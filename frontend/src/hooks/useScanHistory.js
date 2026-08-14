import { useState, useEffect } from 'react'

const STORAGE_KEY = 'foodie_ai_scan_history'

export function getStoredScanHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('Failed to read scan history from localStorage:', err)
    return []
  }
}

export function saveScanHistory(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (err) {
    console.error('Failed to save scan history to localStorage:', err)
  }
}

export function useScanHistory() {
  const [history, setHistory] = useState(() => getStoredScanHistory())

  useEffect(() => {
    saveScanHistory(history)
  }, [history])

  const addScan = (product) => {
    if (!product) return
    const newEntry = {
      ...product,
      scannedAt: 'Just now',
      timestamp: Date.now()
    }
    setHistory((prev) => {
      // Remove existing occurrence if scanned before to move to top
      const filtered = prev.filter((item) => item.id !== product.id && item.barcode !== product.barcode)
      const updated = [newEntry, ...filtered].slice(0, 50) // keep last 50 scans
      saveScanHistory(updated)
      return updated
    })
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    history,
    addScan,
    clearHistory
  }
}
