import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, Sun, Moon, Leaf, X, ScanBarcode } from 'lucide-react'
import { useApp } from '../store.jsx'
import { PRODUCTS } from '../data/mockData'

export default function Header({ title }) {
  const navigate = useNavigate()
  const {
    theme, toggleTheme, userName,
    notifications, unreadNotifCount,
    markNotificationAsRead, markAllNotificationsAsRead, clearNotifications
  } = useApp()

  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery]           = useState('')
  const [showNotif, setShowNotif]   = useState(false)

  const results = query.length > 1
    ? PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.brand.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : []

  const goSearch = () => { navigate('/search'); setSearchOpen(false); setQuery('') }

  const handleNotificationClick = (n) => {
    markNotificationAsRead(n.id)
    setShowNotif(false)
    if (n.link) navigate(n.link)
  }

  return (
    <header className="sticky top-0 z-30 bg-cream/90 dark:bg-[#0B1712]/90 backdrop-blur-2xl border-b border-moss-100/60 dark:border-white/5 px-4 sm:px-6 lg:px-8 py-3">
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <div className="lg:hidden h-8 w-8 rounded-lg bg-moss-700 flex items-center justify-center shrink-0">
          <Leaf size={15} className="text-leaf-light" />
        </div>

        {/* Page title or inline search trigger */}
        {title ? (
          <h1 className="font-display text-lg font-semibold text-ink dark:text-white/90 hidden sm:block">{title}</h1>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex-1 sm:flex-none sm:w-80 flex items-center gap-2 bg-white/70 dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-full px-4 py-2 text-sm text-ink/40 dark:text-white/35 focus-ring hover:bg-white dark:hover:bg-white/8 transition-colors"
          >
            <Search size={15} />
            Search food products…
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {/* Search button for inner pages */}
          {title && (
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 bg-white/70 dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-full px-4 py-2 text-sm text-ink/40 dark:text-white/35 w-56 focus-ring hover:bg-white dark:hover:bg-white/8 transition-colors"
            >
              <Search size={15} />
              Search food…
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="p-2.5 rounded-full hover:bg-moss-50 dark:hover:bg-white/10 text-ink/50 dark:text-white/50 transition-colors focus-ring"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Dynamic Notifications */}
          <div className="relative">
            <button
              aria-label="Notifications"
              onClick={() => {
                setShowNotif((s) => !s)
              }}
              className="relative p-2.5 rounded-full hover:bg-moss-50 dark:hover:bg-white/10 text-ink/50 dark:text-white/50 transition-colors focus-ring"
            >
              <Bell size={18} />
              {unreadNotifCount > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-clay animate-pulse" />
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 top-12 w-80 max-h-96 glass-strong rounded-xl2 shadow-glow z-50 overflow-hidden flex flex-col fade-in-up border border-moss-100 dark:border-white/10">
                <div className="px-4 py-3 border-b border-moss-100/70 dark:border-white/10 flex items-center justify-between bg-moss-50/50 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink dark:text-white">Notifications</p>
                    {unreadNotifCount > 0 && (
                      <span className="px-2 py-0.2 rounded-full bg-clay/15 text-clay text-[10px] font-bold">
                        {unreadNotifCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] font-medium text-leaf-dark dark:text-leaf-light hover:underline"
                      >
                        Read all
                      </button>
                    )}
                    <button onClick={() => setShowNotif(false)} className="text-ink/30 hover:text-ink/60 focus-ring">
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 divide-y divide-moss-50 dark:divide-white/5">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                          !n.read ? 'bg-mint-tint/60 dark:bg-white/8 font-medium' : 'hover:bg-moss-50/40 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-leaf' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-ink dark:text-white/90 leading-snug">{n.text}</p>
                          <p className="text-[10px] text-ink/40 dark:text-white/35 mt-1">{n.sub}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-ink/40 dark:text-white/40">
                      No notifications right now.
                    </div>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-2 border-t border-moss-100/70 dark:border-white/10 text-center bg-moss-50/30 dark:bg-white/5">
                    <button
                      onClick={clearNotifications}
                      className="text-[11px] text-ink/40 hover:text-clay dark:text-white/30 dark:hover:text-clay font-medium"
                    >
                      Clear all notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Avatar */}
          <button
            onClick={() => navigate('/profile')}
            className="h-9 w-9 rounded-full bg-gradient-to-br from-moss-700 to-leaf flex items-center justify-center font-display font-bold text-white text-sm focus-ring shadow-sm"
          >
            {userName[0]}
          </button>
        </div>
      </div>

      {/* Global search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col" onClick={() => setSearchOpen(false)}>
          <div className="bg-cream dark:bg-[#0E1A14] border-b border-moss-100/70 dark:border-white/8 px-4 sm:px-8 py-4" onClick={(e) => e.stopPropagation()}>
            <div className="max-w-xl mx-auto flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2.5 bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-leaf transition-shadow">
                <Search size={17} className="text-ink/30 shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && goSearch()}
                  placeholder="Search food products, brands, barcodes…"
                  className="bg-transparent outline-none text-sm flex-1 text-ink dark:text-white"
                />
                {query && <button onClick={() => setQuery('')} className="text-ink/30 hover:text-ink/60"><X size={14} /></button>}
              </div>
              <button onClick={() => { setSearchOpen(false); setQuery('') }} className="text-sm font-semibold text-ink/60 dark:text-white/50 hover:text-ink focus-ring">Cancel</button>
            </div>

            {/* Inline results */}
            {results.length > 0 && (
              <div className="max-w-xl mx-auto mt-3 flex flex-col gap-1">
                {results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { navigate(`/product/${p.id}`); setSearchOpen(false); setQuery('') }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-mint-tint dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <span className="text-xl">{p.image}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink dark:text-white/90 truncate">{p.name}</p>
                      <p className="text-[11px] text-ink/40 dark:text-white/35">{p.brand} · {p.category}</p>
                    </div>
                    <span className="text-[11px] font-bold text-leaf-dark dark:text-leaf-light shrink-0">{p.healthScore}/100</span>
                  </button>
                ))}
                <button onClick={goSearch} className="text-xs font-semibold text-leaf-dark hover:underline text-center py-2">
                  See all results for "{query}" →
                </button>
              </div>
            )}

            {query.length > 1 && results.length === 0 && (
              <p className="max-w-xl mx-auto mt-3 text-sm text-ink/40 dark:text-white/35 px-3">No products found for "{query}"</p>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
