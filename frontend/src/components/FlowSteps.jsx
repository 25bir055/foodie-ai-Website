import React from 'react'
import { Check, ScanBarcode, BarChart3, ShoppingBag } from 'lucide-react'

const STEPS = [
  { title: 'Scan', desc: 'Log the product', icon: ScanBarcode },
  { title: 'Review', desc: 'Check nutrition', icon: BarChart3 },
  { title: 'Shop', desc: 'Build a better cart', icon: ShoppingBag }
]

export default function FlowSteps({ activeIndex = 0 }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {STEPS.map(({ title, desc, icon: Icon }, index) => {
        const isActive = index === activeIndex
        const isDone = index < activeIndex

        return (
          <div
            key={title}
            className={[
              'relative rounded-2xl border p-3 transition-all',
              isActive
                ? 'border-leaf/25 bg-gradient-to-br from-moss-700 to-moss-600 text-white shadow-soft'
                : isDone
                  ? 'border-leaf/20 bg-leaf/10 text-moss-700 dark:text-white'
                  : 'border-moss-100 bg-white/70 text-ink dark:border-white/10 dark:bg-white/5 dark:text-white/80'
            ].join(' ')}
          >
            <div className="flex items-center justify-between">
              <div
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-xl',
                  isActive ? 'bg-white/15 text-white' : 'bg-moss-50 text-moss-700 dark:bg-white/5 dark:text-leaf-light'
                ].join(' ')}
              >
                {isDone ? <Check size={16} /> : <Icon size={16} />}
              </div>
              {isActive && <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Now</span>}
            </div>
            <p className="mt-3 text-sm font-semibold">{title}</p>
            <p className={['mt-1 text-[11px] leading-relaxed', isActive ? 'text-white/75' : 'text-ink/45 dark:text-white/40'].join(' ')}>{desc}</p>
          </div>
        )
      })}
    </div>
  )
}
