import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ScanBarcode, Search, ShoppingCart, Heart, ChevronRight } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import FlowSteps from '../components/FlowSteps.jsx'
import ScoreBadge from '../components/ScoreBadge.jsx'
import { PRODUCTS } from '../data/mockData.js'

const FEATURED = [
  { id: 'p1', label: 'Crunchy Masala Oats', sub: 'High fiber · good morning choice' },
  { id: 'p3', label: 'Roasted Chana Snack Mix', sub: 'Protein-led snack' },
  { id: 'p5', label: 'Greek Style Curd', sub: 'Smart everyday dairy' }
]

export default function HomeFlow() {
  const navigate = useNavigate()
  const product = PRODUCTS[0]

  return (
    <AppShell title="Foodie AI Flow">
      <div className="space-y-5">
        <div className="glass-panel overflow-hidden p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-moss-600 dark:text-leaf-light">Smart food journey</p>
              <h1 className="mt-2 font-display text-3xl text-ink dark:text-white">Scan better. Eat smarter.</h1>
            </div>
            <button onClick={() => navigate('/scan')} className="btn-primary inline-flex w-fit items-center gap-2">
              <ScanBarcode size={16} /> Start scan
            </button>
          </div>

          <div className="mt-5">
            <FlowSteps activeIndex={1} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 dark:text-white/40">Recommended now</p>
                <h2 className="mt-1 font-display text-2xl text-ink dark:text-white">Healthy starter pick</h2>
              </div>
              <ScoreBadge score={product.healthScore} />
            </div>

            <div className="mt-4 flex items-start gap-4 rounded-2xl bg-mint-tint p-4 dark:bg-white/5">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-4xl shadow-card dark:bg-[#122117]">{product.image}</div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-ink dark:text-white">{product.name}</p>
                <p className="text-sm text-ink/50 dark:text-white/40">{product.brand} · {product.category}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="tag-chip">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button onClick={() => navigate(`/product/${product.id}`)} className="btn-primary flex-1">View details</button>
              <button onClick={() => navigate('/search')} className="btn-secondary flex-1">Browse products</button>
            </div>
          </div>

          <div className="glass-panel p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/40 dark:text-white/40">Quick actions</p>
            <div className="mt-4 space-y-2">
              {[
                { to: '/scan', label: 'Scan a barcode', icon: ScanBarcode, desc: 'Instant product read' },
                { to: '/search', label: 'Find a product', icon: Search, desc: 'Smart search and filters' },
                { to: '/shopping-list', label: 'Build cart', icon: ShoppingCart, desc: 'Track your shop' }
              ].map(({ to, label, icon: Icon, desc }) => (
                <button key={to} onClick={() => navigate(to)} className="flex w-full items-center gap-3 rounded-2xl border border-moss-100 bg-white/60 p-3 text-left transition hover:bg-mint-tint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-moss-50 text-moss-700 dark:bg-white/5 dark:text-leaf-light"><Icon size={18} /></div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-ink dark:text-white">{label}</div>
                    <div className="text-[11px] text-ink/45 dark:text-white/40">{desc}</div>
                  </div>
                  <ChevronRight size={15} className="text-ink/30 dark:text-white/35" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-ink dark:text-white">Top picks for you</h2>
            <button className="text-sm font-semibold text-moss-700 dark:text-leaf-light" onClick={() => navigate('/favorites')}>View favorites</button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {FEATURED.map((item) => {
              const p = PRODUCTS.find((productItem) => productItem.id === item.id)
              return (
                <button key={item.id} onClick={() => navigate(`/product/${item.id}`)} className="rounded-2xl border border-moss-100 bg-white/70 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-card dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between">
                    <div className="text-3xl">{p.image}</div>
                    <ScoreBadge score={p.healthScore} compact />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink dark:text-white">{p.name}</p>
                  <p className="mt-1 text-[11px] text-ink/45 dark:text-white/40">{item.sub}</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
