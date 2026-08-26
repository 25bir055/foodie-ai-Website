import React, { useState, useEffect } from 'react'
import {
  Moon, Sun, Bell, Shield, LogOut, Globe, ChevronRight,
  User, Lock, Trash2, Check, AlertCircle, Volume2,
  Server, Wifi, RefreshCw, X, Sparkles, Users, ArrowLeft
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { useApp } from '../store.jsx'
import { changeUserPassword, deleteUserAccount, updateUserProfile } from '../services/auth.js'
import { useLanguage } from '../context/LanguageContext.jsx'
import { getApiBaseUrl, setCustomApiBaseUrl } from '../services/api.js'

function ToggleSwitch({ checked, onChange, id }) {
  return (
    <button
      type="button"
      id={id}
      onClick={onChange}
      className={`h-6 w-11 rounded-full flex items-center px-0.5 transition-all shrink-0 cursor-pointer ${
        checked ? 'bg-leaf justify-end' : 'bg-moss-200 dark:bg-white/20 justify-start'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow-md transition-all" />
    </button>
  )
}

function SettingsCard({ icon: Icon, title, desc, right, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 p-4 rounded-2xl transition-all text-left border ${
        danger
          ? 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          : 'bg-white dark:bg-[#12211A] hover:bg-moss-50 dark:hover:bg-white/5 border-moss-100 dark:border-white/10 text-ink dark:text-white'
      } shadow-xs`}
    >
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
        danger
          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          : 'bg-moss-50 dark:bg-white/10 text-moss-700 dark:text-leaf-light'
      }`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-ink dark:text-white'}`}>
          {title}
        </p>
        {desc && <p className="text-xs text-ink/50 dark:text-white/40 mt-0.5 leading-snug">{desc}</p>}
      </div>
      {right ?? <ChevronRight size={18} className="text-ink/30 dark:text-white/30 shrink-0" />}
    </button>
  )
}

export default function Settings() {
  const { theme, toggleTheme, voiceEnabled, toggleVoice, logout, userName, user, setUser, clearScanHistory } = useApp()
  const { language, changeLanguage, t } = useLanguage()
  const navigate = useNavigate()

  const [notifs, setNotifs] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(true)
  const [saveHistoryToggle, setSaveHistoryToggle] = useState(true)

  const [nameInput, setNameInput] = useState(userName || '')
  const [nameSaved, setNameSaved] = useState(false)

  // Server Endpoint Management
  const [serverModalOpen, setServerModalOpen] = useState(false)
  const [serverUrlInput, setServerUrlInput] = useState(() => getApiBaseUrl())
  const [serverTestStatus, setServerTestStatus] = useState(null)
  const [activeEndpoint, setActiveEndpoint] = useState(() => getApiBaseUrl())

  // Password Modal
  const [passModalOpen, setPassModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passStatus, setPassStatus] = useState('')

  useEffect(() => {
    setNameInput(userName || '')
  }, [userName])

  const handleTestServer = async (url) => {
    setServerTestStatus('testing')
    try {
      const cleanUrl = url.trim().replace(/\/+$/, '')
      const res = await fetch(`${cleanUrl}/health`, { method: 'GET' })
      if (res.ok) {
        setServerTestStatus('ok')
      } else {
        setServerTestStatus('error')
      }
    } catch (e) {
      setServerTestStatus('error')
    }
  }

  const handleSaveServer = () => {
    if (serverUrlInput && serverUrlInput.trim()) {
      setCustomApiBaseUrl(serverUrlInput.trim())
      setActiveEndpoint(serverUrlInput.trim())
    } else {
      setCustomApiBaseUrl(null)
      setActiveEndpoint(getApiBaseUrl())
    }
    setServerModalOpen(false)
    window.location.reload()
  }

  const saveName = async () => {
    try {
      const updated = await updateUserProfile({ displayName: nameInput })
      if (setUser && updated) {
        setUser(updated)
      }
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
    } catch (err) {
      alert('Failed to update name: ' + (err.message || 'Error'))
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setPassStatus('Password must be at least 6 characters.')
      return
    }
    try {
      await changeUserPassword(newPassword)
      setPassStatus('Success! Password updated.')
      setTimeout(() => {
        setPassModalOpen(false)
        setNewPassword('')
        setPassStatus('')
      }, 1500)
    } catch (err) {
      setPassStatus(err.message || 'Failed to update password.')
    }
  }

  const handleDeleteAccount = async () => {
    if (confirm('Are you sure you want to permanently delete your Foodie AI account? This action cannot be undone.')) {
      try {
        if (clearScanHistory) clearScanHistory()
        await deleteUserAccount()
        navigate('/')
      } catch (err) {
        alert(err.message || 'Could not delete account.')
      }
    }
  }

  return (
    <AppShell title={t('settings') || 'Settings'}>
      <div className="max-w-2xl mx-auto space-y-5 pb-12">

        {/* Top Header Card */}
        <div className="glass-panel p-5 rounded-3xl border border-moss-100 dark:border-white/10 bg-white dark:bg-[#12211A] flex items-center justify-between shadow-soft">
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-moss-700 to-leaf text-white font-display font-bold text-xl flex items-center justify-center shadow-sm">
              {(userName || 'F')[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink dark:text-white">
                {userName || 'Foodie AI User'}
              </h2>
              <p className="text-xs text-ink/50 dark:text-white/40 mt-0.5">
                {user?.email || 'Logged in account'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-mint-tint dark:bg-white/10 text-moss-800 dark:text-white border border-moss-200 dark:border-white/10 hover:bg-leaf/20 transition-all shadow-xs"
          >
            {t('edit_profile') || 'Edit Profile'}
          </button>
        </div>

        {/* 🌐 SECTION 1: SERVER & CLOUD API ENDPOINT */}
        <div className="space-y-2">
          <p className="text-[11px] font-extrabold text-ink/50 dark:text-white/40 uppercase tracking-wider px-2">
            📡 Live Cloud & Server Connection
          </p>

          <div className="glass-panel p-5 rounded-3xl border-2 border-leaf/30 bg-gradient-to-br from-leaf/10 via-white/80 to-moss-50/50 dark:from-leaf/15 dark:via-[#12211A] dark:to-[#0E1A14] shadow-soft space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-leaf text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Server size={22} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-ink dark:text-white flex items-center gap-2">
                    <span>Active API Server</span>
                    <span className="text-[10px] font-extrabold bg-leaf text-white px-2 py-0.5 rounded-full">
                      Online 🟢
                    </span>
                  </h3>
                  <p className="text-xs font-mono text-moss-800 dark:text-leaf-light mt-0.5 break-all">
                    {activeEndpoint}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setServerUrlInput(getApiBaseUrl())
                  setServerTestStatus(null)
                  setServerModalOpen(true)
                }}
                className="px-3.5 py-2 rounded-xl bg-leaf text-white text-xs font-bold hover:bg-leaf-dark transition-all shadow-sm shrink-0"
              >
                Change
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-moss-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  const url = 'https://portion-handles-but-illustration.trycloudflare.com/api'
                  setCustomApiBaseUrl(url)
                  setActiveEndpoint(url)
                  handleTestServer(url)
                }}
                className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 text-moss-800 dark:text-white border border-moss-200 dark:border-white/10 hover:bg-leaf/10 shadow-xs"
              >
                ⚡ Live Cloud (High Speed)
              </button>
              <button
                type="button"
                onClick={() => handleTestServer(activeEndpoint)}
                className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 text-moss-800 dark:text-white border border-moss-200 dark:border-white/10 hover:bg-leaf/10 shadow-xs flex items-center gap-1"
              >
                <Wifi size={13} className="text-leaf" />
                {serverTestStatus === 'testing' ? 'Testing...' : serverTestStatus === 'ok' ? 'Online (200 OK) ✅' : 'Test Connection'}
              </button>
            </div>
          </div>
        </div>

        {/* 👨‍👩‍👧‍👦 SECTION 2: FAMILY PROFILES & OCR SHORTCUTS */}
        <div className="space-y-2">
          <p className="text-[11px] font-extrabold text-ink/50 dark:text-white/40 uppercase tracking-wider px-2">
            👨‍👩‍👧‍👦 Family & Features
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <SettingsCard
              icon={Users}
              title="Family Health Profiles"
              desc="Manage allergies, diseases & diets for the whole family"
              onClick={() => navigate('/family')}
            />
            <SettingsCard
              icon={Shield}
              title="Smart Prescription OCR"
              desc="Upload prescriptions & check drug-food safety"
              onClick={() => navigate('/prescription')}
            />
          </div>
        </div>

        {/* 🎨 SECTION 3: APP PREFERENCES */}
        <div className="space-y-2">
          <p className="text-[11px] font-extrabold text-ink/50 dark:text-white/40 uppercase tracking-wider px-2">
            🎨 App Preferences
          </p>

          <div className="glass-panel p-2 rounded-3xl border border-moss-100 dark:border-white/10 bg-white dark:bg-[#12211A] shadow-soft space-y-1">
            {/* Dark Mode */}
            <div className="flex items-center justify-between p-3.5 hover:bg-moss-50/50 dark:hover:bg-white/5 rounded-2xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-moss-50 dark:bg-white/10 text-moss-700 dark:text-leaf-light flex items-center justify-center shrink-0">
                  {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-ink dark:text-white">{t('dark_mode') || 'Dark Mode'}</p>
                  <p className="text-xs text-ink/50 dark:text-white/40">Easier on the eyes at night</p>
                </div>
              </div>
              <ToggleSwitch checked={theme === 'dark'} onChange={toggleTheme} id="theme-toggle-settings" />
            </div>

            {/* Voice AI */}
            <div className="flex items-center justify-between p-3.5 hover:bg-moss-50/50 dark:hover:bg-white/5 rounded-2xl transition-colors border-t border-moss-100/60 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-moss-50 dark:bg-white/10 text-moss-700 dark:text-leaf-light flex items-center justify-center shrink-0">
                  <Volume2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink dark:text-white">{t('voice_ai') || 'Voice AI Feedback'}</p>
                  <p className="text-xs text-ink/50 dark:text-white/40">Read out product safety warnings</p>
                </div>
              </div>
              <ToggleSwitch checked={voiceEnabled} onChange={toggleVoice} id="voice-toggle-settings" />
            </div>

            {/* Language Selection */}
            <div className="p-3.5 border-t border-moss-100/60 dark:border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-moss-50 dark:bg-white/10 text-moss-700 dark:text-leaf-light flex items-center justify-center shrink-0">
                  <Globe size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink dark:text-white">{t('app_language') || 'App Language'}</p>
                  <p className="text-xs text-ink/50 dark:text-white/40">Select your preferred Indian language</p>
                </div>
              </div>
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="input-base text-xs font-semibold w-full mt-1 bg-white dark:bg-white/5"
              >
                <option value="en">English</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="ml">Malayalam (മലയാളം)</option>
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 🔒 SECTION 4: SECURITY & ACCOUNT */}
        <div className="space-y-2">
          <p className="text-[11px] font-extrabold text-ink/50 dark:text-white/40 uppercase tracking-wider px-2">
            🔒 Security & Account
          </p>

          <div className="space-y-2">
            <SettingsCard
              icon={Lock}
              title="Change Password"
              desc="Update your login password securely"
              onClick={() => setPassModalOpen(true)}
            />

            <SettingsCard
              icon={LogOut}
              title={t('logout') || 'Log Out'}
              desc="Sign out of this mobile device"
              danger
              onClick={async () => { await logout() }}
            />
          </div>
        </div>

      </div>

      {/* 📡 SERVER CONFIGURATION POPUP MODAL */}
      {serverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 fade-in-up">
          <div className="bg-white dark:bg-[#12211A] rounded-3xl w-full max-w-md p-6 shadow-2xl border border-moss-100 dark:border-white/15 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-ink dark:text-white flex items-center gap-2">
                <Server size={20} className="text-leaf" />
                Backend Server Endpoint
              </h3>
              <button
                type="button"
                onClick={() => setServerModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-mint-tint dark:hover:bg-white/10 text-ink/40"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-ink/70 dark:text-white/70 leading-relaxed">
              Connect via <strong>Live Cloud</strong> or <strong>Local Wi-Fi</strong>:
            </p>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const u = 'https://portion-handles-but-illustration.trycloudflare.com/api'
                  setServerUrlInput(u)
                  handleTestServer(u)
                }}
                className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-leaf/15 text-leaf-dark dark:text-leaf-light border border-leaf/30 hover:bg-leaf/25"
              >
                ⚡ Live Cloud (High Speed)
              </button>
              <button
                type="button"
                onClick={() => {
                  const u = 'https://foodie-ai-website-0ghh.onrender.com/api'
                  setServerUrlInput(u)
                  handleTestServer(u)
                }}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-xl bg-moss-50 dark:bg-white/5 text-ink/60 dark:text-white/60 border border-moss-100 dark:border-white/10"
              >
                ☁️ Render Cloud
              </button>
            </div>

            <label className="block">
              <span className="text-[11px] font-bold text-ink/50 dark:text-white/40 uppercase">Server API URL</span>
              <input
                type="text"
                value={serverUrlInput}
                onChange={(e) => {
                  setServerUrlInput(e.target.value)
                  setServerTestStatus(null)
                }}
                placeholder="https://portion-handles-but-illustration.trycloudflare.com/api"
                className="input-base font-mono text-xs w-full mt-1.5 bg-moss-50/50 dark:bg-white/5"
              />
            </label>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => handleTestServer(serverUrlInput)}
                disabled={serverTestStatus === 'testing'}
                className="text-xs font-bold px-3.5 py-2 rounded-xl border border-moss-200 dark:border-white/10 hover:bg-moss-50 dark:hover:bg-white/10 flex items-center gap-1.5"
              >
                <Wifi size={14} className="text-leaf" />
                {serverTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
              </button>

              {serverTestStatus === 'ok' && (
                <span className="text-xs font-bold text-leaf flex items-center gap-1">
                  <Check size={15} /> Online (200 OK)
                </span>
              )}
              {serverTestStatus === 'error' && (
                <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
                  <X size={15} /> Unreachable
                </span>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-moss-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setServerModalOpen(false)}
                className="btn-secondary text-xs px-4 py-2.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveServer}
                className="btn-primary text-xs px-5 py-2.5 font-bold"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔑 CHANGE PASSWORD MODAL */}
      {passModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 fade-in-up">
          <div className="bg-white dark:bg-[#12211A] rounded-3xl w-full max-w-md p-6 shadow-2xl border border-moss-100 dark:border-white/15 space-y-4">
            <h3 className="font-display font-bold text-base text-ink dark:text-white">
              Change Password
            </h3>
            <p className="text-xs text-ink/50 dark:text-white/40">
              Enter your new account password (minimum 6 characters).
            </p>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <input
                type="password"
                required
                placeholder="New password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-base text-xs w-full"
              />
              {passStatus && (
                <p className={`text-xs ${passStatus.includes('Success') ? 'text-leaf font-bold' : 'text-rose-500'}`}>
                  {passStatus}
                </p>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setPassModalOpen(false)} className="btn-secondary text-xs px-4 py-2">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs px-4 py-2 font-bold">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
