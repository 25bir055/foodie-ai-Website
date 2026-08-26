import React, { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, X, Trophy, GitCompareArrows, ChevronUp, ChevronDown, Minus, Search as SearchIcon, ArrowRight } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import HealthScoreRing from '../components/HealthScoreRing.jsx'
import { fetchAllProducts, fetchPersonalizedHealthScore } from '../services/api'
import { useApp } from '../store.jsx'
import { PRODUCTS as FALLBACK_PRODUCTS } from '../data/mockData'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function Compare() {
  const { t } = useLanguage()
  const [params] = useSearchParams()
  const [productsList, setProductsList] = useState(FALLBACK_PRODUCTS)
  const { profile } = useApp()

  // Start with URL param or empty (null) - NO automatic prefilling!
  const [slotA, setSlotA] = useState(() => params.get('a') || null)
  const [slotB, setSlotB] = useState(() => params.get('b') || null)
  const [pickerFor, setPickerFor] = useState(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [mlData, setMlData] = useState({ a: null, b: null, loading: false })

  const ROWS = [
    { key: 'healthScore',  label: t('sort_score') || 'Health Score',   unit: '/100', lowerIsBetter: false },
    { key: 'calories',     label: t('calories') || 'Calories',        unit: ` ${t('kcal') || 'kcal'}`, lowerIsBetter: true },
    { key: 'sugar',        label: t('sugar') || 'Sugar',           unit: 'g',    lowerIsBetter: true },
    { key: 'protein',      label: t('protein') || 'Protein',         unit: 'g',    lowerIsBetter: false },
    { key: 'fat',          label: t('fat') || 'Fat',             unit: 'g',    lowerIsBetter: true },
    { key: 'saturatedFat', label: t('saturated_fat') || 'Saturated Fat',   unit: 'g',    lowerIsBetter: true },
    { key: 'fiber',        label: t('fiber') || 'Fiber',           unit: 'g',    lowerIsBetter: false },
    { key: 'sodium',       label: t('sodium') || 'Sodium',          unit: 'mg',   lowerIsBetter: true }
  ]

  function pickReasons(winner, loser) {
    return ROWS.filter((r) => r.key !== 'healthScore').filter((r) => {
      const wv = Number(winner[r.key] || 0), lv = Number(loser[r.key] || 0)
      return r.lowerIsBetter ? wv < lv : wv > lv
    }).slice(0, 2).map((r) => {
      const labels = {
        sugar: t('less_sugar') || 'less sugar',
        calories: t('fewer_calories') || 'fewer calories',
        protein: t('more_protein') || 'more protein',
        fat: t('less_fat') || 'less fat',
        fiber: t('more_fiber') || 'more fiber',
        sodium: t('less_sodium') || 'less sodium',
        saturatedFat: t('less_sat_fat') || 'less saturated fat'
      }
      return labels[r.key] || r.key
    })
  }

  function ProductSlot({ product, onClear, onChange, slotLabel }) {
    return (
      <div className="glass-panel p-5 relative min-h-[220px] flex flex-col items-center justify-center transition-all">
        {product && (
          <button
            onClick={onClear}
            className="absolute top-3 right-3 h-7 w-7 rounded-full bg-ink/5 dark:bg-white/10 flex items-center justify-center text-ink/40 hover:text-clay hover:bg-clay/10 focus-ring transition-colors"
            title="Remove product"
          >
            <X size={14} />
          </button>
        )}
        {product ? (
          <div className="flex flex-col items-center text-center gap-3 w-full">
            <div className="h-20 w-20 rounded-2xl bg-mint-tint dark:bg-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-contain p-1"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <span className="text-4xl">{product.image || '🥣'}</span>
              )}
            </div>
            <div className="max-w-full px-2">
              <p className="font-display font-semibold text-ink dark:text-white text-sm leading-snug truncate" title={product.name}>
                {product.name}
              </p>
              <p className="text-xs text-ink/50 dark:text-white/40 mt-0.5 truncate">
                {product.brand || 'Product'} {product.category ? `· ${product.category}` : ''}
              </p>
            </div>
            <HealthScoreRing score={product.healthScore || 0} size={76} strokeWidth={7} />
          </div>
        ) : (
          <button
            onClick={onChange}
            className="w-full h-full min-h-[180px] flex flex-col items-center justify-center gap-3 text-ink/40 dark:text-white/30 hover:text-leaf-dark dark:hover:text-leaf-light focus-ring transition-all group p-4 rounded-xl"
          >
            <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-moss-200 dark:border-white/20 flex items-center justify-center group-hover:border-leaf group-hover:bg-mint-tint dark:group-hover:bg-white/5 group-hover:scale-105 transition-all">
              <Plus size={26} className="text-leaf" />
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold block text-ink/70 dark:text-white/70 group-hover:text-leaf-dark dark:group-hover:text-leaf-light">
                {slotLabel ? `${t('select') || 'Select'} ${slotLabel}` : (t('add_product') || 'Add a product')}
              </span>
              <span className="text-[11px] text-ink/40 dark:text-white/40 mt-0.5 block">
                {t('click_to_choose') || 'Click to choose product'}
              </span>
            </div>
          </button>
        )}
      </div>
    )
  }

  function MacroBar({ label, valA, valB, color }) {
    const maxVal = Math.max(valA, valB) || 1
    const pA = (valA / maxVal) * 100
    const pB = (valB / maxVal) * 100
    
    return (
      <div className="mb-4">
        <div className="flex justify-between text-[11px] uppercase mb-1 text-ink/60 dark:text-white/50">
          <span className="font-mono">{valA}g</span>
          <span className="font-semibold text-ink dark:text-white">{label}</span>
          <span className="font-mono">{valB}g</span>
        </div>
        <div className="flex gap-1.5 h-3">
          <div className="flex-1 bg-moss-50 dark:bg-white/5 rounded-l-full overflow-hidden flex justify-end">
            <div className="h-full rounded-l-full transition-all duration-500" style={{ width: `${pA}%`, backgroundColor: color }} />
          </div>
          <div className="flex-1 bg-moss-50 dark:bg-white/5 rounded-r-full overflow-hidden flex justify-start">
            <div className="h-full rounded-r-full transition-all duration-500" style={{ width: `${pB}%`, backgroundColor: color }} />
          </div>
        </div>
      </div>
    )
  }

  // Load products list from backend, without forcing any prefilled slots!
  useEffect(() => {
    fetchAllProducts().then((res) => {
      if (res && res.length) {
        setProductsList(res)
      }
    })
  }, [])

  // Sync if URL search params change
  useEffect(() => {
    const paramA = params.get('a')
    const paramB = params.get('b')
    if (paramA) setSlotA(paramA)
    if (paramB) setSlotB(paramB)
  }, [params])

  // Look up products in productsList or local cache
  const getProduct = (slotId) => {
    if (!slotId) return null
    const found = productsList.find((p) => String(p.id) === String(slotId) || String(p.barcode) === String(slotId) || String(p.firestoreId) === String(slotId))
    if (found) return found
    try {
      const cached = sessionStorage.getItem(`foodie_product_${slotId}`)
      if (cached) return JSON.parse(cached)
    } catch (e) {}
    return null
  }

  const a = getProduct(slotA)
  const b = getProduct(slotB)

  useEffect(() => {
    async function loadMlScores() {
      if (!a || !b) return
      setMlData(prev => ({ ...prev, loading: true }))
      try {
        const [resA, resB] = await Promise.all([
          fetchPersonalizedHealthScore(a, profile),
          fetchPersonalizedHealthScore(b, profile)
        ])
        setMlData({ a: resA, b: resB, loading: false })
      } catch (e) {
        setMlData({ a: null, b: null, loading: false })
      }
    }
    loadMlScores()
  }, [a, b, profile])

  const verdict = useMemo(() => {
    if (!a || !b) return null
    
    let aScore = Number(a.healthScore || 0)
    let bScore = Number(b.healthScore || 0)
    
    if (mlData.a && mlData.b) {
      aScore = mlData.a.predictedHealthScore || aScore
      bScore = mlData.b.predictedHealthScore || bScore
    }
    
    const winner = aScore >= bScore ? a : b
    const loser  = winner === a ? b : a
    const reasons = pickReasons(winner, loser)
    const sugarDiff = Number(loser.sugar || 0) > 0 ? Math.round(((Number(loser.sugar || 0) - Number(winner.sugar || 0)) / Number(loser.sugar || 0)) * 100) : 0
    const calDiff   = Number(loser.calories || 0) > 0 ? Math.round(((Number(loser.calories || 0) - Number(winner.calories || 0)) / Number(loser.calories || 0)) * 100) : 0
    return { winner, loser, reasons, sugarDiff, calDiff }
  }, [a, b, mlData])

  const filteredProducts = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase()
    if (!q) return productsList
    return productsList.filter((p) =>
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.brand || '').toLowerCase().includes(q) ||
      String(p.category || '').toLowerCase().includes(q) ||
      String(p.barcode || '').includes(q)
    )
  }, [productsList, pickerSearch])

  const selectProduct = (p) => {
    const pId = p.id || p.barcode || p.firestoreId
    if (pickerFor === 'a') setSlotA(pId)
    else setSlotB(pId)
    setPickerFor(null)
    setPickerSearch('')
  }

  return (
    <AppShell title={t('compare_products') || "Compare Products"}>
      {/* Header Info */}
      <div className="mb-4">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-ink dark:text-white">
          {t('compare_products') || 'Compare Products'}
        </h1>
        <p className="text-xs sm:text-sm text-ink/50 dark:text-white/40 mt-0.5">
          {t('compare_desc') || 'Select two products to see a side-by-side nutrition and health score comparison.'}
        </p>
      </div>

      {/* Product slots */}
      <div className="grid grid-cols-[1fr,auto,1fr] gap-3 sm:gap-4 items-stretch fade-in-up">
        <ProductSlot
          product={a}
          slotLabel="Product A"
          onClear={() => setSlotA(null)}
          onChange={() => setPickerFor('a')}
        />
        <div className="flex items-center justify-center">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-mint-tint dark:bg-white/5 border border-moss-100 dark:border-white/10 flex items-center justify-center shadow-soft">
            <span className="text-xs sm:text-sm font-black text-moss-700 dark:text-leaf-light">VS</span>
          </div>
        </div>
        <ProductSlot
          product={b}
          slotLabel="Product B"
          onClear={() => setSlotB(null)}
          onChange={() => setPickerFor('b')}
        />
      </div>

      {/* Change product action buttons */}
      <div className="grid grid-cols-[1fr,auto,1fr] gap-3 sm:gap-4 mt-2 mb-2">
        <button
          onClick={() => setPickerFor('a')}
          className="text-xs font-semibold text-leaf-dark dark:text-leaf-light hover:underline text-center focus-ring py-1"
        >
          {a ? t('change_a') || 'Change Product A' : t('select_a') || '+ Select Product A'}
        </button>
        <div />
        <button
          onClick={() => setPickerFor('b')}
          className="text-xs font-semibold text-leaf-dark dark:text-leaf-light hover:underline text-center focus-ring py-1"
        >
          {b ? t('change_b') || 'Change Product B' : t('select_b') || '+ Select Product B'}
        </button>
      </div>

      {/* Product picker modal / drawer */}
      {pickerFor && (
        <div className="glass-panel p-5 mt-4 fade-in-up border-leaf/30 shadow-glow">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-moss-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <GitCompareArrows size={18} className="text-leaf" />
              <p className="text-sm font-semibold text-ink dark:text-white">
                {t('choose_product_for') || 'Choose product for slot'} <span className="text-leaf-dark dark:text-leaf-light uppercase font-bold">{pickerFor}</span>
              </p>
            </div>
            <button
              onClick={() => { setPickerFor(null); setPickerSearch('') }}
              className="text-ink/30 hover:text-clay focus-ring p-1 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search input inside picker */}
          <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-xl px-3.5 py-2.5 mb-3 focus-within:ring-2 focus-within:ring-leaf">
            <SearchIcon size={16} className="text-ink/30 shrink-0" />
            <input
              autoFocus
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search by name, brand, or barcode..."
              className="bg-transparent outline-none text-xs sm:text-sm flex-1 text-ink dark:text-white placeholder:text-ink/30"
            />
            {pickerSearch && (
              <button onClick={() => setPickerSearch('')} className="text-ink/30 hover:text-ink/60">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => {
                const isSelectedInOtherSlot = (pickerFor === 'a' && (slotB === p.id || slotB === p.barcode)) || (pickerFor === 'b' && (slotA === p.id || slotA === p.barcode))
                return (
                  <button
                    key={p.id || p.barcode}
                    onClick={() => selectProduct(p)}
                    className={`text-left text-sm p-3 rounded-xl border transition-all flex items-center gap-3 focus-ring ${
                      isSelectedInOtherSlot
                        ? 'border-moss-100/50 dark:border-white/5 opacity-60 hover:opacity-100'
                        : 'border-moss-100 dark:border-white/10 hover:border-leaf hover:bg-mint-tint/50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="h-11 w-11 rounded-lg bg-mint-tint dark:bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain p-0.5" onError={(e) => e.currentTarget.style.display = 'none'} />
                      ) : (
                        <span className="text-xl">{p.image || '🥣'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs sm:text-sm text-ink dark:text-white/90 truncate">{p.name}</p>
                      <p className="text-[11px] text-ink/50 dark:text-white/40 truncate">{p.brand || 'Product'} · {p.category}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-moss-50 dark:bg-white/5 text-moss-700 dark:text-leaf-light shrink-0">
                      {p.healthScore ?? 65}/100
                    </span>
                  </button>
                )
              })
            ) : (
              <p className="col-span-2 text-center text-xs text-ink/40 dark:text-white/40 py-6">
                No products found matching "{pickerSearch}".
              </p>
            )}
          </div>
        </div>
      )}

      {/* Verdict & Comparisons (Shown only when BOTH A & B are selected) */}
      {a && b && verdict && (
        <>
          {/* Verdict banner */}
          <div className="glass-panel p-5 mt-5 bg-gradient-to-br from-moss-700 to-moss-600 !border-none text-white fade-in-up shadow-glow">
            <div className="flex items-start gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Trophy size={22} className="text-amber" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide uppercase text-white/90">{t('personalized_verdict') || 'Personalized Verdict (AI)'}</p>
                <p className="text-sm text-white/90 mt-1 leading-relaxed">
                  <strong>{verdict.winner.name}</strong> {t('healthier_choice') || 'is the healthier choice for you'}
                  {verdict.reasons.length > 0 && <> {t('it_has') || '— it has'} {verdict.reasons.join(` ${t('and') || 'and'} `)}</>}
                  {verdict.sugarDiff > 0 && Number(verdict.winner.sugar || 0) < Number(verdict.loser.sugar || 0) && (
                    <> ({verdict.sugarDiff}% {t('less_sugar') || 'less sugar'})</>
                  )}
                  {verdict.calDiff > 0 && Number(verdict.winner.calories || 0) < Number(verdict.loser.calories || 0) && (
                    <> {t('and') || 'and'} {verdict.calDiff}% {t('fewer_calories') || 'fewer calories'}</>
                  )}.
                </p>
                
                {mlData.loading ? (
                  <p className="text-xs text-white/70 mt-3 animate-pulse">{t('running_analysis') || 'Running AI nutrition analysis...'}</p>
                ) : (
                  (mlData.a?.insights?.length > 0 || mlData.b?.insights?.length > 0) && (
                    <div className="mt-4 pt-3 border-t border-white/20">
                      <p className="text-xs font-semibold mb-2">{t('health_insights') || 'Health Insights based on your profile:'}</p>
                      {mlData.a?.insights?.map((insight, i) => (
                        <p key={`a-${i}`} className="text-xs text-amber-200">⚠️ {a.name}: {insight}</p>
                      ))}
                      {mlData.b?.insights?.map((insight, i) => (
                        <p key={`b-${i}`} className="text-xs text-amber-200">⚠️ {b.name}: {insight}</p>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
          
          {/* Macros Chart */}
          <div className="glass-panel mt-4 p-5 overflow-hidden fade-in-up">
            <h3 className="font-display font-semibold text-ink dark:text-white text-sm mb-4">{t('macro_comparison') || 'Macro Comparison'}</h3>
            <MacroBar label={t('protein') || "Protein"} valA={Number(a.protein || 0)} valB={Number(b.protein || 0)} color="#4CAE7A" />
            <MacroBar label={t('carbs') || "Carbs"} valA={Number(a.carbs || 0)} valB={Number(b.carbs || 0)} color="#3B82F6" />
            <MacroBar label={t('fat') || "Fat"} valA={Number(a.fat || 0)} valB={Number(b.fat || 0)} color="#EF4444" />
          </div>

          {/* Comparison table */}
          <div className="glass-panel mt-4 overflow-hidden fade-in-up">
            <div className="px-5 py-3.5 border-b border-moss-100/70 dark:border-white/8 flex items-center gap-2">
              <GitCompareArrows size={16} className="text-leaf" />
              <p className="font-display font-semibold text-ink dark:text-white text-sm">{t('side_by_side') || 'Side-by-side comparison'}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-moss-100 dark:border-white/10">
                    <th className="text-left font-semibold text-ink/40 dark:text-white/40 px-5 py-3 text-xs uppercase tracking-wide">{t('metric') || 'Metric'}</th>
                    <th className="text-center px-5 py-3">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="h-10 w-10 rounded-lg bg-mint-tint dark:bg-white/5 flex items-center justify-center overflow-hidden">
                          {a.imageUrl ? (
                            <img src={a.imageUrl} alt={a.name} className="h-full w-full object-contain p-0.5" onError={(e) => e.currentTarget.style.display = 'none'} />
                          ) : (
                            <span className="text-xl">{a.image || '🥣'}</span>
                          )}
                        </div>
                        <span className="font-semibold text-ink dark:text-white text-xs leading-tight max-w-[120px] text-center truncate">{a.name}</span>
                        {verdict.winner.id === a.id && <span className="text-[10px] bg-leaf text-white px-2 py-0.5 rounded-full font-bold">{t('winner') || 'Winner'} 🏆</span>}
                      </div>
                    </th>
                    <th className="text-center px-5 py-3">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="h-10 w-10 rounded-lg bg-mint-tint dark:bg-white/5 flex items-center justify-center overflow-hidden">
                          {b.imageUrl ? (
                            <img src={b.imageUrl} alt={b.name} className="h-full w-full object-contain p-0.5" onError={(e) => e.currentTarget.style.display = 'none'} />
                          ) : (
                            <span className="text-xl">{b.image || '🥣'}</span>
                          )}
                        </div>
                        <span className="font-semibold text-ink dark:text-white text-xs leading-tight max-w-[120px] text-center truncate">{b.name}</span>
                        {verdict.winner.id === b.id && <span className="text-[10px] bg-leaf text-white px-2 py-0.5 rounded-full font-bold">{t('winner') || 'Winner'} 🏆</span>}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => {
                    const aVal = Number(a[row.key] ?? 0), bVal = Number(b[row.key] ?? 0)
                    const aBetter = row.lowerIsBetter ? aVal < bVal : aVal > bVal
                    const bBetter = row.lowerIsBetter ? bVal < aVal : bVal > aVal
                    const equal = aVal === bVal
                    return (
                      <tr key={row.key} className="border-b border-moss-50 dark:border-white/5 last:border-0 hover:bg-mint-tint/50 dark:hover:bg-white/3 transition-colors">
                        <td className="px-5 py-3 text-ink/60 dark:text-white/50 font-medium">{row.label}</td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!equal && aBetter && <ChevronUp size={14} className="text-leaf-dark dark:text-leaf-light shrink-0" />}
                            {!equal && !aBetter && <ChevronDown size={14} className="text-clay shrink-0" />}
                            {equal && <Minus size={14} className="text-ink/30 shrink-0" />}
                            <span className={`data-num font-bold ${aBetter && !equal ? 'text-leaf-dark dark:text-leaf-light' : equal ? 'text-ink/60 dark:text-white/50' : 'text-ink/70 dark:text-white/60'}`}>
                              {aVal}{row.unit}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!equal && bBetter && <ChevronUp size={14} className="text-leaf-dark dark:text-leaf-light shrink-0" />}
                            {!equal && !bBetter && <ChevronDown size={14} className="text-clay shrink-0" />}
                            {equal && <Minus size={14} className="text-ink/30 shrink-0" />}
                            <span className={`data-num font-bold ${bBetter && !equal ? 'text-leaf-dark dark:text-leaf-light' : equal ? 'text-ink/60 dark:text-white/50' : 'text-ink/70 dark:text-white/60'}`}>
                              {bVal}{row.unit}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="border-t border-moss-100 dark:border-white/10">
                    <td className="px-5 py-3 text-ink/60 dark:text-white/50 font-medium align-top">{t('ingredients') || 'Ingredients'}</td>
                    <td className="px-5 py-3 text-xs text-ink/50 dark:text-white/40 align-top leading-relaxed">
                      {(Array.isArray(a.ingredients) ? a.ingredients : []).slice(0, 4).join(', ')}{(Array.isArray(a.ingredients) && a.ingredients.length > 4) ? '…' : ''}
                    </td>
                    <td className="px-5 py-3 text-xs text-ink/50 dark:text-white/40 align-top leading-relaxed">
                      {(Array.isArray(b.ingredients) ? b.ingredients : []).slice(0, 4).join(', ')}{(Array.isArray(b.ingredients) && b.ingredients.length > 4) ? '…' : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* When only 1 product or 0 products selected */}
      {(!a || !b) && !pickerFor && (
        <div className="glass-panel p-10 text-center mt-6 fade-in-up">
          <GitCompareArrows className="mx-auto text-ink/20 dark:text-white/15 mb-3" size={44} />
          <p className="font-display text-base sm:text-lg font-medium text-ink dark:text-white">
            {a || b
              ? (t('select_second_product') || 'Select another product to compare')
              : (t('compare_two') || 'Choose two products to compare')}
          </p>
          <p className="text-xs sm:text-sm text-ink/50 dark:text-white/40 mt-1 max-w-md mx-auto">
            {a || b
              ? `You have selected ${a ? a.name : b.name}. Now click the + button on the other column to pick a product to compare against.`
              : (t('compare_desc') || 'Click on the slots above to choose two products from your catalog or scan history.')}
          </p>
          <div className="flex justify-center gap-3 mt-5">
            {!a && (
              <button
                onClick={() => setPickerFor('a')}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <Plus size={15} /> Select Product A
              </button>
            )}
            {!b && (
              <button
                onClick={() => setPickerFor('b')}
                className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <Plus size={15} /> Select Product B
              </button>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
