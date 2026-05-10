import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export async function getVendors() {
  const { data, error } = await supabase
    .from('upflow_vendors')
    .select('id, name')
    .eq('active', true)
    .order('name')

  if (error) throw error
  return data ?? []
}

// Excludes 0, O, I, l, 1 to avoid visual confusion
const generateToken = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createLink(commercialName, expiresAt, vendorId, vendorName, language = 'pt') {
  const { data, error } = await supabase
    .from('upflow_links')
    .insert({
      commercial_name: commercialName,
      expires_at:      expiresAt,
      status:          'pending',
      token:           generateToken(),
      vendor_id:       vendorId   || null,
      vendor_name:     vendorName || null,
      language:        language,
    })
    .select('id, token')
    .single()

  if (error) throw error
  return data
}

export async function getMyLinks() {
  const { data, error } = await supabase
    .from('upflow_links')
    .select('id, commercial_name, created_at, expires_at, status, token, vendor_id, vendor_name, opened_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getAllLinks() {
  const { data, error } = await supabase
    .from('upflow_links')
    .select('id, commercial_name, created_at, expires_at, status, token, vendor_id, vendor_name, opened_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function markOpened(token) {
  const { error } = await supabase
    .from('upflow_links')
    .update({ status: 'opened', opened_at: new Date().toISOString() })
    .eq('token', token)
    .eq('status', 'pending')

  if (error) throw error
}

export async function getLinkByToken(token) {
  const { data, error } = await supabase
    .from('upflow_links')
    .select('id, commercial_name, expires_at, status, token, language')
    .eq('token', token)
    .single()

  if (error) throw error
  return data
}

export async function getLinkById(id) {
  const { data: link, error } = await supabase
    .from('upflow_links')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  const { data: submission } = await supabase
    .from('upflow_submissions')
    .select('*')
    .eq('link_id', id)
    .limit(1)
    .maybeSingle()

  if (!submission) return { ...link, submission: null }

  const [{ data: contacts }, { data: authorizations }, { data: rgpd }] = await Promise.all([
    supabase.from('upflow_contacts').select('*').eq('submission_id', submission.id),
    supabase.from('upflow_authorizations').select('*').eq('submission_id', submission.id),
    supabase.from('upflow_rgpd_consent').select('*').eq('submission_id', submission.id).maybeSingle(),
  ])

  return {
    ...link,
    submission: {
      ...submission,
      contacts:       contacts       ?? [],
      authorizations: authorizations ?? [],
      rgpd_consent:   rgpd           ?? null,
    },
  }
}

export async function deleteLink(id) {
  const { error } = await supabase
    .from('upflow_links')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function markExpired() {
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('upflow_links')
    .update({ status: 'expired' })
    .lt('expires_at', today)
    .eq('status', 'pending')

  if (error) throw error
}

export function useLinks() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    getMyLinks()
      .then(data  => { if (mounted) { setLinks(data); setLoading(false) } })
      .catch(err  => { if (mounted) { setError(err);  setLoading(false) } })
    return () => { mounted = false }
  }, [])

  function removeLink(id) {
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  return { links, loading, error, removeLink }
}
