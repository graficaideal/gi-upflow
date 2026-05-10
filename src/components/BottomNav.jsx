import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './BottomNav.css'

const THEME_KEY = 'upflow-theme'

function getInitialDark() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved) return saved === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function ImageAuthIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

function PlusCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export default function BottomNav() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(getInitialDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
  }, [isDark])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bottom-nav">
      <NavLink to="/dashboard" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
        <span className="bottom-nav-icon"><HomeIcon /></span>
        <span className="bottom-nav-label">Dashboard</span>
      </NavLink>

      <NavLink to="/authorizations" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
        <span className="bottom-nav-icon"><ImageAuthIcon /></span>
        <span className="bottom-nav-label">Autorizações</span>
      </NavLink>

      <NavLink to="/links/create" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
        <span className="bottom-nav-icon"><PlusCircleIcon /></span>
        <span className="bottom-nav-label">Criar Link</span>
      </NavLink>

      <button
        className="bottom-nav-item"
        onClick={() => setIsDark(d => !d)}
        aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      >
        <span className="bottom-nav-icon">{isDark ? <SunIcon /> : <MoonIcon />}</span>
        <span className="bottom-nav-label">Tema</span>
      </button>

      <button className="bottom-nav-item bottom-nav-logout" onClick={handleLogout}>
        <span className="bottom-nav-icon"><LogoutIcon /></span>
        <span className="bottom-nav-label">Sair</span>
      </button>
    </nav>
  )
}
