import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Heart, ShoppingCart, GitCompareArrows, Sparkles,
  TriangleAlert, CheckCircle2, Info, Star, TrendingUp, Loader2,
  WifiOff, RefreshCw
} from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import HealthScoreRing from '../components/HealthScoreRing.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { scoreLabel } from '../data/mockData'
import { fetchProductById, fetchAllProducts, saveScanRecord } from '../services/api'
import { askGeminiAI } from '../services/gemini'
import { useApp } from '../store.jsx'

const NUTRIENTS = [
  { key: 'calories',     label: 'Calories',       unit: 'kcal', icon: '🔥' },
  { key: 'protein',      label: 'Protein',         unit: 'g',    icon: '💪' },
  { key: 'carbs',        label: 'Carbohydrates',   unit: 'g',    icon: '🌾' },
  { key: 'sugar',        label: 'Sugar',           unit: 'g',    icon: '🍬' },
  { key: 'fat',          label: 'Total Fat',        unit: 'g',    icon: '🫧' },
  { key: 'saturatedFat', label: 'Saturated Fat',   unit: 'g',    icon: '⚠️' },
  { key: 'fiber',        label: 'Fiber',            unit: 'g',    icon: '🌿' },
  { key: 'sodium',       label: 'Sodium',           unit: 'mg',   icon: '🧂' },
  { key: 'salt',         label: 'Salt',             unit: 'g',    icon: '🧂' }
]

const ALLERGEN_ICONS = { Milk: '🥛', Nuts: '🥜', Soy: '🌱', Gluten: '🌾', Eggs: '🥚' }
const ALL_ALLERGENS  = ['Milk', 'Nuts', 'Soy', 'Gluten', 'Eggs']

const NUTRISCORE_COLORS = {
  a: { bg: '#1a7f4b', text: '#fff' },
  b: { bg: '#53a02a', text: '#fff' },
  c: { bg: '#f5c800', text: '#333' },
  d: { bg: '#ef7d00', text: '#fff' },
  e: { bg: '#e63312', text: '#fff' }
}

function getNutrientColor(key, value) {
  const thresholds = {
    sugar:        { warn: 10,  bad: 22  },
    sodium:       { warn: 400, bad: 700 },
    saturatedFat: { warn: 5,   bad: 10  },
    calories:     { warn: 350, bad: 500 }
  }
  const t = thresholds[key]
  if (!t) return null
  if (value >= t.bad)  return 'text-clay'
  if (value >= t.warn) return 'text-amber'
  return 'text-leaf-dark dark:text-leaf-light'
}

// ── Internet check ────────────────────────────────────────────────────────
async function checkInternet() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false
  }
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 4000)
    await fetch('https://www.google.com/favicon.ico?' + Date.now(), {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
      cache: 'no-store'
    })
    clearTimeout(id)
    return true
  } catch {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  }
}

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, favorites, toggleFavorite, addToShoppingList, addScanToHistory } = useApp()

  const [product,      setProduct]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [apiError,     setApiError]     = useState(false)
  const [isOffline,    setIsOffline]    = useState(false)
  const [alternatives, setAlternatives] = useState([])

  // AI insights state
  const [aiInsight,    setAiInsight]    = useState('')
  const [aiLoading,    setAiLoading]    = useState(false)

  // ── Load product ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setApiError(false)
    setIsOffline(false)

    const loadProduct = async () => {
      // Check internet first
      const online = await checkInternet()
      if (!online) {
        if (!cancelled) { setIsOffline(true); setLoading(false) }
        return
      }

      try {
        const data = await fetchProductById(id)
        if (cancelled) return
        setProduct(data)
        setLoading(false)

        if (data) {
          // Record scan in local history
          addScanToHistory(data)

          // Save scan to Firestore scans collection
          saveScanRecord({
            userId:      user?.uid || 'anonymous',
            barcode:     data.barcode || id,
            productName: data.name   || 'Unknown',
            healthScore: data.healthScore ?? null
          })

          // Fetch alternatives
          fetchAllProducts().then((all) => {
            if (cancelled) return
            const alts = (all || [])
              .filter(p => p.category === data.category && p.id !== data.id && p.healthScore > data.healthScore)
              .sort((a, b) => b.healthScore - a.healthScore)
              .slice(0, 3)
            setAlternatives(alts)
          })

          // Generate AI insight via Gemini
          setAiLoading(true)
          askGeminiAI('Give me a brief health insight and recommendation for this product.', data)
            .then(insight => { if (!cancelled) { setAiInsight(insight); setAiLoading(false) } })
            .catch(() => {
              if (!cancelled) {
                setAiInsight(data.insight || 'Balanced nutrition profile. Check the nutrition label before consuming.')
                setAiLoading(false)
              }
            })
        }
      } catch {
        if (!cancelled) { setApiError(true); setLoading(false) }
      }
    }

    loadProduct()
    return () => { cancelled = true }
  }, [id])

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppShell title="Product Details">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 size={40} className="text-leaf animate-spin" />
          <p className="text-sm text-ink/50 dark:text-white/40">Loading product details…</p>
        </div>
      </AppShell>
    )
  }

  if (isOffline) {
    return (
      <AppShell title="Product Details">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4 fade-in-up">
          <div className="h-24 w-24 rounded-full bg-clay/10 flex items-center justify-center">
            <WifiOff size={44} className="text-clay" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink dark:text-white">No Internet Connection</h2>
            <p className="text-sm text-ink/50 dark:text-white/40 mt-2 max-w-xs mx-auto leading-relaxed">
              Please connect to the internet to scan products and retrieve product information.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => window.location.reload()} className="flex items-center gap-2 btn-primary">
              <RefreshCw size={16} /> Retry
            </button>
            <button onClick={() => navigate(-1)} className="btn-secondary">Go Back</button>
          </div>
        </div>
      </AppShell>
    )
  }

  if (apiError) {
    return (
      <AppShell title="Product Details">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center fade-in-up">
          <div className="text-7xl">⚠️</div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink dark:text-white">Database Error</h1>
            <p className="text-sm text-ink/50 dark:text-white/40 mt-2 max-w-xs mx-auto">
              Could not retrieve product details from database.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
            <button onClick={() => navigate(-1)} className="btn-secondary">Go Back</button>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!product) {
    return (
      <AppShell title="Product Details">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center fade-in-up">
          <div className="text-7xl select-none">🔍</div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink dark:text-white">Product not found.</h1>
            <p className="text-sm text-ink/50 dark:text-white/40 mt-2 max-w-xs mx-auto">
              This product is not in our database. Try scanning another barcode.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/scan')} className="btn-primary flex items-center gap-2">
              Scan Product
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">Dashboard</button>
          </div>
        </div>
      </AppShell>
    )
  }

  const isFav = favorites.includes(product.id)
  const { label, color } = scoreLabel(product.healthScore)

  // NutriScore display
  const nutriScoreGrade = (product.nutriscoreGrade || product.nutriscore_grade || '').toLowerCase()
  const nutriScoreColors = NUTRISCORE_COLORS[nutriScoreGrade] || { bg: '#999', text: '#fff' }

  // NOVA group
  const novaGroup = product.novaGroup || product.nova_group || null
  const novaLabel = novaGroup ? String(novaGroup).replace('1 - ', '').replace('2 - ', '').replace('3 - ', '').replace('4 - ', '') : null

  // Salt
  const saltValue = product.salt ?? product.salt_g ?? null

  return (
    <AppShell title="Product Details">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-ink/50 dark:text-white/40 hover:text-moss-700 dark:hover:text-white mb-5 focus-ring transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* ── Product Summary Card ─────────────────────────────── */}
      <div className="glass-panel p-5 sm:p-7 fade-in-up">
        <div className="flex flex-col sm:flex-row gap-6 sm:items-start">

          {/* Product Image */}
          <div className="h-36 w-36 rounded-2xl bg-gradient-to-br from-mint-tint to-moss-50 dark:from-white/5 dark:to-white/3 flex items-center justify-center shrink-0 mx-auto sm:mx-0 shadow-inner overflow-hidden border border-moss-100/50 dark:border-white/5">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain p-2"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
              />
            ) : null}
            <span className={`text-5xl ${product.imageUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
              {product.image || '🥣'}
            </span>
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <span className="text-[11px] uppercase tracking-widest text-ink/40 dark:text-white/40 font-semibold">
              {product.category}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-medium text-ink dark:text-white mt-1 leading-tight">
              {product.name}
            </h1>
            <p className="text-sm text-ink/50 dark:text-white/40 mt-1">{product.brand}</p>
            <p className="text-xs data-num text-ink/30 dark:text-white/25 mt-2">
              Barcode: {product.barcode}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              {/* NutriScore badge */}
              {nutriScoreGrade && (
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full uppercase"
                  style={{ backgroundColor: nutriScoreColors.bg, color: nutriScoreColors.text }}
                >
                  Nutri-Score {nutriScoreGrade.toUpperCase()}
                </span>
              )}
              {/* NOVA Group badge */}
              {novaGroup && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber/10 text-amber border border-amber/20">
                  NOVA {String(novaGroup).charAt(0)}
                </span>
              )}
              {(product.tags || []).map((t) => (
                <span key={t} className={t.toLowerCase().includes('alert') || t.toLowerCase().includes('sodium') ? 'tag-chip-alert' : 'tag-chip'}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="shrink-0 mx-auto sm:mx-0">
            <HealthScoreRing score={product.healthScore} size={120} />
          </div>
        </div>
      </div>

      {/* ── Action Buttons ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        <button
          onClick={() => addToShoppingList(product)}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <ShoppingCart size={16} /> Add to List
        </button>
        <button
          onClick={() => toggleFavorite(product.id)}
          className={`flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl border transition-all focus-ring ${
            isFav ? 'bg-clay/10 border-clay/30 text-clay' : 'btn-secondary'
          }`}
        >
          <Heart size={16} className={isFav ? 'fill-clay' : ''} />
          {isFav ? 'Saved' : 'Save'}
        </button>
        <button
          onClick={() => navigate(`/compare?a=${product.id}`)}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <GitCompareArrows size={16} /> Compare
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        {/* ── Nutrition Table ─────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="glass-panel p-5 sm:p-6">
            <h2 className="font-display text-lg font-medium text-ink dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-leaf" />
              Nutrition Facts
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {NUTRIENTS.map((n) => {
                const val = product[n.key]
                if (val === null || val === undefined || val === '') return null
                const valColor = getNutrientColor(n.key, val)
                return (
                  <div key={n.key} className="bg-mint-tint dark:bg-white/5 rounded-xl2 p-3.5 flex flex-col gap-1">
                    <span className="text-lg">{n.icon}</span>
                    <p className="text-[11px] uppercase tracking-wide text-ink/40 dark:text-white/40 font-semibold">{n.label}</p>
                    <p className={`data-num text-xl font-bold mt-0.5 ${valColor || 'text-ink dark:text-white'}`}>
                      {val}
                      <span className="text-xs font-normal text-ink/40 dark:text-white/35 ml-1">{n.unit}</span>
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Scores row */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {nutriScoreGrade && (
                <div className="rounded-xl p-3.5 flex items-center gap-3" style={{ backgroundColor: `${nutriScoreColors.bg}18` }}>
                  <span className="text-2xl font-black px-2 py-1 rounded-lg" style={{ backgroundColor: nutriScoreColors.bg, color: nutriScoreColors.text }}>
                    {nutriScoreGrade.toUpperCase()}
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold text-ink/40 dark:text-white/40">Nutri-Score</p>
                    <p className="text-sm font-semibold text-ink dark:text-white mt-0.5">Grade {nutriScoreGrade.toUpperCase()}</p>
                  </div>
                </div>
              )}
              {novaGroup && (
                <div className="rounded-xl p-3.5 bg-amber/10 flex items-center gap-3">
                  <span className="text-2xl font-black text-amber w-10 text-center">{String(novaGroup).charAt(0)}</span>
                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold text-ink/40 dark:text-white/40">NOVA Group</p>
                    <p className="text-xs text-ink/60 dark:text-white/50 mt-0.5 leading-tight">{novaLabel}</p>
                  </div>
                </div>
              )}
            </div>

            {/* AI Health Insight */}
            <div className="mt-5 rounded-xl2 bg-gradient-to-br from-moss-700 to-moss-600 p-5 text-white relative overflow-hidden">
              <div className="absolute -right-8 -top-8 opacity-10">
                <Sparkles size={100} />
              </div>
              <div className="relative flex items-center gap-2.5 mb-3">
                <div className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center">
                  <Sparkles size={15} className="text-leaf-light" />
                </div>
                <div>
                  <p className="text-sm font-semibold">AI Health Insights</p>
                  <p className="text-[11px] text-white/60">Powered by Gemini AI</p>
                </div>
              </div>
              {aiLoading ? (
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Loader2 size={14} className="animate-spin" /> Generating insights…
                </div>
              ) : (
                <p className="relative text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
                  {aiInsight || product.insight || 'Balanced nutrition profile.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Ingredients + Allergens + Scores ─────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Ingredients */}
          <div className="glass-panel p-5">
            <h2 className="font-display text-base font-medium text-ink dark:text-white mb-3 flex items-center gap-2">
              <Info size={16} className="text-leaf" /> Ingredients
            </h2>
            {product.ingredients && product.ingredients.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {product.ingredients.map((ing, i) => {
                  const flagged = (product.concerningIngredients || []).includes(ing)
                  return (
                    <span
                      key={`${ing}-${i}`}
                      className={`text-xs px-2.5 py-1 rounded-full border ${
                        flagged
                          ? 'bg-clay/10 border-clay/30 text-clay font-semibold'
                          : 'bg-moss-50 dark:bg-white/5 border-transparent text-ink/60 dark:text-white/50'
                      }`}
                    >
                      {ing}
                    </span>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-ink/40 dark:text-white/30 italic">No ingredient data available.</p>
            )}
          </div>

          {/* Allergens */}
          <div className="glass-panel p-5">
            <h2 className="font-display text-base font-medium text-ink dark:text-white mb-3 flex items-center gap-2">
              <TriangleAlert size={16} className="text-amber" /> Allergen Detection
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {ALL_ALLERGENS.map((a) => {
                const present = (product.allergens || []).includes(a)
                return (
                  <div
                    key={a}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      present
                        ? 'bg-clay/10 text-clay border border-clay/20'
                        : 'bg-moss-50 dark:bg-white/5 text-ink/40 dark:text-white/30'
                    }`}
                  >
                    <span className="text-base">{ALLERGEN_ICONS[a]}</span>
                    {a}
                    {present
                      ? <TriangleAlert size={12} className="ml-auto shrink-0" />
                      : <CheckCircle2 size={12} className="ml-auto opacity-40 shrink-0" />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Health Score Summary */}
          <div className="glass-panel p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-ink/40 dark:text-white/35 uppercase tracking-wide font-semibold">Health Score</p>
              <p className="data-num text-2xl font-bold text-ink dark:text-white mt-0.5">
                {product.healthScore ?? '—'}<span className="text-sm font-normal text-ink/40">/100</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink/40 dark:text-white/35">Rating</p>
              <p className="font-semibold text-sm mt-0.5" style={{ color }}>
                {label}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Healthier Alternatives ──────────────────────────── */}
      {alternatives.length > 0 && (
        <section className="mt-8">
          <div className="section-header">
            <h2 className="font-display text-lg font-medium text-ink dark:text-white flex items-center gap-2">
              <Star size={18} className="text-leaf" /> Healthier Alternatives
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alternatives.map((alt) => (
              <div key={alt.id} className="relative">
                <ProductCard product={alt} />
                <div className="absolute top-3 left-3 bg-leaf text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  +{alt.healthScore - product.healthScore} pts
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  )
}
