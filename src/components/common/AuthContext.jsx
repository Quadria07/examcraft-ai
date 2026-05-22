import React, { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await api.getCurrentUser()
        setUser(data)
      } catch (err) {
        api.logout()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = async (email, password) => {
    setError(null)
    const data = await api.login(email, password)
    setUser(data.user)
    return data.user
  }

  const register = async (email, password, inviteCode) => {
    setError(null)
    const data = await api.register(email, password, inviteCode)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (error) {
      console.warn('Logout failed:', error)
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, setError }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
