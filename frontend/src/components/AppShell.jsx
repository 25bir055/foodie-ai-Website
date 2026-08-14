import React from 'react'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import BottomNav from './BottomNav.jsx'

export default function AppShell({ title, children }) {
  return (
    <div className="flex min-h-screen bg-cream dark:bg-[#0B1712]">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header title={title} />
        <main className="px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-10 max-w-7xl mx-auto">{children}</main>
      </div>
      <BottomNav />
    </div>
  )
}
