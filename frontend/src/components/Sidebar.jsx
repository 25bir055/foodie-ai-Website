import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, ScanBarcode, Search, GitCompareArrows, ShoppingCart,
  Heart, UserCircle2, Settings, LogOut, Leaf, Info,
  BarChart2, Bot, Users, FileText, Sparkles, Receipt
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

const NAV = [
  { to: '/home',               label: 'home',             icon: Home },
  { to: '/dashboard',          label: 'dashboard',        icon: BarChart2 },
  { to: '/scan',               label: 'scan',             icon: ScanBarcode },
  { to: '/scan?tab=bill_scan', label: 'scanBill',         icon: Receipt },
  { to: '/search',             label: 'search',           icon: Search },
  { to: '/compare',            label: 'compare',          icon: GitCompareArrows },
  { to: '/shopping-list',      label: 'shoppingList',     icon: ShoppingCart },
  { to: '/favorites',          label: 'favorites',        icon: Heart },
  { to: '/profile',            label: 'profile',          icon: UserCircle2 },
  { to: '/personal-dashboard', label: 'myDashboard',      icon: BarChart2 },
  { to: '/family',             label: 'family',           icon: Users },
  { to: '/prescription',       label: 'prescriptionOCR',  icon: FileText }
]

const NAV_BOTTOM = [
  { to: '/about',    label: 'about',     icon: Info     },
  { to: '/settings', label: 'settings',  icon: Settings }
]

export default function Sidebar() {
  const { userName, logout, shoppingList, favorites } = useApp()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const pendingItems = shoppingList.filter((p) => !p.purchased).length

  const handleOpenChat = () => {
    window.dispatchEvent(new CustomEvent('open-foodie-chat'))
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-moss-100/70 dark:border-white/5 bg-white/60 dark:bg-[#0E1A14]/80 backdrop-blur-2xl px-3 py-5">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-7">
        <div className="h-9 w-9 rounded-xl bg-moss-700 flex items-center justify-center shadow-sm">
          <Leaf size={17} className="text-leaf-light" />
        </div>
        <div className="leading-none">
          <p className="font-display font-semibold text-[17px] text-moss-700 dark:text-white">Foodie AI</p>
          <p className="text-[10px] uppercase tracking-widest text-ink/35 dark:text-white/35 mt-0.5">{t('nutrition_assistant') || 'Nutrition Assistant'}</p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all focus-ring group relative overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-r from-moss-700 to-leaf text-white shadow-soft'
                  : 'text-ink/55 dark:text-white/55 hover:bg-mint-tint dark:hover:bg-white/5 hover:text-moss-700 dark:hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                <span className="flex-1">{t(label)}</span>
                {/* Badge for shopping list */}
                {to === '/shopping-list' && pendingItems > 0 && (
                  <span className={`h-5 min-w-5 rounded-full text-[11px] font-bold flex items-center justify-center px-1.5 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-leaf text-white'
                  }`}>
                    {pendingItems}
                  </span>
                )}
                {/* Badge for favorites */}
                {to === '/favorites' && favorites.length > 0 && (
                  <span className={`h-5 min-w-5 rounded-full text-[11px] font-bold flex items-center justify-center px-1.5 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-clay/15 text-clay'
                  }`}>
                    {favorites.length}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Floating Chat Trigger Button in Sidebar */}
        <button
          type="button"
          onClick={handleOpenChat}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all focus-ring text-ink/75 dark:text-white/75 hover:bg-leaf/15 hover:text-leaf dark:hover:text-leaf-light mt-1 group"
        >
          <div className="h-6 w-6 rounded-lg bg-leaf/15 text-leaf flex items-center justify-center group-hover:scale-110 transition-transform">
            <Bot size={15} />
          </div>
          <span className="flex-1 text-left">{t('askAI') || 'Ask Foodie AI'}</span>
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-leaf text-white px-1.5 py-0.5 rounded shadow-sm">
            <Sparkles size={10} /> AI
          </span>
        </button>

        <div className="my-2 h-px bg-moss-100/70 dark:bg-white/8 mx-3" />

        {NAV_BOTTOM.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all focus-ring ${
                isActive
                  ? 'bg-moss-700 text-white shadow-soft'
                  : 'text-ink/55 dark:text-white/55 hover:bg-mint-tint dark:hover:bg-white/5 hover:text-moss-700 dark:hover:text-white'
              }`
            }
          >
            <Icon size={17} strokeWidth={2} />
            {t(label)}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button
        type="button"
        onClick={async () => { await logout() }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-ink/45 dark:text-white/35 hover:bg-clay/8 hover:text-clay dark:hover:bg-clay/10 transition-all focus-ring mt-1"
      >
        <LogOut size={17} />
        {t('logout')}
      </button>

      {/* User card */}
      <div className="mt-3 glass-panel p-3 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-moss-700 to-leaf flex items-center justify-center font-display font-bold text-white text-sm shrink-0">
          {userName[0]}
        </div>
        <div className="leading-tight flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink dark:text-white/90 truncate">{userName}</p>
          <p className="text-[11px] text-ink/40 dark:text-white/35">{t('free_plan_active') || 'Free plan · Active'}</p>
        </div>
        <button onClick={() => navigate('/settings')} className="text-ink/25 hover:text-ink/50 focus-ring">
          <Settings size={14} />
        </button>
      </div>
    </aside>
  )
}
