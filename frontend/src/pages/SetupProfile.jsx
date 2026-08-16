import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Leaf, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { useApp } from '../store.jsx'
import { updateUserProfile } from '../services/auth'

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Non-Vegetarian', 'Eggetarian', 
  'Pescatarian', 'Gluten-Free', 'Dairy-Free', 'No Preference'
]

const GOAL_OPTIONS = [
  'Weight Loss', 'Weight Gain', 'Maintain Weight', 
  'Build Muscle', 'Improve General Nutrition', 'Healthy Eating'
]

function InputField({ label, value, onChange, type = 'number', suffix, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide">{label}</span>
      <div className="mt-1.5 flex items-center bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-xl px-3.5 py-3 focus-within:ring-2 focus-within:ring-leaf transition-shadow">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="bg-transparent outline-none text-sm flex-1 text-ink dark:text-white"
        />
        {suffix && <span className="text-xs text-ink/40 dark:text-white/35 shrink-0 ml-2">{suffix}</span>}
      </div>
    </label>
  )
}

export default function SetupProfile() {
  const { user, profile, setProfile, isAuthed, logout } = useApp()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    age: '',
    height: '',
    weight: '',
    calorieGoal: '',
    dietaryPreferences: [],
    goals: []
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAuthed) {
      navigate('/')
    }
  }, [isAuthed, navigate])

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setError('')
  }

  const toggleArrayItem = (key, item) => {
    setForm((f) => {
      const arr = f[key]
      if (key === 'dietaryPreferences' && item === 'No Preference') {
        return { ...f, [key]: ['No Preference'] }
      }
      
      let newArr = arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]
      
      if (key === 'dietaryPreferences' && item !== 'No Preference') {
        newArr = newArr.filter(i => i !== 'No Preference')
      }
      return { ...f, [key]: newArr }
    })
    setError('')
  }

  const handleBackToLogin = async () => {
    try {
      await logout()
    } catch {
      // ignore
    }
    navigate('/')
  }

  const handleSkip = () => {
    navigate('/dashboard')
  }

  const handleSave = async () => {
    // Validation
    const age = Number(form.age)
    const height = Number(form.height)
    const weight = Number(form.weight)
    const calorieGoal = Number(form.calorieGoal)

    if (!form.age) return setError('Please enter your age.')
    if (age <= 0 || age > 120) return setError('Please enter a valid age.')
    if (!form.height) return setError('Please enter your height.')
    if (height <= 0 || height > 300) return setError('Please enter a valid height.')
    if (!form.weight) return setError('Please enter your weight.')
    if (weight <= 0 || weight > 500) return setError('Please enter a valid weight.')
    if (!form.calorieGoal) return setError('Please enter your daily calorie goal.')
    if (calorieGoal <= 0 || calorieGoal > 10000) return setError('Please enter a valid daily calorie goal.')
    
    if (form.dietaryPreferences.length === 0) return setError('Please select at least one dietary preference.')
    if (form.goals.length === 0) return setError('Please select at least one goal.')

    if (!user) return setError('User not authenticated.')

    setSaving(true)
    setError('')

    try {
      const profileData = {
        age,
        height,
        weight,
        calorieGoal,
        dietaryPreferences: form.dietaryPreferences,
        goals: form.goals,
        profileCompleted: true
      }

      await updateUserProfile({
        displayName: user.displayName || '',
        profile: profileData
      })

      // Update global store so subsequent pages know it's completed
      setProfile((prev) => ({ ...prev, ...profileData }))
      
      navigate('/profile')
    } catch (err) {
      console.error(err)
      setError('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-6 bg-cream dark:bg-[#0B1712]">
      <div className="w-full max-w-xl relative fade-in-up">
        {/* Top Header with Back to Login & Skip */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink/70 dark:text-white/70 hover:text-moss-700 dark:hover:text-leaf-light bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-xl px-3.5 py-2 transition-all focus-ring shadow-xs"
          >
            <ArrowLeft size={14} />
            Back to Login
          </button>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-moss-700 flex items-center justify-center">
              <Leaf size={16} className="text-leaf-light" />
            </div>
            <span className="font-display font-semibold text-base text-moss-700 dark:text-white hidden sm:inline">Foodie AI</span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-semibold text-leaf-dark dark:text-leaf-light hover:underline py-1"
          >
            Skip for now →
          </button>
        </div>

        <div className="bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-soft">
          <h1 className="font-display text-2xl font-medium text-ink dark:text-white text-center">
            Complete Your Nutrition Profile
          </h1>
          <p className="text-sm text-ink/50 dark:text-white/40 mt-2 text-center mb-8">
            Tell us a little about yourself to personalize your nutrition experience.
          </p>

          {error && (
            <div className="mb-6 flex items-center gap-2 p-3 rounded-xl bg-clay/10 border border-clay/20 text-clay text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-5 mb-8">
            <InputField 
              label="Age" 
              value={form.age} 
              onChange={(e) => update('age', e.target.value)} 
              suffix="years" 
              placeholder="e.g. 27"
            />
            <InputField 
              label="Height" 
              value={form.height} 
              onChange={(e) => update('height', e.target.value)} 
              suffix="cm" 
              placeholder="e.g. 165"
            />
            <InputField 
              label="Weight" 
              value={form.weight} 
              onChange={(e) => update('weight', e.target.value)} 
              suffix="kg" 
              placeholder="e.g. 60"
            />
            <InputField 
              label="Daily Calorie Goal" 
              value={form.calorieGoal} 
              onChange={(e) => update('calorieGoal', e.target.value)} 
              suffix="kcal/day" 
              placeholder="e.g. 2100"
            />
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-ink dark:text-white mb-3">Dietary Preferences</h3>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleArrayItem('dietaryPreferences', opt)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full border transition-all focus-ring ${
                    form.dietaryPreferences.includes(opt)
                      ? 'bg-leaf-light/20 border-leaf text-leaf-dark dark:text-leaf-light'
                      : 'border-moss-100 dark:border-white/10 text-ink/60 dark:text-white/50 hover:border-leaf/40'
                  }`}
                >
                  {opt}
                  {form.dietaryPreferences.includes(opt) && <Check size={12} className="ml-0.5" />}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-ink dark:text-white mb-3">Goals</h3>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleArrayItem('goals', opt)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full border transition-all focus-ring ${
                    form.goals.includes(opt)
                      ? 'bg-leaf-light/20 border-leaf text-leaf-dark dark:text-leaf-light'
                      : 'border-moss-100 dark:border-white/10 text-ink/60 dark:text-white/50 hover:border-leaf/40'
                  }`}
                >
                  {opt}
                  {form.goals.includes(opt) && <Check size={12} className="ml-0.5" />}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-moss-700 hover:bg-moss-600 disabled:opacity-70 text-white font-semibold text-sm rounded-xl py-3.5 transition-all focus-ring shadow-soft"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving Profile…
              </>
            ) : (
              'Save & Continue'
            )}
          </button>

          {/* Bottom helper actions */}
          <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-moss-100 dark:border-white/10">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-xs text-ink/50 dark:text-white/40 hover:text-ink dark:hover:text-white transition-colors"
            >
              ← Back to Login
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs text-leaf-dark dark:text-leaf-light hover:underline font-medium"
            >
              Skip to Dashboard →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
