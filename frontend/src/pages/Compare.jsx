import React, { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, X, Trophy, GitCompareArrows, ChevronUp, ChevronDown, Minus } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import HealthScoreRing from '../components/HealthScoreRing.jsx'
import { fetchAllProducts } from '../services/api'
import { PRODUCTS as FALLBACK_PRODUCTS } from '../data/mockData'

const ROWS = [
  { key: 'healthScore',  label: 'Health Score',   unit: '/100', lowerIsBetter: false },
  { key: 'calories',     label: 'Calories',        unit: ' kcal', lowerIsBetter: true },
  { key: 'sugar',        label: 'Sugar',           unit: 'g',    lowerIsBetter: true },
  { key: 'protein',      label: 'Protein',         unit: 'g',    lowerIsBetter: false },
  { key: 'fat',          label: 'Fat',             unit: 'g',    lowerIsBetter: true },
  { key: 'saturatedFat', label: 'Saturated Fat',   unit: 'g',    lowerIsBetter: true },
  { key: 'fiber',        label: 'Fiber',           unit: 'g',    lowerIsBetter: false },
  { key: 'sodium',       label: 'Sodium',          unit: 'mg',   lowerIsBetter: true }
]

function pickReasons(winner, loser) {
  return ROWS.filter((r) => r.key !== 'healthScore').filter((r) => {
    const wv = winner[r.key] || 0, lv = loser[r.key] || 0
    return r.lowerIsBetter ? wv < lv : wv > lv
  }).slice(0, 2).map((r) => {
    const labels = {
      sugar: 'less sugar', calories: 'fewer calories', protein: 'more protein',
      fat: 'less fat', fiber: 'more fiber', sodium: 'less sodium', saturatedFat: 'less saturated fat'
    }
    return labels[r.key] || r.key
  })
}

function ProductSlot({ product, onClear, onChange }) {
  return (
    <div className="glass-panel p-5 relative min-h-[200px] flex flex-col items-center justify-center">
      {product && (
        <button onClick={onClear} className="absolute top-3 right-3 h-6 w-6 rounded-full bg-ink/5 dark:bg-white/10 flex items-center justify-center text-ink/40 hover:text-clay focus-ring transition-colors">
          <X size={13} />
        </button>
      )}
      {product ? (
        <div className="flex flex-col items-center text-center gap-3">
          <div className="h-20 w-20 rounded-xl3 bg-mint-tint dark:bg-white/5 flex items-center justify-center text-4xl">
            {product.image || '🥣'}
          </div>
          <div>
            <p className="font-display font-semibold text-ink dark:text-white text-sm leading-snug">{product.name}</p>
            <p className="text-xs text-ink/40 dark:text-white/40 mt-0.5">{product.brand}</p>
            <p className="text-[11px] text-ink/30 dark:text-white/30">{product.category}</p>
          </div>
          <HealthScoreRing score={product.healthScore} size={80} strokeWidth={8} />
        </div>
      ) : (
        <button onClick={onChange} className="w-full h-full flex flex-col items-center justify-center gap-3 text-ink/30 dark:text-white/25 hover:text-moss-700 dark:hover:text-white focus-ring transition-colors group">
          <div className="h-14 w-14 rounded-xl2 border-2 border-dashed border-current flex items-center justify-center group-hover:border-leaf group-hover:bg-mint-tint transition-all">
            <Plus size={24} />
          </div>
          <span className="text-xs font-semibold">Add a product</span>
        </button>
      )}
    </div>
  )
}

export default function Compare() {
  const [params] = useSearchParams()
  const [productsList, setProductsList] = useState(FALLBACK_PRODUCTS)
  const [slotA, setSlotA] = useState(params.get('a') || 'p2')
  const [slotB, setSlotB] = useState('p3')
  const [pickerFor, setPickerFor] = useState(null)
  const [pickerSearch, setPickerSearch] = useState('')

  useEffect(() => {
    fetchAllProducts().then((res) => {
      if (res && res.length) {
        setProductsList(res)
        const initialA = params.get('a') || res[0]?.id
        const initialB = res[1]?.id || res[0]?.id
        setSlotA(initialA)
        setSlotB(initialB)
      }
    })
  }, [params])

  const a = productsList.find((p) => p.id === slotA || p.firestoreId === slotA)
  const b = productsList.find((p) => p.id === slotB || p.firestoreId === slotB)

  const verdict = useMemo(() => {
    if (!a || !b) return null
    const winner = a.healthScore >= b.healthScore ? a : b
    const loser  = winner === a ? b : a
    const reasons = pickReasons(winner, loser)
    const sugarDiff = loser.sugar > 0 ? Math.round(((loser.sugar - winner.sugar) / loser.sugar) * 100) : 0
    const calDiff   = loser.calories > 0 ? Math.round(((loser.calories - winner.calories) / loser.calories) * 100) : 0
    return { winner, loser, reasons, sugarDiff, calDiff }
  }, [a, b])

  const filteredProducts = productsList.filter((p) =>
    p.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    p.brand.toLowerCase().includes(pickerSearch.toLowerCase())
  )

  const selectProduct = (p) => {
    if (pickerFor === 'a') setSlotA(p.id || p.firestoreId)
    else setSlotB(p.id || p.firestoreId)
    setPickerFor(null)
    setPickerSearch('')
  }

  return (
    <AppShell title="Compare Products">
      {/* Product slots */}
      <div className="grid grid-cols-[1fr,auto,1fr] gap-3 sm:gap-4 items-center fade-in-up">
        <ProductSlot product={a} onClear={() => setSlotA(null)} onChange={() => setPickerFor('a')} />
        <div className="flex items-center justify-center">
          <div className="h-10 w-10 rounded-full bg-mint-tint dark:bg-white/5 flex items-center justify-center">
            <span className="text-xs font-black text-ink/40 dark:text-white/30">VS</span>
          </div>
        </div>
        <ProductSlot product={b} onClear={() => setSlotB(null)} onChange={() => setPickerFor('b')} />
      </div>

      {/* Change product buttons */}
      <div className="grid grid-cols-[1fr,auto,1fr] gap-3 sm:gap-4 mt-2">
        <button onClick={() => setPickerFor('a')} className="text-xs font-semibold text-leaf-dark dark:text-leaf-light hover:underline text-center focus-ring">
          {a ? 'Change A' : 'Select A'}
        </button>
        <div />
        <button onClick={() => setPickerFor('b')} className="text-xs font-semibold text-leaf-dark dark:text-leaf-light hover:underline text-center focus-ring">
          {b ? 'Change B' : 'Select B'}
        </button>
      </div>

      {/* Product picker */}
      {pickerFor && (
        <div className="glass-panel p-5 mt-4 fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink dark:text-white">
              Choose product for slot {pickerFor.toUpperCase()}
            </p>
            <button onClick={() => { setPickerFor(null); setPickerSearch('') }} className="text-ink/30 hover:text-clay focus-ring">
              <X size={16} />
            </button>
          </div>
          <input
            autoFocus
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder="Search products…"
            className="input-base mb-3"
          />
          <div className="grid sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {filteredProducts.map((p) => (
              <button
                key={p.id || p.barcode}
                onClick={() => selectProduct(p)}
                className="text-left text-sm px-3 py-2.5 rounded-xl hover:bg-mint-tint dark:hover:bg-white/5 flex items-center gap-2.5 focus-ring transition-colors"
              >
                <span className="text-xl">{p.image || '🥣'}</span>
                <div className="min-w-0">
                  <p className="font-medium text-ink dark:text-white/90 truncate">{p.name}</p>
                  <p className="text-[11px] text-ink/40 dark:text-white/35">{p.brand} · {p.healthScore}/100</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Verdict banner */}
      {a && b && verdict && (
        <>
          <div className="glass-panel p-5 mt-5 bg-gradient-to-br from-moss-700 to-moss-600 !border-none text-white fade-in-up">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Trophy size={20} className="text-amber" />
              </div>
              <div>
                <p className="text-sm font-bold">Verdict</p>
                <p className="text-sm text-white/85 mt-1 leading-relaxed">
                  <strong>{verdict.winner.name}</strong> is the healthier choice
                  {verdict.reasons.length > 0 && <> — it has {verdict.reasons.join(' and ')}</>}
                  {verdict.sugarDiff > 0 && verdict.winner.sugar < verdict.loser.sugar && (
                    <> ({verdict.sugarDiff}% less sugar)</>
                  )}
                  {verdict.calDiff > 0 && verdict.winner.calories < verdict.loser.calories && (
                    <> and {verdict.calDiff}% fewer calories</>
                  )}.
                </p>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="glass-panel mt-4 overflow-hidden fade-in-up">
            <div className="px-5 py-3 border-b border-moss-100/70 dark:border-white/8 flex items-center gap-2">
              <GitCompareArrows size={16} className="text-leaf" />
              <p className="font-display font-semibold text-ink dark:text-white text-sm">Side-by-side comparison</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-moss-100 dark:border-white/10">
                    <th className="text-left font-semibold text-ink/40 dark:text-white/40 px-5 py-3 text-xs uppercase tracking-wide">Metric</th>
                    <th className="text-center px-5 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">{a.image || '🥣'}</span>
                        <span className="font-semibold text-ink dark:text-white text-xs leading-tight max-w-[100px] text-center">{a.name}</span>
                        {verdict.winner.id === a.id && <span className="text-[10px] bg-leaf text-white px-2 py-0.5 rounded-full font-bold">Winner 🏆</span>}
                      </div>
                    </th>
                    <th className="text-center px-5 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">{b.image || '🥣'}</span>
                        <span className="font-semibold text-ink dark:text-white text-xs leading-tight max-w-[100px] text-center">{b.name}</span>
                        {verdict.winner.id === b.id && <span className="text-[10px] bg-leaf text-white px-2 py-0.5 rounded-full font-bold">Winner 🏆</span>}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => {
                    const aVal = a[row.key] ?? 0, bVal = b[row.key] ?? 0
                    const aBetter = row.lowerIsBetter ? aVal < bVal : aVal > bVal
                    const bBetter = row.lowerIsBetter ? bVal < aVal : bVal > aVal
                    const equal = aVal === bVal
                    return (
                      <tr key={row.key} className="border-b border-moss-50 dark:border-white/5 last:border-0 hover:bg-mint-tint/50 dark:hover:bg-white/3 transition-colors">
                        <td className="px-5 py-3 text-ink/60 dark:text-white/50 font-medium">{row.label}</td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!equal && aBetter && <ChevronUp size={14} className="text-leaf-dark shrink-0" />}
                            {!equal && !aBetter && <ChevronDown size={14} className="text-clay shrink-0" />}
                            {equal && <Minus size={14} className="text-ink/30 shrink-0" />}
                            <span className={`data-num font-bold ${aBetter && !equal ? 'text-leaf-dark dark:text-leaf-light' : equal ? 'text-ink/60 dark:text-white/50' : 'text-ink/70 dark:text-white/60'}`}>
                              {aVal}{row.unit}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!equal && bBetter && <ChevronUp size={14} className="text-leaf-dark shrink-0" />}
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
                    <td className="px-5 py-3 text-ink/60 dark:text-white/50 font-medium align-top">Ingredients</td>
                    <td className="px-5 py-3 text-xs text-ink/50 dark:text-white/40 align-top leading-relaxed">
                      {(a.ingredients || []).slice(0, 4).join(', ')}{(a.ingredients || []).length > 4 ? '…' : ''}
                    </td>
                    <td className="px-5 py-3 text-xs text-ink/50 dark:text-white/40 align-top leading-relaxed">
                      {(b.ingredients || []).slice(0, 4).join(', ')}{(b.ingredients || []).length > 4 ? '…' : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {(!a || !b) && !pickerFor && (
        <div className="glass-panel p-10 text-center mt-4">
          <GitCompareArrows className="mx-auto text-ink/15 dark:text-white/10 mb-3" size={40} />
          <p className="font-display text-lg text-ink dark:text-white">Compare two products</p>
          <p className="text-sm text-ink/50 dark:text-white/40 mt-1">Select products for both slots to see a detailed side-by-side comparison.</p>
        </div>
      )}
    </AppShell>
  )
}
