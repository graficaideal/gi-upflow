import { supabase } from '../utils/supabase'

// One atomic RPC (upflow_submit_form) validates the token/status/expiry and writes
// submission, contacts, authorizations, RGPD consent and the link status.
export async function submitForm(token, formData) {
  const { data: linkId, error } = await supabase.rpc('upflow_submit_form', {
    p_token: token,
    p_data:  formData,
  })
  if (error) throw new Error(error.message)

  try {
    await supabase.functions.invoke('notify-submission', { body: { link_id: linkId } })
  } catch (err) {
    console.error('notify-submission failed:', err) // email is best-effort; the submission is saved
  }
}
