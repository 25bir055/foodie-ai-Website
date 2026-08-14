import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, Keyboard, Search, Loader2 } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import { fetchProductByBarcode } from '../services/api'

export default function Scanner() {
  const navigate = useNavigate()

  const scannerRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState()

        if (state === 2) {
          await scannerRef.current.stop()
        }

        scannerRef.current.clear()
        scannerRef.current = null
      }
    } catch (err) {
      console.warn('Scanner stop error:', err)
    }

    setScanning(false)
  }

  const handleBarcode = async (barcode) => {
    const code = String(barcode).trim()

    if (!code) return

    setSuccess(`Barcode detected: ${code}`)
    setError('')

    await stopScanner()

    try {
      const product = await fetchProductByBarcode(code)

      if (product) {
        navigate(`/product/${product.firestoreId || product.id}`)
      } else {
        setError(`Product not found for barcode: ${code}`)
      }
    } catch (err) {
      console.error(err)
      setError('Unable to find this product.')
    }
  }

  const startScanner = async () => {
    setError('')
    setSuccess('')

    try {
      const scanner = new Html5Qrcode('barcode-reader')

      scannerRef.current = scanner
      setScanning(true)

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: {
            width: 280,
            height: 160
          },
          aspectRatio: 1.777778,
          formatsToSupport: [
            1,  // CODE_128
            2,  // CODE_39
            4,  // EAN_13
            5,  // EAN_8
            7,  // UPC_A
            8   // UPC_E
          ]
        },
        async (decodedText) => {
          console.log('BARCODE DETECTED:', decodedText)
          await handleBarcode(decodedText)
        },
        () => {
          // Ignore continuous scan-frame errors
        }
      )
    } catch (err) {
      console.error('Camera error:', err)
      setScanning(false)

      setError(
        'Camera could not start. Please allow camera permission and use HTTPS or localhost.'
      )
    }
  }

  const handleManualSearch = async () => {
    const code = manualBarcode.trim()

    if (!code) {
      setError('Enter a barcode number.')
      return
    }

    await handleBarcode(code)
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  return (
    <AppShell title="Scan Product">

      <div className="max-w-xl mx-auto">

        {/* Scanner Card */}
        <div className="glass-panel p-5">

          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-xl bg-moss-700 text-white flex items-center justify-center">
              <Camera size={21} />
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-ink dark:text-white">
                Scan Barcode
              </h2>

              <p className="text-xs text-ink/50 dark:text-white/40">
                Point your camera at the product barcode
              </p>
            </div>
          </div>

          {/* Camera */}
          <div
            id="barcode-reader"
            className="w-full overflow-hidden rounded-2xl bg-black min-h-[260px]"
          />

          {!scanning && (
            <button
              onClick={startScanner}
              className="w-full mt-4 bg-moss-700 hover:bg-moss-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Camera size={18} />
              Start Camera Scanner
            </button>
          )}

          {scanning && (
            <button
              onClick={stopScanner}
              className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl"
            >
              Stop Scanner
            </button>
          )}

          {success && (
            <div className="mt-4 p-3 rounded-xl bg-green-50 text-green-700 text-sm">
              {success}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

        </div>

        {/* Manual Barcode */}
        <div className="glass-panel p-5 mt-4">

          <div className="flex items-center gap-2 mb-3">
            <Keyboard size={18} className="text-moss-700" />

            <h3 className="font-semibold text-ink dark:text-white">
              Enter Barcode Manually
            </h3>
          </div>

          <div className="flex gap-2">

            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleManualSearch()
                }
              }}
              placeholder="Example: 6291100195558"
              className="input-base flex-1"
            />

            <button
              onClick={handleManualSearch}
              className="bg-moss-700 text-white px-4 rounded-xl flex items-center gap-2"
            >
              <Search size={17} />
              Search
            </button>

          </div>

        </div>

      </div>

    </AppShell>
  )
}