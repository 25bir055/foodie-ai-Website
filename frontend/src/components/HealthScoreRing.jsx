import React from 'react'
import { scoreLabel } from '../data/mockData'

export default function HealthScoreRing({ score, size = 96, strokeWidth = 9, showLabel = true }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const { label, color, bg } = scoreLabel(score)

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-moss-100 dark:text-white/10"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="data-num font-semibold leading-none" style={{ fontSize: size * 0.26, color }}>
            {score}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-ink/40 dark:text-white/40 mt-0.5">/ 100</span>
        </div>
      </div>
      {showLabel && (
        <span
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style={{ color, backgroundColor: bg }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
