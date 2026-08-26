import React, { useState } from 'react'
import { Moon, Sun, Bell, Shield, LogOut, Palette, Globe, ChevronRight, User, Lock, Download, Trash2, Check, AlertCircle, Volume2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { useApp } from '../store.jsx'
import { changeUserPassword, deleteUserAccount, updateUserProfile } from '../services/auth'
import { useLanguage } from '../context/LanguageContext.jsx'

function Toggle({ checked, id }) {
  return (
    <div
      id={id}
      className={`h-6 w-11 rounded-full flex items-center px-0.5 transition-all shrink-0 ${
        checked ? 'bg-moss-700 justify-end' : 'bg-moss-100 dark:bg-white/10 justify-start'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow transition-all" />
    </div>
  )
}

function SettingsRow({ icon: Icon, title, desc, right, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 rounded-xl hover:bg-mint-tint dark:hover:bg-white/5 focus-ring transition-colors text-left ${
        danger ? 'hover:bg-clay/5 dark:hover:bg-clay/10' : ''
      }`}
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
        danger
          ? 'bg-clay/10 text-clay'
          : 'bg-mint-tint dark:bg-white/5 text-moss-700 dark:text-leaf-light'
      }`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${danger ? 'text-clay' : 'text-ink dark:text-white/90'}`}>{title}</p>
        {desc && <p className="text-xs text-ink/40 dark:text-white/35 mt-0.5">{desc}</p>}
      </div>
      {right ?? <ChevronRight size={16} className="text-ink/25 dark:text-white/20 shrink-0" />}
    </button>
  )
}

export default function Settings() {
  const { theme, toggleTheme, voiceEnabled, toggleVoice, logout, userName, user, setUser, scanHistory, clearScanHistory } = useApp()
  const { language, changeLanguage, t } = useLanguage()
  const navigate = useNavigate()
  
  const [notifs, setNotifs] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(true)
  const [saveHistoryToggle, setSaveHistoryToggle] = useState(true)
  
  const [nameInput, setNameInput] = useState(userName)
  const [nameSaved, setNameSaved] = useState(false)

  const [passModalOpen, setPassModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passStatus, setPassStatus] = useState('')

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
        clearScanHistory()
        await deleteUserAccount()
        navigate('/')
      } catch (err) {
        alert(err.message || 'Could not delete account.')
      }
    }
  }

  return (
    <AppShell title={t('settings_title')}>
      <div className="max-w-lg flex flex-col gap-4 fade-in-up">

        {/* Account */}
        <div className="glass-panel overflow-hidden">
          <p className="text-[11px] font-bold text-ink/40 dark:text-white/30 uppercase tracking-widest px-4 pt-4 pb-2">Account</p>
          <div className="px-4 pb-4">
            <label className="block">
              <span className="text-xs font-semibold text-ink/50 dark:text-white/40">Display name</span>
              <div className="flex gap-2 mt-1.5">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="flex-1 input-base"
                  placeholder="Your name"
                />
                <button
                  onClick={saveName}
                  className={`px-4 rounded-xl text-sm font-semibold focus-ring transition-all ${
                    nameSaved ? 'bg-leaf text-white' : 'bg-moss-700 hover:bg-moss-600 text-white'
                  }`}
                >
                  {nameSaved ? '✓' : 'Save'}
                </button>
              </div>
            </label>
          </div>
          <div className="border-t border-moss-100/70 dark:border-white/8">
            <SettingsRow icon={User}  title="Edit Profile"  desc="Update your nutrition profile and goals" onClick={() => navigate('/profile')} />
            <SettingsRow icon={Lock}  title="Change Password" desc="Update your account password" onClick={() => setPassModalOpen(true)} />
          </div>
        </div>

        {/* Appearance & Accessibility */}
        <div className="glass-panel overflow-hidden">
          <p className="text-[11px] font-bold text-ink/40 dark:text-white/30 uppercase tracking-widest px-4 pt-4 pb-1">{t('app_preferences')}</p>
          
          <div className="p-4 border-b border-moss-100/70 dark:border-white/8">
            <label className="block">
              <span className="text-xs font-semibold text-ink/50 dark:text-white/40">{t('app_language')}</span>
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="mt-1.5 w-full input-base"
              >
                <option value="en">English</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="ml">Malayalam (മലയാളം)</option>
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
              </select>
            </label>
          </div>

          <SettingsRow
            icon={theme === 'light' ? Moon : Sun}
            title={t('dark_mode')}
            desc="Easier on the eyes at night"
            onClick={toggleTheme}
            right={<Toggle checked={theme === 'dark'} onChange={toggleTheme} id="dark-mode-toggle" />}
          />
          <SettingsRow
            icon={Volume2}
            title={t('voice_ai')}
            desc={t('voice_feedback_desc')}
            onClick={toggleVoice}
            right={<Toggle checked={voiceEnabled} onChange={toggleVoice} id="voice-toggle" />}
          />
        </div>

        {/* Notifications */}
        <div className="glass-panel overflow-hidden">
          <p className="text-[11px] font-bold text-ink/40 dark:text-white/30 uppercase tracking-widest px-4 pt-4 pb-1">Notifications</p>
          <SettingsRow
            icon={Bell}
            title="Push Notifications"
            desc="Scan reminders and product alerts"
            onClick={() => setNotifs((n) => !n)}
            right={<Toggle checked={notifs} onChange={() => setNotifs((n) => !n)} id="notif-toggle" />}
          />
          <SettingsRow
            icon={Globe}
            title="Weekly Health Report"
            desc="Summary of your weekly scan activity"
            onClick={() => setWeeklyReport((n) => !n)}
            right={<Toggle checked={weeklyReport} onChange={() => setWeeklyReport((n) => !n)} id="weekly-toggle" />}
          />
        </div>

        {/* Privacy */}
        <div className="glass-panel overflow-hidden">
          <p className="text-[11px] font-bold text-ink/40 dark:text-white/30 uppercase tracking-widest px-4 pt-4 pb-1">Privacy & Data</p>
          <SettingsRow
            icon={Shield}
            title="Scan History Tracking"
            desc="Save scanned products to local history"
            onClick={() => setSaveHistoryToggle((n) => !n)}
            right={<Toggle checked={saveHistoryToggle} onChange={() => setSaveHistoryToggle((n) => !n)} id="history-toggle" />}
          />

          <SettingsRow
            icon={Trash2}
            title="Delete Account"
            desc="Permanently remove your account and data"
            onClick={handleDeleteAccount}
            danger
          />
        </div>

        {/* Version info */}
        <div className="glass-panel p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-moss-700 flex items-center justify-center">
              <span className="text-leaf-light font-display font-bold text-sm">F</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink dark:text-white/90">Foodie AI</p>
              <p className="text-[11px] text-ink/40 dark:text-white/35">Version 2.0.0 · MongoDB & Gemini Enabled</p>
            </div>
          </div>
          <span className="text-[11px] bg-leaf/10 text-leaf-dark dark:text-leaf-light px-2.5 py-1 rounded-full font-semibold">Up to date</span>
        </div>

        {/* Log out */}
        <SettingsRow
          icon={LogOut}
          title={t('logout')}
          desc="Sign out of your Foodie AI account"
          danger
          onClick={async () => { await logout() }}
          right={null}
        />
      </div>

      {/* Password Modal */}
      {passModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12211A] rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="font-display font-semibold text-lg text-ink dark:text-white mb-2">Change Password</h3>
            <p className="text-xs text-ink/50 dark:text-white/40 mb-4">Enter a new password for your account.</p>
            <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
              <input
                type="password"
                required
                placeholder="New password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-base"
              />
              {passStatus && (
                <p className={`text-xs ${passStatus.includes('Success') ? 'text-leaf-dark font-semibold' : 'text-clay'}`}>
                  {passStatus}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setPassModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
