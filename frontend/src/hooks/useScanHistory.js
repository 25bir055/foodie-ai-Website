import { useState, useEffect } from 'react'

export function getStoredScanHistory(userKey = 'anonymous') {
  try {
    const raw = localStorage.getItem(`foodie_scan_history_${userKey}`)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('Failed to read scan history from localStorage:', err)
    return []
  }
}

export function saveScanHistory(list, userKey = 'anonymous') {
  try {
    localStorage.setItem(`foodie_scan_history_${userKey}`, JSON.stringify(list))
  } catch (err) {
    console.error('Failed to save scan history to localStorage:', err)
  }
}

export function useScanHistory(userKey = 'anonymous') {
  const [history, setHistory] = useState(() => getStoredScanHistory(userKey))

  useEffect(() => {
    setHistory(getStoredScanHistory(userKey))
  }, [userKey])

  useEffect(() => {
    saveScanHistory(history, userKey)
  }, [history, userKey])

  const addScan = (product) => {
    if (!product) return
    const newEntry = {
      ...product,
      scannedAt: 'Just now',
      timestamp: Date.now()
    }
    setHistory((prev) => {
      // Remove existing occurrence if scanned before to move to top
      const filtered = prev.filter((item) => String(item.id) !== String(product.id) && String(item.barcode) !== String(product.barcode))
      const updated = [newEntry, ...filtered].slice(0, 50) // keep last 50 scans
      saveScanHistory(updated, userKey)
      return updated
    })
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem(`foodie_scan_history_${userKey}`)
  }

  return {
    history,
    addScan,
    clearHistory
  }
}
