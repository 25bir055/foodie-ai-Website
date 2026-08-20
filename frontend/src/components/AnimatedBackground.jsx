import React from 'react'

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-cream dark:bg-[#0B1712]">
      {/* Dark mode mesh gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-leaf-light/30 dark:bg-leaf/15 mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob" />
      <div className="absolute top-[20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-moss-300/30 dark:bg-moss-700/20 mix-blend-multiply dark:mix-blend-screen filter blur-[130px] animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-20%] left-[20%] w-[70vw] h-[70vw] rounded-full bg-mint-tint/60 dark:bg-moss-900/40 mix-blend-multiply dark:mix-blend-screen filter blur-[150px] animate-blob animation-delay-4000" />
      
      {/* Subtle Grid overlay for texture */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIgZmlsbD0icmdiYSgwLCAwLCAwLCAwLjAzKSI+PC9jaXJjbGU+Cjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAyKSI+PC9jaXJjbGU+Cjwvc3ZnPg==')]" />
    </div>
  )
}
