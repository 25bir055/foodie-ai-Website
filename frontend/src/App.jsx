import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useApp } from './store.jsx'
import { Loader2 } from 'lucide-react'

import PageTransition from './components/PageTransition.jsx'
import Login from './pages/Login.jsx'
import SetupProfile from './pages/SetupProfile.jsx'
import Dashboard from './pages/Dashboard.jsx'
import HomeFlow from './pages/HomeFlow.jsx'
import Scanner from './pages/Scanner.jsx'
import ProductDetails from './pages/ProductDetails.jsx'

import Search from './pages/Search.jsx'
import Compare from './pages/Compare.jsx'
import ShoppingList from './pages/ShoppingList.jsx'
import Favorites from './pages/Favorites.jsx'
import Profile from './pages/Profile.jsx'
import PersonalDashboard from './pages/PersonalDashboard.jsx'
import About from './pages/About.jsx'
import Settings from './pages/Settings.jsx'

function Protected({ children }) {
  const { isAuthed, authLoading } = useApp()

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-[#0B1712] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-leaf animate-spin" />
        <p className="text-sm font-medium text-ink/60 dark:text-white/60">Loading Foodie AI...</p>
      </div>
    )
  }

  return isAuthed ? <PageTransition>{children}</PageTransition> : <Navigate to="/" replace />
}

export default function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/setup-profile" element={<Protected><SetupProfile /></Protected>} />
        <Route path="/home" element={<Protected><HomeFlow /></Protected>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/scan" element={<Protected><Scanner /></Protected>} />
        <Route path="/product/:id" element={<Protected><ProductDetails /></Protected>} />

        <Route path="/search" element={<Protected><Search /></Protected>} />
        <Route path="/compare" element={<Protected><Compare /></Protected>} />
        <Route path="/shopping-list" element={<Protected><ShoppingList /></Protected>} />
        <Route path="/favorites" element={<Protected><Favorites /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/personal-dashboard" element={<Protected><PersonalDashboard /></Protected>} />
        <Route path="/about" element={<Protected><About /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}
