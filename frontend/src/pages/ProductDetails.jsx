import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Heart, ShoppingCart, GitCompareArrows, Sparkles,
  TriangleAlert, CheckCircle2, Info, Star, TrendingUp, Loader2,
  WifiOff, RefreshCw, AlertCircle
} from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import HealthScoreRing from '../components/HealthScoreRing.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { scoreLabel } from '../data/mockData'
import { fetchProductById, fetchAllProducts, saveScanRecord, fetchPersonalizedHealthScore, fetchFamilyMembers } from '../services/api'
import { askGeminiAI } from '../services/gemini'
import { auditProductForFamily } from '../utils/familySafety.js'
import { useApp } from '../store.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

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

// ── Internet check helper ───────────────────────────────────────────────────
function checkInternet() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile, favorites, toggleFavorite, addToShoppingList, addScanToHistory } = useApp()
  const { t } = useLanguage()

  const [product,      setProduct]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [apiError,     setApiError]     = useState(false)
  const [isOffline,    setIsOffline]    = useState(false)
  const [alternatives, setAlternatives] = useState([])

  // AI insights state
  const [aiInsight,    setAiInsight]    = useState('')
  const [aiLoading,    setAiLoading]    = useState(false)

  // Family Members State for Household Safety Audit
  const [familyMembers, setFamilyMembers] = useState([])

  useEffect(() => {
    const loadFamily = async () => {
      try {
        const data = await fetchFamilyMembers()
        if (Array.isArray(data)) setFamilyMembers(data)
      } catch (e) {
        console.warn('Family fetch error:', e)
      }
    }
    loadFamily()
  }, [])

  // ── Load product ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setApiError(false)
    setIsOffline(false)

    const loadProduct = async () => {
      // Check online status
      const online = checkInternet()
      if (!online) {
        if (!cancelled) { setIsOffline(true); setLoading(false) }
        return
      }

      try {
        const data = await fetchProductById(id)
        if (!data) {
          if (!cancelled) {
            setProduct(null)
            setLoading(false)
          }
          return
        }

        let finalData = { ...data }
        
        // Fetch personalized health score non-blockingly
        if (profile) {
          try {
            const mlResult = await fetchPersonalizedHealthScore(data, profile)
            if (mlResult && mlResult.predictedHealthScore !== undefined) {
              finalData.healthScore = mlResult.predictedHealthScore
              if (mlResult.insights && mlResult.insights.length > 0) {
                finalData.personalizedInsights = mlResult.insights
              }
            }
          } catch (mlErr) {
            console.warn('ML personalized scoring skipped:', mlErr)
          }
        }

        if (cancelled) return
        setProduct(finalData)
        setLoading(false)

        // Record scan in local history & database
        addScanToHistory(finalData)

        saveScanRecord({
          userId:      user?.uid || user?._id || 'anonymous',
          barcode:     data.barcode || id,
          productName: data.name   || 'Unknown',
          healthScore: data.healthScore ?? null
        })

        // Fetch alternatives in background
        fetchAllProducts().then((all) => {
          if (cancelled) return
          const alts = (all || [])
            .filter(p => p.category === data.category && String(p.id) !== String(data.id) && (p.healthScore || 0) > (data.healthScore || 0))
            .sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0))
            .slice(0, 3)
          setAlternatives(alts)
        }).catch(() => {})

        // Generate AI insight via Gemini in background
        setAiLoading(true)
        askGeminiAI('Give me a brief health insight and recommendation for this product.', data)
          .then(insight => { if (!cancelled) { setAiInsight(insight); setAiLoading(false) } })
          .catch(() => {
            if (!cancelled) {
              setAiInsight(data.insight || 'Balanced nutrition profile. Check the nutrition label before consuming.')
              setAiLoading(false)
            }
          })
      } catch (err) {
        console.error('Product load error:', err)
        if (!cancelled) {
          // If we already have a product, keep showing it
          setLoading(false)
        }
      }
    }

    loadProduct()
    return () => { cancelled = true }
  }, [id])

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppShell title={t('product_details') || "Product Details"}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 size={40} className="text-leaf animate-spin" />
          <p className="text-sm text-ink/50 dark:text-white/40">{t('loading_product') || 'Loading product details…'}</p>
        </div>
      </AppShell>
    )
  }

  if (isOffline) {
    return (
      <AppShell title={t('product_details') || "Product Details"}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4 fade-in-up">
          <div className="h-24 w-24 rounded-full bg-clay/10 flex items-center justify-center">
            <WifiOff size={44} className="text-clay" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink dark:text-white">{t('no_internet') || 'No Internet Connection'}</h2>
            <p className="text-sm text-ink/50 dark:text-white/40 mt-2 max-w-xs mx-auto leading-relaxed">
              {t('no_internet_desc_product') || 'Please connect to the internet to scan products and retrieve product information.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => window.location.reload()} className="flex items-center gap-2 btn-primary">
              <RefreshCw size={16} /> {t('retry') || 'Retry'}
            </button>
            <button onClick={() => navigate(-1)} className="btn-secondary">{t('go_back') || 'Go Back'}</button>
          </div>
        </div>
      </AppShell>
    )
  }

  if (apiError) {
    return (
      <AppShell title={t('product_details') || "Product Details"}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center fade-in-up">
          <div className="text-7xl">⚠️</div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink dark:text-white">{t('database_error') || 'Database Error'}</h1>
            <p className="text-sm text-ink/50 dark:text-white/40 mt-2 max-w-xs mx-auto">
              {t('could_not_retrieve') || 'Could not retrieve product details from database.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => window.location.reload()} className="btn-primary">{t('retry') || 'Retry'}</button>
            <button onClick={() => navigate(-1)} className="btn-secondary">{t('go_back') || 'Go Back'}</button>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!product) {
    return (
      <AppShell title={t('product_details') || "Product Details"}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center fade-in-up">
          <div className="text-7xl select-none">🔍</div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink dark:text-white">{t('product_not_found') || 'Product not found.'}</h1>
            <p className="text-sm text-ink/50 dark:text-white/40 mt-2 max-w-xs mx-auto">
              {t('not_in_database') || 'This product is not in our database. Try scanning another barcode.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/scan')} className="btn-primary flex items-center gap-2">
              {t('scan_product') || 'Scan Product'}
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">{t('dashboard') || 'Dashboard'}</button>
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
    <AppShell title={t('product_details') || "Product Details"}>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-ink/50 dark:text-white/40 hover:text-moss-700 dark:hover:text-white mb-5 focus-ring transition-colors"
      >
        <ArrowLeft size={16} /> {t('back') || 'Back'}
      </button>

      {/* 👨‍👩‍👧‍👦 WHOLE FAMILY HEALTH & ALLERGY AUDIT */}
      {(() => {
        const familyAudit = auditProductForFamily(product, profile, familyMembers)
        const hasAffected = familyAudit.affectedMembers.length > 0

        return (
          <div className="mb-6 glass-panel p-5 rounded-3xl border border-moss-100 dark:border-white/10 shadow-soft fade-in-up space-y-3.5 bg-white dark:bg-[#12211A]">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-base text-ink dark:text-white flex items-center gap-2">
                <span>👨‍👩‍👧‍👦 Family & Household Safety Audit</span>
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                hasAffected 
                  ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300' 
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
              }`}>
                {hasAffected ? '⚠️ Caution for Family' : '✅ 100% Safe for Entire Household'}
              </span>
            </div>

            {hasAffected ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                  🚨 Cannot Consume / Dangerous for ({familyAudit.affectedMembers.length} member{familyAudit.affectedMembers.length > 1 ? 's' : ''}):
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {familyAudit.affectedMembers.map((m, mIdx) => (
                    <div key={mIdx} className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs">
                      <div className="flex items-center justify-between gap-1 flex-wrap mb-1">
                        <span className="font-bold text-red-900 dark:text-red-100 flex items-center gap-1">
                          <span>👤 {m.name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-200 dark:bg-red-900/80 text-red-800 dark:text-red-200">
                            {m.relationship}
                          </span>
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800">
                          {m.trigger}
                        </span>
                      </div>
                      {m.clinicalDetail && (
                        <p className="text-[11px] text-red-800 dark:text-red-300 leading-snug">
                          {m.clinicalDetail}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>Great news! No allergies or medical condition risks were found for any of your {familyAudit.totalHouseholdCount} family members.</span>
              </div>
            )}

            {/* Safe Members Chips */}
            {familyAudit.safeMembers.length > 0 && (
              <div className="pt-2 border-t border-moss-100/70 dark:border-white/5 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  ✅ Safe for:
                </span>
                {familyAudit.safeMembers.map((sm, sIdx) => (
                  <span key={sIdx} className="text-xs px-2.5 py-1 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200/60 dark:border-emerald-900/40">
                    {sm.name} ({sm.relationship})
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {product.allergenWarning && (
        <div className="mb-5 p-4 rounded-2xl bg-clay/10 border border-clay/30 flex items-start gap-3 fade-in-up">
          <div className="p-2 rounded-xl bg-clay/20 shrink-0">
            <AlertCircle size={20} className="text-clay" />
          </div>
          <div>
            <h3 className="text-clay font-bold text-sm uppercase tracking-wide">{t('allergy_warning') || 'Allergy Warning'}</h3>
            <p className="text-sm text-clay/90 mt-0.5">{product.allergenWarning}</p>
          </div>
        </div>
      )}

      {product.personalizedInsights && product.personalizedInsights.length > 0 && (
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-leaf-light/20 to-transparent border border-leaf-light/30 flex items-start gap-4 fade-in-up relative overflow-hidden">
          <div className="p-2.5 rounded-xl bg-leaf-light/30 shrink-0">
            <Sparkles size={22} className="text-leaf-dark dark:text-leaf-light" />
          </div>
          <div className="relative z-10">
            <h3 className="text-leaf-dark dark:text-leaf-light font-display font-semibold text-base mb-1">{t('personalized_for_you') || 'Personalized For You'}</h3>
            <ul className="text-sm text-ink/80 dark:text-white/80 leading-relaxed font-medium space-y-1">
              {product.personalizedInsights.map((insight, idx) => (
                <li key={idx}>{insight}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

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
              {t('barcode_label') || 'Barcode:'} {product.barcode}
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
                  {t('nova') || 'NOVA'} {String(novaGroup).charAt(0)}
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
          <ShoppingCart size={16} /> {t('add_to_list') || 'Add to List'}
        </button>
        <button
          onClick={() => toggleFavorite(product.id)}
          className={`flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl border transition-all focus-ring ${
            isFav ? 'bg-clay/10 border-clay/30 text-clay' : 'btn-secondary'
          }`}
        >
          <Heart size={16} className={isFav ? 'fill-clay' : ''} />
          {isFav ? (t('saved') || 'Saved') : (t('save') || 'Save')}
        </button>
        <button
          onClick={() => navigate(`/compare?a=${product.id}`)}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <GitCompareArrows size={16} /> {t('compare') || 'Compare'}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        {/* ── Nutrition Table ─────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="glass-panel p-5 sm:p-6">
            <h2 className="font-display text-lg font-medium text-ink dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-leaf" />
              {t('nutrition_facts') || 'Nutrition Facts'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {NUTRIENTS.map((n) => {
                const val = product[n.key]
                if (val === null || val === undefined || val === '') return null
                const valColor = getNutrientColor(n.key, val)
                return (
                  <div key={n.key} className="bg-mint-tint dark:bg-white/5 rounded-xl2 p-3.5 flex flex-col gap-1">
                    <span className="text-lg">{n.icon}</span>
                    <p className="text-[11px] uppercase tracking-wide text-ink/40 dark:text-white/40 font-semibold">{t(n.key) || n.label}</p>
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
                    <p className="text-xs uppercase tracking-wide font-semibold text-ink/40 dark:text-white/40">{t('nutri_score_title') || 'Nutri-Score'}</p>
                    <p className="text-sm font-semibold text-ink dark:text-white mt-0.5">{t('grade') || 'Grade'} {nutriScoreGrade.toUpperCase()}</p>
                  </div>
                </div>
              )}
              {novaGroup && (
                <div className="rounded-xl p-3.5 bg-amber/10 flex items-center gap-3">
                  <span className="text-2xl font-black text-amber w-10 text-center">{String(novaGroup).charAt(0)}</span>
                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold text-ink/40 dark:text-white/40">{t('nova_group') || 'NOVA Group'}</p>
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
                  <p className="text-sm font-semibold">{t('ai_health_insights') || 'AI Health Insights'}</p>
                  <p className="text-[11px] text-white/60">{t('powered_by_gemini') || 'Powered by Gemini AI'}</p>
                </div>
              </div>
              {aiLoading ? (
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Loader2 size={14} className="animate-spin" /> {t('generating_insights') || 'Generating insights…'}
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
              <Info size={16} className="text-leaf" /> {t('ingredients_title') || 'Ingredients'}
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
              <p className="text-sm text-ink/40 dark:text-white/30 italic">{t('no_ingredient_data') || 'No ingredient data available.'}</p>
            )}
          </div>

          {/* Allergens */}
          <div className="glass-panel p-5">
            <h2 className="font-display text-base font-medium text-ink dark:text-white mb-3 flex items-center gap-2">
              <TriangleAlert size={16} className="text-amber" /> {t('allergen_detection') || 'Allergen Detection'}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {ALL_ALLERGENS.map((a) => {
                const prodAllergens = Array.isArray(product.allergens)
                  ? product.allergens
                  : (typeof product.allergens === 'string' ? product.allergens.split(',') : [])
                const present = prodAllergens.some(al => String(al).toLowerCase().includes(a.toLowerCase()))
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
              <p className="text-xs text-ink/40 dark:text-white/35 uppercase tracking-wide font-semibold">{t('health_score') || 'Health Score'}</p>
              <p className="data-num text-2xl font-bold text-ink dark:text-white mt-0.5">
                {product.healthScore ?? '—'}<span className="text-sm font-normal text-ink/40">/100</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink/40 dark:text-white/35">{t('rating') || 'Rating'}</p>
              <p className="font-semibold text-sm mt-0.5" style={{ color }}>
                {t(label.toLowerCase().replace(/ /g, '_')) || label}
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
              <Star size={18} className="text-leaf" /> {t('healthier_alternatives') || 'Healthier Alternatives'}
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
