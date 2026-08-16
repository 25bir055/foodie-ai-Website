import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Leaf, Mail, Lock, ScanBarcode, ShieldCheck, Sparkles, Eye, EyeOff, ArrowRight, ChevronRight, AlertCircle } from 'lucide-react'
import { useApp } from '../store.jsx'
import { loginWithEmail, signupWithEmail, loginWithGoogle } from '../services/auth'

const FEATURES = [
  { icon: ScanBarcode, label: 'Instant Barcode Scan', desc: 'Scan any packaged food in seconds' },
  { icon: Sparkles, label: 'AI Health Insights', desc: 'Personalised nutrition explanations' },
  { icon: ShieldCheck, label: 'Allergen Detection', desc: 'Instant alerts for your triggers' }
]

const STATS = [
  { value: '2.4M+', label: 'Products Indexed' },
  { value: '98%', label: 'Scan Accuracy' },
  { value: '180+', label: 'Countries' }
]

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()
  const { isAuthed, profile, authLoading, setUser, setProfile } = useApp()

  useEffect(() => {
    if (isAuthed && !authLoading) {
      if (profile && profile.profileCompleted === false) {
        navigate('/setup-profile')
      } else {
        navigate('/dashboard')
      }
    }
  }, [isAuthed, profile, authLoading, navigate])

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let loggedUser = null
      if (mode === 'signin') {
        loggedUser = await loginWithEmail(email, password)
      } else {
        loggedUser = await signupWithEmail(email, password, displayName)
      }

      if (loggedUser) {
        setUser(loggedUser)
        if (loggedUser.profile) {
          setProfile(loggedUser.profile)
        }
        if (loggedUser.profile?.profileCompleted === false) {
          navigate('/setup-profile')
        } else {
          navigate('/dashboard')
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(err.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      const googleUser = await loginWithGoogle()
      if (googleUser) {
        setUser(googleUser)
        if (googleUser.profile) {
          setProfile(googleUser.profile)
        }
        if (googleUser.profile?.profileCompleted === false) {
          navigate('/setup-profile')
        } else {
          navigate('/dashboard')
        }
      }
    } catch (err) {
      console.error('Google Sign-in error:', err)
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google Sign-In failed.')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr,0.9fr] bg-cream dark:bg-[#0B1712]">

      {/* ── Left Illustration Panel ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden bg-moss-700 px-14 py-10 text-white">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="barcode-rule h-full w-full text-white" style={{ backgroundSize: '8px 100%' }} />
        </div>

        {/* Decorative orbs */}
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-leaf/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-moss-900/40 blur-3xl pointer-events-none" />

        {/* Floating food product mock UI cards */}
        <div className="absolute top-28 right-12 w-52 glass !bg-white/10 !border-white/15 rounded-xl2 p-4 float shadow-soft">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🥣</span>
            <div>
              <p className="font-medium text-sm">Masala Oats</p>
              <p className="text-[11px] text-white/60">FieldFresh · 340 kcal</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full">78 · Healthy ✓</span>
            <span className="text-[10px] text-white/50">High Fibre</span>
          </div>
        </div>

        <div className="absolute bottom-48 right-8 w-44 glass !bg-white/10 !border-white/15 rounded-xl2 p-3.5 float-delay shadow-soft">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🥛</span>
            <div>
              <p className="font-medium text-[13px]">Almond Milk</p>
              <p className="text-[10px] text-white/60">PureLeaf · 60 kcal</p>
            </div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-4/5 rounded-full bg-leaf-light" />
          </div>
          <p className="text-[10px] text-leaf-light mt-1.5">Score: 80/100</p>
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Leaf size={20} className="text-leaf-light" />
          </div>
          <div className="leading-tight">
            <p className="font-display font-semibold text-xl">Foodie AI</p>
            <p className="text-[10px] uppercase tracking-widest text-white/40">Nutrition Assistant</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative max-w-md">
          <p className="font-display text-[2.6rem] leading-[1.1] font-medium">
            Scan the label.<br />
            <span className="text-leaf-light">Skip the guesswork.</span>
          </p>
          <p className="text-white/60 mt-5 text-[15px] leading-relaxed">
            Foodie AI reads the barcode, breaks down the nutrition panel, and tells you — in plain language — whether it belongs in your cart.
          </p>

          {/* Feature chips */}
          <div className="mt-8 flex flex-col gap-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 glass !bg-white/8 !border-white/10 rounded-xl p-3.5">
                <div className="h-9 w-9 rounded-lg bg-leaf-light/20 flex items-center justify-center shrink-0">
                  <Icon size={17} className="text-leaf-light" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-[11px] text-white/50">{desc}</p>
                </div>
                <ChevronRight size={14} className="ml-auto text-white/30" />
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="font-display font-semibold text-2xl text-leaf-light">{value}</p>
                <p className="text-[11px] text-white/50 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/30">© 2026 Foodie AI · Powered by MongoDB & Gemini AI</p>
      </div>

      {/* ── Right Form Panel ─────────────────────────────────────── */}
      <div className="flex items-center justify-center px-6 py-12 relative">
        {/* Subtle bg orb */}
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-leaf/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm relative fade-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="h-10 w-10 rounded-xl bg-moss-700 flex items-center justify-center">
              <Leaf size={19} className="text-leaf-light" />
            </div>
            <div>
              <p className="font-display font-semibold text-lg text-moss-700 dark:text-white">Foodie AI</p>
              <p className="text-[10px] uppercase tracking-widest text-ink/40 dark:text-white/30">Nutrition Assistant</p>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-moss-50 dark:bg-white/5 rounded-xl mb-8">
            {['signin', 'signup'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all ${
                  mode === m
                    ? 'bg-white dark:bg-white/10 text-ink dark:text-white shadow-sm'
                    : 'text-ink/50 dark:text-white/40 hover:text-ink/70 dark:hover:text-white/60'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <h1 className="font-display text-2xl font-medium text-ink dark:text-white">
            {mode === 'signin' ? 'Welcome back 👋' : 'Join Foodie AI'}
          </h1>
          <p className="text-sm text-ink/50 dark:text-white/40 mt-1.5">
            {mode === 'signin'
              ? 'Sign in to continue to your dashboard.'
              : 'Start scanning smarter in under a minute.'}
          </p>

          {error && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-clay/10 border border-clay/20 text-clay text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="mt-6 flex flex-col gap-4">
            {mode === 'signup' && (
              <label className="block">
                <span className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide">Full Name</span>
                <div className="mt-1.5 flex items-center gap-2.5 bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-xl px-3.5 py-3 focus-within:ring-2 focus-within:ring-leaf transition-shadow">
                  <span className="text-ink/30">👤</span>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ananya Rao"
                    className="bg-transparent outline-none text-sm w-full text-ink dark:text-white placeholder:text-ink/30"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide">Email</span>
              <div className="mt-1.5 flex items-center gap-2.5 bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-xl px-3.5 py-3 focus-within:ring-2 focus-within:ring-leaf transition-shadow">
                <Mail size={16} className="text-ink/30 shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-transparent outline-none text-sm w-full text-ink dark:text-white placeholder:text-ink/30"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide">Password</span>
              <div className="mt-1.5 flex items-center gap-2.5 bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-xl px-3.5 py-3 focus-within:ring-2 focus-within:ring-leaf transition-shadow">
                <Lock size={16} className="text-ink/30 shrink-0" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent outline-none text-sm w-full text-ink dark:text-white placeholder:text-ink/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="text-ink/30 hover:text-ink/60 transition-colors focus-ring"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="mt-1 flex items-center justify-center gap-2 bg-moss-700 hover:bg-moss-600 disabled:opacity-70 text-white font-semibold text-sm rounded-xl py-3.5 transition-all focus-ring shadow-soft"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="flex items-center gap-3 my-1">
              <span className="h-px flex-1 bg-moss-100 dark:bg-white/10" />
              <span className="text-xs text-ink/30 dark:text-white/30">or continue with</span>
              <span className="h-px flex-1 bg-moss-100 dark:bg-white/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="flex items-center justify-center gap-2.5 border border-moss-100 dark:border-white/10 rounded-xl py-3 text-sm font-medium text-ink/70 dark:text-white/70 hover:bg-mint-tint dark:hover:bg-white/5 transition-colors focus-ring disabled:opacity-50"
            >
              {googleLoading ? (
                <span className="h-4 w-4 border-2 border-moss-700/30 border-t-moss-700 rounded-full animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5z" />
                  <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 6.1 29.5 3 24 3 16.1 3 9.3 7.6 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 45c5.4 0 10.3-1.8 14-5l-6.5-5.4c-2 1.4-4.6 2.4-7.5 2.4-5.4 0-9.9-3.4-11.5-8.2l-6.6 5.1C9.2 40.3 16 45 24 45z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 3-3.1 5.4-5.8 6.9l6.5 5.4c-.5.4 7-5.1 7-16.3 0-1.4-.1-2.4-.4-3.5z" />
                </svg>
              )}
              Continue with Google
            </button>
          </form>

          <p className="text-center text-sm text-ink/50 dark:text-white/40 mt-8">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}
              className="font-semibold text-leaf-dark hover:underline"
            >
              {mode === 'signin' ? 'Create account' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
