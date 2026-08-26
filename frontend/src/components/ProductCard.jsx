import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ShoppingCart } from 'lucide-react'
import { scoreLabel } from '../data/mockData'
import { useApp } from '../store.jsx'

export default function ProductCard({ product, compact = false }) {
  const navigate = useNavigate()
  const { favorites, toggleFavorite, addToShoppingList, user, profile } = useApp()
  const { label, color, bg } = scoreLabel(product.healthScore)
  const isFav = favorites.includes(product.id)

  const activeProfile = user?.profile || profile || {}
  const userAllergies = Array.isArray(activeProfile?.allergies) ? activeProfile.allergies : []
  const userConditions = Array.isArray(activeProfile?.medicalConditions) ? activeProfile.medicalConditions : []

  const prodAllergens = Array.isArray(product.allergens)
    ? product.allergens
    : (typeof product.allergens === 'string' && product.allergens.trim() ? product.allergens.split(',') : [])
  const prodIngredients = Array.isArray(product.ingredients)
    ? product.ingredients
    : (typeof product.ingredients === 'string' && product.ingredients.trim() ? product.ingredients.split(',') : [])

  const hasAllergenMatch = userAllergies.some((a) => {
    if (!a || typeof a !== 'string') return false
    const aClean = a.trim().toLowerCase()
    if (!aClean || aClean === 'none') return false
    return (
      prodAllergens.some((al) => String(al).toLowerCase().includes(aClean)) ||
      prodIngredients.some((ing) => String(ing).toLowerCase().includes(aClean))
    )
  })

  const hasDiabetes = userConditions.some((c) => typeof c === 'string' && c.toLowerCase().includes('diabetes'))
  const hasHypertension = userConditions.some(
    (c) => typeof c === 'string' && (c.toLowerCase().includes('hypertension') || c.toLowerCase().includes('blood pressure'))
  )

  return (
    <div className="group glass-panel hover:shadow-glow hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
      <button
        onClick={() => navigate(`/product/${product.id}`)}
        className="w-full text-left p-4 focus-ring block rounded-xl2"
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="h-16 w-16 rounded-xl2 bg-gradient-to-br from-mint-tint to-moss-50 dark:from-white/5 dark:to-white/3 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300 overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name || 'Product'}
                className="h-full w-full object-contain p-1"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <span className="text-3xl">{product.image || '🥣'}</span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
              style={{ color, backgroundColor: bg }}
            >
              {product.healthScore} · {label}
            </span>
          </div>
        </div>

        {/* Name and brand */}
        <h3 className="font-display font-semibold text-[15px] mt-3 leading-snug text-ink dark:text-white/90 group-hover:text-moss-700 dark:group-hover:text-leaf-light transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-ink/45 dark:text-white/35 mt-0.5">{product.brand || 'General'} {product.category ? `· ${product.category}` : ''}</p>

        {/* Tags and Warnings */}
        {!compact && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {/* Dynamic Personalized Warnings */}
            {hasAllergenMatch && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-clay text-white flex items-center gap-1 shadow-sm">
                ⚠️ Allergen Match
              </span>
            )}
            {hasDiabetes && Number(product.sugar || 0) > 10 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-clay/10 text-clay border border-clay/20">
                High Sugar
              </span>
            )}
            {hasHypertension && (Number(product.sodium || 0) > 500 || Number(product.sodium || 0) > 0.5) && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-clay/10 text-clay border border-clay/20">
                High Sodium
              </span>
            )}
            
            {/* Standard Tags */}
            {Array.isArray(product.tags) && product.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  String(t).toLowerCase().includes('alert') || String(t).toLowerCase().includes('sodium') || String(t).toLowerCase().includes('saturated')
                    ? 'bg-clay/10 text-clay'
                    : 'bg-moss-50 dark:bg-white/5 text-moss-700 dark:text-leaf-light'
                }`}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Nutrition summary */}
        {!compact && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-moss-100/70 dark:border-white/8 text-xs flex-wrap">
            <span className="data-num font-semibold text-ink/60 dark:text-white/50">{product.calories} kcal</span>
            <span className="h-3 w-px bg-ink/15 dark:bg-white/10" />
            <span className="data-num font-semibold text-ink/60 dark:text-white/50">{product.sugar}g sugar</span>
            <span className="h-3 w-px bg-ink/15 dark:bg-white/10" />
            <span className="data-num font-semibold text-ink/60 dark:text-white/50">{product.protein}g protein</span>
          </div>
        )}
      </button>

      {/* Action row */}
      {!compact && (
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all focus-ring ${
              isFav
                ? 'bg-clay/10 border-clay/20 text-clay'
                : 'border-moss-100 dark:border-white/10 text-ink/50 dark:text-white/40 hover:border-clay/30 hover:text-clay'
            }`}
          >
            <Heart size={13} className={isFav ? 'fill-clay' : ''} />
            {isFav ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); addToShoppingList(product) }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-moss-100 dark:border-white/10 text-ink/50 dark:text-white/40 hover:bg-mint-tint dark:hover:bg-white/5 focus-ring transition-all"
          >
            <ShoppingCart size={13} />
            Add
          </button>

        </div>
      )}
    </div>
  )
}
