import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Leaf } from 'lucide-react'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || ''
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If already logged in → redirect
  useEffect(() => {
    const token = localStorage.getItem('foodie_admin_token')
    const userStr = localStorage.getItem('foodie_admin_user')
    if (token && userStr) {
      navigate('/admin-dashboard', { replace: true })
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      // If user not found and email matches ADMIN_EMAIL, automatically register as admin
      if (res.status === 401 && ADMIN_EMAIL && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        const signupRes = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, displayName: 'Foodie Admin' })
        })
        if (signupRes.ok) {
          res = signupRes
        }
      }

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Invalid admin credentials.')
      }

      // Check admin privileges
      const user = data.user
      const isAuthorized = user.role === 'admin' || !ADMIN_EMAIL || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      if (!isAuthorized) {
        throw new Error('Access denied. This account does not have admin privileges.')
      }

      localStorage.setItem('foodie_admin_token', data.token)
      localStorage.setItem('foodie_admin_user', JSON.stringify(user))

      navigate('/admin-dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: 'var(--cream)'
    }}>

      {/* ── Left Panel ─────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0F2B1E 0%, #173C2C 50%, #1e4d38 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 56px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 300, height: 300, borderRadius: '50%',
          background: 'rgba(76,174,122,0.12)', filter: 'blur(60px)', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 250, height: 250, borderRadius: '50%',
          background: 'rgba(23,60,44,0.5)', filter: 'blur(60px)', pointerEvents: 'none'
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Leaf size={22} color="#4CAE7A" />
          </div>
          <div>
            <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 20 }}>Foodie AI</p>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Admin Portal
            </p>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(76,174,122,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24
          }}>
            <ShieldCheck size={28} color="#4CAE7A" />
          </div>
          <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '2.2rem', fontWeight: 700, lineHeight: 1.1 }}>
            Admin<br />
            <span style={{ color: '#4CAE7A' }}>Dashboard</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', marginTop: 16, fontSize: 15, lineHeight: 1.7, maxWidth: 300 }}>
            Manage products, monitor user activity, and view real-time analytics from MongoDB database.
          </p>

          {/* Feature list */}
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              '📊 Real-time MongoDB statistics',
              '👥 Total users & product counts',
              '📦 Recent scans & product activity',
              '💯 Average platform health score'
            ].map(f => (
              <div key={f} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '10px 14px',
                fontSize: 13, color: 'rgba(255,255,255,0.8)'
              }}>
                {f}
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', position: 'relative' }}>
          © 2026 Foodie AI · Admin Access Only
        </p>
      </div>

      {/* ── Right Form ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px', position: 'relative'
      }}>
        <div style={{ width: '100%', maxWidth: 380 }} className="fade-up">

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.7rem', fontWeight: 700, color: 'var(--ink)' }}>
              Welcome back, Admin
            </h2>
            <p style={{ fontSize: 14, color: '#7A8C82', marginTop: 6 }}>
              Sign in with your administrator account.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'rgba(217,83,79,0.08)',
              border: '1px solid rgba(217,83,79,0.2)',
              borderRadius: 12, padding: '12px 14px',
              color: 'var(--clay)', fontSize: 13, marginBottom: 20
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Email */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#7A8C82', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                Admin Email
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff', border: '1px solid rgba(23,60,44,0.12)',
                borderRadius: 12, padding: '12px 14px',
                transition: 'box-shadow 0.2s'
              }}>
                <Mail size={16} color="#A8BDB5" style={{ flexShrink: 0 }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@foodie.ai"
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', width: '100%' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#7A8C82', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff', border: '1px solid rgba(23,60,44,0.12)',
                borderRadius: 12, padding: '12px 14px'
              }}>
                <Lock size={16} color="#A8BDB5" style={{ flexShrink: 0 }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A8BDB5', padding: 0 }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', marginTop: 8, fontSize: 15, borderRadius: 14 }}
            >
              {loading
                ? <><Loader2 size={18} className="spin" /> Signing in…</>
                : <><ShieldCheck size={18} /> Sign In to Admin</>}
            </button>
          </form>

          <div style={{
            marginTop: 32, padding: '14px 16px',
            background: 'rgba(227,162,61,0.08)', border: '1px solid rgba(227,162,61,0.2)',
            borderRadius: 12, fontSize: 12, color: '#A07020', lineHeight: 1.6
          }}>
            🔒 <strong>Restricted Access</strong><br />
            This admin panel is for authorized personnel only. Powered by MongoDB & Express.
          </div>
        </div>
      </div>

      {/* Hide right panel on mobile */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns"] { grid-template-columns: 1fr !important; }
          div[style*="flexDirection: column"][style*="padding: 48px 56px"] { display: none !important; }
        }
      `}</style>
    </div>
  )
}
