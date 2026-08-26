import React, { useMemo, useState, useEffect } from 'react'
import { Search as SearchIcon, SlidersHorizontal, X, Package, Loader2, Key, Sparkles } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { fetchAllProducts, fetchSearchProducts } from '../services/api'
import { searchUsdaFood, getUsdaApiKey, setUsdaApiKey } from '../services/usdaFoodApi'
import { PRODUCTS } from '../data/mockData'
import { useLanguage } from '../context/LanguageContext.jsx'

const CATEGORIES = ['All', 'Breakfast & Cereal', 'Snacks & Biscuits', 'Beverages', 'Dairy', 'Bakery', 'Ready-to-eat']

function matchesCategoryFilter(productCategory, selectedCategory) {
  if (!selectedCategory || selectedCategory === 'All') return true
  if (!productCategory) return false
  const pCat = String(productCategory).toLowerCase().trim()
  const sCat = String(selectedCategory).toLowerCase().trim()

  if (pCat === sCat || pCat.includes(sCat) || sCat.includes(pCat)) return true

  if (selectedCategory === 'Snacks & Biscuits') {
    return /snack|biscuit|cookie|crisp|chip|cracker|wafer|namkeen|confectionery|chocolate|dessert/i.test(pCat)
  }
  if (selectedCategory === 'Beverages') {
    return /beverage|drink|juice|soda|cola|tea|coffee|water|milkshake|syrup|shake/i.test(pCat)
  }
  if (selectedCategory === 'Dairy') {
    return /dairy|milk|cheese|butter|yogurt|curd|paneer|cream/i.test(pCat)
  }
  if (selectedCategory === 'Breakfast & Cereal') {
    return /breakfast|cereal|oat|muesli|cornflake|porridge|grain/i.test(pCat)
  }
  if (selectedCategory === 'Bakery') {
    return /bakery|bread|cake|pastry|bun|toast|rusk|bake/i.test(pCat)
  }
  if (selectedCategory === 'Ready-to-eat') {
    return /ready|instant|noodle|pasta|meal|soup|mix/i.test(pCat)
  }
  return false
}

export default function Search() {
  const { t } = useLanguage()
  const HEALTH_FILTERS = [
    { label: t('sort_score') || 'Any score', min: 0 },
    { label: '🟢 Healthy (70+)', min: 70 },
    { label: '🟡 Moderate (45+)', min: 45 },
    { label: '🔴 Poor only', min: 0, max: 44 }
  ]
  const [query,       setQuery]       = useState('')
  const [category,    setCategory]    = useState('All')
  const [minScore,    setMinScore]    = useState(0)
  const [maxScore,    setMaxScore]    = useState(100)
  const [maxCalories, setMaxCalories] = useState(1000)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy,      setSortBy]      = useState('score')
  const [apiProducts, setApiProducts] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [usdaKeyInput, setUsdaKeyInput] = useState(() => getUsdaApiKey())
  const [showKeyModal, setShowKeyModal] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const cleanQ = query.trim()

    async function executeSearch() {
      try {
        let dbResults = []
        if (cleanQ) {
          dbResults = await fetchSearchProducts(cleanQ)
        } else {
          dbResults = await fetchAllProducts()
        }

        // Live search USDA FoodData Central database if query exists
        let usdaResults = []
        if (cleanQ.length >= 2) {
          try {
            usdaResults = await searchUsdaFood(cleanQ)
          } catch (e) {
            console.warn('USDA search error:', e)
          }
        }

        if (!cancelled) {
          const baseList = (dbResults && dbResults.length > 0) ? dbResults : PRODUCTS
          // Merge USDA results avoiding duplicate barcodes
          const existingBarcodes = new Set(baseList.map(p => String(p.barcode || p.id)))
          const filteredUsda = (usdaResults || []).filter(u => !existingBarcodes.has(String(u.barcode)))

          // Cache USDA results so ProductDetails page can find them by ID
          filteredUsda.forEach(u => {
            try {
              sessionStorage.setItem(`foodie_product_${u.id}`, JSON.stringify(u))
            } catch (e) {
              // ignore storage errors
            }
          })

          setApiProducts([...baseList, ...filteredUsda])
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setApiProducts(PRODUCTS)
          setLoading(false)
        }
      }
    }

    const timer = setTimeout(() => {
      executeSearch()
    }, 200)

    return () => { 
      cancelled = true 
      clearTimeout(timer)
    }
  }, [query])

  const results = useMemo(() => {
    let list = apiProducts || []
    const cleanQ = query.trim().toLowerCase()

    let filtered = list.filter((p) => {
      if (!p) return false

      // If query is active, apply client-side text match for instant local responsiveness
      if (cleanQ) {
        const nameMatch = String(p.name || '').toLowerCase().includes(cleanQ)
        const brandMatch = String(p.brand || '').toLowerCase().includes(cleanQ)
        const catMatch = String(p.category || '').toLowerCase().includes(cleanQ)
        const barcodeMatch = String(p.barcode || '').toLowerCase().includes(cleanQ)
        const ingMatch = Array.isArray(p.ingredients)
          ? p.ingredients.some(i => String(i).toLowerCase().includes(cleanQ))
          : String(p.ingredients || '').toLowerCase().includes(cleanQ)

        if (!nameMatch && !brandMatch && !catMatch && !barcodeMatch && !ingMatch) {
          return false
        }
      }

      const matchesCat = matchesCategoryFilter(p.category, category)
      const pScore = Number(p.healthScore ?? 65)
      const matchesScore = pScore >= minScore && pScore <= maxScore
      const matchesCal = Number(p.calories || 0) <= maxCalories

      return matchesCat && matchesScore && matchesCal
    })

    return filtered.sort((a, b) => {
      if (sortBy === 'score') return Number(b.healthScore || 0) - Number(a.healthScore || 0)
      if (sortBy === 'calories') return Number(a.calories || 0) - Number(b.calories || 0)
      if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''))
      if (sortBy === 'price') return Number(a.price || 0) - Number(b.price || 0)
      return 0
    })
  }, [apiProducts, query, category, minScore, maxScore, maxCalories, sortBy])

  const activeFilterCount = [
    category !== 'All',
    minScore > 0 || maxScore < 100,
    maxCalories < 1000
  ].filter(Boolean).length

  return (
    <AppShell title={t('search_products_title') || 'Search Products'}>
      {/* Search bar */}
      <div className="flex gap-2 fade-in-up">
        <div className="flex-1 flex items-center gap-2.5 bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-leaf transition-shadow">
          <SearchIcon size={18} className="text-ink/30 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_placeholder') || 'Search products by name, brand, or barcode...'}
            className="flex-1 bg-transparent outline-none text-sm text-ink dark:text-white placeholder:text-ink/30"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-ink/30 hover:text-ink/60 focus-ring">
              <X size={15} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowKeyModal(true)}
          className="px-3.5 rounded-xl border border-moss-100 dark:border-white/10 text-ink/70 dark:text-white/70 hover:bg-mint-tint dark:hover:bg-white/5 flex items-center gap-1.5 text-xs font-semibold focus-ring transition-all"
          title="USDA API Key"
        >
          <Key size={15} className="text-leaf-dark dark:text-leaf-light" />
          <span className="hidden sm:inline">{t('usda_key') || 'USDA Key'}</span>
        </button>

        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`relative px-4 rounded-xl border flex items-center gap-2 text-sm font-semibold focus-ring transition-all ${
            showFilters ? 'bg-moss-700 text-white border-moss-700' : 'border-moss-100 dark:border-white/10 text-ink/60 dark:text-white/50 hover:bg-mint-tint dark:hover:bg-white/5'
          }`}
        >
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">{t('filters') || 'Filters'}</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-leaf text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* USDA API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cream dark:bg-[#0E1A14] border border-moss-100 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-glow fade-in-up">
            <div className="flex items-center justify-between mb-4 border-b border-moss-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Key className="text-leaf" size={20} />
                <h3 className="font-display font-semibold text-lg text-ink dark:text-white">{t('usda_key_setup') || 'USDA API Key Setup'}</h3>
              </div>
              <button onClick={() => setShowKeyModal(false)} className="text-ink/30 hover:text-ink/60">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-ink/70 dark:text-white/70 mb-4 leading-relaxed">
              {t('usda_key_desc') || 'Enter your USDA FoodData Central API Key for live global food lookup.'}
            </p>
            <input
              type="text"
              value={usdaKeyInput}
              onChange={(e) => setUsdaKeyInput(e.target.value)}
              placeholder={t('paste_usda_key') || 'Paste USDA Key (or DEMO_KEY)'}
              className="input-base text-xs font-mono mb-4 w-full"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowKeyModal(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                onClick={() => {
                  setUsdaApiKey(usdaKeyInput)
                  setShowKeyModal(false)
                }}
                className="btn-primary text-xs px-4 py-2"
              >
                {t('save_key') || 'Save Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="glass-panel p-5 mt-4 fade-in-up">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <p className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide mb-2">{t('category') || 'Category'}</p>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-base"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide mb-2">{t('health_score') || 'Health Score'}</p>
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
                {t('max_calories') || 'Max Calories'}: <span className="data-num text-ink dark:text-white">{maxCalories} kcal</span>
              </p>
              <input
                type="range" min="50" max="1000" step="25"
                value={maxCalories}
                onChange={(e) => setMaxCalories(Number(e.target.value))}
                className="w-full accent-leaf"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-ink/60 dark:text-white/50 uppercase tracking-wide mb-2">{t('sort_by') || 'Sort By'}</p>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-base"
              >
                <option value="score">{t('sort_score') || 'Health Score (High to Low)'}</option>
                <option value="calories">{t('sort_cal') || 'Calories (Low to High)'}</option>
                <option value="name">{t('sort_name') || 'Name (A to Z)'}</option>
                <option value="price">{t('sort_price') || 'Price (Low to High)'}</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => { setCategory('All'); setMinScore(0); setMaxScore(100); setMaxCalories(1000); setSortBy('score') }}
            className="mt-4 text-xs font-semibold text-clay hover:underline"
          >
            {t('reset_filters') || 'Reset All Filters'}
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
                ? 'bg-moss-700 text-white border-moss-700 shadow-sm'
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
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={14} className="animate-spin text-leaf" /> {t('searching') || 'Searching catalog...'}
            </span>
          ) : (
            <>
              <span className="font-semibold text-ink dark:text-white">{results.length}</span>{' '}
              {t('products_found') || 'products found'}
              {query && (
                <span>
                  {' '}
                  {t('for_query') || 'for'} "<span className="text-leaf-dark dark:text-leaf-light font-semibold">{query}</span>"
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={36} className="animate-spin text-leaf" />
          <p className="text-xs text-ink/40 dark:text-white/40">Fetching food products...</p>
        </div>
      ) : results.length > 0 ? (
        // When searching or viewing a single category, show clean flat grid
        query.trim() || category !== 'All' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 stagger-children">
            {results.map((p) => (
              <ProductCard key={p.id || p.barcode} product={p} />
            ))}
          </div>
        ) : (
          // When browsing All with no search query, group by categories nicely
          <div className="flex flex-col gap-8">
            {CATEGORIES.filter((c) => c !== 'All').map((cat) => {
              const catProducts = results.filter((p) => matchesCategoryFilter(p.category, cat))
              if (catProducts.length === 0) return null
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between border-b border-moss-100 dark:border-white/10 pb-2 mb-3.5">
                    <h3 className="font-display text-base sm:text-lg font-semibold text-ink dark:text-white flex items-center gap-2">
                      {cat}
                      <span className="text-xs font-medium text-ink/40 dark:text-white/40 bg-moss-50 dark:bg-white/5 px-2 py-0.5 rounded-full">
                        {catProducts.length}
                      </span>
                    </h3>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 stagger-children">
                    {catProducts.map((p) => (
                      <ProductCard key={p.id || p.barcode} product={p} />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Other Products not matching standard categories */}
            {(() => {
              const otherProducts = results.filter(
                (p) => !CATEGORIES.filter((c) => c !== 'All').some((cat) => matchesCategoryFilter(p.category, cat))
              )
              if (otherProducts.length === 0) return null
              return (
                <div key="Other">
                  <div className="flex items-center justify-between border-b border-moss-100 dark:border-white/10 pb-2 mb-3.5">
                    <h3 className="font-display text-base sm:text-lg font-semibold text-ink dark:text-white flex items-center gap-2">
                      {t('other_products') || 'Other Packaged Foods'}
                      <span className="text-xs font-medium text-ink/40 dark:text-white/40 bg-moss-50 dark:bg-white/5 px-2 py-0.5 rounded-full">
                        {otherProducts.length}
                      </span>
                    </h3>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 stagger-children">
                    {otherProducts.map((p) => (
                      <ProductCard key={p.id || p.barcode} product={p} />
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )
      ) : (
        <div className="glass-panel p-14 text-center">
          <Package className="mx-auto text-ink/15 dark:text-white/10 mb-3" size={44} />
          <p className="font-display text-lg text-ink dark:text-white font-medium">{t('no_products_match') || 'No products found'}</p>
          <p className="text-sm text-ink/50 dark:text-white/40 mt-1">{t('try_widening') || 'Try adjusting your search terms or filters.'}</p>
          <button
            onClick={() => {
              setQuery('')
              setCategory('All')
              setMinScore(0)
              setMaxScore(100)
              setMaxCalories(1000)
            }}
            className="mt-4 btn-primary inline-flex"
          >
            {t('clear_filters') || 'Clear Filters'}
          </button>
        </div>
      )}
    </AppShell>
  )
}
