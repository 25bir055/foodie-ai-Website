import React, { useState, useEffect } from 'react'
import { motion, useAnimation, useInView } from 'framer-motion'
import { scoreLabel } from '../data/mockData'

export default function HealthScoreRing({ score, size = 96, strokeWidth = 9, showLabel = true }) {
  const [displayScore, setDisplayScore] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const { label, color, bg } = scoreLabel(score)

  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })

  useEffect(() => {
    if (isInView) {
      let start = 0
      const duration = 1000 // 1s
      const increment = score / (duration / 16) // roughly 60fps
      
      const timer = setInterval(() => {
        start += increment
        if (start >= score) {
          setDisplayScore(score)
          clearInterval(timer)
        } else {
          setDisplayScore(Math.floor(start))
        }
      }, 16)
      return () => clearInterval(timer)
    }
  }, [score, isInView])

  return (
    <div ref={ref} className="flex flex-col items-center gap-1.5" style={{ width: size }}>
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
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={isInView ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="data-num font-semibold leading-none" style={{ fontSize: size * 0.26, color }}>
            {displayScore}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-ink/40 dark:text-white/40 mt-0.5">/ 100</span>
        </div>
      </div>
      {showLabel && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style={{ color, backgroundColor: bg }}
        >
          {label}
        </motion.span>
      )}
    </div>
  )
}
