import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getVendors } from '../hooks/useLinks'
import './Login.css'

const VENDOR_KEY = 'upflow-active-vendor'

function readStoredVendorId() {
  try {
    const stored = localStorage.getItem(VENDOR_KEY)
    return stored ? (JSON.parse(stored)?.id ?? '') : ''
  } catch { return '' }
}

function BackspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
      <line x1="18" y1="9" x2="12" y2="15" />
      <line x1="12" y1="9" x2="18" y2="15" />
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [vendors, setVendors] = useState([])
  const [selectedVendorId, setSelectedVendorId] = useState(readStoredVendorId)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    getVendors().then(list => {
      setVendors(list)
      // Fallback: if id init found nothing, try matching by stored name
      setSelectedVendorId(prev => {
        if (prev) return prev
        try {
          const stored = localStorage.getItem(VENDOR_KEY)
          if (!stored) return ''
          const name = JSON.parse(stored)?.name
          return list.find(v => v.name === name)?.id ?? ''
        } catch { return '' }
      })
    }).catch(() => {})
  }, [])

  function addDigit(digit) {
    setError('')
    setPin(p => p + digit)
  }

  function deleteDigit() {
    setPin(p => p.slice(0, -1))
    setError('')
  }

  function tryLogin(value) {
    const { error } = login(value)
    if (error) {
      setShake(true)
      setTimeout(() => { setShake(false); setPin('') }, 600)
    } else {
      const vendor = vendors.find(v => v.id === selectedVendorId)
      if (vendor) {
        localStorage.setItem(VENDOR_KEY, JSON.stringify({ id: vendor.id, name: vendor.name }))
      } else {
        localStorage.removeItem(VENDOR_KEY)
      }
      navigate('/dashboard')
    }
  }

  function handleKeyDown(e) {
    if (e.key >= '0' && e.key <= '9') addDigit(e.key)
    else if (e.key === 'Backspace') deleteDigit()
    else if (e.key === 'Enter' && pin.length > 0) tryLogin(pin)
  }

  const keys = ['1','2','3','4','5','6','7','8','9']

  return (
    <div className="login-page" onClick={() => inputRef.current?.focus()}>
      <div className="login-card">
        <div className="login-brand">
          <img src="/logo.svg" alt="Gráfica Ideal" className="login-logo" />
          <span className="login-brand-name">UpFlow</span>
          <span className="login-brand-sub">Portal de atualização de dados de clientes</span>
        </div>

        <select
          className="login-vendor-select"
          value={selectedVendorId}
          onChange={e => { setSelectedVendorId(e.target.value); inputRef.current?.focus() }}
          onClick={e => e.stopPropagation()}
        >
          <option value="">— Acesso Geral —</option>
          {vendors.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>

        <input
          ref={inputRef}
          className="login-hidden-input"
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={() => {}}
          onKeyDown={handleKeyDown}
          readOnly
        />

        <div className={`pin-dots${shake ? ' pin-dots--shake' : ''}`}>
          {Array.from({ length: pin.length }).map((_, i) => (
            <span key={i} className="pin-dot filled" />
          ))}
        </div>

        {error && <p className="login-error">{error}</p>}

        <div className="pin-pad">
          {keys.map(k => (
            <button key={k} className="pin-key" type="button" onClick={() => addDigit(k)}>{k}</button>
          ))}
          <button className="pin-key pin-key--action" type="button" onClick={deleteDigit} aria-label="Apagar">
            <BackspaceIcon />
          </button>
          <button className="pin-key" type="button" onClick={() => addDigit('0')}>0</button>
          <button
            className="pin-key pin-key--action pin-key--confirm"
            type="button"
            disabled={pin.length === 0}
            onClick={() => tryLogin(pin)}
            aria-label="Confirmar"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  )
}
