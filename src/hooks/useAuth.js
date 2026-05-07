import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

export function useAuth() {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function fetchProfile(userId) {
      try {
        const { data } = await supabase
          .from('upflow_profiles')
          .select('is_admin')
          .eq('id', userId)
          .single()
        if (mounted) setIsAdmin(data?.is_admin ?? false)
      } catch {
        // profile row may not exist yet — treat as non-admin
      } finally {
        if (mounted) setLoading(false)
      }
    }

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        setSession(session)
        if (session) {
          await fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } catch {
        // Network or config error — unblock the UI
        if (mounted) setLoading(false)
      }
    }

    // onAuthStateChange fires INITIAL_SESSION immediately in Supabase v2,
    // so init() and the callback may both run. Both paths guard with `mounted`.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        setSession(session)
        if (session) {
          await fetchProfile(session.user.id)
        } else {
          setIsAdmin(false)
          setLoading(false)
        }
      }
    )

    // Safety net: if auth hasn't resolved in 5s (e.g. browser extension blocking
    // Supabase fetch), unblock the UI so the user isn't stuck on a spinner.
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

    init()

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return { session, isAdmin, loading, login, logout }
}
