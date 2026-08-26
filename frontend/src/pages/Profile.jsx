import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, UserCircle2, Activity, Leaf, Edit2, X, Loader2, LogOut, Settings as SettingsIcon } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import { useApp } from '../store.jsx'
import { updateUserProfile } from '../services/auth.js'
import AllergySelector from '../components/AllergySelector.jsx'
import { getRecommendedCalories, getRecommendedWater, getRecommendedSleep } from '../utils/nutrition.js'
import { useLanguage } from '../context/LanguageContext.jsx'
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

const ALLERGY_OPTIONS = [
  'Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Gluten',
  'Soy', 'Fish', 'Shellfish', 'Sesame', 'High Added Sugar', 'High Sodium'
]

function InputField({ label, value, onChange, type = 'number', suffix }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide">{label}</span>
      <div className="mt-1.5 flex items-center bg-mint-tint dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-leaf transition-shadow">
        <input
          type={type}
          value={value}
          onChange={onChange}
          className="bg-transparent outline-none text-sm flex-1 text-ink dark:text-white data-num"
        />
        {suffix && <span className="text-xs text-ink/40 dark:text-white/35 shrink-0 ml-2">{suffix}</span>}
      </div>
    </label>
  )
}

function DisplayField({ label, value }) {
  return (
    <div className="block">
      <span className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide">{label}</span>
      <div className="mt-1.5 text-sm font-medium text-ink dark:text-white data-num">
        {value || '--'}
      </div>
    </div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, profile, setProfile, userName, logout } = useApp()
  const { t } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  
  // Initialize form with profile. If it's old data (dietaryPreference as string), convert to array.
  const [form, setForm] = useState(() => {
    const prefs = profile.dietaryPreferences || (profile.dietaryPreference ? [profile.dietaryPreference] : [])
    return { ...profile, dietaryPreferences: prefs }
  })
  
  const [saving, setSaving] = useState(false)

  // Sync form when profile changes externally
  useEffect(() => {
    const prefs = profile.dietaryPreferences || (profile.dietaryPreference ? [profile.dietaryPreference] : [])
    setForm({ ...profile, dietaryPreferences: prefs })
  }, [profile])

  // Auto-calculate age from DOB while editing
  useEffect(() => {
    if (isEditing && form.dob) {
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
  }, [form.dob, isEditing])

  // Auto-fill calorie, water, and sleep goals when age or gender changes while editing
  useEffect(() => {
    if (isEditing && form.age && form.gender) {
      const recCal = getRecommendedCalories(form.age, form.gender)
      const recWater = getRecommendedWater(form.age, form.gender)
      const recSleep = getRecommendedSleep(form.age)
      
      setForm(f => {
        let updates = {}
        if (recCal && String(recCal) !== f.calorieGoal) updates.calorieGoal = String(recCal)
        if (recWater && String(recWater) !== f.waterGoal) updates.waterGoal = String(recWater)
        if (recSleep && String(recSleep) !== f.sleepHours) updates.sleepHours = String(recSleep)
        
        if (Object.keys(updates).length > 0) {
          return { ...f, ...updates }
        }
        return f
      })
    }
  }, [form.age, form.gender, isEditing])

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const toggleArrayItem = (key, item) => {
    setForm((f) => {
      const arr = f[key] || []
      if (key === 'dietaryPreferences' && item === 'No Preference') {
        return { ...f, [key]: ['No Preference'] }
      }
      
      let newArr = arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]
      
      if (key === 'dietaryPreferences' && item !== 'No Preference') {
        newArr = newArr.filter(i => i !== 'No Preference')
      }
      return { ...f, [key]: newArr }
    })
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const updatedProfile = { ...form, profileCompleted: true }
      // Remove old field if it exists
      if ('dietaryPreference' in updatedProfile) {
        delete updatedProfile.dietaryPreference
      }
      await updateUserProfile({ profile: updatedProfile })
      setProfile(updatedProfile)
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving profile:', err)
      alert('Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    const prefs = profile.dietaryPreferences || (profile.dietaryPreference ? [profile.dietaryPreference] : [])
    setForm({ ...profile, dietaryPreferences: prefs })
    setIsEditing(false)
  }

  // BMI Calculation
  const heightNum = Number(form.height)
  const weightNum = Number(form.weight)
  const bmi = heightNum > 0 ? (weightNum / ((heightNum / 100) ** 2)).toFixed(1) : '--'
  let bmiLabel = 'Normal'
  let bmiColor = 'text-leaf-dark dark:text-leaf-light'
  
  if (bmi !== '--') {
    const bmiVal = Number(bmi)
    if (bmiVal < 18.5) { bmiLabel = 'Underweight'; bmiColor = 'text-amber' }
    else if (bmiVal < 25) { bmiLabel = 'Normal'; bmiColor = 'text-leaf-dark dark:text-leaf-light' }
    else if (bmiVal < 30) { bmiLabel = 'Overweight'; bmiColor = 'text-amber' }
    else { bmiLabel = 'Obese'; bmiColor = 'text-clay' }
  }

  const displayPrefs = form.dietaryPreferences?.length > 0 ? form.dietaryPreferences.join(', ') : t('none')
  const displayGoals = form.goals?.length > 0 ? form.goals.join(', ') : t('none')

  return (
    <AppShell title={t('profile')}>
      {/* Profile header */}
      <div className="glass-panel p-5 flex items-center gap-4 mb-6 fade-in-up">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-moss-700 to-leaf flex items-center justify-center text-white font-display font-bold text-2xl shrink-0 shadow-soft">
          {userName[0]}
        </div>
        <div className="flex-1">
          <h2 className="font-display text-xl font-medium text-ink dark:text-white">{userName}</h2>
          <p className="text-sm text-ink/50 dark:text-white/40 mt-0.5">{displayPrefs} · {form.activityLevel}</p>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-ink/50 dark:text-white/40"><span className="data-num font-semibold text-ink dark:text-white">{form.calorieGoal}</span> {t('kcal')} goal</span>
            <span className="text-ink/50 dark:text-white/40">BMI: <span className={`data-num font-semibold ${bmiColor}`}>{bmi}</span> <span className={bmiColor}>({bmiLabel})</span></span>
          </div>
        </div>
        <UserCircle2 size={24} className="text-ink/20 dark:text-white/20 shrink-0" />
      </div>

      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-ink/50 dark:text-white/40">
          {t('personalize_info')}
        </p>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 text-ink dark:text-white hover:bg-moss-50 dark:hover:bg-white/10 transition-colors"
          >
            <Edit2 size={14} /> {t('edit_profile')}
          </button>
        )}
      </div>

      <div className="max-w-2xl flex flex-col gap-5 pb-8">
        {/* Basic info */}
        <div className="glass-panel p-5 sm:p-6">
          <h3 className="font-display text-base font-semibold text-ink dark:text-white mb-4 flex items-center gap-2">
            <UserCircle2 size={17} className="text-leaf" /> {t('basic_info')}
          </h3>
          {isEditing ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <InputField label={t('age')} value={form.age} onChange={(e) => update('age', e.target.value)} suffix={t('years')} />
              <InputField label={t('dob')} type="date" value={form.dob ? new Date(form.dob).toISOString().split('T')[0] : ''} onChange={(e) => update('dob', e.target.value)} />
              
              <div className="sm:col-span-2">
                <span className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide">{t('gender')}</span>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('gender', opt)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all focus-ring ${
                        form.gender === opt
                          ? 'bg-leaf-light/20 border-leaf text-leaf-dark dark:text-leaf-light'
                          : 'border-moss-100 dark:border-white/10 text-ink/50 dark:text-white/40 hover:border-leaf/40'
                      }`}
                    >
                      {opt}
                      {form.gender === opt && <Check size={11} className="ml-0.5" />}
                    </button>
                  ))}
                </div>
              </div>

              <InputField label={t('height')} value={form.height} onChange={(e) => update('height', e.target.value)} suffix={t('cm')} />
              <InputField label={t('weight')} value={form.weight} onChange={(e) => update('weight', e.target.value)} suffix={t('kg')} />
              <InputField label={t('water_goal')} value={form.waterGoal} onChange={(e) => update('waterGoal', e.target.value)} suffix={t('L') || 'L'} placeholder="e.g. 2.5" />
              <InputField label={t('sleep')} value={form.sleepHours} onChange={(e) => update('sleepHours', e.target.value)} suffix={t('hours')} />
              <InputField label={t('daily_calorie_goal')} value={form.calorieGoal} onChange={(e) => update('calorieGoal', e.target.value)} suffix={t('kcal')} />
              <InputField label={t('country')} type="text" value={form.country} onChange={(e) => update('country', e.target.value)} />
              <InputField label={t('state')} type="text" value={form.state} onChange={(e) => update('state', e.target.value)} />
              <InputField label={t('language')} type="text" value={form.preferredLanguage} onChange={(e) => update('preferredLanguage', e.target.value)} />
              

            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-y-6 gap-x-4">
              <DisplayField label={t('age')} value={form.age ? `${form.age} ${t('years')}` : ''} />
              <DisplayField label={t('dob')} value={form.dob ? new Date(form.dob).toLocaleDateString() : ''} />
              <DisplayField label={t('gender')} value={form.gender} />
              <DisplayField label={t('height')} value={form.height ? `${form.height} ${t('cm')}` : ''} />
              <DisplayField label={t('weight')} value={form.weight ? `${form.weight} ${t('kg')}` : ''} />
              <DisplayField label={t('water_goal')} value={form.waterGoal ? `${form.waterGoal} L` : ''} />
              <DisplayField label={t('sleep')} value={form.sleepHours ? `${form.sleepHours} ${t('hours')}` : ''} />
              <DisplayField label={t('daily_calorie_goal')} value={form.calorieGoal ? `${form.calorieGoal} ${t('kcal')}` : ''} />
              <DisplayField label={t('country')} value={form.country} />
              <DisplayField label={t('state')} value={form.state} />
              <DisplayField label={t('language')} value={form.preferredLanguage} />
            </div>
          )}
        </div>

        {/* Dietary preferences & Goals */}
        <div className="glass-panel p-5 sm:p-6">
          <h3 className="font-display text-base font-semibold text-ink dark:text-white mb-4 flex items-center gap-2">
            <Leaf size={17} className="text-leaf" /> {t('dietary_prefs_goals')}
          </h3>
          
          <p className="text-xs text-ink/50 dark:text-white/40 mb-3">{t('dietary_prefs')}</p>
          {isEditing ? (
            <div className="flex flex-wrap gap-2 mb-6">
              {DIETARY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleArrayItem('dietaryPreferences', opt)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all focus-ring ${
                    form.dietaryPreferences?.includes(opt)
                      ? 'bg-leaf-light/20 border-leaf text-leaf-dark dark:text-leaf-light'
                      : 'border-moss-100 dark:border-white/10 text-ink/50 dark:text-white/40 hover:border-leaf/40'
                  }`}
                >
                  {opt}
                  {form.dietaryPreferences?.includes(opt) && <Check size={11} className="ml-0.5" />}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-6">
              {form.dietaryPreferences?.length > 0 ? form.dietaryPreferences.map(opt => (
                <span key={opt} className="bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 text-ink dark:text-white text-xs font-medium px-3 py-1.5 rounded-full">
                  {opt}
                </span>
              )) : <span className="text-sm text-ink dark:text-white font-medium">{t('none')}</span>}
            </div>
          )}

          <p className="text-xs text-ink/50 dark:text-white/40 mb-3">{t('nutrition_goals')}</p>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleArrayItem('goals', opt)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all focus-ring ${
                    form.goals?.includes(opt)
                      ? 'bg-leaf-light/20 border-leaf text-leaf-dark dark:text-leaf-light'
                      : 'border-moss-100 dark:border-white/10 text-ink/50 dark:text-white/40 hover:border-leaf/40'
                  }`}
                >
                  {opt}
                  {form.goals?.includes(opt) && <Check size={11} className="ml-0.5" />}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {form.goals?.length > 0 ? form.goals.map(opt => (
                <span key={opt} className="bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 text-ink dark:text-white text-xs font-medium px-3 py-1.5 rounded-full">
                  {opt}
                </span>
              )) : <span className="text-sm text-ink dark:text-white font-medium">{t('none')}</span>}
            </div>
          )}

          <p className="text-xs text-ink/50 dark:text-white/40 mb-3 mt-6">{t('medical_conditions')}</p>
          {isEditing ? (
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
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all focus-ring ${
                    (form.medicalConditions || []).includes(opt)
                      ? 'bg-clay/20 border-clay text-clay-dark dark:text-clay'
                      : 'border-moss-100 dark:border-white/10 text-ink/50 dark:text-white/40 hover:border-clay/40'
                  }`}
                >
                  {opt}
                  {(form.medicalConditions || []).includes(opt) && <Check size={11} className="ml-0.5" />}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {form.medicalConditions?.length > 0 ? form.medicalConditions.map(opt => (
                <span key={opt} className="bg-clay/10 border border-clay/30 text-clay text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Activity size={12} /> {opt}
                </span>
              )) : <span className="text-sm text-ink dark:text-white font-medium">{t('none')}</span>}
            </div>
          )}
        </div>

        {/* Allergies & Intolerances */}
        <div className="glass-panel p-5 sm:p-6 mb-6">
          <h3 className="font-display text-base font-semibold text-clay mb-4 flex items-center gap-2">
            ⚠️ {t('allergies_intolerances')}
          </h3>
          <p className="text-xs text-ink/50 dark:text-white/40 mb-3">
            {t('allergies_desc')}
          </p>
          
          {isEditing ? (
            <AllergySelector 
              selectedAllergies={form.allergies || []} 
              onChange={(newAllergies) => update('allergies', newAllergies)} 
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {form.allergies?.length > 0 ? form.allergies.map(opt => (
                <span key={opt} className="bg-clay/10 border border-clay/30 text-clay text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <X size={12} /> {opt}
                </span>
              )) : <span className="text-sm text-ink dark:text-white font-medium">{t('no_allergies')}</span>}
            </div>
          )}
        </div>

        {/* Activity level */}
        {isEditing && (
          <div className="glass-panel p-5 sm:p-6">
            <h3 className="font-display text-base font-semibold text-ink dark:text-white mb-4 flex items-center gap-2">
              <Activity size={17} className="text-leaf" /> {t('activity_level')}
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
                  <span className="text-xs font-semibold leading-tight">{lvl.label}</span>
                  <span className={`text-[10px] ${form.activityLevel === lvl.value ? 'text-white/70' : 'text-ink/35 dark:text-white/30'}`}>{lvl.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isEditing && (
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={cancelEdit}
              className="flex-1 flex items-center justify-center gap-2 font-semibold text-sm px-6 py-3.5 rounded-xl border border-moss-100 dark:border-white/10 text-ink dark:text-white hover:bg-moss-50 dark:hover:bg-white/5 transition-colors focus-ring"
            >
              <X size={16} /> {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-[2] flex items-center gap-2 justify-center font-semibold text-sm px-6 py-3.5 rounded-xl transition-all focus-ring shadow-soft bg-moss-700 hover:bg-moss-600 disabled:opacity-70 text-white"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? t('saving') : t('save_profile')}
            </button>
          </div>
        )}

        {/* ⚙️ App & Server Settings & Logout */}
        {!isEditing && (
          <div className="pt-3 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="w-full py-3.5 px-4 rounded-2xl bg-white dark:bg-white/5 hover:bg-moss-50 dark:hover:bg-white/10 text-ink dark:text-white border border-moss-100 dark:border-white/10 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <SettingsIcon size={17} className="text-leaf" />
              <span>{t('settings') || 'App & Server Settings'}</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await logout()
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <LogOut size={17} />
              <span>{t('logout') || 'Log Out'}</span>
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
