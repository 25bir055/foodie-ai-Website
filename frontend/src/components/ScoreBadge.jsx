import React from 'react'

export default function ScoreBadge({ score, compact = false }) {
  const tone = score >= 75 ? 'bg-leaf/15 text-leaf-dark dark:text-leaf-light' : score >= 50 ? 'bg-amber/15 text-amber dark:text-[#E3A23D]' : 'bg-clay/10 text-clay dark:text-[#E8706C]'

  return (
    <span className={['inline-flex items-center justify-center rounded-full font-semibold', compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1 text-[11px]', tone].join(' ')}>
      {score}/100
    </span>
  )
}
