import { supabase } from '../utils/supabase'

export async function submitForm(token, formData) {
  const { data: link, error: linkError } = await supabase
    .from('upflow_links')
    .select('id, status, expires_at')
    .eq('token', token)
    .single()

  if (linkError || !link) throw new Error('Link inválido ou inexistente.')
  if (link.status !== 'pending' && link.status !== 'opened') throw new Error('Este link já foi utilizado ou expirou.')

  const today = new Date().toISOString().split('T')[0]
  if (link.expires_at < today) throw new Error('Este link expirou.')

  const { data: submission, error: subError } = await supabase
    .from('upflow_submissions')
    .insert({
      link_id:            link.id,
      company_name:       formData.company_name,
      nif:                formData.nif,
      address:            formData.morada          || null,
      codigo_postal:      formData.codigo_postal   || null,
      city:               formData.localidade      || null,
      phone:              formData.telefone        || null,
      mobile:             formData.telemovel       || null,
      email:              formData.email           || null,
      website:            formData.site            || null,
      billing_same_email: formData.billing_same_email ?? null,
      billing_email:      formData.billing_email   || null,
      billing_mode:       formData.billing_mode    || null,
      billing_notes:      formData.billing_notes   || null,
    })
    .select('id')
    .single()

  if (subError) throw subError

  const sid = submission.id

  const contactRows = ['compras', 'financeiro', 'marketing']
    .filter(dept => formData[`${dept}_nome`])
    .map(dept => ({
      submission_id: sid,
      department:    dept,
      name:          formData[`${dept}_nome`],
      email:         formData[`${dept}_email`],
      phone:         formData[`${dept}_telefone`]  || null,
      mobile:        formData[`${dept}_telemovel`] || null,
    }))

  if (contactRows.length > 0) {
    const { error } = await supabase.from('upflow_contacts').insert(contactRows)
    if (error) throw error
  }

  const authRows = ['fotos', 'videos', 'publicacoes'].map(type => ({
    submission_id: sid,
    type,
    authorized: formData[type] === 'sim',
  }))

  const { error: authError } = await supabase.from('upflow_authorizations').insert(authRows)
  if (authError) throw authError

  const { error: rgpdError } = await supabase
    .from('upflow_rgpd_consent')
    .insert({ submission_id: sid, accepted: true })
  if (rgpdError) throw rgpdError

  const { error: updateError } = await supabase
    .from('upflow_links')
    .update({ status: 'completed', submitted_at: new Date().toISOString() })
    .eq('id', link.id)
  if (updateError) throw updateError
}

