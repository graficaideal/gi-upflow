-- UpFlow: replace anon access with Supabase Auth + per-vendor RLS.
-- Access model (fail-closed):
--   staff  = row in upflow_staff            -> everything
--   vendor = upflow_vendors.user_id = me AND active -> only own links (+ children)
--   anyone else (incl. anon)                -> nothing, except the public form RPCs

-- ── 1. Identity ──────────────────────────────────────────────────────────────
alter table public.upflow_vendors
  add column user_id uuid unique references auth.users(id) on delete set null;

update public.upflow_vendors v
   set user_id = u.id
  from auth.users u
 where lower(u.email) = lower(v.email);

-- Keep user_id in sync when staff create/edit a vendor in Settings.
-- ponytail: the auth user must exist before the vendor is saved; re-save the vendor otherwise.
create function public.upflow_vendors_link_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.user_id := (select id from auth.users where lower(email) = lower(new.email));
  return new;
end $$;
revoke all on function public.upflow_vendors_link_user() from public, anon, authenticated;

create trigger upflow_vendors_link_user
  before insert or update of email on public.upflow_vendors
  for each row execute function public.upflow_vendors_link_user();

create table public.upflow_staff (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.upflow_staff enable row level security;

-- Staff sees every record. Users must already exist in auth.users (invite them
-- first); re-run this insert after inviting anyone missing.
insert into public.upflow_staff (user_id)
select id from auth.users
 where lower(email) in ('sergiohenriques@graficaideal.pt',
                        'marciaestima@graficaideal.pt',
                        'financeiro@graficaideal.pt')
on conflict do nothing;

-- ── 2. Indexes used by the policies / joins ─────────────────────────────────
create index if not exists upflow_links_vendor_id_idx          on public.upflow_links (vendor_id);
create index if not exists upflow_submissions_link_id_idx      on public.upflow_submissions (link_id);
create index if not exists upflow_contacts_submission_id_idx   on public.upflow_contacts (submission_id);
create index if not exists upflow_authorizations_submission_id_idx on public.upflow_authorizations (submission_id);
create index if not exists upflow_rgpd_consent_submission_id_idx   on public.upflow_rgpd_consent (submission_id);

-- ── 3. Helpers (private schema: not exposed through PostgREST) ──────────────
create schema if not exists upflow_private;
revoke all on schema upflow_private from public, anon;
grant usage on schema upflow_private to authenticated;

create function upflow_private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.upflow_staff where user_id = (select auth.uid()))
$$;

create function upflow_private.my_vendor_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.upflow_vendors where user_id = (select auth.uid()) and active
$$;

create function upflow_private.can_see_link(p_link_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select upflow_private.is_staff()
      or exists (select 1 from public.upflow_links
                  where id = p_link_id and vendor_id = upflow_private.my_vendor_id())
$$;

create function upflow_private.can_see_submission(p_submission_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select upflow_private.can_see_link(
    (select link_id from public.upflow_submissions where id = p_submission_id))
$$;

revoke all on all functions in schema upflow_private from public, anon;
grant execute on all functions in schema upflow_private to authenticated;

-- ── 4. Drop every existing upflow policy and all anon access ─────────────────
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
            where schemaname = 'public' and tablename like 'upflow\_%'
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

revoke all on public.upflow_links, public.upflow_submissions, public.upflow_contacts,
              public.upflow_authorizations, public.upflow_rgpd_consent,
              public.upflow_vendors, public.upflow_staff
  from anon;

alter table public.upflow_links          enable row level security;
alter table public.upflow_submissions    enable row level security;
alter table public.upflow_contacts       enable row level security;
alter table public.upflow_authorizations enable row level security;
alter table public.upflow_rgpd_consent   enable row level security;
alter table public.upflow_vendors        enable row level security;

-- ── 5. Policies ──────────────────────────────────────────────────────────────
-- staff: own row only (frontend uses it to know the role)
create policy staff_read_self on public.upflow_staff
  for select to authenticated using (user_id = (select auth.uid()));

-- vendors: staff manage all; a vendor reads only its own row
create policy vendors_staff_all on public.upflow_vendors
  for all to authenticated
  using ((select upflow_private.is_staff())) with check ((select upflow_private.is_staff()));
create policy vendors_read_self on public.upflow_vendors
  for select to authenticated using (user_id = (select auth.uid()) and active);

-- links: staff all; vendor full CRUD on own links, cannot move a link to another vendor
create policy links_access on public.upflow_links
  for all to authenticated
  using      ((select upflow_private.is_staff()) or vendor_id = (select upflow_private.my_vendor_id()))
  with check ((select upflow_private.is_staff()) or vendor_id = (select upflow_private.my_vendor_id()));

-- children: staff write (backup restore); readable by whoever can see the link.
-- Vendors deleting a link still removes children via ON DELETE CASCADE.
create policy submissions_staff_all on public.upflow_submissions
  for all to authenticated
  using ((select upflow_private.is_staff())) with check ((select upflow_private.is_staff()));
create policy submissions_read on public.upflow_submissions
  for select to authenticated using (upflow_private.can_see_link(link_id));

create policy contacts_staff_all on public.upflow_contacts
  for all to authenticated
  using ((select upflow_private.is_staff())) with check ((select upflow_private.is_staff()));
create policy contacts_read on public.upflow_contacts
  for select to authenticated using (upflow_private.can_see_submission(submission_id));

create policy authorizations_staff_all on public.upflow_authorizations
  for all to authenticated
  using ((select upflow_private.is_staff())) with check ((select upflow_private.is_staff()));
create policy authorizations_read on public.upflow_authorizations
  for select to authenticated using (upflow_private.can_see_submission(submission_id));

create policy rgpd_staff_all on public.upflow_rgpd_consent
  for all to authenticated
  using ((select upflow_private.is_staff())) with check ((select upflow_private.is_staff()));
create policy rgpd_read on public.upflow_rgpd_consent
  for select to authenticated using (upflow_private.can_see_submission(submission_id));

-- ── 6. Public form RPCs (the only thing anon can touch) ─────────────────────
-- Opens the form: marks a pending, unexpired link as opened and returns what the
-- page needs. status is the effective one ('expired' if past expires_at).
create function public.upflow_open_form(p_token text)
returns table (commercial_name text, expires_at date, status text, language text)
language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.upflow_links l
     set status = 'opened', opened_at = now()
   where l.token = p_token and l.status = 'pending' and l.expires_at >= current_date;

  return query
    select l.commercial_name, l.expires_at,
           case when l.status in ('pending', 'opened') and l.expires_at < current_date
                then 'expired' else l.status end,
           l.language
      from public.upflow_links l
     where l.token = p_token;
end $$;

-- Submits the form atomically. p_data uses the same keys as the React form state.
-- Returns the link id (used to trigger notify-submission).
create function public.upflow_submit_form(p_token text, p_data jsonb)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_link public.upflow_links;
  v_sid  uuid;
  v_dept text;
  v_type text;
begin
  select * into v_link from public.upflow_links where token = p_token for update;

  if not found then
    raise exception 'Link inválido ou inexistente.' using errcode = 'P0002';
  end if;
  if v_link.status not in ('pending', 'opened') then
    raise exception 'Este link já foi utilizado ou expirou.' using errcode = 'P0001';
  end if;
  if v_link.expires_at < current_date then
    raise exception 'Este link expirou.' using errcode = 'P0001';
  end if;

  insert into public.upflow_submissions (
    link_id, fiscal_name, nif, address, codigo_postal, city, phone, mobile, email, website,
    billing_same_email, billing_email, billing_mode, billing_notes, submitted_at)
  values (
    v_link.id,
    p_data->>'fiscal_name',
    p_data->>'nif',
    nullif(p_data->>'morada', ''),
    nullif(p_data->>'codigo_postal', ''),
    nullif(p_data->>'localidade', ''),
    nullif(p_data->>'telefone', ''),
    nullif(p_data->>'telemovel', ''),
    nullif(p_data->>'email', ''),
    nullif(p_data->>'site', ''),
    (p_data->>'billing_same_email')::boolean,
    nullif(p_data->>'billing_email', ''),
    nullif(p_data->>'billing_mode', ''),
    nullif(p_data->>'billing_notes', ''),
    now())
  returning id into v_sid;

  foreach v_dept in array array['compras', 'financeiro', 'marketing'] loop
    if nullif(p_data->>(v_dept || '_nome'), '') is not null then
      insert into public.upflow_contacts (submission_id, department, name, email, phone, mobile, cargo, cargo_outro)
      values (v_sid, v_dept,
              p_data->>(v_dept || '_nome'),
              p_data->>(v_dept || '_email'),
              nullif(p_data->>(v_dept || '_telefone'), ''),
              nullif(p_data->>(v_dept || '_telemovel'), ''),
              nullif(p_data->>(v_dept || '_cargo'), ''),
              nullif(p_data->>(v_dept || '_cargo_outro'), ''));
    end if;
  end loop;

  foreach v_type in array array['fotos', 'videos', 'publicacoes'] loop
    insert into public.upflow_authorizations (submission_id, type, authorized)
    values (v_sid, v_type, coalesce(p_data->>v_type = 'sim', false));
  end loop;

  insert into public.upflow_rgpd_consent (submission_id, accepted, accepted_at)
  values (v_sid, true, now());

  update public.upflow_links
     set status = 'completed', submitted_at = now()
   where id = v_link.id;

  return v_link.id;
end $$;

revoke all on function public.upflow_open_form(text)          from public;
revoke all on function public.upflow_submit_form(text, jsonb) from public;
grant execute on function public.upflow_open_form(text)          to anon, authenticated;
grant execute on function public.upflow_submit_form(text, jsonb) to anon, authenticated;
