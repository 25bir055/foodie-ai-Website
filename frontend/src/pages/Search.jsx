import React, { useMemo, useState, useEffect } from 'react'
import { Search as SearchIcon, SlidersHorizontal, X, Package, Loader2 } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { fetchAllProducts, fetchSearchProducts } from '../services/api'
import { PRODUCTS } from '../data/mockData'

const CATEGORIES = ['All', 'Breakfast & Cereal', 'Snacks & Biscuits', 'Beverages', 'Dairy', 'Bakery', 'Ready-to-eat']
const HEALTH_FILTERS = [
  { label: 'Any score', min: 0 },
  { label: '🟢 Healthy (70+)', min: 70 },
  { label: '🟡 Moderate (45+)', min: 45 },
  { label: '🔴 Poor only', min: 0, max: 44 }
]

export default function Search() {
  const [query,       setQuery]       = useState('')
  const [category,    setCategory]    = useState('All')
  const [minScore,    setMinScore]    = useState(0)
  const [maxScore,    setMaxScore]    = useState(100)
  const [maxCalories, setMaxCalories] = useState(600)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy,      setSortBy]      = useState('score')
  const [apiProducts, setApiProducts] = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const fn = query.trim() ? fetchSearchProducts(query.trim()) : fetchAllProducts()
    fn.then((data) => {
      if (!cancelled) {
        // If Firestore is empty (not seeded yet), fallback to PRODUCTS mockData
        setApiProducts(data && data.length ? data : PRODUCTS)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) {
        setApiProducts(PRODUCTS)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [query])

  const results = useMemo(() => {
    let filtered = apiProducts.filter((p) => {
      const matchesCategory = category === 'All' || p.category === category
      const matchesScore    = p.healthScore >= minScore && p.healthScore <= maxScore
      const matchesCalories = (p.calories || 0) <= maxCalories
      return matchesCategory && matchesScore && matchesCalories
    })
    return filtered.sort((a, b) => {
      if (sortBy === 'score')    return b.healthScore - a.healthScore
      if (sortBy === 'calories') return a.calories - b.calories
      if (sortBy === 'name')     return a.name.localeCompare(b.name)
      if (sortBy === 'price')    return a.price - b.price
      return 0
    })
  }, [apiProducts, category, minScore, maxScore, maxCalories, sortBy])

  const activeFilterCount = [
    category !== 'All',
    minScore > 0 || maxScore < 100,
    maxCalories < 600
  ].filter(Boolean).length

  return (
    <AppShell title="Search Products">
      {/* Search bar */}
      <div className="flex gap-2 fade-in-up">
        <div className="flex-1 flex items-center gap-2.5 bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-leaf transition-shadow">
          <SearchIcon size={18} className="text-ink/30 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name, brand or barcode…"
            className="flex-1 bg-transparent outline-none text-sm text-ink dark:text-white placeholder:text-ink/30"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-ink/30 hover:text-ink/60 focus-ring">
              <X size={15} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`relative px-4 rounded-xl border flex items-center gap-2 text-sm font-semibold focus-ring transition-all ${
            showFilters ? 'bg-moss-700 text-white border-moss-700' : 'border-moss-100 dark:border-white/10 text-ink/60 dark:text-white/50 hover:bg-mint-tint dark:hover:bg-white/5'
          }`}
        >
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-leaf text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="glass-panel p-5 mt-4 fade-in-up">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <p className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide mb-2">Category</p>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-base"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide mb-2">Health Score</p>
              <select
                onChange={(e) => {
                  const idx = Number(e.target.value)
                  const f = HEALTH_FILTERS[idx]
                  setMinScore(f.min)
                  setMaxScore(f.max ?? 100)
                }}
                className="input-base"
              >
                {HEALTH_FILTERS.map((f, i) => <option key={f.label} value={i}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide mb-2">
                Max Calories: <span className="data-num text-ink dark:text-white">{maxCalories}</span>
              </p>
              <input
                type="range" min="50" max="600" step="10"
                value={maxCalories}
                onChange={(e) => setMaxCalories(Number(e.target.value))}
                className="w-full accent-leaf"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide mb-2">Sort By</p>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-base"
              >
                <option value="score">Health Score</option>
                <option value="calories">Calories (low first)</option>
                <option value="name">Name A–Z</option>
                <option value="price">Price (low first)</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => { setCategory('All'); setMinScore(0); setMaxScore(100); setMaxCalories(600); setSortBy('score') }}
            className="mt-4 text-xs font-semibold text-clay hover:underline"
          >
            Reset all filters
          </button>
        </div>
      )}

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto mt-4 pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all focus-ring ${
              category === c
                ? 'bg-moss-700 text-white border-moss-700'
                : 'border-moss-100 dark:border-white/10 text-ink/50 dark:text-white/40 hover:bg-mint-tint dark:hover:bg-white/5'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between mt-5 mb-3">
        <p className="text-sm text-ink/50 dark:text-white/40">
          {loading
            ? <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin text-leaf" /> Searching…</span>
            : <><span className="font-semibold text-ink dark:text-white">{results.length}</span> products found{query && <span> for "<span className="text-leaf-dark dark:text-leaf-light">{query}</span>"</span>}</>
          }
        </p>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-leaf" />
        </div>
      ) : results.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
          {results.map((p) => <ProductCard key={p.id || p.barcode} product={p} />)}
        </div>
      ) : (
        <div className="glass-panel p-14 text-center">
          <Package className="mx-auto text-ink/15 dark:text-white/10 mb-3" size={40} />
          <p className="font-display text-lg text-ink dark:text-white">No products match those filters</p>
          <p className="text-sm text-ink/50 dark:text-white/40 mt-1">Try widening your calorie range or clearing a filter.</p>
          <button
            onClick={() => { setQuery(''); setCategory('All'); setMinScore(0); setMaxCalories(600) }}
            className="mt-4 btn-primary inline-flex"
          >
            Clear filters
          </button>
        </div>
      )}
    </AppShell>
  )
}
