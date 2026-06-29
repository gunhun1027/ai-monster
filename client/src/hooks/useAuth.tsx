// 认证Context - 全局共享登录状态
import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { authApi, setToken, clearToken, getToken } from '../services/api'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<User>
  register: (username: string, email: string, password: string) => Promise<User>
  logout: () => void
  updateUser: (newUser: Partial<User>) => void
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const data = await authApi.me()
      setUser(data.user)
    } catch {
      clearToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (username: string, password: string) => {
    const data = await authApi.login(username, password)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const register = async (username: string, email: string, password: string) => {
    const data = await authApi.register(username, email, password)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  const updateUser = (newUser: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...newUser } : null))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
