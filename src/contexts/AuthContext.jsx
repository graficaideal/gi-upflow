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

// Supabase error codes → message the user can act on.
// invalid_credentials never says whether email or password is wrong (account enumeration).
const ERROR_MESSAGES = {
  invalid_credentials:        'Email ou password incorretos. Confirme o email e tente novamente, ou use "Esqueci-me da password".',
  email_not_confirmed:        'O email ainda não foi confirmado. Abra o link que recebeu por email.',
  user_banned:                'Esta conta está bloqueada. Contacte o administrador.',
  same_password:              'A nova password tem de ser diferente da atual.',
  over_email_send_rate_limit: 'Foram pedidos demasiados emails. Aguarde alguns minutos e tente novamente.',
  over_request_rate_limit:    'Demasiadas tentativas. Aguarde alguns minutos e tente novamente.',
  validation_failed:          'O email não é válido.',
}

const WEAK_REASONS = {
  pwned:      'esta password apareceu numa fuga de dados conhecida — escolha outra',
  length:     'é demasiado curta',
  characters: 'tem de ter letras maiúsculas, minúsculas, números e símbolos',
}

function authErrorMessage(error) {
  if (!error) return null
  if (error.code === 'weak_password') {
    const reasons = (error.reasons ?? []).map(r => WEAK_REASONS[r]).filter(Boolean)
    return reasons.length ? `Password fraca: ${reasons.join('; ')}.` : 'Password fraca. Escolha uma password mais forte.'
  }
  if (ERROR_MESSAGES[error.code]) return ERROR_MESSAGES[error.code]
  if (!error.status) return 'Sem ligação ao servidor. Verifique a internet e tente novamente.'
  return 'Ocorreu um erro. Tente novamente.'
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
    return { error: authErrorMessage(error) }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: authErrorMessage(error) }
  }

  async function updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: authErrorMessage(error) }
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
