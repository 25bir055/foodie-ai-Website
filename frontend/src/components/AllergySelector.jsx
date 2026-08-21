import React, { useState, useRef, useEffect } from 'react'
import { Search, X, Check } from 'lucide-react'

const COMMON_ALLERGIES = [
  'Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Gluten', 'Wheat',
  'Soy', 'Fish', 'Shellfish', 'Sesame', 'Mustard', 'Celery',
  'Lupin', 'Sulfites', 'Corn', 'Meat', 'Poultry', 'Legumes'
]

export default function AllergySelector({ selectedAllergies = [], onChange }) {
  const [hasAllergies, setHasAllergies] = useState(() => selectedAllergies.length > 0)
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredAllergies = COMMON_ALLERGIES.filter(a => 
    a.toLowerCase().includes(query.toLowerCase())
  )

  const toggleAllergy = (allergy) => {
    let newSelection = [...selectedAllergies]
    if (newSelection.includes(allergy)) {
      newSelection = newSelection.filter(a => a !== allergy)
    } else {
      newSelection.push(allergy)
    }
    onChange(newSelection)
  }

  const handleHasAllergiesChange = (val) => {
    setHasAllergies(val)
    if (!val) {
      onChange([]) // Clear allergies if they select "No"
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide">Do you have any food allergies?</span>
      
      {/* Yes / No Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleHasAllergiesChange(true)}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all focus-ring border ${
            hasAllergies
              ? 'bg-leaf-light/20 border-leaf text-leaf-dark dark:text-leaf-light'
              : 'bg-white dark:bg-white/5 border-moss-100 dark:border-white/10 text-ink/50 dark:text-white/40 hover:border-leaf/40'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => handleHasAllergiesChange(false)}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all focus-ring border ${
            !hasAllergies
              ? 'bg-clay/10 border-clay text-clay'
              : 'bg-white dark:bg-white/5 border-moss-100 dark:border-white/10 text-ink/50 dark:text-white/40 hover:border-leaf/40'
          }`}
        >
          No
        </button>
      </div>

      {/* Allergy Search & Selection */}
      {hasAllergies && (
        <div className="relative mt-2" ref={wrapperRef}>
          <div className="flex items-center bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-leaf transition-shadow">
            <Search size={16} className="text-ink/40 dark:text-white/40 mr-2" />
            <input
              type="text"
              placeholder="Search allergies (e.g. Peanuts)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              className="bg-transparent outline-none text-sm flex-1 text-ink dark:text-white placeholder:text-ink/30 dark:placeholder:text-white/30"
            />
          </div>

          {/* Dropdown Suggestions */}
          {isOpen && filteredAllergies.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1A2621] border border-moss-100 dark:border-white/10 rounded-xl shadow-lg max-h-48 overflow-y-auto overflow-hidden">
              {filteredAllergies.map(allergy => {
                const isSelected = selectedAllergies.includes(allergy)
                return (
                  <button
                    key={allergy}
                    type="button"
                    onClick={() => toggleAllergy(allergy)}
                    className="w-full text-left px-4 py-2.5 text-sm text-ink dark:text-white hover:bg-moss-50 dark:hover:bg-white/5 flex items-center justify-between"
                  >
                    {allergy}
                    {isSelected && <Check size={14} className="text-leaf" />}
                  </button>
                )
              })}
            </div>
          )}

          {/* Selected Allergy Tags */}
          {selectedAllergies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedAllergies.map(allergy => (
                <span
                  key={allergy}
                  className="flex items-center gap-1.5 bg-leaf-light/20 text-leaf-dark dark:text-leaf-light text-xs font-semibold px-3 py-1.5 rounded-full border border-leaf"
                >
                  {allergy}
                  <button
                    type="button"
                    onClick={() => toggleAllergy(allergy)}
                    className="hover:text-clay transition-colors ml-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
