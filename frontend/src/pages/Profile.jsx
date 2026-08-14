import React, { useState } from 'react'
import { Check, UserCircle2, Target, Activity, Leaf } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import { useApp } from '../store.jsx'

const ACTIVITY_LEVELS = [
  { value: 'Sedentary',         label: 'Sedentary',          desc: 'Little/no exercise',   icon: '🛋️' },
  { value: 'Lightly Active',    label: 'Lightly Active',     desc: '1–3 days/week',        icon: '🚶' },
  { value: 'Moderately Active', label: 'Moderately Active',  desc: '3–5 days/week',        icon: '🏃' },
  { value: 'Very Active',       label: 'Very Active',        desc: '6–7 days/week',        icon: '🏋️' }
]

const DIET_PREFS = [
  { value: 'Vegetarian',    icon: '🥦' },
  { value: 'Vegan',         icon: '🌱' },
  { value: 'Non-vegetarian',icon: '🍖' },
  { value: 'Low sugar',     icon: '🍬' },
  { value: 'High protein',  icon: '💪' },
  { value: 'Low sodium',    icon: '🧂' },
  { value: 'Gluten-free',   icon: '🌾' }
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

export default function Profile() {
  const { profile, setProfile, userName } = useApp()
  const [form, setForm] = useState(profile)
  const [saved, setSaved] = useState(false)

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const toggleGoal = (goal) => {
    setForm((f) => ({
      ...f,
      goals: f.goals.includes(goal) ? f.goals.filter((g) => g !== goal) : [...f.goals, goal]
    }))
  }

  const save = () => {
    setProfile(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // BMI
  const bmi = form.height > 0 ? (form.weight / ((form.height / 100) ** 2)).toFixed(1) : '--'
  const bmiLabel = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
  const bmiColor = bmi < 18.5 ? 'text-amber' : bmi < 25 ? 'text-leaf-dark dark:text-leaf-light' : bmi < 30 ? 'text-amber' : 'text-clay'

  return (
    <AppShell title="Nutrition Profile">
      {/* Profile header */}
      <div className="glass-panel p-5 flex items-center gap-4 mb-6 fade-in-up">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-moss-700 to-leaf flex items-center justify-center text-white font-display font-bold text-2xl shrink-0 shadow-soft">
          {userName[0]}
        </div>
        <div className="flex-1">
          <h2 className="font-display text-xl font-medium text-ink dark:text-white">{userName}</h2>
          <p className="text-sm text-ink/50 dark:text-white/40 mt-0.5">{form.dietaryPreference} · {form.activityLevel}</p>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-ink/50 dark:text-white/40"><span className="data-num font-semibold text-ink dark:text-white">{form.calorieGoal}</span> kcal goal</span>
            <span className="text-ink/50 dark:text-white/40">BMI: <span className={`data-num font-semibold ${bmiColor}`}>{bmi}</span> <span className={bmiColor}>({bmiLabel})</span></span>
          </div>
        </div>
        <UserCircle2 size={24} className="text-ink/20 dark:text-white/20 shrink-0" />
      </div>

      <p className="text-sm text-ink/50 dark:text-white/40 mb-5">
        This information personalizes your health scores and AI recommendations.
      </p>

      <div className="max-w-2xl flex flex-col gap-5">
        {/* Basic info */}
        <div className="glass-panel p-5 sm:p-6">
          <h3 className="font-display text-base font-semibold text-ink dark:text-white mb-4 flex items-center gap-2">
            <UserCircle2 size={17} className="text-leaf" /> Basic Information
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <InputField label="Age" value={form.age} onChange={(e) => update('age', Number(e.target.value))} suffix="years" />
            <InputField label="Height" value={form.height} onChange={(e) => update('height', Number(e.target.value))} suffix="cm" />
            <InputField label="Weight" value={form.weight} onChange={(e) => update('weight', Number(e.target.value))} suffix="kg" />
            <InputField label="Daily Calorie Goal" value={form.calorieGoal} onChange={(e) => update('calorieGoal', Number(e.target.value))} suffix="kcal" />
          </div>
        </div>

        {/* Activity level */}
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

        {/* Dietary preference */}
        <div className="glass-panel p-5 sm:p-6">
          <h3 className="font-display text-base font-semibold text-ink dark:text-white mb-4 flex items-center gap-2">
            <Leaf size={17} className="text-leaf" /> Dietary Preferences & Goals
          </h3>
          <p className="text-xs text-ink/50 dark:text-white/40 mb-3">Primary preference</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {DIET_PREFS.filter(d => ['Vegetarian','Vegan','Non-vegetarian'].includes(d.value)).map((d) => (
              <button
                key={d.value}
                onClick={() => update('dietaryPreference', d.value)}
                className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border transition-all focus-ring ${
                  form.dietaryPreference === d.value
                    ? 'bg-moss-700 text-white border-moss-700'
                    : 'border-moss-100 dark:border-white/10 text-ink/60 dark:text-white/50 hover:bg-mint-tint dark:hover:bg-white/5'
                }`}
              >
                {d.icon} {d.value}
              </button>
            ))}
          </div>

          <p className="text-xs text-ink/50 dark:text-white/40 mb-3">Nutrition goals (select all that apply)</p>
          <div className="flex flex-wrap gap-2">
            {DIET_PREFS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleGoal(d.value)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all focus-ring ${
                  form.goals.includes(d.value)
                    ? 'bg-leaf-light/20 border-leaf text-leaf-dark dark:text-leaf-light'
                    : 'border-moss-100 dark:border-white/10 text-ink/50 dark:text-white/40 hover:border-leaf/40'
                }`}
              >
                {d.icon} {d.value}
                {form.goals.includes(d.value) && <Check size={11} className="ml-0.5" />}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          className={`flex items-center gap-2 justify-center font-semibold text-sm px-6 py-3.5 rounded-xl transition-all focus-ring shadow-soft ${
            saved
              ? 'bg-leaf text-white'
              : 'bg-moss-700 hover:bg-moss-600 text-white'
          }`}
        >
          {saved ? <><Check size={16} /> Profile Saved!</> : 'Save Profile'}
        </button>
      </div>
    </AppShell>
  )
}
