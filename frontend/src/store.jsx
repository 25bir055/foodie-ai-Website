import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { SHOPPING_LIST_INITIAL, FAVORITES, PRODUCTS } from './data/mockData'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { logoutUser } from './services/auth'
import { getStoredScanHistory, saveScanHistory } from './hooks/useScanHistory'

const AppCtx = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('foodie_theme') || 'light')
  
  const [shoppingList, setShoppingList] = useState(() => {
    try {
      const stored = localStorage.getItem('foodie_shopping_list')
      return stored ? JSON.parse(stored) : SHOPPING_LIST_INITIAL
    } catch {
      return SHOPPING_LIST_INITIAL
    }
  })

  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('foodie_favorites')
      return stored ? JSON.parse(stored) : FAVORITES.map((p) => p.id)
    } catch {
      return FAVORITES.map((p) => p.id)
    }
  })

  const [scanHistory, setScanHistoryState] = useState(() => getStoredScanHistory())

  const [profile, setProfile] = useState({
    age: 27, height: 165, weight: 60,
    activityLevel: 'Moderately Active',
    dietaryPreference: 'Vegetarian',
    calorieGoal: 2100,
    goals: ['Low Sugar', 'High Protein']
  })

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Persist Theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('foodie_theme', theme)
  }, [theme])

  // Persist Shopping list
  useEffect(() => {
    localStorage.setItem('foodie_shopping_list', JSON.stringify(shoppingList))
  }, [shoppingList])

  // Persist Favorites
  useEffect(() => {
    localStorage.setItem('foodie_favorites', JSON.stringify(favorites))
  }, [favorites])

  const addScanToHistory = (product) => {
    if (!product) return
    const newEntry = {
      ...product,
      scannedAt: 'Just now',
      timestamp: Date.now()
    }
    setScanHistoryState((prev) => {
      const filtered = prev.filter((item) => item.id !== product.id && item.barcode !== product.barcode)
      const updated = [newEntry, ...filtered].slice(0, 50)
      saveScanHistory(updated)
      return updated
    })
  }

  const clearScanHistory = () => {
    setScanHistoryState([])
    localStorage.removeItem('foodie_ai_scan_history')
  }

  const toggleFavorite = (id) =>
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )

  const addToShoppingList = (product) => {
    setShoppingList((prev) => {
      const existing = prev.find((p) => p.id === product.id)
      if (existing) {
        const newQty = existing.qty + (product.qty ?? 1)
        if (newQty <= 0) return prev.filter((p) => p.id !== product.id)
        return prev.map((p) => (p.id === product.id ? { ...p, qty: newQty } : p))
      }
      return [...prev, { ...product, qty: product.qty ?? 1, purchased: false }]
    })
  }

  const removeFromShoppingList = (id) =>
    setShoppingList((prev) => prev.filter((p) => p.id !== id))

  const togglePurchased = (id) =>
    setShoppingList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, purchased: !p.purchased } : p))
    )

  const userName = user?.displayName || user?.email?.split('@')[0] || 'Foodie User'

  const value = useMemo(
    () => ({
      user,
      isAuthed: !!user,
      authLoading,
      logout: logoutUser,
      userName,
      theme,
      toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
      shoppingList,
      addToShoppingList,
      removeFromShoppingList,
      togglePurchased,
      favorites,
      toggleFavorite,
      favoriteProducts: PRODUCTS.filter((p) => favorites.includes(p.id)),
      scanHistory,
      addScanToHistory,
      clearScanHistory,
      profile,
      setProfile
    }),
    [user, authLoading, userName, theme, shoppingList, favorites, scanHistory, profile]
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
