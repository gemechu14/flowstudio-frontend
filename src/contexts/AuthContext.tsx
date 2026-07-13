import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthUser } from '../api/auth'
import { getToken } from '../api/client'

interface AuthContextValue {
  user: AuthUser | null
  setUser: (u: AuthUser | null) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => {},
  isLoading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (token) {
      const stored = localStorage.getItem('cl_user')
      if (stored) {
        try {
          setUser(JSON.parse(stored))
        } catch {}
      }
      // Verify token against /auth/me
      fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            const u = { ...data, access_token: token }
            setUser(u)
            localStorage.setItem('cl_user', JSON.stringify(u))
          } else {
            setUser(null)
            localStorage.removeItem('cl_user')
            localStorage.removeItem('cl_token')
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const handleSetUser = (u: AuthUser | null) => {
    setUser(u)
    if (u) {
      localStorage.setItem('cl_user', JSON.stringify(u))
    } else {
      localStorage.removeItem('cl_user')
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser: handleSetUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
