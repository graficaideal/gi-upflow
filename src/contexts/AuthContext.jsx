import { createContext, useContext, useState } from 'react'

const CORRECT_PIN = import.meta.env.VITE_APP_PIN
const STORAGE_KEY = 'gi-upflow-auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) === 'true' ? true : null
  )

  function login(pin) {
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem(STORAGE_KEY, 'true')
      setSession(true)
      return { error: null }
    }
    return { error: 'PIN incorrecto.' }
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, isAdmin: !!session, loading: false, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
