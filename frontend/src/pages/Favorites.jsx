import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, X, ArrowRight } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import HealthScoreRing from '../components/HealthScoreRing.jsx'
import { useApp } from '../store.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function Favorites() {
  const { favoriteProducts, toggleFavorite } = useApp()
  const { t } = useLanguage()
  const navigate = useNavigate()

  return (
    <AppShell title={t('saved_products')}>
      <div className="flex items-center justify-between mb-5 fade-in-up">
        <div>
          <p className="text-sm text-ink/50 dark:text-white/40">
            <span className="font-bold text-ink dark:text-white">{favoriteProducts.length}</span> {t('saved_products_count')}
          </p>
        </div>
        {favoriteProducts.length > 0 && (
          <button onClick={() => navigate('/search')} className="text-xs font-semibold text-leaf-dark hover:underline flex items-center gap-1">
            {t('browse_more')} <ArrowRight size={12} />
          </button>
        )}
      </div>

      {favoriteProducts.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
          {favoriteProducts.map((p) => (
            <div key={p.id} className="glass-panel p-4 relative group card-hover fade-in-up">
              {/* Remove button */}
              <button
                onClick={() => toggleFavorite(p.id)}
                className="absolute top-3 right-3 h-7 w-7 rounded-full bg-clay/10 flex items-center justify-center text-clay/60 hover:text-clay hover:bg-clay/20 focus-ring transition-all opacity-0 group-hover:opacity-100"
                aria-label="Remove from favorites"
              >
                <X size={13} />
              </button>

              {/* Product info — clickable */}
              <button onClick={() => navigate(`/product/${p.id}`)} className="w-full text-left focus-ring rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl2 bg-mint-tint dark:bg-white/5 flex items-center justify-center text-2xl shrink-0">
                    {p.image}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-ink dark:text-white/90 truncate group-hover:text-moss-700 dark:group-hover:text-leaf-light transition-colors">{p.name}</p>
                    <p className="text-xs text-ink/40 dark:text-white/40">{p.brand}</p>
                    <p className="text-[11px] text-ink/30 dark:text-white/30">{p.category}</p>
                  </div>
                  <HealthScoreRing score={p.healthScore} size={44} strokeWidth={5} showLabel={false} />
                </div>

                {/* Nutrition summary */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-moss-100/70 dark:border-white/10 text-xs flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="text-base">🔥</span>
                    <span className="data-num font-semibold text-ink/70 dark:text-white/60">{p.calories}</span>
                    <span className="text-ink/40 dark:text-white/35">{t('kcal')}</span>
                  </div>
                  <div className="w-px h-3 bg-ink/15 dark:bg-white/10" />
                  <div className="flex items-center gap-1">
                    <span className="text-base">💪</span>
                    <span className="data-num font-semibold text-ink/70 dark:text-white/60">{p.protein}g</span>
                    <span className="text-ink/40 dark:text-white/35">{t('protein')}</span>
                  </div>
                  <div className="w-px h-3 bg-ink/15 dark:bg-white/10" />
                  <div className="flex items-center gap-1">
                    <span className="text-base">🍬</span>
                    <span className="data-num font-semibold text-ink/70 dark:text-white/60">{p.sugar}g</span>
                    <span className="text-ink/40 dark:text-white/35">{t('sugar')}</span>
                  </div>
                </div>

                {/* Tags */}
                {p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {p.tags.slice(0, 2).map((t) => (
                      <span key={t} className={t.toLowerCase().includes('alert') || t.toLowerCase().includes('sodium') ? 'tag-chip-alert' : 'tag-chip'}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </button>


            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-14 text-center">
          <div className="h-16 w-16 rounded-2xl bg-clay/10 flex items-center justify-center mx-auto mb-4">
            <Heart className="text-clay" size={28} />
          </div>
          <p className="font-display text-lg text-ink dark:text-white">{t('no_favorites')}</p>
          <p className="text-sm text-ink/50 dark:text-white/40 mt-1">{t('no_favorites_desc')}</p>
          <button onClick={() => navigate('/search')} className="btn-primary mt-5 inline-flex items-center gap-2">
            {t('discover_products')} <ArrowRight size={16} />
          </button>
        </div>
      )}
    </AppShell>
  )
}
