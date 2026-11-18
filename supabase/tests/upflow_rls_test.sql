-- RLS check for 20261118120000_upflow_auth_rls.sql.
-- Run AFTER the migration, inside a transaction that is rolled back:
--   begin; <migration>; <this file>; rollback;
-- Raises an exception on the first failed assertion; returns 'ALL OK' otherwise.

do $$
declare
  v_a      public.upflow_vendors;   -- vendor with links
  v_b      public.upflow_vendors;   -- another vendor
  u_staff  uuid;
  u_nobody uuid;
  n        int;
  expected int;
  tok      text;
  lid      uuid;

begin
  select v.* into v_a from public.upflow_vendors v
   where v.user_id is not null and v.active
   order by (select count(*) from public.upflow_links l where l.vendor_id = v.id) desc limit 1;
  select v.* into v_b from public.upflow_vendors v
   where v.user_id is not null and v.id <> v_a.id limit 1;
  select user_id into u_staff from public.upflow_staff limit 1;   -- seeded by the migration
  select u.id into u_nobody from auth.users u
   where not exists (select 1 from public.upflow_vendors v where v.user_id = u.id)
     and not exists (select 1 from public.upflow_staff s where s.user_id = u.id) limit 1;

  if v_a.id is null or v_b.id is null or u_staff is null or u_nobody is null then
    raise exception 'FAIL setup: missing personas';
  end if;

  -- trigger links a vendor to its auth user by email (and unlinks on unknown email)
  insert into public.upflow_vendors (name, email, active)
  values ('__rls_test__', (select email from auth.users where id = u_nobody), true)
  returning user_id into lid;
  if lid is distinct from u_nobody then raise exception 'FAIL trigger did not link user_id'; end if;
  update public.upflow_vendors set email = 'nobody@invalid' where name = '__rls_test__' returning user_id into lid;
  if lid is not null then raise exception 'FAIL trigger kept stale user_id'; end if;
  delete from public.upflow_vendors where name = '__rls_test__';

  -- vendors all have a user_id after backfill
  select count(*) into n from public.upflow_vendors where user_id is null;
  if n <> 0 then raise exception 'FAIL backfill: % vendors without user_id', n; end if;

  -- ── anon: no direct table access ──
  perform set_config('role', 'anon', true);
  begin
    perform 1 from public.upflow_links limit 1;
    raise exception 'FAIL anon can select upflow_links';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.upflow_contacts;
    raise exception 'FAIL anon can delete upflow_contacts';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.upflow_staff limit 1;
    raise exception 'FAIL anon can select upflow_staff';
  exception when insufficient_privilege then null;
  end;
  begin
    perform upflow_private.is_staff();
    raise exception 'FAIL anon can call private helper';
  exception when insufficient_privilege then null;
  end;
  perform set_config('role', 'postgres', true);

  -- ── staff: sees everything ──
  perform set_config('request.jwt.claims', json_build_object('sub', u_staff, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.upflow_links;
  perform set_config('role', 'postgres', true);
  select count(*) into expected from public.upflow_links;
  if n <> expected then raise exception 'FAIL staff links % <> %', n, expected; end if;

  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.upflow_contacts;
  perform set_config('role', 'postgres', true);
  select count(*) into expected from public.upflow_contacts;
  if n <> expected then raise exception 'FAIL staff contacts % <> %', n, expected; end if;

  -- ── vendor A: only own links and children ──
  perform set_config('request.jwt.claims', json_build_object('sub', v_a.user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.upflow_links;
  perform set_config('role', 'postgres', true);
  select count(*) into expected from public.upflow_links where vendor_id = v_a.id;
  if n <> expected then raise exception 'FAIL vendor links % <> %', n, expected; end if;

  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.upflow_submissions;
  perform set_config('role', 'postgres', true);
  select count(*) into expected from public.upflow_submissions s
    join public.upflow_links l on l.id = s.link_id where l.vendor_id = v_a.id;
  if n <> expected then raise exception 'FAIL vendor submissions % <> %', n, expected; end if;

  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.upflow_contacts;
  perform set_config('role', 'postgres', true);
  select count(*) into expected from public.upflow_contacts c
    join public.upflow_submissions s on s.id = c.submission_id
    join public.upflow_links l on l.id = s.link_id where l.vendor_id = v_a.id;
  if n <> expected then raise exception 'FAIL vendor contacts % <> %', n, expected; end if;

  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.upflow_vendors;
  if n <> 1 then raise exception 'FAIL vendor sees % vendor rows', n; end if;
  select count(*) into n from public.upflow_staff;
  if n <> 0 then raise exception 'FAIL vendor sees staff rows'; end if;

  -- vendor can create own link, not one for vendor B
  insert into public.upflow_links (commercial_name, expires_at, status, token, vendor_id, vendor_name)
  values ('__rls_test__', current_date + 7, 'pending', '__rlstest1', v_a.id, v_a.name)
  returning id into lid;
  begin
    insert into public.upflow_links (commercial_name, expires_at, status, token, vendor_id)
    values ('__rls_test__', current_date + 7, 'pending', '__rlstest2', v_b.id);
    raise exception 'FAIL vendor inserted link for another vendor';
  exception when insufficient_privilege then null;
  end;
  -- cannot move own link to vendor B
  begin
    update public.upflow_links set vendor_id = v_b.id where id = lid;
    raise exception 'FAIL vendor moved link to another vendor';
  exception when insufficient_privilege then null;
  end;
  -- cannot touch vendor B links
  update public.upflow_links set commercial_name = 'x' where vendor_id = v_b.id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL vendor updated % foreign links', n; end if;
  delete from public.upflow_links where vendor_id = v_b.id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL vendor deleted % foreign links', n; end if;
  -- cannot write children directly
  begin
    delete from public.upflow_contacts;
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL vendor deleted % contacts', n; end if;
  end;
  -- can delete own link
  delete from public.upflow_links where id = lid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL vendor could not delete own link'; end if;
  perform set_config('role', 'postgres', true);

  -- ── inactive vendor: no access ──
  update public.upflow_vendors set active = false where id = v_a.id;
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.upflow_links;
  if n <> 0 then raise exception 'FAIL inactive vendor sees % links', n; end if;
  perform set_config('role', 'postgres', true);
  update public.upflow_vendors set active = true where id = v_a.id;

  -- ── authenticated user with no role: nothing ──
  perform set_config('request.jwt.claims', json_build_object('sub', u_nobody, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select (select count(*) from public.upflow_links) + (select count(*) from public.upflow_vendors)
       + (select count(*) from public.upflow_submissions) + (select count(*) from public.upflow_contacts)
    into n;
  if n <> 0 then raise exception 'FAIL no-role user sees % rows', n; end if;
  perform set_config('role', 'postgres', true);

  -- ── public form RPCs as anon ──
  insert into public.upflow_links (commercial_name, expires_at, status, token, vendor_id)
  values ('__rls_test__', current_date + 7, 'pending', '__rlsform', v_a.id) returning id into lid;
  insert into public.upflow_links (commercial_name, expires_at, status, token, vendor_id)
  values ('__rls_test__', current_date - 1, 'opened', '__rlsexp', v_a.id);

  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);

  select status into tok from public.upflow_open_form('__rlsform');
  if tok <> 'opened' then raise exception 'FAIL open_form status %', tok; end if;
  select status into tok from public.upflow_open_form('__rlsexp');
  if tok <> 'expired' then raise exception 'FAIL open_form expired status %', tok; end if;
  select count(*) into n from public.upflow_open_form('nope');
  if n <> 0 then raise exception 'FAIL open_form unknown token returned rows'; end if;

  if public.upflow_submit_form('__rlsform', jsonb_build_object(
       'fiscal_name', 'Teste Lda', 'nif', '500000000', 'morada', 'Rua X', 'codigo_postal', '3750-000', 'localidade', 'Águeda', 'site', '',
       'billing_same_email', true, 'compras_nome', 'Ana', 'compras_email', 'a@x.pt',
       'fotos', 'sim', 'videos', 'nao')) <> lid then
    raise exception 'FAIL submit_form returned wrong id';
  end if;
  begin
    perform public.upflow_submit_form('__rlsform', '{}'::jsonb);
    raise exception 'FAIL submit_form accepted a second submission';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.upflow_submit_form('__rlsexp', '{}'::jsonb);
    raise exception 'FAIL submit_form accepted an expired link';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if;
  end;
  perform set_config('role', 'postgres', true);

  select count(*) into n from public.upflow_links where id = lid and status = 'completed' and opened_at is not null;
  if n <> 1 then raise exception 'FAIL link not completed'; end if;
  select count(*) into n from public.upflow_submissions s
    join public.upflow_contacts c on c.submission_id = s.id
   where s.link_id = lid and s.website is null and s.billing_same_email and c.department = 'compras';
  if n <> 1 then raise exception 'FAIL submission/contact rows'; end if;
  select count(*) into n from public.upflow_submissions s
    join public.upflow_authorizations a on a.submission_id = s.id
   where s.link_id = lid and a.authorized = (a.type = 'fotos');
  if n <> 3 then raise exception 'FAIL authorization rows (%)', n; end if;
  select count(*) into n from public.upflow_submissions s
    join public.upflow_rgpd_consent r on r.submission_id = s.id where s.link_id = lid and r.accepted;
  if n <> 1 then raise exception 'FAIL rgpd row'; end if;
end $$;

select 'ALL OK' as result;
