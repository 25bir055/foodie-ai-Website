import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, ScanBarcode, Search, Heart, UserCircle2, Bot } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function BottomNav() {
  const { t } = useLanguage()

  const handleOpenChat = () => {
    window.dispatchEvent(new CustomEvent('open-foodie-chat'))
  }

  const NAV = [
    { to: '/dashboard', label: t('home_nav') || 'Home',      icon: Home         },
    { to: '/search',    label: t('search_nav') || 'Search',    icon: Search       },
    { to: '/scan',      label: t('scan_nav') || 'Scan',      icon: ScanBarcode, isCentral: true },
    { type: 'chat',     label: t('chat_ai_nav') || 'Chat AI', icon: Bot, isChat: true },
    { to: '/favorites', label: t('saved_nav') || 'Saved',     icon: Heart        },
    { to: '/profile',   label: t('profile_nav') || 'Profile', icon: UserCircle2  }
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]">
      {/* Frosted glass bar */}
      <div className="mx-3 mb-3 bg-white/85 dark:bg-[#0E1A14]/90 backdrop-blur-2xl border border-moss-100/80 dark:border-white/8 rounded-xl2 shadow-soft">
        <div className="flex items-center justify-between px-2 py-2">
          {NAV.map((item) => {
            const { to, label, icon: Icon, isCentral, isChat } = item

            if (isChat) {
              return (
                <button
                  key="chat-ai-btn"
                  type="button"
                  onClick={handleOpenChat}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl text-[10px] font-semibold focus-ring transition-all text-leaf hover:text-moss-700 dark:hover:text-leaf-light"
                >
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center transition-all bg-leaf/15 text-leaf">
                    <Icon size={19} strokeWidth={2.2} />
                  </div>
                  {label}
                </button>
              )
            }

            return (
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
                    <span
                      className={`h-12 w-12 rounded-xl2 flex items-center justify-center text-white mb-0.5 shadow-glow transition-all ${
                        isActive ? 'bg-moss-600 scale-110' : 'bg-moss-700 hover:scale-105'
                      }`}
                    >
                      <Icon size={22} />
                    </span>
                  ) : (
                    <>
                      <div
                        className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                          isActive ? 'bg-moss-700/10 dark:bg-white/10' : ''
                        }`}
                      >
                        <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      {label}
                    </>
                  )
                }
              </NavLink>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
