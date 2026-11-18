import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

function EyeIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  )
}

function PasswordField(props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="login-password">
      <input {...props} className="login-input" type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="login-password-toggle"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Ocultar password' : 'Mostrar password'}
        aria-pressed={visible}
      >
        <EyeIcon off={visible} />
      </button>
    </div>
  )
}

// mode: 'login' (default) | 'reset' (landing page of the password-recovery email)
export default function Login({ mode: initialMode = 'login' }) {
  const navigate = useNavigate()
  const { session, loading, hasAccess, login, logout, sendPasswordReset, updatePassword } = useAuth()
  const [mode, setMode]         = useState(initialMode) // login | forgot | reset
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')
  const [busy, setBusy]         = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('upflow-theme')
    document.documentElement.classList.add('dark')
    return () => {
      const isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', isDark)
    }
  }, [])

  // Logged in with a role → straight to the app.
  useEffect(() => {
    if (mode === 'login' && !loading && session && hasAccess) navigate('/dashboard', { replace: true })
  }, [mode, loading, session, hasAccess, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await login(email.trim(), password)
        if (error) setError(error)
      } else if (mode === 'forgot') {
        const { error } = await sendPasswordReset(email.trim())
        if (error) setError(error)
        else setInfo('Se o email existir, vai receber um link para definir a password.')
      } else {
        if (password.length < 8) { setError('A password deve ter pelo menos 8 caracteres.'); return }
        if (password !== confirm) { setError('As passwords não coincidem.'); return }
        const { error } = await updatePassword(password)
        if (error) setError(error)
        else navigate('/dashboard', { replace: true })
      }
    } finally {
      setBusy(false)
    }
  }

  const noAccess   = mode === 'login' && !loading && session && !hasAccess
  const badReset   = mode === 'reset' && !loading && !session
  const showEmail  = mode === 'login' || mode === 'forgot'
  const showPass   = mode === 'login' || mode === 'reset'
  const submitText = { login: 'Entrar', forgot: 'Enviar link', reset: 'Guardar password' }[mode]

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src="/logo.svg" alt="Gráfica Ideal" className="login-logo" />
          <span className="login-brand-name notranslate" translate="no">UpFlow</span>
          <span className="login-brand-sub">Portal de atualização de dados de clientes</span>
        </div>

        {noAccess ? (
          <div className="login-form">
            <p className="login-error">Esta conta não tem acesso ao UpFlow.</p>
            <button className="login-link" type="button" onClick={logout}>Entrar com outra conta</button>
          </div>
        ) : badReset ? (
          <div className="login-form">
            <p className="login-error">O link é inválido ou expirou.</p>
            <button className="login-link" type="button" onClick={() => setMode('forgot')}>Pedir novo link</button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {mode === 'reset' && <p className="login-info">Defina a nova password.</p>}
            {showEmail && (
              <input className="login-input" type="email" autoComplete="email" placeholder="Email"
                     value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            )}
            {showPass && (
              <PasswordField placeholder={mode === 'reset' ? 'Nova password' : 'Password'}
                             autoComplete={mode === 'reset' ? 'new-password' : 'current-password'}
                             value={password} onChange={e => setPassword(e.target.value)} required
                             autoFocus={mode === 'reset'} />
            )}
            {mode === 'reset' && (
              <PasswordField placeholder="Confirmar password" autoComplete="new-password"
                             value={confirm} onChange={e => setConfirm(e.target.value)} required />
            )}
            {error && <p className="login-error">{error}</p>}
            {info  && <p className="login-info">{info}</p>}
            <button className="login-submit" type="submit" disabled={busy || loading}>{submitText}</button>
            {mode === 'login'  && <button className="login-link" type="button" onClick={() => { setMode('forgot'); setError('') }}>Esqueci-me da password</button>}
            {mode === 'forgot' && <button className="login-link" type="button" onClick={() => { setMode('login'); setError(''); setInfo('') }}>Voltar</button>}
          </form>
        )}
      </div>
    </div>
  )
}
