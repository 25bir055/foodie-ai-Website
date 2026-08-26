import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Trash2, Check, ShoppingCart, Plus, Minus, Package2, ArrowRight } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import { useApp } from '../store.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function ShoppingList() {
  const { shoppingList, removeFromShoppingList, togglePurchased, addToShoppingList } = useApp()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')

  const categories = useMemo(() => ['All', ...new Set(shoppingList.map((p) => p.category))], [shoppingList])

  const filtered = shoppingList.filter((p) => {
    const matchQ = p.name.toLowerCase().includes(query.toLowerCase())
    const matchC = category === 'All' || p.category === category
    return matchQ && matchC
  })

  const total = shoppingList.reduce((sum, p) => sum + p.price * p.qty, 0)
  const purchasedCount = shoppingList.filter((p) => p.purchased).length
  const pendingCount = shoppingList.length - purchasedCount

  const progress = shoppingList.length > 0 ? Math.round((purchasedCount / shoppingList.length) * 100) : 0

  return (
    <AppShell title={t('my_shopping_list')}>
      {/* Stats bar */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row sm:items-center gap-4 mb-5 fade-in-up">
        <div className="flex gap-5 flex-1">
          <div className="text-center">
            <p className="data-num text-2xl font-bold text-ink dark:text-white">{shoppingList.length}</p>
            <p className="text-[11px] text-ink/40 dark:text-white/40 mt-0.5">{t('items')}</p>
          </div>
          <div className="text-center">
            <p className="data-num text-2xl font-bold text-leaf-dark dark:text-leaf-light">{purchasedCount}</p>
            <p className="text-[11px] text-ink/40 dark:text-white/40 mt-0.5">{t('purchased')}</p>
          </div>
          <div className="text-center">
            <p className="data-num text-2xl font-bold text-amber">{pendingCount}</p>
            <p className="text-[11px] text-ink/40 dark:text-white/40 mt-0.5">{t('remaining')}</p>
          </div>
        </div>
        <div className="flex-1 sm:max-w-xs">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-ink/60 dark:text-white/50">{t('progress')}</span>
            <span className="data-num text-ink/40 dark:text-white/40">{progress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-moss-100 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-leaf progress-animated" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-xl px-3.5 py-2.5 flex-1 focus-within:ring-2 focus-within:ring-leaf transition-shadow">
          <Search size={15} className="text-ink/30 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_list')}
            className="bg-transparent outline-none text-sm flex-1 text-ink dark:text-white placeholder:text-ink/30"
          />
        </div>
        <button
          onClick={() => navigate('/search')}
          className="btn-primary flex items-center gap-2 justify-center shrink-0"
        >
          <Plus size={16} /> {t('add_products')}
        </button>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        {categories.map((c) => (
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

      {/* Items */}
      {filtered.length ? (
        <div className="flex flex-col gap-2.5">
          {filtered.map((p) => (
            <div
              key={p.id}
              className={`glass-panel p-4 flex items-center gap-4 transition-all ${p.purchased ? 'opacity-55' : ''}`}
            >
              {/* Check button */}
              <button
                onClick={() => togglePurchased(p.id)}
                className={`h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 focus-ring transition-all ${
                  p.purchased
                    ? 'bg-leaf border-leaf text-white'
                    : 'border-moss-200 dark:border-white/20 hover:border-leaf'
                }`}
              >
                {p.purchased && <Check size={13} />}
              </button>

              {/* Product image */}
              <div className="h-12 w-12 rounded-xl bg-mint-tint dark:bg-white/5 flex items-center justify-center text-2xl shrink-0">
                {p.image}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold text-ink dark:text-white/90 truncate ${p.purchased ? 'line-through' : ''}`}>
                  {p.name}
                </p>
                <p className="text-xs text-ink/40 dark:text-white/40">{p.category}</p>
              </div>

              {/* Qty controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    if (p.qty <= 1) removeFromShoppingList(p.id)
                    else addToShoppingList({ ...p, qty: -1 })
                  }}
                  className="h-7 w-7 rounded-lg bg-moss-50 dark:bg-white/5 flex items-center justify-center text-ink/60 hover:bg-moss-100 dark:hover:bg-white/10 focus-ring transition-colors"
                >
                  <Minus size={13} />
                </button>
                <span className="data-num text-sm font-bold text-ink dark:text-white w-5 text-center">{p.qty}</span>
                <button
                  onClick={() => addToShoppingList(p)}
                  className="h-7 w-7 rounded-lg bg-moss-50 dark:bg-white/5 flex items-center justify-center text-ink/60 hover:bg-moss-100 dark:hover:bg-white/10 focus-ring transition-colors"
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Price */}
              <p className="data-num text-sm font-bold text-ink dark:text-white/80 shrink-0 w-16 text-right">
                ₹{p.price * p.qty}
              </p>

              {/* Remove */}
              <button
                onClick={() => removeFromShoppingList(p.id)}
                className="text-ink/25 hover:text-clay p-1.5 focus-ring transition-colors shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-14 text-center">
          <ShoppingCart className="mx-auto text-ink/15 dark:text-white/10 mb-3" size={40} />
          <p className="font-display text-lg text-ink dark:text-white">
            {query ? t('no_items_match') : t('list_is_empty')}
          </p>
          <p className="text-sm text-ink/50 dark:text-white/40 mt-1">{t('add_products_desc')}</p>
          <button onClick={() => navigate('/search')} className="btn-primary mt-4 inline-flex items-center gap-2">
            {t('browse_products')} <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Total footer */}
      {shoppingList.length > 0 && (
        <div className="glass-panel p-5 mt-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink/60 dark:text-white/50">{t('estimated_total')}</p>
            <p className="text-xs text-ink/30 dark:text-white/30 mt-0.5">{shoppingList.length} {t('items').toLowerCase()}</p>
          </div>
          <p className="data-num text-2xl font-bold text-ink dark:text-white">₹{total}</p>
        </div>
      )}
    </AppShell>
  )
}
