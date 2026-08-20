import React, { useState, useEffect } from 'react'
import { Check, UserCircle2, Activity, Leaf, Edit2, X, Loader2 } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import { useApp } from '../store.jsx'
import { updateUserProfile } from '../services/auth.js'

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
  const { user, profile, setProfile, userName } = useApp()
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

  const displayPrefs = form.dietaryPreferences?.length > 0 ? form.dietaryPreferences.join(', ') : 'None'
  const displayGoals = form.goals?.length > 0 ? form.goals.join(', ') : 'None'

  return (
    <AppShell title="Nutrition Profile">
      {/* Profile header */}
      <div className="glass-panel p-5 flex items-center gap-4 mb-6 fade-in-up">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-moss-700 to-leaf flex items-center justify-center text-white font-display font-bold text-2xl shrink-0 shadow-soft">
          {userName[0]}
        </div>
        <div className="flex-1">
          <h2 className="font-display text-xl font-medium text-ink dark:text-white">{userName}</h2>
          <p className="text-sm text-ink/50 dark:text-white/40 mt-0.5">{displayPrefs} · {form.activityLevel}</p>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-ink/50 dark:text-white/40"><span className="data-num font-semibold text-ink dark:text-white">{form.calorieGoal}</span> kcal goal</span>
            <span className="text-ink/50 dark:text-white/40">BMI: <span className={`data-num font-semibold ${bmiColor}`}>{bmi}</span> <span className={bmiColor}>({bmiLabel})</span></span>
          </div>
        </div>
        <UserCircle2 size={24} className="text-ink/20 dark:text-white/20 shrink-0" />
      </div>

      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-ink/50 dark:text-white/40">
          This information personalizes your health scores and AI recommendations.
        </p>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 text-ink dark:text-white hover:bg-moss-50 dark:hover:bg-white/10 transition-colors"
          >
            <Edit2 size={14} /> Edit Profile
          </button>
        )}
      </div>

      <div className="max-w-2xl flex flex-col gap-5 pb-8">
        {/* Basic info */}
        <div className="glass-panel p-5 sm:p-6">
          <h3 className="font-display text-base font-semibold text-ink dark:text-white mb-4 flex items-center gap-2">
            <UserCircle2 size={17} className="text-leaf" /> Basic Information
          </h3>
          {isEditing ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <InputField label="Age" value={form.age} onChange={(e) => update('age', e.target.value)} suffix="years" />
              <InputField label="Height" value={form.height} onChange={(e) => update('height', e.target.value)} suffix="cm" />
              <InputField label="Weight" value={form.weight} onChange={(e) => update('weight', e.target.value)} suffix="kg" />
              <InputField label="Daily Calorie Goal" value={form.calorieGoal} onChange={(e) => update('calorieGoal', e.target.value)} suffix="kcal" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-y-6 gap-x-4">
              <DisplayField label="Age" value={`${form.age} years`} />
              <DisplayField label="Height" value={`${form.height} cm`} />
              <DisplayField label="Weight" value={`${form.weight} kg`} />
              <DisplayField label="Daily Calorie Goal" value={`${form.calorieGoal} kcal`} />
            </div>
          )}
        </div>

        {/* Dietary preferences & Goals */}
        <div className="glass-panel p-5 sm:p-6">
          <h3 className="font-display text-base font-semibold text-ink dark:text-white mb-4 flex items-center gap-2">
            <Leaf size={17} className="text-leaf" /> Dietary Preferences & Goals
          </h3>
          
          <p className="text-xs text-ink/50 dark:text-white/40 mb-3">Dietary Preferences</p>
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
              )) : <span className="text-sm text-ink dark:text-white font-medium">None</span>}
            </div>
          )}

          <p className="text-xs text-ink/50 dark:text-white/40 mb-3">Nutrition Goals</p>
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
              )) : <span className="text-sm text-ink dark:text-white font-medium">None</span>}
            </div>
          )}
        </div>

        {/* Allergies & Intolerances */}
        <div className="glass-panel p-5 sm:p-6 mb-6">
          <h3 className="font-display text-base font-semibold text-clay mb-4 flex items-center gap-2">
            ⚠️ Allergies & Intolerances
          </h3>
          <p className="text-xs text-ink/50 dark:text-white/40 mb-3">
            Select items you want to avoid. The app will warn you if a scanned product contains these ingredients.
          </p>
          
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {ALLERGY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleArrayItem('allergies', opt)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all focus-ring ${
                    form.allergies?.includes(opt)
                      ? 'bg-clay/10 border-clay text-clay'
                      : 'border-moss-100 dark:border-white/10 text-ink/50 dark:text-white/40 hover:border-clay/40'
                  }`}
                >
                  {opt}
                  {form.allergies?.includes(opt) && <Check size={11} className="ml-0.5" />}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {form.allergies?.length > 0 ? form.allergies.map(opt => (
                <span key={opt} className="bg-clay/10 border border-clay/30 text-clay text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <X size={12} /> {opt}
                </span>
              )) : <span className="text-sm text-ink dark:text-white font-medium">No allergies recorded</span>}
            </div>
          )}
        </div>

        {/* Activity level */}
        {isEditing && (
          <div className="glass-panel p-5 sm:p-6">
            <h3 className="font-display text-base font-semibold text-ink dark:text-white mb-4 flex items-center gap-2">
              <Activity size={17} className="text-leaf" /> Activity Level
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
              <X size={16} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-[2] flex items-center gap-2 justify-center font-semibold text-sm px-6 py-3.5 rounded-xl transition-all focus-ring shadow-soft bg-moss-700 hover:bg-moss-600 disabled:opacity-70 text-white"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
