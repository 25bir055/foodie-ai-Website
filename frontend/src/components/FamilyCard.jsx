import React from 'react'
import {
  Activity, Flame, Droplets, Moon, ShieldAlert,
  HeartPulse, Edit2, Trash2, Tag, Sparkles
} from 'lucide-react'

export default function FamilyCard({ member, onEdit, onDelete }) {
  const {
    name, relationship, gender, age, height, weight,
    bmi, calories, waterGoal, sleepHours,
    healthConditions, diseases, allergies, dietaryPreferences
  } = member

  const conditionsList = healthConditions || diseases || []
  const allergiesList = allergies || []
  const dietsList = dietaryPreferences || []

  // Determine avatar icon/color based on relationship
  const getAvatar = (rel) => {
    switch(rel) {
      case 'Father':      return { icon: '👨', bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' }
      case 'Mother':      return { icon: '👩', bg: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600' }
      case 'Spouse':      return { icon: '💍', bg: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' }
      case 'Son':         return { icon: '👦', bg: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600' }
      case 'Daughter':    return { icon: '👧', bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' }
      case 'Brother':     return { icon: '🧑', bg: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600' }
      case 'Sister':      return { icon: '👱‍♀️', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600' }
      case 'Grandfather': return { icon: '👴', bg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' }
      case 'Grandmother': return { icon: '👵', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' }
      case 'Friend':      return { icon: '🤝', bg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' }
      default:            return { icon: '👤', bg: 'bg-gray-100 dark:bg-gray-800 text-gray-600' }
    }
  }

  const avatar = getAvatar(relationship)

  return (
    <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-moss-100 dark:border-white/10 relative group hover:shadow-glow transition-all flex flex-col justify-between bg-white dark:bg-[#12211A]">
      <div>
        {/* Action Controls */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(member)}
            className="p-2 rounded-xl bg-white dark:bg-white/10 border border-moss-100 dark:border-white/10 text-ink/50 hover:text-leaf hover:bg-moss-50 dark:hover:bg-white/20 transition-all shadow-2xs"
            title="Edit profile"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(member._id)}
            className="p-2 rounded-xl bg-white dark:bg-white/10 border border-moss-100 dark:border-white/10 text-ink/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shadow-2xs"
            title="Delete member"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Identity Header */}
        <div className="flex items-start gap-3.5">
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-xs ${avatar.bg}`}>
            {avatar.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-black text-lg text-ink dark:text-white truncate leading-tight">
              {name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-moss-700 text-white uppercase tracking-wider">
                {relationship}
              </span>
              {gender && (
                <span className="text-[10px] font-semibold text-ink/50 dark:text-white/40">
                  • {gender}
                </span>
              )}
              {age && (
                <span className="text-[10px] font-semibold text-ink/50 dark:text-white/40">
                  • {age} yrs
                </span>
              )}
            </div>
            {(weight || height) && (
              <p className="text-[11px] text-ink/40 dark:text-white/40 mt-1 font-medium">
                {weight ? `${weight} kg` : ''} {weight && height ? '·' : ''} {height ? `${height} cm` : ''}
              </p>
            )}
          </div>
        </div>

        {/* 4-Metric Nutrition Grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* BMI */}
          <div className="bg-moss-50/70 dark:bg-white/5 rounded-2xl p-2.5 text-center border border-moss-100/60 dark:border-white/5">
            <div className="flex items-center justify-center gap-1 text-leaf-dark dark:text-leaf-light mb-0.5">
              <Activity size={12} />
              <span className="text-[9px] font-black uppercase tracking-wider">BMI</span>
            </div>
            <p className="font-display font-black text-sm text-ink dark:text-white">
              {bmi || '--'}
            </p>
          </div>

          {/* Calories */}
          <div className="bg-moss-50/70 dark:bg-white/5 rounded-2xl p-2.5 text-center border border-moss-100/60 dark:border-white/5">
            <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-0.5">
              <Flame size={12} />
              <span className="text-[9px] font-black uppercase tracking-wider">Calories</span>
            </div>
            <p className="font-display font-black text-sm text-ink dark:text-white">
              {calories || 2000}
            </p>
          </div>

          {/* Water Goal in Liters */}
          <div className="bg-moss-50/70 dark:bg-white/5 rounded-2xl p-2.5 text-center border border-moss-100/60 dark:border-white/5">
            <div className="flex items-center justify-center gap-1 text-cyan-600 dark:text-cyan-400 mb-0.5">
              <Droplets size={12} />
              <span className="text-[9px] font-black uppercase tracking-wider">Water</span>
            </div>
            <p className="font-display font-black text-sm text-ink dark:text-white">
              {waterGoal ? `${waterGoal}L` : '2.5L'}
            </p>
          </div>

          {/* Sleep Hours */}
          <div className="bg-moss-50/70 dark:bg-white/5 rounded-2xl p-2.5 text-center border border-moss-100/60 dark:border-white/5">
            <div className="flex items-center justify-center gap-1 text-indigo-600 dark:text-indigo-400 mb-0.5">
              <Moon size={12} />
              <span className="text-[9px] font-black uppercase tracking-wider">Sleep</span>
            </div>
            <p className="font-display font-black text-sm text-ink dark:text-white">
              {sleepHours ? `${sleepHours}h` : '8h'}
            </p>
          </div>
        </div>

        {/* Health Conditions & Allergies Tags */}
        <div className="mt-4 space-y-2.5">
          {/* Conditions */}
          {conditionsList.length > 0 && !conditionsList.includes('None') && (
            <div>
              <p className="text-[10px] font-bold text-ink/40 dark:text-white/40 uppercase mb-1 flex items-center gap-1">
                <HeartPulse size={12} className="text-red-500" /> Health Conditions
              </p>
              <div className="flex flex-wrap gap-1">
                {conditionsList.map((d, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[11px] font-bold rounded-lg border border-red-200/60 dark:border-red-900/40"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Allergies */}
          {allergiesList.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-ink/40 dark:text-white/40 uppercase mb-1 flex items-center gap-1">
                <ShieldAlert size={12} className="text-amber-500" /> Allergies
              </p>
              <div className="flex flex-wrap gap-1">
                {allergiesList.map((a, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold rounded-lg border border-amber-200/60 dark:border-amber-900/40"
                  >
                    🚨 {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Diets */}
          {dietsList.length > 0 && !dietsList.includes('No Preference') && (
            <div>
              <div className="flex flex-wrap gap-1">
                {dietsList.map((diet, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-200/60 dark:border-emerald-900/40"
                  >
                    🌱 {diet}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-moss-100/80 dark:border-white/5 flex items-center justify-between text-[11px] text-ink/40 dark:text-white/40">
        <span>Protected by Foodie AI</span>
        <button
          type="button"
          onClick={() => onEdit(member)}
          className="text-leaf-dark dark:text-leaf font-bold hover:underline"
        >
          Edit Details →
        </button>
      </div>
    </div>
  )
}
