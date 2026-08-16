import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { PRODUCTS } from './data/mockData'
import { logoutUser, getCurrentUser, getStoredUser, updateUserProfile } from './services/auth'
import { getStoredScanHistory, saveScanHistory } from './hooks/useScanHistory'
import { saveScanRecord, fetchAllProducts } from './services/api'

const AppCtx = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())
  const [authLoading, setAuthLoading] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('foodie_theme') || 'light')
  const [productsList, setProductsList] = useState(PRODUCTS)

  const userKey = user?.uid || user?._id || user?.email || 'anonymous'

  // Shopping List — empty by default, isolated per user
  const [shoppingList, setShoppingList] = useState(() => {
    try {
      const stored = localStorage.getItem(`foodie_shopping_${userKey}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Favorites — empty by default, isolated per user (NO default mock items!)
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem(`foodie_favorites_${userKey}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [scanHistory, setScanHistoryState] = useState(() => getStoredScanHistory(userKey))

  const [profile, setProfile] = useState({
    age: 27, height: 165, weight: 60,
    activityLevel: 'Moderately Active',
    dietaryPreference: 'Vegetarian',
    calorieGoal: 2100,
    goals: ['Low Sugar', 'High Protein'],
    profileCompleted: false
  })

  // Load products list from MongoDB backend
  useEffect(() => {
    async function loadProducts() {
      try {
        const fetched = await fetchAllProducts()
        if (fetched && fetched.length > 0) {
          setProductsList(fetched)
        }
      } catch (err) {
        console.warn('Failed to load products in store:', err)
      }
    }
    loadProducts()
  }, [])

  // Load user session and user-specific data from MongoDB backend
  useEffect(() => {
    async function initAuth() {
      try {
        const currentUser = await getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
          const key = currentUser.uid || currentUser._id || currentUser.email

          if (currentUser.profile) {
            setProfile((prev) => ({
              ...prev,
              ...currentUser.profile,
              profileCompleted: currentUser.profile.profileCompleted ?? true
            }))
          }

          // User-specific scan history
          setScanHistoryState(getStoredScanHistory(key))

          // User-specific favorites from MongoDB or localStorage
          if (Array.isArray(currentUser.favorites)) {
            setFavorites(currentUser.favorites)
            localStorage.setItem(`foodie_favorites_${key}`, JSON.stringify(currentUser.favorites))
          } else {
            const cachedFavs = localStorage.getItem(`foodie_favorites_${key}`)
            setFavorites(cachedFavs ? JSON.parse(cachedFavs) : [])
          }

          // User-specific shopping list from MongoDB or localStorage
          if (Array.isArray(currentUser.shoppingList)) {
            setShoppingList(currentUser.shoppingList)
            localStorage.setItem(`foodie_shopping_${key}`, JSON.stringify(currentUser.shoppingList))
          } else {
            const cachedShop = localStorage.getItem(`foodie_shopping_${key}`)
            setShoppingList(cachedShop ? JSON.parse(cachedShop) : [])
          }
        } else {
          setUser(null)
          setFavorites([])
          setShoppingList([])
          setScanHistoryState([])
        }
      } catch (err) {
        console.warn('Auth init failed:', err)
      } finally {
        setAuthLoading(false)
      }
    }
    initAuth()
  }, [])

  // Persist Theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('foodie_theme', theme)
  }, [theme])

  const addScanToHistory = (product) => {
    if (!product) return
    const key = user?.uid || user?._id || user?.email || 'anonymous'
    const newEntry = {
      ...product,
      scannedAt: 'Just now',
      timestamp: Date.now()
    }
    setScanHistoryState((prev) => {
      const filtered = prev.filter((item) => String(item.id) !== String(product.id) && String(item.barcode) !== String(product.barcode))
      const updated = [newEntry, ...filtered].slice(0, 50)
      saveScanHistory(updated, key)
      return updated
    })

    // Record scan to backend MongoDB
    saveScanRecord({
      userId: user?.uid || user?._id || 'anonymous',
      barcode: product.barcode,
      productName: product.name,
      healthScore: product.healthScore
    })
  }

  const clearScanHistory = () => {
    const key = user?.uid || user?._id || user?.email || 'anonymous'
    setScanHistoryState([])
    localStorage.removeItem(`foodie_scan_history_${key}`)
  }

  // Toggle favorite for current user & sync to MongoDB
  const toggleFavorite = (id) => {
    if (!id) return
    const cleanId = String(id)

    setFavorites((prev) => {
      const next = prev.includes(cleanId)
        ? prev.filter((f) => f !== cleanId)
        : [...prev, cleanId]

      const key = user?.uid || user?._id || user?.email || 'anonymous'
      localStorage.setItem(`foodie_favorites_${key}`, JSON.stringify(next))

      // Sync with MongoDB backend if logged in
      if (user) {
        updateUserProfile({ favorites: next }).catch((err) =>
          console.warn('Failed to sync favorites to MongoDB:', err)
        )
      }

      return next
    })
  }

  // Add to Shopping List & sync to MongoDB
  const addToShoppingList = (product) => {
    if (!product) return
    setShoppingList((prev) => {
      const existing = prev.find((p) => String(p.id) === String(product.id))
      let next
      if (existing) {
        const newQty = existing.qty + (product.qty ?? 1)
        if (newQty <= 0) {
          next = prev.filter((p) => String(p.id) !== String(product.id))
        } else {
          next = prev.map((p) => (String(p.id) === String(product.id) ? { ...p, qty: newQty } : p))
        }
      } else {
        next = [...prev, { ...product, qty: product.qty ?? 1, purchased: false }]
      }

      const key = user?.uid || user?._id || user?.email || 'anonymous'
      localStorage.setItem(`foodie_shopping_${key}`, JSON.stringify(next))

      if (user) {
        updateUserProfile({ shoppingList: next }).catch((err) =>
          console.warn('Failed to sync shopping list to MongoDB:', err)
        )
      }

      return next
    })
  }

  const removeFromShoppingList = (id) => {
    setShoppingList((prev) => {
      const next = prev.filter((p) => String(p.id) !== String(id))
      const key = user?.uid || user?._id || user?.email || 'anonymous'
      localStorage.setItem(`foodie_shopping_${key}`, JSON.stringify(next))

      if (user) {
        updateUserProfile({ shoppingList: next }).catch((err) =>
          console.warn('Failed to sync shopping list to MongoDB:', err)
        )
      }

      return next
    })
  }

  const togglePurchased = (id) => {
    setShoppingList((prev) => {
      const next = prev.map((p) =>
        String(p.id) === String(id) ? { ...p, purchased: !p.purchased } : p
      )
      const key = user?.uid || user?._id || user?.email || 'anonymous'
      localStorage.setItem(`foodie_shopping_${key}`, JSON.stringify(next))

      if (user) {
        updateUserProfile({ shoppingList: next }).catch((err) =>
          console.warn('Failed to sync shopping list to MongoDB:', err)
        )
      }

      return next
    })
  }

  const handleLogout = async () => {
    await logoutUser()
    setUser(null)
    setFavorites([])
    setShoppingList([])
  }

  const handleSetProfile = async (newProfile) => {
    setProfile(newProfile)
    if (user) {
      try {
        await updateUserProfile({ profile: newProfile })
      } catch (err) {
        console.warn('Failed to sync profile to server:', err)
      }
    }
  }

  const userName = user?.displayName || user?.email?.split('@')[0] || 'Foodie User'

  // Match favorite products across all available products
  const favoriteProducts = useMemo(() => {
    if (!favorites || favorites.length === 0) return []
    return productsList.filter((p) =>
      favorites.includes(String(p.id)) ||
      favorites.includes(String(p.barcode)) ||
      (p._id && favorites.includes(String(p._id)))
    )
  }, [productsList, favorites])

  const value = useMemo(
    () => ({
      user,
      setUser,
      isAuthed: !!user,
      authLoading,
      logout: handleLogout,
      userName,
      theme,
      toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
      shoppingList,
      addToShoppingList,
      removeFromShoppingList,
      togglePurchased,
      favorites,
      toggleFavorite,
      favoriteProducts,
      scanHistory,
      addScanToHistory,
      clearScanHistory,
      profile,
      setProfile: handleSetProfile
    }),
    [user, authLoading, userName, theme, shoppingList, favorites, favoriteProducts, scanHistory, profile]
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
