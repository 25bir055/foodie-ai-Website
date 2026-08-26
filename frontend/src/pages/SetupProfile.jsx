import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Leaf, Check, AlertCircle, Loader2, ArrowLeft, Activity } from 'lucide-react'
import { useApp } from '../store.jsx'
import AllergySelector from '../components/AllergySelector'
import { getRecommendedCalories, getRecommendedWater, getRecommendedSleep } from '../utils/nutrition'
import { useLanguage } from '../context/LanguageContext.jsx'
import { updateUserProfile } from '../services/auth.js'
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say']

const ACTIVITY_LEVELS = [
  { value: 'Sedentary',         label: 'Sedentary',          desc: 'Little/no exercise',   icon: '🛋️' },
  { value: 'Lightly Active',    label: 'Lightly Active',     desc: '1–3 days/week',        icon: '🚶' },
  { value: 'Moderately Active', label: 'Moderately Active',  desc: '3–5 days/week',        icon: '🏃' },
  { value: 'Very Active',       label: 'Very Active',        desc: '6–7 days/week',        icon: '🏋️' }
]

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Non-Vegetarian', 'Eggetarian', 
  'Pescatarian', 'Gluten-Free', 'Dairy-Free', 'No Preference'
]

const GOAL_OPTIONS = [
  'Weight Loss', 'Weight Gain', 'Maintain Weight', 
  'Build Muscle', 'Improve General Nutrition', 'Healthy Eating'
]

const MEDICAL_CONDITIONS_OPTIONS = [
  'Diabetes', 'Hypertension (High Blood Pressure)', 
  'High Cholesterol', 'Thyroid', 'None'
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
  const { t } = useLanguage()

  const [form, setForm] = useState({
    age: '',
    dob: '',
    height: '',
    weight: '',
    calorieGoal: '',
    gender: '',
    activityLevel: 'Sedentary',
    waterGoal: '',
    sleepHours: '',
    dietaryPreferences: [],
    goals: [],
    allergies: [],
    medicalConditions: [],
    country: '',
    state: '',
    preferredLanguage: 'English'
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAuthed) {
      navigate('/')
    }
  }, [isAuthed, navigate])

  // Auto-calculate age from DOB
  useEffect(() => {
    if (form.dob) {
      const birthDate = new Date(form.dob)
      if (!isNaN(birthDate.getTime())) {
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        if (age > 0 && String(age) !== form.age) {
          setForm(f => ({ ...f, age: String(age) }))
        }
      }
    }
  }, [form.dob])

  // Auto-fill calorie, water, and sleep goals when age or gender changes
  useEffect(() => {
    if (form.age && form.gender) {
      const recCal = getRecommendedCalories(form.age, form.gender)
      const recWater = getRecommendedWater(form.age, form.gender)
      const recSleep = getRecommendedSleep(form.age)
      
      setForm(f => {
        let updates = {}
        if (recCal) updates.calorieGoal = String(recCal)
        if (recWater) updates.waterGoal = String(recWater)
        if (recSleep) updates.sleepHours = String(recSleep)
        
        if (Object.keys(updates).length > 0) {
          return { ...f, ...updates }
        }
        return f
      })
    }
  }, [form.age, form.gender])

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
    if (!form.gender) return setError('Please select your gender.')
    
    if (form.dietaryPreferences.length === 0) return setError('Please select at least one dietary preference.')
    if (form.goals.length === 0) return setError('Please select at least one goal.')

    if (!user) return setError('User not authenticated.')

    setSaving(true)
    setError('')

    try {
      const profileData = {
        age,
        dob: form.dob || null,
        height,
        weight,
        calorieGoal,
        gender: form.gender,
        activityLevel: form.activityLevel,
        waterGoal: form.waterGoal ? Number(form.waterGoal) : 2500,
        sleepHours: form.sleepHours ? Number(form.sleepHours) : 8,
        dietaryPreferences: form.dietaryPreferences,
        goals: form.goals,
        allergies: form.allergies,
        medicalConditions: form.medicalConditions,
        country: form.country,
        state: form.state,
        preferredLanguage: form.preferredLanguage,
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
            {t('back_to_login') || 'Back to Login'}
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
            {t('skip_for_now') || 'Skip for now →'}
          </button>
        </div>

        <div className="bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-soft">
          <h1 className="font-display text-2xl font-medium text-ink dark:text-white text-center">
            {t('complete_nutrition_profile') || 'Complete Your Nutrition Profile'}
          </h1>
          <p className="text-sm text-ink/50 dark:text-white/40 mt-2 text-center mb-8">
            {t('tell_us_about_yourself') || 'Tell us a little about yourself to personalize your nutrition experience.'}
          </p>

          {error && (
            <div className="mb-6 flex items-center gap-2 p-3 rounded-xl bg-clay/10 border border-clay/20 text-clay text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-ink dark:text-white mb-3">{t('gender') || 'Gender'}</h3>
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => update('gender', opt)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full border transition-all focus-ring ${
                    form.gender === opt
                      ? 'bg-leaf-light/20 border-leaf text-leaf-dark dark:text-leaf-light'
                      : 'border-moss-100 dark:border-white/10 text-ink/60 dark:text-white/50 hover:border-leaf/40'
                  }`}
                >
                  {t(opt.toLowerCase().replace(/ /g, '_')) || opt}
                  {form.gender === opt && <Check size={12} className="ml-0.5" />}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            <InputField 
              label={t('age') || 'Age'}
              value={form.age} 
              onChange={(e) => update('age', e.target.value)} 
              suffix={t('years') || 'years'}
              placeholder="e.g. 27"
            />
            <InputField 
              label={t('dob') || 'DOB'}
              type="date"
              value={form.dob} 
              onChange={(e) => update('dob', e.target.value)} 
            />
            <InputField 
              label={t('height') || 'Height'}
              value={form.height} 
              onChange={(e) => update('height', e.target.value)} 
              suffix={t('cm') || 'cm'}
              placeholder="e.g. 165"
            />
            <InputField 
              label={t('weight') || 'Weight'}
              value={form.weight} 
              onChange={(e) => update('weight', e.target.value)} 
              suffix={t('kg') || 'kg'}
              placeholder="e.g. 60"
            />
            <InputField 
              label={t('water_goal') || 'Water Goal'}
              value={form.waterGoal} 
              onChange={(e) => update('waterGoal', e.target.value)} 
              suffix={t('L') || 'L'}
              placeholder="e.g. 2.5"
            />
            <InputField 
              label={t('sleep') || 'Sleep'}
              value={form.sleepHours} 
              onChange={(e) => update('sleepHours', e.target.value)} 
              suffix={t('hours') || 'hours'}
              placeholder="e.g. 8"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            <InputField 
              label={t('country') || 'Country'}
              type="text"
              value={form.country} 
              onChange={(e) => update('country', e.target.value)} 
              placeholder="e.g. India"
            />
            <InputField 
              label={t('state') || 'State'}
              type="text"
              value={form.state} 
              onChange={(e) => update('state', e.target.value)} 
              placeholder="e.g. Tamil Nadu"
            />
            <InputField 
              label={t('language') || 'Language'}
              type="text"
              value={form.preferredLanguage} 
              onChange={(e) => update('preferredLanguage', e.target.value)} 
              placeholder="e.g. English"
            />
          </div>



          <div className="mb-8">
            <InputField 
              label={t('daily_calorie_goal') || 'Daily Calorie Goal (Auto-Calculated)'}
              value={form.calorieGoal} 
              onChange={(e) => update('calorieGoal', e.target.value)} 
              suffix={t('kcal_day') || 'kcal/day'}
              placeholder="e.g. 2100"
            />
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-ink dark:text-white mb-3">{t('dietary_preferences') || 'Dietary Preferences'}</h3>
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
                  {t(opt.toLowerCase().replace(/-/g, '_').replace(/ /g, '_')) || opt}
                  {form.dietaryPreferences.includes(opt) && <Check size={12} className="ml-0.5" />}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-ink dark:text-white mb-3">{t('goals') || 'Goals'}</h3>
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
                  {t(opt.toLowerCase().replace(/ /g, '_')) || opt}
                  {form.goals.includes(opt) && <Check size={12} className="ml-0.5" />}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-ink dark:text-white mb-3">{t('medical_conditions') || 'Medical Conditions'}</h3>
            <div className="flex flex-wrap gap-2">
              {MEDICAL_CONDITIONS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (opt === 'None') {
                      setForm(prev => ({ ...prev, medicalConditions: ['None'] }))
                    } else {
                      setForm(prev => {
                        const current = (prev.medicalConditions || []).filter(c => c !== 'None')
                        return { 
                          ...prev, 
                          medicalConditions: current.includes(opt) 
                            ? current.filter(c => c !== opt) 
                            : [...current, opt] 
                        }
                      })
                    }
                  }}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full border transition-all focus-ring ${
                    (form.medicalConditions || []).includes(opt)
                      ? 'bg-clay/20 border-clay text-clay-dark dark:text-clay'
                      : 'border-moss-100 dark:border-white/10 text-ink/60 dark:text-white/50 hover:border-clay/40'
                  }`}
                >
                  {opt === 'Hypertension (High Blood Pressure)' ? (t('hypertension') || opt) : (t(opt.toLowerCase().replace(/ /g, '_')) || opt)}
                  {(form.medicalConditions || []).includes(opt) && <Check size={12} className="ml-0.5" />}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-10">
            <AllergySelector 
              selectedAllergies={form.allergies} 
              onChange={(newAllergies) => update('allergies', newAllergies)} 
            />
          </div>

          <div className="mb-10">
            <h3 className="text-sm font-semibold text-ink dark:text-white mb-3 flex items-center gap-2">
              <Activity size={16} className="text-leaf" /> {t('activity_level') || 'Activity Level'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACTIVITY_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => update('activityLevel', lvl.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all focus-ring ${
                    form.activityLevel === lvl.value
                      ? 'bg-moss-700 text-white border-moss-700 shadow-soft'
                      : 'border-moss-100 dark:border-white/10 text-ink/60 dark:text-white/50 hover:bg-mint-tint dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-2xl">{lvl.icon}</span>
                  <span className="text-xs font-semibold leading-tight">{t(lvl.value.toLowerCase().replace(/ /g, '_')) || lvl.label}</span>
                  <span className={`text-[10px] ${form.activityLevel === lvl.value ? 'text-white/70' : 'text-ink/35 dark:text-white/30'}`}>{t(lvl.desc.toLowerCase().replace(/ /g, '_').replace(/[\/\–]/g, '_')) || lvl.desc}</span>
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
                {t('saving_profile') || 'Saving Profile…'}
              </>
            ) : (
              t('save_and_continue') || 'Save & Continue'
            )}
          </button>

          {/* Bottom helper actions */}
          <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-moss-100 dark:border-white/10">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-xs text-ink/50 dark:text-white/40 hover:text-ink dark:hover:text-white transition-colors"
            >
              ← {t('back_to_login') || 'Back to Login'}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs text-leaf-dark dark:text-leaf-light hover:underline font-medium"
            >
              {t('skip_to_dashboard') || 'Skip to Dashboard →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
