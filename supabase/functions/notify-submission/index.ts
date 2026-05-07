import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY      = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL        = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function emailHtml(clientName: string, companyName: string, linkId: string): string {
  const detailUrl = `https://upflow.graficaideal.pt/links/${linkId}`

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Formulário preenchido</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="background:#333F48;border-radius:12px 12px 0 0;padding:32px 40px;">
              <div style="display:inline-block;background:#e0cb4b;border-radius:10px;width:52px;height:52px;line-height:52px;text-align:center;font-size:20px;font-weight:800;color:#333F48;letter-spacing:0.05em;">
                GI
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 40px 32px;border-left:1px solid #e4e6e8;border-right:1px solid #e4e6e8;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#333F48;">
                Formulário preenchido
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#8d9190;line-height:1.5;">
                O cliente <strong style="color:#333F48;">${clientName}</strong>
                da empresa <strong style="color:#333F48;">${companyName}</strong>
                submeteu os seus dados.
              </p>
              <a href="${detailUrl}"
                 style="display:inline-block;background:#e0cb4b;color:#333F48;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;">
                Ver dados
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f5f5;border:1px solid #e4e6e8;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#8d9190;">
                Gráfica Ideal de Águeda &nbsp;·&nbsp; Este email foi gerado automaticamente pelo UpFlow.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let body: {
    vendedor_id: string
    client_name: string
    company_name: string
    link_id: string
  }

  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { vendedor_id, client_name, company_name, link_id } = body

  if (!vendedor_id || !client_name || !company_name || !link_id) {
    return json({ error: 'Missing required fields' }, 400)
  }

  // Resolve vendedor email + name via service role (auth.users + upflow_profiles)
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(vendedor_id)
  if (userError || !userData?.user?.email) {
    console.error('Could not resolve vendedor:', userError)
    return json({ error: 'Vendedor not found' }, 404)
  }

  const vendedor_email = userData.user.email

  const { data: profile } = await admin
    .from('upflow_profiles')
    .select('full_name')
    .eq('id', vendedor_id)
    .maybeSingle()

  const vendedor_name = profile?.full_name ?? vendedor_email

  // Send email via Resend
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'UpFlow <geral@graficaideal.pt>',
      to: [vendedor_email],
      subject: `[UpFlow] ${company_name} preencheu o formulário`,
      html: emailHtml(client_name, company_name, link_id),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
    return json({ error: 'Failed to send email', detail: err }, 502)
  }

  const data = await res.json()
  return json({ success: true, id: data.id })
})
