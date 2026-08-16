import { useState, useEffect, useCallback } from 'react'

/**
 * useNetworkStatus
 * Returns { isOnline, checkConnection }
 * - isOnline: current best-guess network state
 * - checkConnection: async function that pings a known URL and updates state
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const checkConnection = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false)
      return false
    }
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 4000)
      await fetch('https://www.google.com/favicon.ico?' + Date.now(), {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        cache:  'no-store'
      })
      clearTimeout(id)
      setIsOnline(true)
      return true
    } catch {
      const fallback = typeof navigator !== 'undefined' ? navigator.onLine : true
      setIsOnline(fallback)
      return fallback
    }
  }, [])

  useEffect(() => {
    // Initial check
    checkConnection()

    const onOnline  = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [checkConnection])

  return { isOnline, checkConnection }
}
