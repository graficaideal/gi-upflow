import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

const AuthContext = createContext(null)

// Role comes from the DB (RLS lets a user read only their own staff/vendor row).
// No row → no access (fail-closed), mirrored by the RLS policies.
async function loadRole(userId) {
  const [{ data: staff }, { data: vendor }] = await Promise.all([
    supabase.from('upflow_staff').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('upflow_vendors').select('id, name').eq('user_id', userId).eq('active', true).maybeSingle(),
  ])
  return { isStaff: !!staff, vendor: vendor ?? null }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [role, setRole]       = useState({ isStaff: false, vendor: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let current = null
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      const uid = s?.user?.id ?? null
      if (uid === current) { setLoading(false); return }
      current = uid
      if (!uid) { setRole({ isStaff: false, vendor: null }); setLoading(false); return }
      setLoading(true)
      // Defer: calling supabase inside the callback can deadlock the auth lock.
      setTimeout(() => {
        loadRole(uid)
          .then(r => { if (current === uid) setRole(r) })
          .catch(() => { if (current === uid) setRole({ isStaff: false, vendor: null }) })
          .finally(() => { if (current === uid) setLoading(false) })
      }, 0)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? 'Email ou password incorretos.' : null }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error?.message ?? null }
  }

  async function updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error?.message ?? null }
  }

  const hasAccess = role.isStaff || !!role.vendor

  return (
    <AuthContext.Provider value={{
      session, loading, hasAccess,
      isAdmin: role.isStaff, isStaff: role.isStaff, vendor: role.vendor,
      login, logout, sendPasswordReset, updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
