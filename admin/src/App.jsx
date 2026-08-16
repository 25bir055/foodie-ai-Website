import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import { Loader2 } from 'lucide-react'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || ''
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function AdminGuard({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('foodie_admin_token')
    const storedUser = localStorage.getItem('foodie_admin_user')

    if (!token) {
      setAuthLoading(false)
      return
    }

    // Verify token with backend
    fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error('Unauthorized')
      })
      .then((data) => {
        setUser(data)
      })
      .catch(() => {
        if (storedUser) {
          try { setUser(JSON.parse(storedUser)) } catch { setUser(null) }
        } else {
          setUser(null)
        }
      })
      .finally(() => {
        setAuthLoading(false)
      })
  }, [])

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <Loader2 size={36} style={{ color: '#2C7C51', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 14, color: '#7A8C82' }}>Loading Admin…</p>
      </div>
    )
  }

  // Must be logged in AND (have admin role OR email matching ADMIN_EMAIL or default allow if authed)
  const isAdmin = user && (user.role === 'admin' || !ADMIN_EMAIL || user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())
  return isAdmin ? children : <Navigate to="/admin-login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route
        path="/admin-dashboard"
        element={
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        }
      />
      <Route path="*" element={<Navigate to="/admin-login" replace />} />
    </Routes>
  )
}
