import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Users, Plus, X, Activity, Flame, Droplets, Moon,
  HeartPulse, ShieldAlert, Check, Sparkles, Scale,
  User, Calendar, Info, ShieldCheck, Tag
} from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import FamilyCard from '../components/FamilyCard.jsx'
import { fetchFamilyMembers, createFamilyMember, updateFamilyMember, deleteFamilyMember } from '../services/api'
import { useApp } from '../store.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { getRecommendedCalories, getRecommendedWater, getRecommendedSleep } from '../utils/nutrition.js'

const RELATIONSHIPS = [
  'Father', 'Mother', 'Spouse', 'Son', 'Daughter',
  'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Friend', 'Other'
]

const GENDER_OPTIONS = ['Male', 'Female', 'Other']

const ACTIVITY_LEVELS = [
  { value: 'Sedentary',         label: 'Sedentary',          desc: 'Little/no exercise',   icon: '🛋️' },
  { value: 'Lightly Active',    label: 'Lightly Active',     desc: '1–3 days/week',        icon: '🚶' },
  { value: 'Moderately Active', label: 'Moderately Active',  desc: '3–5 days/week',        icon: '🏃' },
  { value: 'Very Active',       label: 'Very Active',        desc: '6–7 days/week',        icon: '🏋️' }
]

const GOAL_OPTIONS = [
  'Healthy Eating', 'Weight Loss', 'Weight Gain', 'Maintain Weight',
  'Build Muscle', 'Improve General Nutrition'
]

const MEDICAL_CONDITIONS_OPTIONS = [
  'Diabetes', 'Hypertension (High Blood Pressure)',
  'High Cholesterol', 'Thyroid', 'PCOS', 'Acidity / GERD',
  'Heart Disease', 'Kidney Disease', 'None'
]

const ALLERGY_OPTIONS = [
  'Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Gluten',
  'Soy', 'Fish', 'Shellfish', 'Sesame', 'Mustard',
  'High Added Sugar', 'High Sodium'
]

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Non-Vegetarian', 'Eggetarian',
  'Pescatarian', 'Gluten-Free', 'Dairy-Free', 'Halal', 'Jain', 'No Preference'
]

export default function Family() {
  const { user, isAuthed } = useApp()
  const { t } = useLanguage()
  const [members, setMembers] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    relationship: 'Father',
    gender: 'Male',
    dob: '',
    age: '',
    height: '',
    weight: '',
    bmi: '',
    calories: '2000',
    waterGoal: '2.5',
    sleepHours: '8',
    activityLevel: 'Moderately Active',
    goal: 'Healthy Eating',
    healthConditions: [],
    allergies: [],
    dietaryPreferences: ['No Preference']
  })

  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [user, isAuthed])

  const loadMembers = async () => {
    try {
      const data = await fetchFamilyMembers()
      setMembers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.warn('Error loading family members:', e)
      setMembers([])
    }
  }

  // Calculate age from DOB
  useEffect(() => {
    if (isModalOpen && formData.dob) {
      const birthDate = new Date(formData.dob)
      if (!isNaN(birthDate.getTime())) {
        const today = new Date()
        let calculatedAge = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--
        }
        if (calculatedAge > 0 && String(calculatedAge) !== String(formData.age)) {
          setFormData(prev => ({ ...prev, age: String(calculatedAge) }))
        }
      }
    }
  }, [formData.dob, isModalOpen])

  // Calculate BMI when height and weight change
  useEffect(() => {
    if (isModalOpen && formData.height && formData.weight) {
      const hMeters = parseFloat(formData.height) / 100
      const wKg = parseFloat(formData.weight)
      if (hMeters > 0 && wKg > 0) {
        const bmiVal = (wKg / (hMeters * hMeters)).toFixed(1)
        if (String(bmiVal) !== String(formData.bmi)) {
          setFormData(prev => ({ ...prev, bmi: String(bmiVal) }))
        }
      }
    }
  }, [formData.height, formData.weight, isModalOpen])

  // Auto-calculate Calorie Goal, Water Goal (L), and Sleep Hours from Age & Gender
  useEffect(() => {
    if (isModalOpen && formData.age && formData.gender) {
      const recCal = getRecommendedCalories(formData.age, formData.gender)
      const recWater = getRecommendedWater(formData.age, formData.gender)
      const recSleep = getRecommendedSleep(formData.age)

      setFormData(prev => {
        let updates = {}
        if (recCal && String(recCal) !== String(prev.calories)) {
          updates.calories = String(recCal)
        }
        if (recWater && String(recWater) !== String(prev.waterGoal)) {
          updates.waterGoal = String(recWater)
        }
        if (recSleep && String(recSleep) !== String(prev.sleepHours)) {
          updates.sleepHours = String(recSleep)
        }
        if (Object.keys(updates).length > 0) {
          return { ...prev, ...updates }
        }
        return prev
      })
    }
  }, [formData.age, formData.gender, isModalOpen])

  const handleOpenModal = (member = null) => {
    if (member) {
      setEditingMember(member)
      const conds = member.healthConditions || member.diseases || []
      const alls = member.allergies || []
      const diets = member.dietaryPreferences || []

      setFormData({
        name: member.name || '',
        relationship: member.relationship || 'Father',
        gender: member.gender || 'Male',
        dob: member.dob || '',
        age: member.age ? String(member.age) : '',
        height: member.height ? String(member.height) : '',
        weight: member.weight ? String(member.weight) : '',
        bmi: member.bmi ? String(member.bmi) : '',
        calories: member.calories ? String(member.calories) : '2000',
        waterGoal: member.waterGoal ? String(member.waterGoal) : '2.5',
        sleepHours: member.sleepHours ? String(member.sleepHours) : '8',
        activityLevel: member.activityLevel || 'Moderately Active',
        goal: member.goal || 'Healthy Eating',
        healthConditions: Array.isArray(conds) ? conds : [],
        allergies: Array.isArray(alls) ? alls : [],
        dietaryPreferences: Array.isArray(diets) && diets.length > 0 ? diets : ['No Preference']
      })
    } else {
      setEditingMember(null)
      setFormData({
        name: '',
        relationship: 'Father',
        gender: 'Male',
        dob: '',
        age: '28',
        height: '170',
        weight: '68',
        bmi: '23.5',
        calories: '2600',
        waterGoal: '3.7',
        sleepHours: '8',
        activityLevel: 'Moderately Active',
        goal: 'Healthy Eating',
        healthConditions: ['None'],
        allergies: [],
        dietaryPreferences: ['No Preference']
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingMember(null)
  }

  const toggleArrayItem = (field, value) => {
    setFormData(prev => {
      const currentList = prev[field] || []
      if (value === 'None' || value === 'No Preference') {
        return { ...prev, [field]: [value] }
      }
      const filtered = currentList.filter(item => item !== 'None' && item !== 'No Preference')
      if (filtered.includes(value)) {
        const next = filtered.filter(item => item !== value)
        return { ...prev, [field]: next.length === 0 ? (field === 'healthConditions' ? ['None'] : []) : next }
      } else {
        return { ...prev, [field]: [...filtered, value] }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Please enter member name')
      return
    }

    setIsSaving(true)
    
    const payload = {
      name: formData.name.trim(),
      relationship: formData.relationship,
      gender: formData.gender,
      dob: formData.dob,
      age: parseInt(formData.age) || null,
      height: parseFloat(formData.height) || null,
      weight: parseFloat(formData.weight) || null,
      bmi: parseFloat(formData.bmi) || null,
      calories: parseInt(formData.calories) || 2000,
      waterGoal: String(formData.waterGoal || '2.5'),
      sleepHours: parseFloat(formData.sleepHours) || 8,
      activityLevel: formData.activityLevel,
      goal: formData.goal,
      healthConditions: formData.healthConditions,
      diseases: formData.healthConditions, // maintain backwards compatibility
      allergies: formData.allergies,
      dietaryPreferences: formData.dietaryPreferences
    }

    try {
      if (editingMember) {
        const updated = await updateFamilyMember(editingMember._id, payload)
        setMembers(prev => prev.map(m => m._id === editingMember._id ? (updated || { ...m, ...payload }) : m))
      } else {
        const created = await createFamilyMember(payload)
        if (created) {
          setMembers(prev => [...prev, created])
        }
      }
      handleCloseModal()
      await loadMembers()
    } catch (err) {
      console.error('Error saving family member:', err)
      // Optimistic fallback
      const fallbackMember = {
        ...payload,
        _id: 'local_' + Date.now(),
        createdAt: new Date().toISOString()
      }
      setMembers(prev => [...prev, fallbackMember])
      handleCloseModal()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this family member profile?')) {
      setMembers(prev => prev.filter(m => m._id !== id))
      await deleteFamilyMember(id)
      await loadMembers()
    }
  }

  return (
    <AppShell title={t('family_profiles')}>
      <div className="max-w-5xl mx-auto space-y-6 fade-in-up pb-12">
        
        {/* Header Banner */}
        <div className="glass-panel p-6 rounded-3xl border border-moss-100 dark:border-white/10 shadow-soft bg-gradient-to-r from-moss-50/80 via-mint-tint/30 to-white dark:from-white/5 dark:to-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-moss-700 to-leaf text-white flex items-center justify-center shadow-sm shrink-0">
              <Users size={26} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black text-ink dark:text-white flex items-center gap-2">
                <span>{t('family_profiles')}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-leaf/20 text-leaf-dark dark:text-leaf font-bold">
                  {members.length} {members.length === 1 ? 'Member' : 'Members'}
                </span>
              </h1>
              <p className="text-ink/60 dark:text-white/50 text-xs mt-0.5">
                Manage nutrition, allergies, water & calorie goals for each member of your household
              </p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => handleOpenModal()} 
            className="btn-primary py-3 px-6 rounded-2xl font-bold flex items-center gap-2 justify-center shadow-soft shrink-0 text-xs"
          >
            <Plus size={18} /> {t('add_member') || 'Add Family Member'}
          </button>
        </div>

        {/* Member Cards Grid */}
        {members.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {members.map(member => (
              <FamilyCard 
                key={member._id} 
                member={member} 
                onEdit={handleOpenModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel p-12 text-center rounded-3xl border border-moss-100 dark:border-white/10">
            <div className="h-20 w-20 bg-gradient-to-tr from-moss-100 to-mint-tint dark:from-white/5 dark:to-white/10 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-xs">
              👨‍👩‍👧‍👦
            </div>
            <h2 className="font-display font-black text-xl text-ink dark:text-white mb-2">
              {t('no_members') || 'No Family Members Added Yet'}
            </h2>
            <p className="text-ink/60 dark:text-white/40 text-xs max-w-md mx-auto mb-6 leading-relaxed">
              Add your parents, spouse, or children to personalize food safety checks, calculate automatic water & calorie targets, and safeguard their health.
            </p>
            <button 
              type="button"
              onClick={() => handleOpenModal()} 
              className="btn-primary py-3 px-7 rounded-2xl font-bold inline-flex items-center gap-2 text-xs shadow-soft"
            >
              <Plus size={18} /> {t('add_first_member') || 'Add First Family Member'}
            </button>
          </div>
        )}

        {/* ── ADD / EDIT FAMILY MEMBER MODAL ───────────────────────────────── */}
        {isModalOpen && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel max-w-2xl w-full max-h-[90vh] p-6 sm:p-7 rounded-3xl shadow-glow border border-moss-200 dark:border-white/15 flex flex-col fade-in-up bg-white dark:bg-[#0E1A14] text-ink dark:text-white">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-moss-100 dark:border-white/10 mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-moss-700 text-white flex items-center justify-center shadow-xs">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-lg text-ink dark:text-white leading-tight">
                      {editingMember ? 'Edit Family Member Profile' : 'Add New Family Member'}
                    </h3>
                    <p className="text-[11px] text-ink/50 dark:text-white/40">
                      Calculates automated calorie, water, and sleep goals from age and gender
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-ink/60 dark:text-white/60"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Form Scroll Area */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 pr-1.5">
                
                {/* Section 1: Basic Identity & Relationship */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-leaf-dark dark:text-leaf uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} /> Basic Information
                  </h4>

                  <div className="grid sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-ink/60 dark:text-white/60 uppercase tracking-wider mb-1">
                        Member Name *
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="input-base text-sm font-semibold"
                        placeholder="e.g. Ramesh / Priya"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-ink/60 dark:text-white/60 uppercase tracking-wider mb-1">
                        Relationship with You *
                      </label>
                      <select
                        value={formData.relationship}
                        onChange={e => setFormData({ ...formData, relationship: e.target.value })}
                        className="input-base text-sm font-semibold cursor-pointer"
                      >
                        {RELATIONSHIPS.map(rel => (
                          <option key={rel} value={rel}>{rel}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Gender, Age & Date of Birth */}
                <div className="space-y-3 pt-3 border-t border-moss-100 dark:border-white/10">
                  <div className="grid sm:grid-cols-3 gap-3.5">
                    
                    {/* Gender (Above Height & Weight) */}
                    <div>
                      <label className="block text-[11px] font-bold text-ink/60 dark:text-white/60 uppercase tracking-wider mb-1">
                        Gender *
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-moss-50 dark:bg-white/5 p-1 rounded-xl border border-moss-100 dark:border-white/10">
                        {GENDER_OPTIONS.map(g => (
                          <button
                            type="button"
                            key={g}
                            onClick={() => setFormData({ ...formData, gender: g })}
                            className={`py-1.5 text-xs font-bold rounded-lg transition-all text-center ${
                              formData.gender === g
                                ? 'bg-moss-700 text-white shadow-xs'
                                : 'text-ink/60 dark:text-white/60 hover:text-ink dark:hover:text-white'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-[11px] font-bold text-ink/60 dark:text-white/60 uppercase tracking-wider mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={formData.dob}
                        onChange={e => setFormData({ ...formData, dob: e.target.value })}
                        className="input-base text-xs font-medium"
                      />
                    </div>

                    {/* Age (Auto-calculated or Manual) */}
                    <div>
                      <label className="block text-[11px] font-bold text-ink/60 dark:text-white/60 uppercase tracking-wider mb-1">
                        Age (Years) *
                      </label>
                      <input
                        required
                        type="number"
                        min="1"
                        max="120"
                        value={formData.age}
                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                        className="input-base text-sm font-semibold"
                        placeholder="e.g. 28"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Height, Weight & Calculated BMI */}
                <div className="space-y-3 pt-3 border-t border-moss-100 dark:border-white/10">
                  <div className="grid grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-ink/60 dark:text-white/60 uppercase tracking-wider mb-1">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        value={formData.height}
                        onChange={e => setFormData({ ...formData, height: e.target.value })}
                        className="input-base text-sm font-semibold"
                        placeholder="e.g. 172"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-ink/60 dark:text-white/60 uppercase tracking-wider mb-1">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.weight}
                        onChange={e => setFormData({ ...formData, weight: e.target.value })}
                        className="input-base text-sm font-semibold"
                        placeholder="e.g. 68"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-ink/60 dark:text-white/60 uppercase tracking-wider mb-1">
                        Calculated BMI
                      </label>
                      <div className="input-base text-sm font-black bg-moss-50/70 dark:bg-white/5 flex items-center justify-between text-leaf-dark dark:text-leaf">
                        <span>{formData.bmi || '--'}</span>
                        <Scale size={15} className="text-leaf" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Automated Nutrition & Health Goals */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-moss-50 to-mint-tint/40 dark:from-white/5 dark:to-white/5 border border-moss-100 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-ink dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-leaf" /> Auto-Calculated Daily Targets
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-leaf/20 text-leaf-dark dark:text-leaf">
                      Smart Nutrition Engine
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Calories */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#12211A] border border-moss-100 dark:border-white/10">
                      <div className="flex items-center gap-1 text-amber-600 mb-1">
                        <Flame size={13} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Calories</span>
                      </div>
                      <input
                        type="number"
                        value={formData.calories}
                        onChange={e => setFormData({ ...formData, calories: e.target.value })}
                        className="w-full bg-transparent font-black text-sm text-ink dark:text-white outline-none"
                      />
                      <span className="text-[10px] text-ink/40 dark:text-white/40">kcal / day</span>
                    </div>

                    {/* Water Goal in Liters */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#12211A] border border-moss-100 dark:border-white/10">
                      <div className="flex items-center gap-1 text-cyan-600 mb-1">
                        <Droplets size={13} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Water Goal</span>
                      </div>
                      <input
                        type="text"
                        value={formData.waterGoal}
                        onChange={e => setFormData({ ...formData, waterGoal: e.target.value })}
                        className="w-full bg-transparent font-black text-sm text-ink dark:text-white outline-none"
                      />
                      <span className="text-[10px] text-ink/40 dark:text-white/40">Liters / day</span>
                    </div>

                    {/* Sleep Hours */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#12211A] border border-moss-100 dark:border-white/10">
                      <div className="flex items-center gap-1 text-indigo-600 mb-1">
                        <Moon size={13} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Sleep Target</span>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.sleepHours}
                        onChange={e => setFormData({ ...formData, sleepHours: e.target.value })}
                        className="w-full bg-transparent font-black text-sm text-ink dark:text-white outline-none"
                      />
                      <span className="text-[10px] text-ink/40 dark:text-white/40">Hours / night</span>
                    </div>
                  </div>
                </div>

                {/* Section 5: Medical Conditions (Chips) */}
                <div className="space-y-2 pt-2 border-t border-moss-100 dark:border-white/10">
                  <label className="block text-xs font-black text-ink dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <HeartPulse size={14} className="text-red-500" /> Health Conditions / Medical History
                  </label>
                  <p className="text-[11px] text-ink/50 dark:text-white/40">
                    AI will flag ingredients dangerous for these conditions
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {MEDICAL_CONDITIONS_OPTIONS.map(cond => {
                      const isSelected = formData.healthConditions.includes(cond)
                      return (
                        <button
                          type="button"
                          key={cond}
                          onClick={() => toggleArrayItem('healthConditions', cond)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-red-500 text-white shadow-xs'
                              : 'bg-moss-50 dark:bg-white/5 border border-moss-200/80 dark:border-white/10 text-ink/70 dark:text-white/70 hover:border-red-400'
                          }`}
                        >
                          {isSelected && <Check size={13} />}
                          <span>{cond}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Section 6: Allergies (Chips) */}
                <div className="space-y-2 pt-2 border-t border-moss-100 dark:border-white/10">
                  <label className="block text-xs font-black text-ink dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-amber-500" /> Food Allergies & Intolerances
                  </label>
                  <p className="text-[11px] text-ink/50 dark:text-white/40">
                    Critical allergen warnings will trigger if food items contain these
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ALLERGY_OPTIONS.map(allergy => {
                      const isSelected = formData.allergies.includes(allergy)
                      return (
                        <button
                          type="button"
                          key={allergy}
                          onClick={() => toggleArrayItem('allergies', allergy)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-moss-50 dark:bg-white/5 border border-moss-200/80 dark:border-white/10 text-ink/70 dark:text-white/70 hover:border-amber-400'
                          }`}
                        >
                          {isSelected && <Check size={13} />}
                          <span>{allergy}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Section 7: Dietary Preferences */}
                <div className="space-y-2 pt-2 border-t border-moss-100 dark:border-white/10">
                  <label className="block text-xs font-black text-ink dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Tag size={14} className="text-emerald-500" /> Dietary Preferences
                  </label>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {DIETARY_OPTIONS.map(diet => {
                      const isSelected = formData.dietaryPreferences.includes(diet)
                      return (
                        <button
                          type="button"
                          key={diet}
                          onClick={() => toggleArrayItem('dietaryPreferences', diet)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-moss-50 dark:bg-white/5 border border-moss-200/80 dark:border-white/10 text-ink/70 dark:text-white/70 hover:border-emerald-400'
                          }`}
                        >
                          {isSelected && <Check size={13} />}
                          <span>{diet}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="pt-4 border-t border-moss-100 dark:border-white/10 flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-[#0E1A14] py-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary px-5 py-2.5 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold shadow-soft flex items-center gap-2 disabled:opacity-60"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      editingMember ? 'Save Changes' : 'Save Member Profile'
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>,
          document.body
        )}

      </div>
    </AppShell>
  )
}
