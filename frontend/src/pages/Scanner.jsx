import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Camera, Keyboard, Search, Loader2, AlertCircle,
  ScanBarcode, WifiOff, RefreshCw, CheckCircle2,
  HelpCircle, X
} from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import { fetchProductByBarcode } from '../services/api'

// ── Internet check helper ───────────────────────────────────────────────────
async function checkInternet() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false
  }
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 4000)
    await fetch('https://www.google.com/favicon.ico?' + Date.now(), {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
      cache: 'no-store'
    })
    clearTimeout(id)
    return true
  } catch {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  }
}

export default function Scanner() {
  const navigate = useNavigate()

  // Barcode Scanner State
  const scannerRef = useRef(null)
  const [scanning, setScanning]           = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState('')
  const [isOnline, setIsOnline]           = useState(true)
  const [checkingNet, setCheckingNet]     = useState(false)

  // ── Network check ─────────────────────────────────────────────────────────
  const verifyNetwork = useCallback(async () => {
    setCheckingNet(true)
    const online = await checkInternet()
    setIsOnline(online)
    setCheckingNet(false)
    return online
  }, [])

  useEffect(() => {
    verifyNetwork()

    const onOnline  = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [verifyNetwork])

  // ── Stop Barcode Scanner ──────────────────────────────────────────────────
  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState()
        if (state === 2) await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      }
    } catch (err) {
      console.warn('Barcode scanner stop error:', err)
    }
    setScanning(false)
  }

  // ── Handle Barcode Result ─────────────────────────────────────────────────
  const handleBarcode = async (barcode) => {
    const code = String(barcode).trim()
    if (!code) return

    setSuccess(`Barcode detected: ${code}`)
    setError('')
    await stopScanner()

    const online = await checkInternet()
    if (!online) {
      setIsOnline(false)
      setSuccess('')
      return
    }

    try {
      const product = await fetchProductByBarcode(code)
      if (product) {
        navigate(`/product/${product.firestoreId || product.id}`)
      } else {
        setError(`Product with barcode "${code}" not found in our database.`)
        setSuccess('')
      }
    } catch (err) {
      console.error('Fetch product error:', err)
      setError('Unable to retrieve product details. Please try again.')
      setSuccess('')
    }
  }

  // ── Start Camera Scanner ──────────────────────────────────────────────────
  const startScanner = async () => {
    setError('')
    setSuccess('')

    const online = await verifyNetwork()
    if (!online) return

    try {
      const scanner = new Html5Qrcode('barcode-reader')
      scannerRef.current = scanner
      setScanning(true)

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 25,
          disableFlip: false,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.777778,
          // Support EAN-13, EAN-8, UPC-A, UPC-E, Code 128, QR
          formatsToSupport: [1, 2, 4, 5, 7, 8]
        },
        async (decodedText) => {
          console.log('BARCODE DETECTED:', decodedText)
          await handleBarcode(decodedText)
        },
        () => {}
      )
    } catch (err) {
      console.error('Camera startup error:', err)
      setScanning(false)
      if (err.message && err.message.toLowerCase().includes('permission')) {
        setError('Camera permission denied. Please allow camera access in your browser settings.')
      } else {
        setError('Camera could not start. Please verify camera permissions and use HTTPS or localhost.')
      }
    }
  }

  // ── Manual Barcode Entry ──────────────────────────────────────────────────
  const handleManualSearch = async () => {
    const code = manualBarcode.trim()
    if (!code) {
      setError('Please enter a barcode number.')
      return
    }
    const online = await verifyNetwork()
    if (!online) return
    await handleBarcode(code)
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  // ── Offline Screen ────────────────────────────────────────────────────────
  if (!isOnline) {
    return (
      <AppShell title="Scan Product">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6 fade-in-up">
          <div className="h-24 w-24 rounded-full bg-clay/10 flex items-center justify-center">
            <WifiOff size={44} className="text-clay" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink dark:text-white">
              No Internet Connection
            </h2>
            <p className="text-sm text-ink/50 dark:text-white/40 mt-2 max-w-xs mx-auto leading-relaxed">
              Please connect to the internet to scan products and retrieve product information.
            </p>
          </div>
          <button
            onClick={verifyNetwork}
            disabled={checkingNet}
            className="flex items-center gap-2 bg-moss-700 hover:bg-moss-600 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition-all focus-ring shadow-soft"
          >
            {checkingNet ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {checkingNet ? 'Checking…' : 'Retry'}
          </button>
        </div>
      </AppShell>
    )
  }

  // ── Main View ─────────────────────────────────────────────────────────────
  return (
    <AppShell title="Scan Product">
      <div className="max-w-xl mx-auto pb-10 fade-in-up">

        {/* Header banner */}
        <div className="glass-panel p-4 mb-5 flex items-center gap-3.5 border border-moss-100/70 dark:border-white/10 shadow-soft">
          <div className="h-11 w-11 rounded-xl bg-moss-700 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ScanBarcode size={22} />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-ink dark:text-white">
              Barcode Product Scanner
            </h2>
            <p className="text-xs text-ink/50 dark:text-white/40">
              Point your camera at any product barcode (EAN-13, EAN-8, UPC-A, UPC-E)
            </p>
          </div>
        </div>

        {/* Camera Viewport Card */}
        <div className="glass-panel p-5 border border-moss-100/70 dark:border-white/10 shadow-soft">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-moss-700 dark:text-leaf-light" />
              <h3 className="font-semibold text-ink dark:text-white text-sm">
                Live Barcode Camera
              </h3>
            </div>
            {scanning && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-leaf px-2.5 py-0.5 rounded-full bg-leaf/10 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-leaf" /> Scanning Live
              </span>
            )}
          </div>

          {/* Camera display */}
          <div
            id="barcode-reader"
            className="w-full overflow-hidden rounded-2xl bg-black min-h-[260px] border border-moss-100/40 dark:border-white/5"
          />

          {!scanning ? (
            <button
              onClick={startScanner}
              className="w-full mt-4 bg-moss-700 hover:bg-moss-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 focus-ring shadow-soft transition-all text-sm"
            >
              <Camera size={18} /> Open Camera Scanner
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="w-full mt-4 bg-clay hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 focus-ring shadow-soft transition-all text-sm"
            >
              <X size={18} /> Stop Camera
            </button>
          )}

          {success && (
            <div className="mt-4 p-3 rounded-xl bg-leaf-light/10 text-leaf-dark dark:text-leaf border border-leaf/20 text-sm flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3.5 rounded-xl bg-clay/10 text-clay text-sm border border-clay/20 flex items-start gap-2.5">
              <AlertCircle size={17} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Manual Barcode Input Card */}
        <div className="glass-panel p-5 mt-4 border border-moss-100/70 dark:border-white/10 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <Keyboard size={18} className="text-moss-700 dark:text-leaf-light" />
            <h3 className="font-semibold text-ink dark:text-white text-sm">
              Enter Barcode Number Manually
            </h3>
          </div>
          <p className="text-xs text-ink/40 dark:text-white/40 mb-3">
            If your camera is unavailable, enter the barcode digits printed on the package.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualSearch() }}
              placeholder="e.g. 8903023006559 or 8901058851126"
              className="input-base flex-1 text-sm font-mono"
            />
            <button
              onClick={handleManualSearch}
              className="bg-moss-700 hover:bg-moss-600 text-white px-5 rounded-xl flex items-center gap-2 transition-colors focus-ring font-semibold text-sm"
            >
              <Search size={16} /> Search
            </button>
          </div>
        </div>

        {/* Supported formats info */}
        <div className="glass-panel p-4 mt-4 border border-moss-100/50 dark:border-white/5">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink/60 dark:text-white/60 mb-2">
            <HelpCircle size={14} className="text-leaf" /> Supported Barcode Standards
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-ink/50 dark:text-white/40">
            <span className="px-2 py-0.5 rounded-lg bg-mint-tint dark:bg-white/5 font-mono">EAN-13</span>
            <span className="px-2 py-0.5 rounded-lg bg-mint-tint dark:bg-white/5 font-mono">EAN-8</span>
            <span className="px-2 py-0.5 rounded-lg bg-mint-tint dark:bg-white/5 font-mono">UPC-A</span>
            <span className="px-2 py-0.5 rounded-lg bg-mint-tint dark:bg-white/5 font-mono">UPC-E</span>
            <span className="px-2 py-0.5 rounded-lg bg-mint-tint dark:bg-white/5 font-mono">Code-128</span>
          </div>
        </div>

      </div>
    </AppShell>
  )
}