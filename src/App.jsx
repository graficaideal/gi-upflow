import { Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import CreateLink from './pages/CreateLink'
import LinkDetail from './pages/LinkDetail'
import FormPage from './pages/form/FormPage'
import Authorizations from './pages/Authorizations'

// ── Catches render errors and shows a readable message instead of blank page
class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'Outfit, sans-serif', color: '#333F48' }}>
          <h2 style={{ marginBottom: 8 }}>Algo correu mal</h2>
          <pre style={{ fontSize: 13, color: '#e57373', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

function AuthLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#333F48',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 28,
        height: 28,
        border: '3px solid rgba(224,203,75,0.3)',
        borderTopColor: '#e0cb4b',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function RootRedirect() {
  const { session, loading } = useAuth()
  if (loading) return <AuthLoading />
  return <Navigate to={session ? '/dashboard' : '/login'} replace />
}

function ProtectedLayout({ adminOnly = false }) {
  const { session, isAdmin, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (!session) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />
  return <AppLayout><Outlet /></AppLayout>
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/form/:token" element={<FormPage />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/links/create" element={<CreateLink />} />
            <Route path="/links/:id" element={<LinkDetail />} />
            <Route path="/authorizations" element={<Authorizations />} />
          </Route>

          <Route element={<ProtectedLayout adminOnly />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
