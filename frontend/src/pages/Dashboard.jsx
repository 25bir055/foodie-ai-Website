import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ScanBarcode, Search, ShoppingCart, ArrowRight, Clock,
  Zap, BarChart2, Target, Sparkles
} from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import HealthScoreRing from '../components/HealthScoreRing.jsx'
import { RECENT_SCANS as FALLBACK_SCANS, MACROS_TODAY, AI_INSIGHTS } from '../data/mockData'
import { useApp } from '../store.jsx'

const QUICK_ACTIONS = [
  { to: '/search',        label: 'Search Products',      icon: Search,      desc: 'Find by name or brand' },
  { to: '/shopping-list', label: 'Shopping List',        icon: ShoppingCart, desc: 'Manage your cart'     }
]

const INSIGHT_ICON_MAP = {
  '🍬': { bg: 'bg-[#FBEAE9] dark:bg-[#D9534F]/10', text: 'text-[#B84540] dark:text-[#E8706C]' },
  '🌾': { bg: 'bg-[#EAF3EE] dark:bg-[#2C7C51]/10', text: 'text-[#2C7C51] dark:text-[#7FCB9F]' },
  '💪': { bg: 'bg-[#E8F0F8] dark:bg-[#3E7CB1]/10', text: 'text-[#3E7CB1] dark:text-[#7BA8D4]' },
  '🧂': { bg: 'bg-[#EAF3EE] dark:bg-[#2C7C51]/10', text: 'text-[#2C7C51] dark:text-[#7FCB9F]' },
  '⚠️': { bg: 'bg-[#FBF3E4] dark:bg-[#B8791A]/10', text: 'text-[#B8791A] dark:text-[#E3A23D]' },
  '🚨': { bg: 'bg-[#FBEAE9] dark:bg-[#D9534F]/10', text: 'text-[#B84540] dark:text-[#E8706C]' }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { userName, scanHistory } = useApp()

  const scansToDisplay = useMemo(() => {
    return scanHistory && scanHistory.length > 0 ? scanHistory : FALLBACK_SCANS
  }, [scanHistory])

  // Compute average health score from user's scan history
  const averageHealthScore = useMemo(() => {
    if (!scansToDisplay || scansToDisplay.length === 0) return 74
    const total = scansToDisplay.reduce((sum, item) => sum + (item.healthScore || 50), 0)
    return Math.round(total / scansToDisplay.length)
  }, [scansToDisplay])

  // Dynamic smart nudges based on actual scan history
  const smartNudges = useMemo(() => {
    const nudges = []
    const highSugar = scansToDisplay.find((p) => (p.sugar || 0) > 20)
    if (highSugar) {
      nudges.push(`Consider a low-sugar alternative for ${highSugar.name}`)
    } else {
      nudges.push('Great job! Your recent scanned products are low in added sugar.')
    }

    const highProtein = scansToDisplay.find((p) => (p.protein || 0) >= 15)
    if (highProtein) {
      nudges.push(`${highProtein.name} is giving your daily protein goal a great boost!`)
    } else {
      nudges.push('Try adding high-protein items like Greek Curd or Chana to your daily diet.')
    }

    nudges.push(`Your scan history health score averages ${averageHealthScore}/100.`)
    return nudges
  }, [scansToDisplay, averageHealthScore])

  return (
    <AppShell>
      {/* ── Welcome ──────────────────────────────────────── */}
      <div className="mb-6 fade-in-up">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl2 bg-gradient-to-br from-moss-700 to-leaf flex items-center justify-center text-white font-display font-bold text-lg shadow-soft shrink-0">
            {userName ? userName[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-medium text-ink dark:text-white">
              Hello, {userName} 👋
            </h1>
            <p className="text-ink/50 dark:text-white/40 mt-0.5 text-sm">Make healthier food choices, one scan at a time.</p>
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-leaf/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-moss-700 dark:text-leaf-light">Today</span>
        <span className="rounded-full bg-moss-700/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/60 dark:text-white/55">Firebase Live</span>
      </div>

      {/* ── Main Scan Card ──────────────────────────────── */}
      <button
        onClick={() => navigate('/scan')}
        className="w-full text-left relative overflow-hidden rounded-xl3 bg-gradient-to-br from-moss-700 via-moss-600 to-leaf p-6 sm:p-8 shadow-soft group focus-ring shine fade-in-up fade-in-up-delay-1"
      >
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <div className="barcode-rule h-full w-full text-white" style={{ backgroundSize: '7px 100%' }} />
        </div>
        <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-leaf-light/20 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <ScanBarcode size={32} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white/70 text-[11px] font-semibold uppercase tracking-widest mb-1">AI-Powered Scanner</p>
            <h2 className="font-display text-xl sm:text-2xl font-medium text-white">Scan a Food Product</h2>
            <p className="text-white/70 text-sm mt-1.5 max-w-md leading-relaxed">
              Scan the barcode and discover nutrition, ingredients and personalized health insights instantly.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 bg-white text-moss-700 font-semibold text-sm px-5 py-3 rounded-xl shrink-0 group-hover:gap-3 group-hover:shadow-md transition-all duration-300">
            Scan Product <ArrowRight size={16} />
          </span>
        </div>
      </button>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-medium text-ink dark:text-white flex items-center gap-2"><Target size={18} className="text-leaf" /> Scan Summary</h2>
            <button onClick={() => navigate('/personal-dashboard')} className="text-xs font-semibold text-leaf-dark hover:underline">View details</button>
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-mint-tint p-3 dark:bg-white/5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-ink/40 dark:text-white/35">Avg Scan Health score</p>
                <p className="mt-1 text-2xl font-bold text-ink dark:text-white">{averageHealthScore}</p>
              </div>
              <div className="rounded-full bg-leaf/10 px-2.5 py-1 text-[10px] font-semibold text-moss-700 dark:text-leaf-light">{scansToDisplay.length} Total Scans</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/60 p-3 dark:bg-white/5"><p className="text-[10px] uppercase tracking-[0.13em] text-ink/35 dark:text-white/35">History</p><p className="mt-1 text-lg font-bold text-ink dark:text-white">{scansToDisplay.length}</p></div>
              <div className="rounded-2xl bg-white/60 p-3 dark:bg-white/5"><p className="text-[10px] uppercase tracking-[0.13em] text-ink/35 dark:text-white/35">Sugar Avg</p><p className="mt-1 text-lg font-bold text-ink dark:text-white">12g</p></div>
              <div className="rounded-2xl bg-white/60 p-3 dark:bg-white/5"><p className="text-[10px] uppercase tracking-[0.13em] text-ink/35 dark:text-white/35">Protein Avg</p><p className="mt-1 text-lg font-bold text-ink dark:text-white">14g</p></div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-medium text-ink dark:text-white flex items-center gap-2"><Zap size={18} className="text-leaf" /> Smart nudges</h2>
          </div>
          <div className="mt-4 space-y-2">
            {smartNudges.map((nudge) => (
              <div key={nudge} className="flex items-start gap-3 rounded-2xl bg-mint-tint p-3 dark:bg-white/5"><div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-leaf shrink-0" /><p className="text-sm text-ink/70 dark:text-white/70">{nudge}</p></div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 stagger-children">
        {QUICK_ACTIONS.map(({ to, label, icon: Icon, desc }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="glass-panel p-4 flex items-center gap-3 card-hover focus-ring text-left fade-in-up"
          >
            <div className="h-10 w-10 rounded-xl bg-mint-tint dark:bg-white/5 flex items-center justify-center text-moss-700 dark:text-leaf-light shrink-0">
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink dark:text-white/90">{label}</p>
              <p className="text-[11px] text-ink/40 dark:text-white/35 mt-0.5">{desc}</p>
            </div>
            <ArrowRight size={14} className="ml-auto text-ink/25 shrink-0" />
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr,360px] gap-4 mt-6">
        {/* ── Nutrition Overview ─────────────────────────── */}
        <section>
          <div className="section-header">
            <h2 className="font-display text-lg font-medium text-ink dark:text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-leaf" />
              Nutrition Overview
            </h2>
          </div>
          <div className="glass-panel p-5 sm:p-6">
            <div className="grid sm:grid-cols-[auto,1fr] gap-6 items-center">
              <div className="flex flex-col items-center gap-2 sm:border-r sm:border-moss-100 dark:sm:border-white/10 sm:pr-6">
                <HealthScoreRing score={averageHealthScore} size={120} />
                <p className="text-xs text-ink/50 dark:text-white/40 text-center">Scan Health<br />Score Average</p>
              </div>
              <div className="flex flex-col gap-4">
                {MACROS_TODAY.map((m) => (
                  <div key={m.name}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-ink/70 dark:text-white/60">{m.name}</span>
                      <span className="data-num text-ink/40 dark:text-white/40">{m.value}/{m.goal}{m.unit}</span>
                    </div>
                    <div className="h-2 rounded-full bg-moss-50 dark:bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full progress-animated"
                        style={{ width: `${Math.min(100, (m.value / m.goal) * 100)}%`, backgroundColor: m.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── AI Food Insights ───────────────────────────── */}
        <section>
          <div className="section-header">
            <h2 className="font-display text-lg font-medium text-ink dark:text-white flex items-center gap-2">
              <Sparkles size={18} className="text-leaf" />
              AI Food Insights
            </h2>
          </div>
          <div className="glass-panel p-4 flex flex-col gap-2.5">
            {AI_INSIGHTS.map((ins) => {
              const style = INSIGHT_ICON_MAP[ins.icon] || { bg: 'bg-moss-50', text: 'text-moss-700' }
              return (
                <div
                  key={ins.label}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-mint-tint dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${style.bg}`}>
                    {ins.icon}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${style.text}`}>{ins.label}</p>
                    <p className="text-[11px] text-ink/40 dark:text-white/35 truncate">{ins.products[0]}{ins.products[1] ? `, ${ins.products[1]}` : ''}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ── Recent Scans ───────────────────────────────── */}
      <section className="mt-8">
        <div className="section-header">
          <h2 className="font-display text-lg font-medium text-ink dark:text-white flex items-center gap-2">
            <Clock size={18} className="text-leaf" />
            Recent Scans ({scansToDisplay.length})
          </h2>
          <button onClick={() => navigate('/search')} className="text-xs font-semibold text-leaf-dark hover:underline flex items-center gap-1">
            See all <ArrowRight size={12} />
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {scansToDisplay.slice(0, 6).map((p, idx) => (
            <button
              key={p.id || p.barcode || idx}
              onClick={() => navigate(`/product/${p.id || p.firestoreId}`)}
              className="glass-panel p-4 flex items-center gap-4 card-hover text-left focus-ring"
            >
              <div className="h-14 w-14 rounded-xl2 bg-mint-tint dark:bg-white/5 flex items-center justify-center text-2xl shrink-0">
                {p.image || '🥣'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-ink dark:text-white/90 truncate">{p.name}</p>
                <p className="text-xs text-ink/40 dark:text-white/40">{p.category}</p>
                <p className="text-[11px] text-ink/30 dark:text-white/30 mt-0.5">{p.scannedAt || 'Recently'}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <HealthScoreRing score={p.healthScore || 50} size={44} strokeWidth={5} showLabel={false} />
                <span className="text-[10px] font-semibold text-leaf-dark dark:text-leaf-light">View →</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Today's Tip ─────────────────────────────────── */}
      <section className="mt-6">
        <div className="glass-panel p-5 flex gap-4 items-start bg-gradient-to-r from-moss-700/5 to-transparent dark:from-moss-700/20 border-l-4 border-l-leaf">
          <div className="h-10 w-10 rounded-xl bg-leaf-light/20 flex items-center justify-center shrink-0">
            <Zap size={18} className="text-leaf-dark" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink dark:text-white">Today's Nutrition Tip</p>
            <p className="text-sm text-ink/60 dark:text-white/50 mt-1 leading-relaxed">
              Reading ingredient lists is more important than the nutrition table. If sugar or refined flour is in the first 3 ingredients, it's a treat — not a staple.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
