import React from 'react'

export default function SkeletonLoader() {
  return (
    <div className="glass-panel p-5 sm:p-6 border border-leaf/30 shadow-glow rounded-2xl animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-moss-100 dark:border-white/10">
        <div className="flex-1 space-y-3">
          <div className="h-4 w-24 bg-moss-200 dark:bg-white/10 rounded-full" />
          <div className="h-6 w-48 bg-moss-300 dark:bg-white/20 rounded-md" />
          <div className="h-4 w-32 bg-moss-200 dark:bg-white/10 rounded-md" />
        </div>
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div className="h-14 w-14 rounded-full bg-moss-200 dark:bg-white/10" />
          <div className="h-2 w-12 bg-moss-200 dark:bg-white/10 rounded-full" />
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 my-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-2.5 rounded-xl bg-moss-50/50 dark:bg-white/5 border border-moss-100/30 flex flex-col items-center justify-center gap-1.5 h-16">
            <div className="h-2 w-8 bg-moss-200 dark:bg-white/10 rounded-full" />
            <div className="h-4 w-10 bg-moss-300 dark:bg-white/20 rounded-md" />
            <div className="h-2 w-6 bg-moss-200 dark:bg-white/10 rounded-full" />
          </div>
        ))}
      </div>

      {/* Insight Skeleton */}
      <div className="p-3 rounded-xl bg-leaf-light/10 border border-leaf/20 h-10 w-full flex items-center gap-2">
        <div className="h-4 w-4 rounded-full bg-leaf-light/50" />
        <div className="h-3 flex-1 bg-leaf-light/20 rounded-full" />
      </div>

      {/* Buttons Skeleton */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="h-10 rounded-xl bg-moss-200 dark:bg-white/10" />
        <div className="h-10 rounded-xl bg-moss-200 dark:bg-white/10" />
      </div>
    </div>
  )
}
