import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Leaf, Mail, Lock, ScanBarcode, ShieldCheck, Sparkles, Eye, EyeOff, ArrowRight, ChevronRight, AlertCircle, Settings as SettingsIcon, Wifi, Check, X, Server } from 'lucide-react'
import { useApp } from '../store.jsx'
import { loginWithEmail, signupWithEmail, loginWithGoogle } from '../services/auth'
import { getApiBaseUrl, setCustomApiBaseUrl } from '../services/api'

import AnimatedBackground from '../components/AnimatedBackground.jsx'
import ScrollReveal from '../components/ScrollReveal.jsx'

import { useLanguage } from '../context/LanguageContext.jsx'

const FEATURES = [
  { icon: ScanBarcode, labelKey: 'instant_barcode_scan', descKey: 'scan_packaged_food', fallbackLabel: 'Instant Barcode Scan', fallbackDesc: 'Scan any packaged food in seconds' },
  { icon: Sparkles, labelKey: 'ai_health_insights', descKey: 'ai_health_insights_desc', fallbackLabel: 'AI Health Insights', fallbackDesc: 'Personalised nutrition explanations' },
  { icon: ShieldCheck, labelKey: 'allergen_detection', descKey: 'allergen_alerts', fallbackLabel: 'Allergen Detection', fallbackDesc: 'Instant alerts for your triggers' }
]

const STATS = [
  { value: '2.4M+', labelKey: 'products_indexed', fallbackLabel: 'Products Indexed' },
  { value: '98%', labelKey: 'scan_accuracy', fallbackLabel: 'Scan Accuracy' },
  { value: '180+', labelKey: 'countries', fallbackLabel: 'Countries' }
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
  const [showServerModal, setShowServerModal] = useState(false)
  const [serverUrlInput, setServerUrlInput] = useState(() => getApiBaseUrl())
  const [serverTestStatus, setServerTestStatus] = useState(null) // null | 'testing' | 'ok' | 'error'

  const navigate = useNavigate()
  const { isAuthed, profile, authLoading, setUser, setProfile } = useApp()
  const { t } = useLanguage()

  const handleTestServer = async (urlToTest) => {
    setServerTestStatus('testing')
    try {
      const clean = (urlToTest || serverUrlInput).trim().replace(/\/+$/, '')
      const res = await fetch(`${clean}/health`, { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        setServerTestStatus('ok')
      } else {
        setServerTestStatus('error')
      }
    } catch (e) {
      setServerTestStatus('error')
    }
  }

  const handleSaveServerUrl = () => {
    setCustomApiBaseUrl(serverUrlInput)
    setShowServerModal(false)
    setError('')
  }

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

  const handleGuestSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      let loggedUser = null
      try {
        loggedUser = await loginWithEmail('demo@foodieai.com', 'demo1234')
      } catch (loginErr) {
        console.log('Demo account not found, creating it automatically...')
        loggedUser = await signupWithEmail('demo@foodieai.com', 'demo1234', 'Guest Explorer')
      }

      if (loggedUser) {
        setUser(loggedUser)
        if (loggedUser.profile) {
          setProfile(loggedUser.profile)
        }
        navigate('/dashboard')
      }
    } catch (err) {
      console.error('Demo auth failed:', err)
      setError('Could not start demo session. Please try regular login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AnimatedBackground />
      <div className="min-h-screen grid lg:grid-cols-[1.1fr,0.9fr] bg-transparent">

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
            <p className="text-[10px] uppercase tracking-widest text-white/40">{t('nutrition_assistant') || 'Nutrition Assistant'}</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative max-w-md">
          <p className="font-display text-[2.6rem] leading-[1.1] font-medium">
            {t('scan_the_label') || 'Scan the label.'}<br />
            <span className="text-leaf-light">{t('skip_guesswork') || 'Skip the guesswork.'}</span>
          </p>
          <p className="text-white/60 mt-5 text-[15px] leading-relaxed">
            {t('foodie_ai_desc') || 'Foodie AI reads the barcode, breaks down the nutrition panel, and tells you — in plain language — whether it belongs in your cart.'}
          </p>

          {/* Feature chips */}
          <div className="mt-8 flex flex-col gap-3">
            {FEATURES.map(({ icon: Icon, labelKey, descKey, fallbackLabel, fallbackDesc }) => (
              <div key={labelKey} className="flex items-center gap-3 glass !bg-white/8 !border-white/10 rounded-xl p-3.5">
                <div className="h-9 w-9 rounded-lg bg-leaf-light/20 flex items-center justify-center shrink-0">
                  <Icon size={17} className="text-leaf-light" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t(labelKey) || fallbackLabel}</p>
                  <p className="text-[11px] text-white/50">{t(descKey) || fallbackDesc}</p>
                </div>
                <ChevronRight size={14} className="ml-auto text-white/30" />
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {STATS.map(({ value, labelKey, fallbackLabel }) => (
              <div key={labelKey} className="text-center">
                <p className="font-display font-semibold text-2xl text-leaf-light">{value}</p>
                <p className="text-[11px] text-white/50 mt-0.5">{t(labelKey) || fallbackLabel}</p>
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

        <ScrollReveal delay={0.1}>
          <div className="w-full max-w-sm relative">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
            <div className="h-10 w-10 rounded-xl bg-moss-700 flex items-center justify-center">
              <Leaf size={19} className="text-leaf-light" />
            </div>
            <div>
              <p className="font-display font-semibold text-lg text-moss-700 dark:text-white">Foodie AI</p>
              <p className="text-[10px] uppercase tracking-widest text-ink/40 dark:text-white/30">Nutrition Assistant</p>
            </div>
          </div>

          {/* Mobile onboarding/features helper */}
          <div className="lg:hidden mb-6 bg-moss-50 dark:bg-white/5 border border-moss-100/50 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2.5">
            <p className="text-[10px] font-bold text-moss-700 dark:text-leaf-light uppercase tracking-wider">{t('how_it_works') || 'How it works'}</p>
            <div className="grid grid-cols-3 gap-2">
              {FEATURES.map(({ icon: Icon, labelKey, fallbackLabel }) => (
                <div key={labelKey} className="flex flex-col items-center text-center p-2 rounded-xl bg-white dark:bg-white/5 border border-moss-100 dark:border-white/5 shadow-xs">
                  <div className="h-7 w-7 rounded-lg bg-leaf-light/15 flex items-center justify-center mb-1">
                    <Icon size={14} className="text-leaf-dark dark:text-leaf-light" />
                  </div>
                  <span className="text-[9px] font-semibold text-ink/70 dark:text-white/70 leading-tight">{t(labelKey) || fallbackLabel}</span>
                </div>
              ))}
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
                {m === 'signin' ? (t('sign_in') || 'Sign In') : (t('create_account') || 'Create Account')}
              </button>
            ))}
          </div>

          {/* Server Config Button */}
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => {
                setShowServerModal(true)
                setServerUrlInput(getApiBaseUrl())
                setServerTestStatus(null)
              }}
              className="px-2.5 py-1.5 rounded-lg border border-moss-100 dark:border-white/10 text-[11px] text-ink/50 dark:text-white/40 hover:text-moss-700 dark:hover:text-leaf-light hover:bg-moss-50 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors focus-ring"
            >
              <Server size={13} />
              <span className="font-mono">{getApiBaseUrl().replace('http://', '').replace('/api', '')}</span>
              <SettingsIcon size={12} className="opacity-60" />
            </button>
          </div>

          <h1 className="font-display text-2xl font-medium text-ink dark:text-white">
            {mode === 'signin' ? (t('welcome_back') || 'Welcome back 👋') : (t('join_foodie_ai') || 'Join Foodie AI')}
          </h1>
          <p className="text-sm text-ink/50 dark:text-white/40 mt-1.5">
            {mode === 'signin'
              ? (t('sign_in_desc') || 'Sign in to continue to your dashboard.')
              : (t('start_scanning_smarter') || 'Start scanning smarter in under a minute.')}
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-clay/10 border border-clay/20 text-clay text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
              {(error.toLowerCase().includes('failed to fetch') || error.toLowerCase().includes('network') || error.toLowerCase().includes('auth failed')) && (
                <div className="pt-1.5 border-t border-clay/20 flex items-center justify-between text-[11px]">
                  <span>Server unreachable over network.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowServerModal(true)
                      setServerUrlInput(getApiBaseUrl())
                      setServerTestStatus(null)
                    }}
                    className="font-bold underline text-moss-700 dark:text-leaf-light ml-2"
                  >
                    ⚙️ Check Server IP
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="mt-6 flex flex-col gap-4">
            {mode === 'signup' && (
              <label className="block">
                <span className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide">{t('full_name') || 'Full Name'}</span>
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
              <span className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide">{t('email') || 'Email'}</span>
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
              <span className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide">{t('password') || 'Password'}</span>
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
                  {mode === 'signin' ? (t('signing_in') || 'Signing in…') : (t('creating_account') || 'Creating account…')}
                </>
              ) : (
                <>
                  {mode === 'signin' ? (t('sign_in') || 'Sign In') : (t('create_account') || 'Create Account')}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="flex items-center gap-3 my-1">
              <span className="h-px flex-1 bg-moss-100 dark:bg-white/10" />
              <span className="text-xs text-ink/30 dark:text-white/30">{t('or_continue_with') || 'or continue with'}</span>
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
              {t('continue_with_google') || 'Continue with Google'}
            </button>

            <button
              type="button"
              onClick={handleGuestSignIn}
              disabled={loading || googleLoading}
              className="flex items-center justify-center gap-2.5 bg-mint-tint dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-xl py-3 text-sm font-semibold text-leaf-dark dark:text-leaf-light hover:bg-leaf-light/10 transition-colors focus-ring disabled:opacity-50"
            >
              {t('explore_as_guest') || '🚀 Explore as Guest (Try Demo)'}
            </button>
          </form>

          <p className="text-center text-sm text-ink/50 dark:text-white/40 mt-8">
            {mode === 'signin' ? (t('dont_have_account') || "Don't have an account? ") : (t('already_have_account') || 'Already have an account? ')}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}
              className="font-semibold text-leaf-dark hover:underline"
            >
              {mode === 'signin' ? (t('create_account') || 'Create account') : (t('sign_in') || 'Sign in')}
            </button>
          </p>
          </div>
        </ScrollReveal>
      </div>

      {/* ── Server Settings Modal ─────────────────────────────────── */}
      {showServerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cream dark:bg-[#0E1A14] border border-moss-100 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-glow fade-in-up">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-moss-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Server className="text-leaf" size={20} />
                <h3 className="font-display font-semibold text-lg text-ink dark:text-white">Backend Server IP / URL</h3>
              </div>
              <button onClick={() => setShowServerModal(false)} className="text-ink/40 hover:text-ink dark:text-white/40">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-ink/70 dark:text-white/70 mb-2.5 leading-relaxed">
              Connect via <strong>Live Cloud Tunnel</strong> (works on mobile data 4G/5G anywhere) or <strong>Local Wi-Fi IP</strong>:
            </p>

            {/* Quick-fill preset buttons */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                type="button"
                onClick={() => {
                  setServerUrlInput('https://foodie-ai-website-0ghh.onrender.com/api')
                  handleTestServer('https://foodie-ai-website-0ghh.onrender.com/api')
                }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-leaf/10 text-leaf-dark dark:text-leaf-light border border-leaf/20 hover:bg-leaf/20 transition-colors"
              >
                ☁️ Render Cloud (24/7 Global)
              </button>
              <button
                type="button"
                onClick={() => {
                  setServerUrlInput('https://newspapers-thoroughly-english-physics.trycloudflare.com/api')
                  handleTestServer('https://newspapers-thoroughly-english-physics.trycloudflare.com/api')
                }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-moss-50 dark:bg-white/5 text-ink/60 dark:text-white/60 border border-moss-100 dark:border-white/10 hover:bg-mint-tint"
              >
                ⚡ Cloudflare Tunnel
              </button>
              <button
                type="button"
                onClick={() => {
                  setServerUrlInput('http://172.30.135.135:5000/api')
                  handleTestServer('http://172.30.135.135:5000/api')
                }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-moss-50 dark:bg-white/5 text-ink/60 dark:text-white/60 border border-moss-100 dark:border-white/10 hover:bg-mint-tint"
              >
                📶 Local Wi-Fi
              </button>
            </div>

            <label className="block mb-3">
              <span className="text-[11px] font-semibold text-ink/50 dark:text-white/40 uppercase">Server API Endpoint</span>
              <input
                type="text"
                value={serverUrlInput}
                onChange={(e) => {
                  setServerUrlInput(e.target.value)
                  setServerTestStatus(null)
                }}
                placeholder="https://foodie-ai-website-0ghh.onrender.com/api"
                className="input-base font-mono text-xs w-full mt-1"
              />
            </label>

            {/* Test connection results */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => handleTestServer(serverUrlInput)}
                disabled={serverTestStatus === 'testing'}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-moss-100 dark:border-white/10 hover:bg-mint-tint dark:hover:bg-white/5 flex items-center gap-1.5 focus-ring"
              >
                <Wifi size={13} className="text-leaf" />
                {serverTestStatus === 'testing' ? 'Testing connection...' : 'Test Connection'}
              </button>

              {serverTestStatus === 'ok' && (
                <span className="text-xs font-bold text-leaf flex items-center gap-1">
                  <Check size={14} /> Server Online (200 OK)
                </span>
              )}
              {serverTestStatus === 'error' && (
                <span className="text-xs font-bold text-clay flex items-center gap-1">
                  <X size={14} /> Unreachable
                </span>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-moss-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setCustomApiBaseUrl(null)
                  setServerUrlInput(getApiBaseUrl())
                  setShowServerModal(false)
                }}
                className="btn-secondary text-xs px-3.5 py-2"
              >
                Reset Default
              </button>
              <button
                type="button"
                onClick={handleSaveServerUrl}
                className="btn-primary text-xs px-4 py-2"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
