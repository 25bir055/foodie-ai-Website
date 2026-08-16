import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Camera, Keyboard, Search, Loader2, AlertCircle,
  ScanBarcode, WifiOff, RefreshCw, CheckCircle2,
  HelpCircle, X, Sparkles, UploadCloud, Image as ImageIcon,
  ArrowRight, ShieldCheck, Flame, Zap, Check, Edit3, Save,
  Key, ExternalLink
} from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import HealthScoreRing from '../components/HealthScoreRing.jsx'
import { fetchProductByBarcode, createProduct } from '../services/api'
import { analyzeNutritionImage, getGeminiApiKey, setGeminiApiKey } from '../services/imageRecognition'
import { useApp } from '../store.jsx'

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
  const { addScanToHistory } = useApp()

  // Active Mode: 'barcode' | 'ai_photo' | 'manual'
  const [activeTab, setActiveTab] = useState('ai_photo')

  // Barcode Scanner State
  const scannerRef = useRef(null)
  const [scanning, setScanning]           = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState('')
  const [isOnline, setIsOnline]           = useState(true)
  const [checkingNet, setCheckingNet]     = useState(false)

  // Gemini API Key State
  const [apiKeyInput, setApiKeyInput]     = useState('')
  const [showKeyModal, setShowKeyModal]   = useState(false)
  const [hasValidKey, setHasValidKey]     = useState(Boolean(getGeminiApiKey()))

  // AI Photo Scanner State
  const fileInputRef = useRef(null)
  const [photoPreview, setPhotoPreview]     = useState(null)
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false)
  const [analysisStep, setAnalysisStep]     = useState('')
  const [extractedProduct, setExtractedProduct] = useState(null)
  const [savingToDb, setSavingToDb]         = useState(false)
  const [isEditing, setIsEditing]           = useState(false)
  const [editedName, setEditedName]         = useState('')
  const [editedBrand, setEditedBrand]       = useState('')

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
        addScanToHistory(product)
        navigate(`/product/${product.id || product.barcode}`)
      } else {
        setError(`Product with barcode "${code}" not found in database. You can scan its nutrition label using the AI Photo Scanner!`)
        setSuccess('')
      }
    } catch (err) {
      console.error('Fetch product error:', err)
      setError('Unable to retrieve product details. Please try again.')
      setSuccess('')
    }
  }

  // ── Start Camera Barcode Scanner ──────────────────────────────────────────
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
        setError('Camera permission denied. Please allow camera access in your browser.')
      } else {
        setError('Camera could not start. Please verify camera permissions.')
      }
    }
  }

  // ── Handle Manual Search ──────────────────────────────────────────────────
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

  // ── Handle Key Save ───────────────────────────────────────────────────────
  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim() || !apiKeyInput.trim().startsWith('AIzaSy')) {
      setError('Please enter a valid Google Gemini API Key starting with "AIzaSy...".')
      return
    }
    setGeminiApiKey(apiKeyInput.trim())
    setHasValidKey(true)
    setShowKeyModal(false)
    setApiKeyInput('')
    setSuccess('✅ Gemini API Key saved successfully!')
    setError('')
  }

  // ── AI Nutrition Label Image Handler ──────────────────────────────────────
  const handleImageFile = async (file) => {
    if (!file) return

    setError('')
    setSuccess('')
    setExtractedProduct(null)
    setAnalyzingPhoto(true)
    setAnalysisStep('Uploading image & preparing Gemini Vision...')

    try {
      // Create local preview
      const previewUrl = URL.createObjectURL(file)
      setPhotoPreview(previewUrl)

      setAnalysisStep('Gemini Vision reading actual nutrition facts from photo...')
      
      const result = await analyzeNutritionImage(file)
      
      setAnalysisStep('Calculating health score & checking allergens...')
      await new Promise(r => setTimeout(r, 300))

      setExtractedProduct(result)
      setEditedName(result.name)
      setEditedBrand(result.brand)
      setSuccess(`✅ Successfully analyzed "${result.name}"!`)
    } catch (err) {
      console.error('Photo analysis error:', err)
      setError(err.message || 'Could not analyze photo. Please ensure the nutrition label is clearly visible.')
    } finally {
      setAnalyzingPhoto(false)
      setAnalysisStep('')
    }
  }

  // Save AI extracted product to MongoDB & Navigate
  const handleSaveToDatabase = async () => {
    if (!extractedProduct) return

    setSavingToDb(true)
    setError('')

    try {
      const finalProduct = {
        ...extractedProduct,
        name: editedName || extractedProduct.name,
        brand: editedBrand || extractedProduct.brand
      }

      // Save directly to MongoDB via backend
      const saved = await createProduct(finalProduct)
      
      // Store in session storage so it displays immediately
      sessionStorage.setItem(`foodie_product_${saved.id || finalProduct.id}`, JSON.stringify(saved))
      
      // Add to personal scan history
      addScanToHistory(saved)

      // Navigate to detailed view
      navigate(`/product/${saved.id || finalProduct.id}`)
    } catch (err) {
      console.error('Save to MongoDB error:', err)
      setError('Failed to save to database. Opening product details directly...')
      addScanToHistory(extractedProduct)
      navigate(`/product/${extractedProduct.id}`)
    } finally {
      setSavingToDb(false)
    }
  }

  // Reset Photo Scanner
  const handleResetPhoto = () => {
    setPhotoPreview(null)
    setExtractedProduct(null)
    setError('')
    setSuccess('')
    if (fileInputRef.current) fileInputRef.current.value = ''
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
              Please connect to the internet to scan products and retrieve AI nutrition details.
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

        {/* Mode Selector Tabs */}
        <div className="flex gap-1.5 p-1.5 bg-moss-50 dark:bg-white/5 rounded-2xl mb-4 shadow-xs">
          <button
            type="button"
            onClick={() => { setActiveTab('ai_photo'); stopScanner(); setError(''); setSuccess('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ai_photo'
                ? 'bg-moss-700 text-white shadow-soft'
                : 'text-ink/60 dark:text-white/50 hover:text-ink dark:hover:text-white'
            }`}
          >
            <Sparkles size={15} className={activeTab === 'ai_photo' ? 'text-leaf-light animate-pulse' : ''} />
            <span>AI Label Photo</span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full bg-leaf-light/20 text-[10px] text-leaf-light font-bold uppercase">New</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('barcode'); setError(''); setSuccess('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'barcode'
                ? 'bg-moss-700 text-white shadow-soft'
                : 'text-ink/60 dark:text-white/50 hover:text-ink dark:hover:text-white'
            }`}
          >
            <Camera size={15} />
            <span>Barcode Camera</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('manual'); stopScanner(); setError(''); setSuccess('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'manual'
                ? 'bg-moss-700 text-white shadow-soft'
                : 'text-ink/60 dark:text-white/50 hover:text-ink dark:hover:text-white'
            }`}
          >
            <Keyboard size={15} />
            <span>Manual Code</span>
          </button>
        </div>

        {/* Gemini Key Missing Banner */}
        {!hasValidKey && activeTab === 'ai_photo' && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/40 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <Key size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Add Google Gemini API Key for Vision Scanning</p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Get your 100% free Gemini API key from Google AI Studio to accurately extract nutrition details from photos.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowKeyModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0 flex items-center gap-1.5 transition-colors"
            >
              <Key size={13} /> Enter API Key
            </button>
          </div>
        )}

        {/* Global Notifications */}
        {success && (
          <div className="mb-4 p-3.5 rounded-xl bg-leaf-light/15 text-leaf-dark dark:text-leaf border border-leaf/30 text-xs font-medium flex items-center gap-2.5 fade-in-up">
            <CheckCircle2 size={17} className="shrink-0 text-leaf" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-clay/10 text-clay text-xs border border-clay/20 flex items-start gap-2.5 fade-in-up">
            <AlertCircle size={17} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="leading-relaxed">{error}</p>
              {error.toLowerCase().includes('gemini') && (
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="mt-2 text-xs font-semibold underline text-moss-800 dark:text-leaf-light flex items-center gap-1"
                >
                  <Key size={13} /> Update Gemini API Key Now
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 1: AI NUTRITION LABEL PHOTO SCANNER ────────────────────────── */}
        {activeTab === 'ai_photo' && (
          <div className="space-y-4">
            
            {/* Header banner */}
            <div className="glass-panel p-4 flex items-center gap-3.5 border border-moss-100/70 dark:border-white/10 shadow-soft">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-moss-700 to-leaf text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles size={20} className="text-leaf-light" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base font-semibold text-ink dark:text-white flex items-center gap-1.5">
                  AI Nutrition Label Scanner
                </h2>
                <p className="text-xs text-ink/50 dark:text-white/40">
                  Snap the nutrition facts table on the back of any food packet. Gemini Vision AI reads the real values.
                </p>
              </div>
              {hasValidKey && (
                <button
                  onClick={() => setShowKeyModal(true)}
                  title="Configure Gemini API Key"
                  className="p-2 rounded-xl bg-mint-tint dark:bg-white/5 hover:bg-moss-100 text-moss-700 dark:text-leaf-light shrink-0 transition-colors"
                >
                  <Key size={15} />
                </button>
              )}
            </div>

            {/* Photo Capture / Upload Area */}
            {!extractedProduct && (
              <div className="glass-panel p-6 border border-dashed border-moss-200 dark:border-white/15 text-center rounded-2xl relative overflow-hidden">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageFile(file)
                  }}
                  className="hidden"
                  id="label-photo-upload"
                />

                {photoPreview ? (
                  <div className="relative rounded-xl overflow-hidden max-h-72 mx-auto mb-4 border border-moss-100 dark:border-white/10 bg-black/5">
                    <img src={photoPreview} alt="Nutrition Label Preview" className="w-full h-auto object-contain max-h-72" />
                    
                    {analyzingPhoto && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white">
                        {/* Laser scan line animation */}
                        <div className="w-full h-1 bg-leaf-light shadow-[0_0_12px_#7FCB9F] absolute top-1/2 -translate-y-1/2 animate-pulse" />
                        <Loader2 size={36} className="animate-spin text-leaf-light mb-3" />
                        <p className="font-display font-medium text-sm text-center">{analysisStep || 'Analyzing Nutrition Label…'}</p>
                        <p className="text-[11px] text-white/60 mt-1">Extracting exact calories, protein, sugar, and additives</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6">
                    <div className="h-16 w-16 rounded-2xl bg-mint-tint dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-moss-700 dark:text-leaf-light">
                      <UploadCloud size={30} />
                    </div>
                    <h3 className="font-display font-medium text-base text-ink dark:text-white">
                      Take a Photo or Upload Label
                    </h3>
                    <p className="text-xs text-ink/50 dark:text-white/40 mt-1 max-w-sm mx-auto leading-relaxed">
                      Snap the nutrition facts table on the back of any food packet.
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2.5 mt-2 justify-center">
                  <label
                    htmlFor="label-photo-upload"
                    className="btn-primary py-3 px-6 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-2 shadow-soft"
                  >
                    <Camera size={16} />
                    <span>{photoPreview ? 'Take / Choose Another Photo' : 'Capture Nutrition Label'}</span>
                  </label>

                  {photoPreview && !analyzingPhoto && (
                    <button
                      type="button"
                      onClick={handleResetPhoto}
                      className="btn-secondary py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <X size={15} /> Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Extracted Product Review Card ──────────────────────────────── */}
            {extractedProduct && (
              <div className="glass-panel p-5 sm:p-6 border border-leaf/30 shadow-glow rounded-2xl fade-in-up">
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-moss-100 dark:border-white/10">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-leaf-light/20 text-leaf-dark dark:text-leaf text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={11} /> Gemini Vision Analyzed
                      </span>
                      <span className="text-xs text-ink/40 dark:text-white/30 font-mono">
                        {extractedProduct.barcode}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 mt-2">
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          placeholder="Product Name"
                          className="input-base text-sm font-semibold w-full py-1.5 px-2.5"
                        />
                        <input
                          type="text"
                          value={editedBrand}
                          onChange={(e) => setEditedBrand(e.target.value)}
                          placeholder="Brand Name"
                          className="input-base text-xs w-full py-1 px-2.5"
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="font-display font-semibold text-lg text-ink dark:text-white">
                          {editedName || extractedProduct.name}
                        </h3>
                        <p className="text-xs text-ink/50 dark:text-white/40">
                          {editedBrand || extractedProduct.brand} · {extractedProduct.category}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <HealthScoreRing score={extractedProduct.healthScore} size={60} strokeWidth={6} />
                    <span className="text-[10px] font-semibold text-ink/50 dark:text-white/40">Health Score</span>
                  </div>
                </div>

                {/* Nutrition Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 my-4 text-center">
                  <div className="p-2.5 rounded-xl bg-moss-50 dark:bg-white/5 border border-moss-100/60 dark:border-white/5">
                    <p className="text-[10px] text-ink/45 dark:text-white/40 uppercase">Calories</p>
                    <p className="data-num font-bold text-sm text-ink dark:text-white mt-0.5">{extractedProduct.calories}</p>
                    <p className="text-[9px] text-ink/30 dark:text-white/30">kcal</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-moss-50 dark:bg-white/5 border border-moss-100/60 dark:border-white/5">
                    <p className="text-[10px] text-ink/45 dark:text-white/40 uppercase">Protein</p>
                    <p className="data-num font-bold text-sm text-leaf-dark dark:text-leaf-light mt-0.5">{extractedProduct.protein}g</p>
                    <p className="text-[9px] text-ink/30 dark:text-white/30">protein</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-moss-50 dark:bg-white/5 border border-moss-100/60 dark:border-white/5">
                    <p className="text-[10px] text-ink/45 dark:text-white/40 uppercase">Sugar</p>
                    <p className={`data-num font-bold text-sm mt-0.5 ${extractedProduct.sugar > 15 ? 'text-clay' : 'text-ink dark:text-white'}`}>
                      {extractedProduct.sugar}g
                    </p>
                    <p className="text-[9px] text-ink/30 dark:text-white/30">sugar</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-moss-50 dark:bg-white/5 border border-moss-100/60 dark:border-white/5">
                    <p className="text-[10px] text-ink/45 dark:text-white/40 uppercase">Carbs</p>
                    <p className="data-num font-bold text-sm text-ink dark:text-white mt-0.5">{extractedProduct.carbs}g</p>
                    <p className="text-[9px] text-ink/30 dark:text-white/30">carbs</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-moss-50 dark:bg-white/5 border border-moss-100/60 dark:border-white/5">
                    <p className="text-[10px] text-ink/45 dark:text-white/40 uppercase">Fat</p>
                    <p className="data-num font-bold text-sm text-ink dark:text-white mt-0.5">{extractedProduct.fat}g</p>
                    <p className="text-[9px] text-ink/30 dark:text-white/30">total fat</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-moss-50 dark:bg-white/5 border border-moss-100/60 dark:border-white/5">
                    <p className="text-[10px] text-ink/45 dark:text-white/40 uppercase">Sodium</p>
                    <p className="data-num font-bold text-sm text-ink dark:text-white mt-0.5">{extractedProduct.sodium}</p>
                    <p className="text-[9px] text-ink/30 dark:text-white/30">mg</p>
                  </div>
                </div>

                {/* AI Insight */}
                {extractedProduct.insight && (
                  <div className="p-3 rounded-xl bg-leaf-light/10 border border-leaf/20 text-xs text-moss-800 dark:text-leaf-light mb-4 flex items-start gap-2">
                    <Zap size={15} className="shrink-0 text-leaf mt-0.5" />
                    <span>{extractedProduct.insight}</span>
                  </div>
                )}

                {/* Allergens & Ingredients pills */}
                {extractedProduct.allergens?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold text-clay uppercase mb-1.5">Detected Allergens</p>
                    <div className="flex flex-wrap gap-1.5">
                      {extractedProduct.allergens.map((a) => (
                        <span key={a} className="tag-chip-alert text-xs">⚠️ {a}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-moss-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={handleSaveToDatabase}
                    disabled={savingToDb}
                    className="btn-primary flex-1 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-soft"
                  >
                    {savingToDb ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Saving to Database…</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save to MongoDB & View Details</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="btn-secondary py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Edit3 size={15} />
                    <span>{isEditing ? 'Done Editing' : 'Edit Info'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetPhoto}
                    className="btn-secondary py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={14} />
                    <span>Scan Another</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── TAB 2: LIVE BARCODE CAMERA ─────────────────────────────────────── */}
        {activeTab === 'barcode' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 flex items-center gap-3.5 border border-moss-100/70 dark:border-white/10 shadow-soft">
              <div className="h-11 w-11 rounded-xl bg-moss-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                <ScanBarcode size={22} />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink dark:text-white">
                  Barcode Scanner
                </h2>
                <p className="text-xs text-ink/50 dark:text-white/40">
                  Point camera at product barcode (EAN-13, EAN-8, UPC-A, UPC-E)
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
            </div>
          </div>
        )}

        {/* ── TAB 3: MANUAL BARCODE ENTRY ────────────────────────────────────── */}
        {activeTab === 'manual' && (
          <div className="space-y-4">
            <div className="glass-panel p-5 border border-moss-100/70 dark:border-white/10 shadow-soft">
              <div className="flex items-center gap-2 mb-2">
                <Keyboard size={18} className="text-moss-700 dark:text-leaf-light" />
                <h3 className="font-semibold text-ink dark:text-white text-sm">
                  Enter Barcode Number Manually
                </h3>
              </div>
              <p className="text-xs text-ink/40 dark:text-white/40 mb-3">
                Type the barcode digits printed on the package to look it up in MongoDB.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleManualSearch() }}
                  placeholder="e.g. 8903023006559 or 8901058851126"
                  className="input-base flex-1 text-sm font-mono"
                  autoFocus
                />
                <button
                  onClick={handleManualSearch}
                  className="btn-primary px-5 rounded-xl flex items-center gap-2 font-semibold text-sm"
                >
                  <Search size={16} /> Search
                </button>
              </div>
            </div>

            {/* Supported formats info */}
            <div className="glass-panel p-4 border border-moss-100/50 dark:border-white/5">
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
        )}

        {/* ── Gemini Key Setup Modal ─────────────────────────────────────────── */}
        {showKeyModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="glass-panel max-w-md w-full p-6 rounded-2xl shadow-glow border border-moss-100 dark:border-white/10 fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Key size={20} className="text-moss-700 dark:text-leaf-light" />
                  <h3 className="font-display font-semibold text-base text-ink dark:text-white">
                    Google Gemini API Key
                  </h3>
                </div>
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-ink/50"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-ink/60 dark:text-white/50 leading-relaxed mb-4">
                To accurately extract nutrition numbers and ingredients directly from photos, paste your Google Gemini API Key below. (Keys start with <code>AIzaSy...</code>).
              </p>

              <div className="space-y-3">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="input-base text-sm font-mono w-full"
                />

                <div className="flex items-center justify-between text-[11px] text-ink/50 dark:text-white/40">
                  <span>Don't have a key?</span>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-moss-700 dark:text-leaf-light font-semibold hover:underline flex items-center gap-1"
                  >
                    Get Free API Key from Google <ExternalLink size={11} />
                  </a>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveApiKey}
                    className="btn-primary flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Save size={14} /> Save API Key
                  </button>
                  <button
                    onClick={() => setShowKeyModal(false)}
                    className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}