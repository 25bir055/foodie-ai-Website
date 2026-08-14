import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, ScanBarcode, Search, Heart, UserCircle2 } from 'lucide-react'

const NAV = [
  { to: '/dashboard', label: 'Home',      icon: Home         },
  { to: '/search',    label: 'Search',    icon: Search       },
  { to: '/scan',      label: 'Scan',      icon: ScanBarcode, isCentral: true },
  { to: '/favorites', label: 'Saved',     icon: Heart        },
  { to: '/profile',   label: 'Profile',   icon: UserCircle2  }
]

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]">
      {/* Frosted glass bar */}
      <div className="mx-3 mb-3 bg-white/85 dark:bg-[#0E1A14]/90 backdrop-blur-2xl border border-moss-100/80 dark:border-white/8 rounded-xl2 shadow-soft">
        <div className="flex items-center justify-between px-2 py-2">
          {NAV.map(({ to, label, icon: Icon, isCentral }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl text-[10px] font-semibold focus-ring transition-all ${
                  isCentral
                    ? '-mt-5'
                    : isActive
                    ? 'text-moss-700 dark:text-leaf-light'
                    : 'text-ink/40 dark:text-white/35 hover:text-ink/60'
                }`
              }
            >
              {({ isActive }) =>
                isCentral ? (
                  <span className={`h-12 w-12 rounded-xl2 flex items-center justify-center text-white mb-0.5 shadow-glow transition-all ${
                    isActive ? 'bg-moss-600 scale-110' : 'bg-moss-700 hover:scale-105'
                  }`}>
                    <Icon size={22} />
                  </span>
                ) : (
                  <>
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                      isActive ? 'bg-moss-700/10 dark:bg-white/10' : ''
                    }`}>
                      <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    {label}
                  </>
                )
              }
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
