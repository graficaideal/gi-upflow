import { supabase } from '../utils/supabase'

export async function getAuthorizations() {
  const { data: links, error: linksError } = await supabase
    .from('upflow_links')
    .select('id, commercial_name')
    .eq('status', 'completed')

  if (linksError) {
    console.error('[useAuthorizations] upflow_links query failed:', linksError)
    throw linksError
  }
  if (!links?.length) return []

  const linkIds = links.map(l => l.id)

  const { data: submissions, error: subsError } = await supabase
    .from('upflow_submissions')
    .select('id, link_id, submitted_at')
    .in('link_id', linkIds)

  if (subsError) {
    console.error('[useAuthorizations] upflow_submissions query failed:', subsError)
    throw subsError
  }
  if (!submissions?.length) return []

  const submissionIds = submissions.map(s => s.id)

  const { data: authorizations, error: authError } = await supabase
    .from('upflow_authorizations')
    .select('submission_id, type, authorized')
    .in('submission_id', submissionIds)

  if (authError) {
    console.error('[useAuthorizations] upflow_authorizations query failed:', authError)
    throw authError
  }

  const authMap = {}
  for (const a of authorizations ?? []) {
    if (!authMap[a.submission_id]) authMap[a.submission_id] = {}
    authMap[a.submission_id][a.type] = a.authorized
  }

  const linkMap = Object.fromEntries(links.map(l => [l.id, l]))

  return submissions
    .map(sub => {
      const auths = authMap[sub.id] ?? {}
      return {
        commercial_name: linkMap[sub.link_id]?.commercial_name || '—',
        submitted_at:    sub.submitted_at,
        fotos:           auths.fotos       ?? false,
        videos:          auths.videos      ?? false,
        publicacoes:     auths.publicacoes ?? false,
      }
    })
    .sort((a, b) => a.commercial_name.localeCompare(b.commercial_name, 'pt'))
}
