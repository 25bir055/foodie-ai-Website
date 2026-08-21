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

      {/* Floating Leaves (Micro-animations) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute left-[15%] bottom-[-50px] animate-float-leaf-1 scale-75 opacity-30">
          <LeafIcon />
        </div>
        <div className="absolute left-[50%] bottom-[-50px] animate-float-leaf-2 scale-110 opacity-40 animation-delay-2000">
          <LeafIcon />
        </div>
        <div className="absolute left-[80%] bottom-[-50px] animate-float-leaf-3 scale-90 opacity-25 animation-delay-4000">
          <LeafIcon />
        </div>
      </div>
    </div>
  )
}

function LeafIcon() {
  return (
    <svg className="h-10 w-10 text-leaf/40 dark:text-leaf/15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747C20.835 12.288 19.343 8.385 12 3c-7.343 5.385-8.835 9.288-8.716 11.253A9.004 9.004 0 0012 21z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18" />
    </svg>
  )
}
