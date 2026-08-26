import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Camera, Keyboard, Search, Loader2, AlertCircle,
  ScanBarcode, WifiOff, RefreshCw, CheckCircle2,
  HelpCircle, X, Sparkles, UploadCloud, Image as ImageIcon,
  ArrowRight, ShieldCheck, Flame, Zap, Check, Edit3, Save,
  Key, ExternalLink, Clock, Users, MessageSquare, Send, Info, Tag, Layers,
  Receipt, ShoppingCart, ShoppingBag, ShieldAlert, History, Trash2, Calendar, Store, Plus, AlertTriangle, FileText,
  Stethoscope, Pill, Heart
} from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import HealthScoreRing from '../components/HealthScoreRing.jsx'
import { fetchProductByBarcode, createProduct, fetchPrescriptions, fetchFamilyMembers } from '../services/api'
import { analyzeBillWithAI, fetchUserBills, deleteBillRecord } from '../services/billScannerService'
import { auditProductForFamily } from '../utils/familySafety.js'
import { auditProductForPrescriptions } from '../utils/prescriptionSafety.js'
import { useApp } from '../store.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import confetti from 'canvas-confetti'
import SkeletonLoader from '../components/SkeletonLoader.jsx'

// ── Voice Synthesis Helper for Single Products ──────────────────────────────
const speakResult = (score, name, lang = 'en-US') => {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const msg = new SpeechSynthesisUtterance()
  msg.lang = lang

  if (lang === 'ta-IN') {
    if (score >= 80) {
      msg.text = `இந்த ${name} உடம்புக்கு ரொம்ப நல்லது. இதோட ஹெல்த் ஸ்கோர் ${score}.`
    } else if (score >= 50) {
      msg.text = `இந்த ${name} பரவாயில்லை, ஆனா அளவா சாப்பிடுங்க. ஸ்கோர் ${score}.`
    } else {
      msg.text = `இந்த ${name} உடம்புக்கு நல்லது இல்ல. ஸ்கோர் ${score}. தயவு செஞ்சு தவிர்க்கவும்.`
    }
  } else if (lang === 'hi-IN') {
    if (score >= 80) {
      msg.text = `यह ${name} सेहत के लिए बहुत अच्छा है। इसका हेल्थ स्कोर ${score} है।`
    } else if (score >= 50) {
      msg.text = `यह ${name} ठीक है, लेकिन कम मात्रा में खाएं। इसका हेल्थ स्कोर ${score} है।`
    } else {
      msg.text = `यह ${name} सेहत के लिए हानिकारक है। इसका हेल्थ स्कोर ${score} है। इसे खाने से बचें।`
    }
  } else {
    if (score >= 80) {
      msg.text = `${name} has an excellent health score of ${score}. It is a great choice!`
    } else if (score >= 50) {
      msg.text = `${name} has a moderate health score of ${score}. Consume in moderation.`
    } else {
      msg.text = `${name} has a poor health score of ${score}. It is not recommended.`
    }
  }
  msg.rate = 1.05
  window.speechSynthesis.speak(msg)
}

// ── Voice Synthesis Helper for Grocery Bills ─────────────────────────────────
const speakBillResult = (bill, lang = 'en-US') => {
  if (!window.speechSynthesis || !bill) return
  window.speechSynthesis.cancel()
  const msg = new SpeechSynthesisUtterance()
  msg.lang = lang
  
  const total = bill.items?.length || 0
  const harmful = bill.harmfulCount || 0
  const store = bill.storeName || 'Supermarket'

  if (lang === 'ta-IN') {
    if (harmful > 0) {
      msg.text = `${store} பில்லில் ${total} பொருட்கள் உள்ளன. இதில் ${harmful} பொருட்கள் உங்கள் அலர்ஜி அல்லது உடல்நலத்திற்கு ஆபத்தானது. ஆரோக்கியமான மாற்று உணவுகளை பரிந்துரைத்துள்ளோம்.`
    } else {
      msg.text = `${store} பில்லில் உள்ள ${total} பொருட்களும் உங்கள் உடல்நலத்திற்கு பாதுகாப்பானது!`
    }
  } else if (lang === 'hi-IN') {
    if (harmful > 0) {
      msg.text = `${store} बिल में ${total} आइटम हैं। इनमें से ${harmful} आइटम आपकी सेहत या एलर्जी के लिए हानिकारक हैं। स्वस्थ विकल्प देखें।`
    } else {
      msg.text = `${store} बिल के सभी आइटम आपकी सेहत के लिए सुरक्षित हैं!`
    }
  } else {
    if (harmful > 0) {
      msg.text = `Scanned ${store} receipt with ${total} items. Detected ${harmful} harmful items matching your health profile. Check recommended safe alternatives.`
    } else {
      msg.text = `Great! All ${total} items on your ${store} receipt are safe for your health profile.`
    }
  }
  msg.rate = 1.05
  window.speechSynthesis.speak(msg)
}

const triggerHapticsAndConfetti = (score) => {
  if (score >= 80) {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200])
    const duration = 2500
    const end = Date.now() + duration
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#16A34A', '#4CAE7A']
      })
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#16A34A', '#4CAE7A']
      })
      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()
  } else if (score < 40) {
    if (navigator.vibrate) navigator.vibrate(500)
  }
}

// ── Internet check helper ───────────────────────────────────────────────────
async function checkInternet() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

export default function Scanner() {
  const navigate = useNavigate()
  const location = useLocation()
  const { addScanToHistory, voiceEnabled, profile, addToShoppingList } = useApp()
  const { t } = useLanguage()

  // Active Mode: 'barcode' | 'bill_scan' | 'manual'
  const [activeTab, setActiveTab] = useState(() => {
    const search = new URLSearchParams(window.location.search)
    return search.get('tab') || 'barcode'
  })
  const [voiceLang, setVoiceLang] = useState('en-US')

  useEffect(() => {
    const search = new URLSearchParams(location.search)
    const tab = search.get('tab')
    if (tab && ['bill_scan', 'barcode', 'manual'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [location.search])

  // Barcode Scanner State
  const scannerRef = useRef(null)
  const isProcessingRef = useRef(false)
  const [scanning, setScanning]           = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [scannedBarcodeProduct, setScannedBarcodeProduct] = useState(null)
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState('')
  const [isOnline, setIsOnline]           = useState(true)
  const [checkingNet, setCheckingNet]     = useState(false)
  const [dangerAlert, setDangerAlert]     = useState(null)

  // ── Grocery Bill Scanner State ──────────────────────────────────────────
  const billFileInputRef = useRef(null)
  const billVideoRef = useRef(null)
  const billStreamRef = useRef(null)
  const [isLiveBillCameraOpen, setIsLiveBillCameraOpen] = useState(false)
  const [cameraFacing, setCameraFacing] = useState('environment') // 'environment' | 'user'

  const [billPreview, setBillPreview] = useState(null)
  const [analyzingBill, setAnalyzingBill] = useState(false)
  const [billAnalysisStep, setBillAnalysisStep] = useState('')
  const [analyzedBill, setAnalyzedBill] = useState(null)
  const [savedBillsHistory, setSavedBillsHistory] = useState([])
  const [showBillHistory, setShowBillHistory] = useState(false)
  const [loadingBills, setLoadingBills] = useState(false)
  const [prescriptions, setPrescriptions] = useState([])
  const [familyMembers, setFamilyMembers] = useState([])
  const [addedAlternatives, setAddedAlternatives] = useState({})
  const [billFilter, setBillFilter] = useState('all') // 'all' | 'harmful' | 'caution' | 'safe'

  // Load prescriptions and family members on mount
  useEffect(() => {
    fetchPrescriptions().then(data => {
      if (Array.isArray(data)) setPrescriptions(data)
    }).catch(e => console.warn('Prescriptions load warning:', e))

    fetchFamilyMembers().then(data => {
      if (Array.isArray(data)) setFamilyMembers(data)
    }).catch(e => console.warn('Family members load warning:', e))
  }, [])

  // Live Camera Handlers for Bill Scanner
  const startLiveBillCamera = async (facing = cameraFacing) => {
    setError('')
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Browser doesn't support getUserMedia or insecure context -> open file input
      billFileInputRef.current?.click()
      return
    }

    try {
      if (billStreamRef.current) {
        billStreamRef.current.getTracks().forEach(t => t.stop())
        billStreamRef.current = null
      }

      let stream = null
      // Tier 1: Try with ideal facing mode
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false
        })
      } catch (tier1Err) {
        console.warn('Facing mode camera constraint failed, trying generic video...', tier1Err.message)
        // Tier 2: Generic video (works on all laptop webcams & basic devices)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        })
      }

      if (stream) {
        billStreamRef.current = stream
        setIsLiveBillCameraOpen(true)
        setTimeout(() => {
          if (billVideoRef.current) {
            billVideoRef.current.srcObject = stream
            billVideoRef.current.play().catch(e => console.warn('Video play error:', e))
          }
        }, 80)
      }
    } catch (err) {
      console.error('Camera access error:', err)
      setIsLiveBillCameraOpen(false)
      // Open file picker directly so user isn't stuck
      billFileInputRef.current?.click()
      setError('Camera access not granted or blocked. We opened the file selector for you. (To enable camera, click the lock 🔒/tune icon in the browser address bar and select "Allow Camera").')
    }
  }

  const stopLiveBillCamera = () => {
    if (billStreamRef.current) {
      billStreamRef.current.getTracks().forEach(track => track.stop())
      billStreamRef.current = null
    }
    setIsLiveBillCameraOpen(false)
  }

  const flipBillCamera = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment'
    setCameraFacing(nextFacing)
    startLiveBillCamera(nextFacing)
  }

  const captureBillSnapshot = () => {
    if (!billVideoRef.current) return
    const video = billVideoRef.current
    const w = video.videoWidth > 0 ? video.videoWidth : 1280
    const h = video.videoHeight > 0 ? video.videoHeight : 720
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, w, h)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    setBillPreview(dataUrl)
    stopLiveBillCamera()
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `grocery_receipt_${Date.now()}.jpg`, { type: 'image/jpeg' })
        handleBillFile(file)
      }
    }, 'image/jpeg', 0.95)
  }

  useEffect(() => {
    return () => {
      if (billStreamRef.current) {
        billStreamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  // Load saved bills history
  const loadBillsHistory = async () => {
    setLoadingBills(true)
    try {
      const list = await fetchUserBills()
      setSavedBillsHistory(list || [])
    } catch (e) {
      console.warn('Error fetching bills:', e)
    } finally {
      setLoadingBills(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'bill_scan') {
      loadBillsHistory()
    }
  }, [activeTab])

  // Handle Bill File Upload
  const handleBillFile = async (file) => {
    if (!file) return
    setError('')
    setSuccess('')
    setAnalyzedBill(null)
    setAnalyzingBill(true)
    setBillAnalysisStep('🧾 Reading receipt line items & prices...')

    try {
      const previewUrl = URL.createObjectURL(file)
      setBillPreview(previewUrl)

      setBillAnalysisStep('🛡️ Checking items against User & Family Member Allergies & Conditions...')
      
      const customKey = localStorage.getItem('foodie_gemini_key')
      const result = await analyzeBillWithAI(file, profile, prescriptions, customKey, (msg) => setBillAnalysisStep(msg), familyMembers)

      setBillAnalysisStep('💾 Automatically saving bill to your Foodie AI history...')
      
      setAnalyzedBill(result)
      setSuccess(`✅ Grocery bill from "${result.storeName || 'Store'}" analyzed for the whole family & auto-saved!`)

      if (result.harmfulCount > 0) {
        if (navigator.vibrate) navigator.vibrate([500, 200, 500])
      } else {
        triggerHapticsAndConfetti(85)
      }

      if (voiceEnabled) {
        speakBillResult(result, voiceLang)
      }

      loadBillsHistory()
    } catch (err) {
      console.error('Bill analyze error:', err)
      setError(err.message || 'Could not analyze grocery bill. Please ensure receipt is readable.')
    } finally {
      setAnalyzingBill(false)
      setBillAnalysisStep('')
    }
  }

  // Handle Sample Bill (1-Click Test)
  const handleSampleBill = async () => {
    setError('')
    setSuccess('')
    setAnalyzedBill(null)
    setAnalyzingBill(true)
    setBillAnalysisStep('🧾 Loading sample D-Mart Supermarket receipt...')

    try {
      const customKey = localStorage.getItem('foodie_gemini_key')
      const sampleText = `D-MART SUPERMARKET
Receipt No: DM-88429
Date: 25/08/2026
--------------------------------
1. Parle-G Glucose Biscuits 250g - 30.00
2. Coca Cola 750ml PET - 45.00
3. Roasted Salted Peanuts 200g - 65.00
4. Amul Fresh Toned Milk 500ml - 32.00
5. Quaker Rolled Oats 1kg - 190.00
6. Lays Classic Salted Potato Chips 50g - 20.00
7. Organic Brown Rice 1kg - 115.00
--------------------------------
TOTAL AMOUNT: Rs. 497.00
THANK YOU FOR SHOPPING AT D-MART!`

      setBillAnalysisStep('🛡️ Evaluating harmful items against whole family roster...')
      const result = await analyzeBillWithAI(sampleText, profile, prescriptions, customKey, (msg) => setBillAnalysisStep(msg), familyMembers)
      
      setAnalyzedBill(result)
      setSuccess(`✅ Sample D-Mart grocery bill analyzed for whole family & auto-saved!`)

      if (result.harmfulCount > 0) {
        if (navigator.vibrate) navigator.vibrate([500, 200, 500])
      } else {
        triggerHapticsAndConfetti(85)
      }

      if (voiceEnabled) {
        speakBillResult(result, voiceLang)
      }

      loadBillsHistory()
    } catch (err) {
      console.error('Sample bill analyze error:', err)
      setError(err.message || 'Sample bill analysis failed.')
    } finally {
      setAnalyzingBill(false)
      setBillAnalysisStep('')
    }
  }

  // Add Alternative item to user's shopping list
  const handleAddAlternativeToCart = (alt, originalItemName) => {
    const itemKey = `${originalItemName}_${alt.name}`
    addToShoppingList({
      id: `alt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: alt.name,
      brand: 'Recommended Safe Alternative',
      healthScore: alt.healthScore || 90,
      category: alt.category || 'Healthy Food',
      qty: 1
    })
    setAddedAlternatives(prev => ({ ...prev, [itemKey]: true }))
    setTimeout(() => {
      setAddedAlternatives(prev => ({ ...prev, [itemKey]: false }))
    }, 2500)
  }

  // Delete saved bill from history
  const handleDeleteBill = async (billId, e) => {
    e?.stopPropagation()
    if (!confirm('Are you sure you want to delete this saved bill record?')) return
    const ok = await deleteBillRecord(billId)
    if (ok) {
      setSavedBillsHistory(prev => prev.filter(b => b._id !== billId))
      if (analyzedBill?._id === billId) setAnalyzedBill(null)
    }
  }



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
      console.warn('Barcode scanner stop warning:', err)
    }
    setScanning(false)
  }

  // ── Allergen Checker ──────────────────────────────────────────────────────
  const checkAllergens = (product) => {
    if (!profile?.allergies || profile.allergies.length === 0) return null
    
    const ingredientsText = [
      ...(product.ingredients || []),
      ...(product.allergens || []),
      ...(product.visibleText || []),
      product.name || '',
      product.productName || ''
    ].join(' ').toLowerCase()

    const searchMap = {
      'Peanuts': ['peanut', 'groundnut'],
      'Tree Nuts': ['almond', 'cashew', 'walnut', 'pecan', 'macadamia', 'pistachio', 'hazelnut'],
      'Milk': ['milk', 'dairy', 'whey', 'casein', 'butter', 'cheese', 'cream'],
      'Eggs': ['egg', 'albumin', 'mayo'],
      'Gluten': ['wheat', 'gluten', 'barley', 'rye', 'malt', 'oat'],
      'Soy': ['soy', 'edamame', 'tofu', 'miso'],
      'Fish': ['fish', 'tuna', 'salmon', 'cod'],
      'Shellfish': ['shrimp', 'crab', 'lobster', 'prawn'],
      'Sesame': ['sesame', 'tahini'],
      'High Added Sugar': ['sugar', 'syrup', 'cane'],
      'High Sodium': ['sodium', 'salt']
    }

    const foundAllergies = profile.allergies.filter(allergy => {
      const terms = searchMap[allergy] || [allergy.toLowerCase()]
      return terms.some(term => ingredientsText.includes(term))
    })

    return foundAllergies.length > 0 ? foundAllergies : null
  }

  // ── Handle Barcode Lookup ────────────────────────────────────────────────
  const handleBarcode = async (code) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    setError('')
    setSuccess('🔍 Looking up barcode in database...')

    try {
      const product = await fetchProductByBarcode(code)
      if (product) {
        const prodId = product.id || product.barcode || `p_${code}`
        sessionStorage.setItem(`foodie_product_${prodId}`, JSON.stringify(product))
        sessionStorage.setItem(`foodie_product_${code}`, JSON.stringify(product))
        if (product.barcode) {
          sessionStorage.setItem(`foodie_product_${product.barcode}`, JSON.stringify(product))
        }

        setScannedBarcodeProduct(product)
        setSuccess(`✅ Successfully scanned "${product.name}"!`)
        addScanToHistory(product)
        await stopScanner()

        const allergensFound = checkAllergens(product)
        const familyAudit = auditProductForFamily(product, profile, familyMembers)
        const hasAllergens = (allergensFound && allergensFound.length > 0) || (familyAudit && familyAudit.affectedMembers?.length > 0)

        if (hasAllergens) {
          const list = allergensFound && allergensFound.length > 0 
            ? allergensFound 
            : familyAudit.affectedMembers.map(m => `${m.name}: ${m.trigger}`)

          setDangerAlert({
            allergens: list,
            product
          })

          if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500])

          if (voiceEnabled && window.speechSynthesis) {
            window.speechSynthesis.cancel()
            const lang = voiceLang || 'en-US'
            const msg = new SpeechSynthesisUtterance()
            msg.lang = lang
            if (lang === 'ta-IN') {
              msg.text = `எச்சரிக்கை! இந்த ${product.name} தயாரிப்பில் ஒவ்வாமை பொருட்கள் உள்ளன. சாப்பிட வேண்டாம்!`
            } else if (lang === 'hi-IN') {
              msg.text = `चेतावनी! इस ${product.name} में एलर्जी तत्व पाए गए हैं। कृपया इसे न खाएं!`
            } else {
              msg.text = `Warning! Allergen detected in ${product.name}. Do not consume!`
            }
            msg.rate = 1.05
            window.speechSynthesis.speak(msg)
          }
        } else {
          triggerHapticsAndConfetti(product.healthScore)
          if (voiceEnabled) speakResult(product.healthScore, product.name, voiceLang)
        }
      } else {
        setError(`Product with barcode "${code}" not found in database. Please check the barcode number or enter manually below.`)
        setSuccess('')
      }
    } catch (err) {
      console.error('Fetch product error:', err)
      setError('Unable to retrieve product details. Please try again.')
      setSuccess('')
    } finally {
      isProcessingRef.current = false
    }
  }

  // ── Start Camera Barcode Scanner ──────────────────────────────────────────
  const startScanner = async () => {
    isProcessingRef.current = false
    setError('')
    setSuccess('')

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
        setError('Camera could not start. Please verify your camera permissions or enter barcode manually below.')
      }
    }
  }

  // ── Handle Manual Search ──────────────────────────────────────────────────
  const handleManualSearch = async () => {
    const code = manualBarcode.trim()
    if (!code) {
      setError('Please enter a valid barcode number.')
      return
    }
    await handleBarcode(code)
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  // Health Score status categorization helper
  const getHealthStatus = (score) => {
    const s = typeof score === 'number' ? score : (parseFloat(score) || 60)
    if (s >= 80) return { label: 'Healthy', color: 'bg-emerald-500 text-white', ringColor: '#16A34A' }
    if (s >= 60) return { label: 'Moderate', color: 'bg-lime-500 text-white', ringColor: '#84CC16' }
    if (s >= 40) return { label: 'Eat Occasionally', color: 'bg-amber-500 text-white', ringColor: '#F59E0B' }
    return { label: 'Avoid Frequently', color: 'bg-rose-500 text-white', ringColor: '#EF4444' }
  }

  // Dynamic emotion glow & emergency red screen alert
  const getThemeColor = () => {
    if (dangerAlert) return 'rgba(239, 68, 68, 0.35)'
    const activeProd = scannedBarcodeProduct
    if (!activeProd) return 'transparent'

    const allergensFound = checkAllergens(activeProd)
    const familyAudit = auditProductForFamily(activeProd, profile, familyMembers)
    const rxAudit = auditProductForPrescriptions(activeProd, prescriptions)
    if ((allergensFound && allergensFound.length > 0) || (familyAudit && familyAudit.affectedMembers?.length > 0) || (rxAudit && rxAudit.hasConflict)) {
      return 'rgba(239, 68, 68, 0.25)'
    }

    const score = activeProd.healthScore
    if (score >= 80) return 'rgba(22, 163, 74, 0.10)'
    if (score >= 50) return 'rgba(245, 158, 11, 0.10)'
    return 'rgba(239, 68, 68, 0.12)'
  }

  return (
    <AppShell title={t('scan_product') || "Scan Product"}>
      {/* Background Emotion Glow */}
      <div 
        className="fixed inset-0 pointer-events-none transition-colors duration-1000 z-0" 
        style={{ backgroundColor: getThemeColor() }} 
      />
      
      <div className="max-w-xl mx-auto pb-12 fade-in-up relative z-10">

        {/* Header Title Banner */}
        <div className="mb-4 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-ink dark:text-white flex items-center justify-center sm:justify-start gap-2">
              <Sparkles size={22} className="text-leaf-dark dark:text-leaf-light animate-pulse" />
              <span>Smart AI Product Explainer</span>
            </h1>
            <p className="text-xs text-ink/60 dark:text-white/50 mt-0.5">
              Powered by Gemini Vision AI · Instant package & nutrition breakdown
            </p>
          </div>

          {/* Voice Language Selector */}
          <div className="flex items-center justify-center gap-1.5 p-1 bg-white/60 dark:bg-white/5 backdrop-blur-md rounded-xl border border-moss-100 dark:border-white/10 shrink-0">
            {[
              { id: 'en-US', label: '🇬🇧 EN' },
              { id: 'ta-IN', label: '🇮🇳 TA' },
              { id: 'hi-IN', label: '🇮🇳 HI' }
            ].map(lang => (
              <button
                key={lang.id}
                onClick={() => setVoiceLang(lang.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  voiceLang === lang.id 
                    ? 'bg-moss-700 text-white shadow-soft' 
                    : 'text-ink/60 dark:text-white/50 hover:bg-moss-200/50 dark:hover:bg-white/10'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-moss-100/60 dark:bg-white/5 rounded-2xl mb-4 shadow-xs border border-moss-200/40 dark:border-white/5">
          <button
            type="button"
            onClick={() => { setActiveTab('barcode'); setError(''); setSuccess('') }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'barcode'
                ? 'bg-moss-700 text-white shadow-soft'
                : 'text-ink/60 dark:text-white/50 hover:text-ink dark:hover:text-white'
            }`}
          >
            <Camera size={15} />
            <span>Barcode</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('bill_scan'); stopScanner(); setError(''); setSuccess('') }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'bill_scan'
                ? 'bg-moss-700 text-white shadow-soft'
                : 'text-ink/60 dark:text-white/50 hover:text-ink dark:hover:text-white'
            }`}
          >
            <Receipt size={15} className={activeTab === 'bill_scan' ? 'text-leaf-light animate-bounce' : ''} />
            <span>Bill Scanner</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase shadow-xs">AI</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('manual'); stopScanner(); setError(''); setSuccess('') }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'manual'
                ? 'bg-moss-700 text-white shadow-soft'
                : 'text-ink/60 dark:text-white/50 hover:text-ink dark:hover:text-white'
            }`}
          >
            <Keyboard size={15} />
            <span>Manual</span>
          </button>
        </div>

        {/* Global Notifications */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              className="mb-4 p-3.5 rounded-xl bg-leaf-light/15 text-leaf-dark dark:text-leaf border border-leaf/30 text-xs font-medium flex items-center gap-2.5 shadow-glow"
            >
              <CheckCircle2 size={17} className="shrink-0 text-leaf drop-shadow-md" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs border border-rose-500/20 flex items-start gap-3 shadow-xs fade-in-up">
            <AlertCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p className="leading-relaxed font-medium">{error}</p>
            </div>
          </div>
        )}



        {/* ── TAB 2: GROCERY BILL & RECEIPT SAFETY SCANNER ─────────────────── */}
        {activeTab === 'bill_scan' && (
          <div className="space-y-5">
            {/* Top Info Banner & History Trigger */}
            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-moss-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-soft bg-gradient-to-r from-moss-50/70 to-mint-tint/30 dark:from-white/5 dark:to-white/5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-moss-700 to-leaf text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Receipt size={22} />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-ink dark:text-white flex items-center gap-2">
                    <span>Grocery Bill Safety Auditor</span>
                    <span className="text-[10px] font-extrabold bg-leaf/20 text-leaf-dark dark:text-leaf px-2 py-0.5 rounded-full">
                      AI Vision
                    </span>
                  </h2>
                  <p className="text-xs text-ink/60 dark:text-white/50 mt-0.5">
                    Checks grocery items against your Allergies & Conditions · Auto-saved to history
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  loadBillsHistory()
                  setShowBillHistory(true)
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-white/10 border border-moss-200 dark:border-white/10 text-xs font-bold text-moss-800 dark:text-white hover:bg-moss-50 dark:hover:bg-white/20 transition-all shadow-xs shrink-0"
              >
                <History size={15} className="text-leaf" />
                <span>Saved Bills ({savedBillsHistory.length})</span>
              </button>
            </div>

            {/* Receipt Upload / Capture Area */}
            <div className="glass-panel p-5 sm:p-6 border border-moss-100 dark:border-white/10 text-center rounded-2xl relative overflow-hidden shadow-soft">
              {/* Standard File Upload */}
              <input
                type="file"
                ref={billFileInputRef}
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleBillFile(file)
                }}
                className="hidden"
                id="grocery-bill-upload"
              />

              {/* Camera Direct Capture */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleBillFile(file)
                }}
                className="hidden"
                id="grocery-bill-camera"
              />

              {billPreview ? (
                <div className="relative rounded-2xl overflow-hidden max-h-60 mx-auto mb-4 border border-moss-100 dark:border-white/10 bg-black/10 shadow-sm">
                  <img src={billPreview} alt="Receipt Preview" className="w-full h-auto object-contain max-h-60" />
                  
                  {analyzingBill && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white">
                      <div className="w-full h-1 bg-leaf-light shadow-[0_0_14px_#7FCB9F] absolute top-1/2 -translate-y-1/2 animate-pulse" />
                      <Loader2 size={38} className="animate-spin text-leaf-light mb-3" />
                      <p className="font-display font-semibold text-sm text-center text-white">{billAnalysisStep || 'Analyzing Grocery Bill with AI…'}</p>
                      <p className="text-[11px] text-white/70 mt-1">Extracting only printed items & checking health safety</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 px-3">
                  <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-moss-50 to-mint-tint dark:from-white/5 dark:to-white/10 border border-moss-100 dark:border-white/10 flex items-center justify-center shadow-xs">
                    <Receipt size={32} className="text-moss-700 dark:text-leaf-light" />
                  </div>
                  <h3 className="font-display font-bold text-base text-ink dark:text-white mb-1">
                    Scan Supermarket Grocery Bill
                  </h3>
                  <p className="text-xs text-ink/50 dark:text-white/40 max-w-sm mx-auto mb-6">
                    Snap or upload your grocery bill. AI will extract only the products on the receipt, flag harmful items matching your health profile, and recommend safe alternatives!
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
                    {/* Live Camera Scanner Button */}
                    <button
                      type="button"
                      onClick={() => startLiveBillCamera()}
                      disabled={analyzingBill}
                      className="w-full sm:w-auto btn-primary py-3 px-5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs shadow-soft bg-gradient-to-r from-moss-700 to-leaf hover:from-moss-800 hover:to-leaf-dark cursor-pointer"
                    >
                      <Camera size={16} />
                      <span>📸 Live Scan Bill (Camera)</span>
                    </button>

                    {/* File Upload Button */}
                    <button
                      type="button"
                      onClick={() => billFileInputRef.current?.click()}
                      disabled={analyzingBill}
                      className="w-full sm:w-auto btn-secondary py-3 px-5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs hover:border-leaf/40"
                    >
                      <UploadCloud size={16} />
                      <span>📁 Upload Bill File</span>
                    </button>

                    {/* Sample Test Bill */}
                    <button
                      type="button"
                      onClick={handleSampleBill}
                      disabled={analyzingBill}
                      className="w-full sm:w-auto p-2.5 rounded-xl border border-moss-200 dark:border-white/10 text-ink/70 dark:text-white/70 hover:bg-moss-50 dark:hover:bg-white/5 text-[11px] font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={13} className="text-leaf" />
                      <span>Sample Bill</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Status banner while analyzing */}
              {analyzingBill && !billPreview && (
                <div className="mt-4 p-4 rounded-xl bg-leaf/10 border border-leaf/20 flex items-center justify-center gap-3 text-xs font-semibold text-leaf">
                  <Loader2 size={18} className="animate-spin" />
                  <span>{billAnalysisStep}</span>
                </div>
              )}
            </div>

            {/* ── Bill Analysis Results Dashboard ── */}
            {analyzedBill && (
              <div className="space-y-4 fade-in-up">
                {/* Store & Cart Header Card */}
                <div className="glass-panel p-5 rounded-2xl border border-moss-100 dark:border-white/10 shadow-soft bg-white dark:bg-[#12211A]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-moss-100/70 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-moss-50 dark:bg-white/10 border border-moss-100 dark:border-white/10 flex items-center justify-center text-moss-700 dark:text-leaf-light shrink-0 shadow-xs">
                        <Store size={24} />
                      </div>
                      <div>
                        <h3 className="font-display font-black text-lg text-ink dark:text-white leading-tight">
                          {analyzedBill.storeName || 'Supermarket Receipt'}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-ink/50 dark:text-white/40 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> {analyzedBill.billDate || new Date().toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-ink dark:text-white">
                            Total: {analyzedBill.currency || '₹'}{analyzedBill.totalAmount || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Auto-Saved Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold self-start sm:self-auto">
                      <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                      <span>Auto-Saved to Database</span>
                    </div>
                  </div>

                  {/* Overall Safety Banner */}
                  <div className="mt-4">
                    {analyzedBill.harmfulCount > 0 ? (
                      <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2.5">
                        <ShieldAlert size={20} className="text-red-600 dark:text-red-400 shrink-0" />
                        <div>
                          <p className="font-bold">⚠️ Warning: {analyzedBill.harmfulCount} Harmful / Allergen-Triggering Product(s) Found!</p>
                          <p className="font-normal text-[11px] mt-0.5 text-red-600 dark:text-red-300/80">
                            See safe alternative food suggestions below to swap out hazardous items.
                          </p>
                        </div>
                      </div>
                    ) : analyzedBill.cautionCount > 0 ? (
                      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2.5">
                        <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                          <p className="font-bold">⚠️ Caution: {analyzedBill.cautionCount} Processed / Moderation Item(s) Detected</p>
                          <p className="font-normal text-[11px] mt-0.5 text-amber-600 dark:text-amber-300/80">
                            No direct allergens triggered, but some items are high in sugar or sodium.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
                        <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                          <p className="font-bold">🌿 Great Job! All {analyzedBill.items?.length || 0} Grocery Items are Safe & Clean!</p>
                          <p className="font-normal text-[11px] mt-0.5 text-emerald-600 dark:text-emerald-300/80">
                            Zero allergens or condition conflicts found matching your profile.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-moss-100/70 dark:border-white/10 text-center">
                    <div className="p-2 rounded-xl bg-moss-50/50 dark:bg-white/5">
                      <p className="text-[10px] text-ink/40 dark:text-white/40 uppercase font-semibold">Total Items</p>
                      <p className="text-base font-black text-ink dark:text-white mt-0.5">{analyzedBill.items?.length || 0}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/20">
                      <p className="text-[10px] text-red-600 dark:text-red-400 uppercase font-semibold">Harmful</p>
                      <p className="text-base font-black text-red-600 dark:text-red-400 mt-0.5">{analyzedBill.harmfulCount || 0}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20">
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold">Caution</p>
                      <p className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">{analyzedBill.cautionCount || 0}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Safe</p>
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{analyzedBill.safeCount || 0}</p>
                    </div>
                  </div>

                  {/* Executive Summary Box */}
                  {analyzedBill.summary && (
                    <div className="mt-4 p-3 rounded-xl bg-mint-tint/40 dark:bg-white/5 border border-moss-100 dark:border-white/10 text-xs text-ink/80 dark:text-white/80 leading-relaxed">
                      <strong>AI Summary:</strong> {analyzedBill.summary}
                    </div>
                  )}
                </div>

                {/* Filter Tabs for Items */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-1">
                  <span className="text-xs font-bold text-ink/70 dark:text-white/70 shrink-0">Product Breakdown:</span>
                  <div className="flex gap-1.5">
                    {[
                      { id: 'all', label: `All (${analyzedBill.items?.length || 0})` },
                      { id: 'harmful', label: `🔴 Harmful (${analyzedBill.harmfulCount || 0})` },
                      { id: 'caution', label: `🟡 Caution (${analyzedBill.cautionCount || 0})` },
                      { id: 'safe', label: `🟢 Safe (${analyzedBill.safeCount || 0})` }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setBillFilter(f.id)}
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all whitespace-nowrap ${
                          billFilter === f.id
                            ? 'bg-moss-700 text-white shadow-xs'
                            : 'bg-white dark:bg-white/5 border border-moss-100 dark:border-white/10 text-ink/60 dark:text-white/60 hover:text-ink'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List of Scanned Bill Items */}
                <div className="space-y-3">
                  {analyzedBill.items
                    ?.filter(item => {
                      if (billFilter === 'harmful') return item.status?.toLowerCase() === 'harmful'
                      if (billFilter === 'caution') return item.status?.toLowerCase() === 'caution'
                      if (billFilter === 'safe') return item.status?.toLowerCase() === 'safe'
                      return true
                    })
                    .map((item, idx) => {
                      const isHarmful = item.status?.toLowerCase() === 'harmful'
                      const isCaution = item.status?.toLowerCase() === 'caution'
                      const isSafe = !isHarmful && !isCaution

                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border transition-all ${
                            isHarmful
                              ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 shadow-xs'
                              : isCaution
                              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 shadow-xs'
                              : 'bg-white dark:bg-[#12211A] border-moss-100 dark:border-white/10 shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-display font-bold text-sm text-ink dark:text-white">
                                  {item.name}
                                </h4>
                                {item.brand && (
                                  <span className="text-[10px] bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded text-ink/60 dark:text-white/60">
                                    {item.brand}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-ink/50 dark:text-white/40 mt-0.5">
                                {item.category || 'Grocery'} • Qty: {item.quantity || '1'} • {analyzedBill.currency || '₹'}{item.price || 0}
                              </p>
                            </div>

                            {/* Status Badge */}
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 ${
                                isHarmful
                                  ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                                  : isCaution
                                  ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {isHarmful ? <ShieldAlert size={12} /> : isCaution ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
                              <span>{item.status || 'Safe'}</span>
                            </span>
                          </div>

                          {/* Risk Explanation */}
                          {item.riskReason && (
                            <div className={`mt-2.5 p-2.5 rounded-xl text-xs font-medium ${
                              isHarmful 
                                ? 'bg-red-100/70 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/40' 
                                : 'bg-amber-100/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40'
                            }`}>
                              <strong>Health Impact:</strong> {item.riskReason}
                            </div>
                          )}

                          {/* 👨‍👩‍👧‍👦 WHO CANNOT EAT THIS (AFFECTED FAMILY MEMBERS) */}
                          {item.affectedMembers && item.affectedMembers.length > 0 && (
                            <div className="mt-2.5 p-3 rounded-2xl bg-red-100/80 dark:bg-red-950/50 border border-red-300 dark:border-red-800/60 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-black text-red-900 dark:text-red-200 uppercase tracking-wider">
                                <Users size={14} className="text-red-600 dark:text-red-400" />
                                <span>Affected Family Members ({item.affectedMembers.length}):</span>
                              </div>
                              <div className="space-y-1.5">
                                {item.affectedMembers.map((m, mIdx) => (
                                  <div key={mIdx} className="p-2 rounded-xl bg-white/90 dark:bg-black/40 border border-red-200 dark:border-red-900/40 text-xs shadow-2xs">
                                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                      <span className="font-bold text-red-900 dark:text-red-100 flex items-center gap-1">
                                        🚨 {m.name} <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-200 dark:bg-red-900/80 text-red-800 dark:text-red-200">({m.relationship || 'Member'})</span>
                                      </span>
                                      <span className="text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                                        {m.trigger || 'Allergy Trigger'}
                                      </span>
                                    </div>
                                    {m.clinicalDetail && (
                                      <p className="text-[11px] text-red-800/90 dark:text-red-300/90 mt-1 leading-snug">
                                        {m.clinicalDetail}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Matched Allergens & Conditions Tags */}
                          {(item.matchedAllergens?.length > 0 || item.matchedConditions?.length > 0) && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {item.matchedAllergens?.map((all, aIdx) => (
                                <span key={aIdx} className="px-2 py-0.5 rounded bg-red-200/60 dark:bg-red-900/60 text-red-900 dark:text-red-200 text-[10px] font-bold">
                                  🚨 Allergen: {all}
                                </span>
                              ))}
                              {item.matchedConditions?.map((cond, cIdx) => (
                                <span key={cIdx} className="px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                                  ⚠️ Health Condition: {cond}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* ── RECOMMENDED HEALTHY SAFE ALTERNATIVES ── */}
                          {item.safeAlternatives && item.safeAlternatives.length > 0 && (
                            <div className="mt-3.5 pt-3 border-t border-black/5 dark:border-white/5 space-y-2">
                              <p className="text-xs font-bold text-leaf-dark dark:text-leaf-light flex items-center gap-1.5">
                                <Sparkles size={13} className="text-leaf" />
                                <span>Recommended Safe Alternatives to Buy Next Time:</span>
                              </p>

                              <div className="grid sm:grid-cols-2 gap-2">
                                {item.safeAlternatives.map((alt, altIdx) => {
                                  const altKey = `${item.name}_${alt.name}`
                                  const isAdded = addedAlternatives[altKey]

                                  return (
                                    <div
                                      key={altIdx}
                                      className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-moss-200/70 dark:border-white/10 flex flex-col justify-between shadow-2xs"
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-1">
                                          <h5 className="font-bold text-xs text-ink dark:text-white truncate">
                                            {alt.name}
                                          </h5>
                                          <span className="text-[10px] font-bold text-leaf shrink-0 bg-leaf/10 px-1.5 py-0.2 rounded">
                                            {alt.healthScore || 90}/100
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-ink/60 dark:text-white/50 mt-1 leading-snug">
                                          {alt.reason}
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleAddAlternativeToCart(alt, item.name)}
                                        className={`mt-2 w-full py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                          isAdded
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-leaf/10 hover:bg-leaf text-leaf-dark dark:text-leaf-light hover:text-white dark:hover:text-white'
                                        }`}
                                      >
                                        {isAdded ? (
                                          <>
                                            <Check size={12} />
                                            <span>Added to List!</span>
                                          </>
                                        ) : (
                                          <>
                                            <ShoppingCart size={12} />
                                            <span>Add to Shopping List</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>

                {/* Bottom Action Row */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBillPreview(null)
                      setAnalyzedBill(null)
                    }}
                    className="w-full sm:flex-1 btn-primary py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs shadow-soft"
                  >
                    <Receipt size={16} />
                    <span>Scan Another Grocery Bill</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => speakBillResult(analyzedBill, voiceLang)}
                    className="w-full sm:w-auto btn-secondary py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs"
                  >
                    <span>🔊 Listen to Voice Summary</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: LIVE BARCODE CAMERA ─────────────────────────────────────── */}
        {activeTab === 'barcode' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 flex items-center gap-3.5 border border-moss-100/70 dark:border-white/10 shadow-soft">
              <div className="h-11 w-11 rounded-xl bg-moss-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                <ScanBarcode size={22} />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink dark:text-white">
                  {t('barcode_camera') || 'Barcode Scanner'}
                </h2>
                <p className="text-xs text-ink/50 dark:text-white/40">
                  {t('point_camera') || 'Point camera at product barcode'} (EAN-13, EAN-8, UPC-A, UPC-E)
                </p>
              </div>
            </div>

            <div className="glass-panel p-5 border border-moss-100/70 dark:border-white/10 shadow-soft">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <Camera size={18} className="text-moss-700 dark:text-leaf-light" />
                  <h3 className="font-semibold text-ink dark:text-white text-sm">
                    {t('live_barcode') || 'Live Barcode Camera'}
                  </h3>
                </div>
                {scanning && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-leaf px-2.5 py-0.5 rounded-full bg-leaf/10 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-leaf" /> {t('scanning_live') || 'Scanning Live'}
                  </span>
                )}
              </div>

              <div className="relative w-full rounded-2xl overflow-hidden bg-black min-h-[260px] border border-moss-100/40 dark:border-white/5">
                <div id="barcode-reader" className="w-full" />
                {scanning && (
                  <div className="absolute inset-0 pointer-events-none scan-sweep z-20">
                    <div className="scanner-bracket bracket-tl" />
                    <div className="scanner-bracket bracket-tr" />
                    <div className="scanner-bracket bracket-bl" />
                    <div className="scanner-bracket bracket-br" />
                  </div>
                )}
              </div>

              {!scanning ? (
                <button
                  type="button"
                  onClick={startScanner}
                  className="w-full mt-4 bg-moss-700 hover:bg-moss-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 focus-ring shadow-soft transition-all text-sm"
                >
                  <Camera size={18} /> {t('open_camera') || 'Open Camera Scanner'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopScanner}
                  className="w-full mt-4 bg-clay hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 focus-ring shadow-soft transition-all text-sm"
                >
                  <X size={18} /> {t('stop_camera') || 'Stop Camera'}
                </button>
              )}
            </div>

          </div>
        )}

        {/* ── TAB 4: MANUAL BARCODE ENTRY ────────────────────────────────────── */}
        {activeTab === 'manual' && (
          <div className="space-y-4">
            <div className="glass-panel p-5 border border-moss-100/70 dark:border-white/10 shadow-soft">
              <div className="flex items-center gap-2 mb-2">
                <Keyboard size={18} className="text-moss-700 dark:text-leaf-light" />
                <h3 className="font-semibold text-ink dark:text-white text-sm">
                  {t('enter_barcode_manual') || 'Enter Barcode Number Manually'}
                </h3>
              </div>
              <p className="text-xs text-ink/40 dark:text-white/40 mb-3">
                {t('type_barcode') || 'Type the barcode digits printed on the package to look it up in MongoDB.'}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleManualSearch() }}
                  placeholder="e.g. 8901063094253 or 8901058851126"
                  className="input-base flex-1 text-sm font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleManualSearch}
                  className="btn-primary px-5 rounded-xl flex items-center gap-2 font-semibold text-sm"
                >
                  <Search size={16} /> {t('search') || 'Search'}
                </button>
              </div>
            </div>

            <div className="glass-panel p-4 border border-moss-100/50 dark:border-white/5">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink/60 dark:text-white/60 mb-2">
                <HelpCircle size={14} className="text-leaf" /> {t('supported_standards') || 'Supported Barcode Standards'}
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

        {/* ── SCANNED BARCODE PRODUCT RESULT CARD (RENDERED IN BOTH BARCODE & MANUAL TABS) ── */}
        {(activeTab === 'barcode' || activeTab === 'manual') && scannedBarcodeProduct && (() => {
          const cardAllergens = checkAllergens(scannedBarcodeProduct)
          const cardFamilyAudit = auditProductForFamily(scannedBarcodeProduct, profile, familyMembers)
          const cardRxAudit = auditProductForPrescriptions(scannedBarcodeProduct, prescriptions)
          const cardHasAllergens = (cardAllergens && cardAllergens.length > 0) || (cardFamilyAudit && cardFamilyAudit.affectedMembers?.length > 0)
          const cardHasRxConflict = cardRxAudit && cardRxAudit.hasConflict
          const cardHasHazard = cardHasAllergens || cardHasRxConflict
          const detectedList = cardAllergens && cardAllergens.length > 0 ? cardAllergens : cardFamilyAudit.affectedMembers?.map(m => `${m.name}: ${m.trigger}`)

          return (
            <div className="space-y-4 fade-in-up mt-4">
              {/* Emergency Red Screen Banner for Allergens & Prescription Conflicts */}
              {cardHasHazard && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-bold text-xs flex items-center gap-3 shadow-xl border-2 border-red-400 animate-pulse">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                    <AlertTriangle size={24} className="text-white animate-bounce" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                      <span>{cardHasRxConflict ? '🚨 PRESCRIPTION CONFLICT DETECTED' : '🚨 ALLERGEN DETECTED'}</span>
                      <span className="text-[10px] bg-white text-red-700 px-2 py-0.2 rounded-full font-extrabold uppercase">
                        Danger
                      </span>
                    </p>
                    <p className="text-xs text-white/90 font-medium mt-0.5">
                      {cardHasRxConflict 
                        ? `Conflicts with ${cardRxAudit.conflicts[0]?.medication || 'Prescription'}: ${cardRxAudit.conflicts[0]?.nutrientOrTrigger || 'Hazardous nutrient'}. Do not consume!` 
                        : `Contains: ${detectedList?.join(', ')}. Do not consume!`}
                    </p>
                  </div>
                </div>
              )}

              <div className={`glass-panel p-5 sm:p-6 shadow-glow rounded-3xl transition-all ${
                cardHasHazard
                  ? 'border-2 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.35)] bg-gradient-to-b from-red-500/10 via-white to-white dark:via-[#12211A] dark:to-[#12211A]'
                  : 'border border-moss-200 dark:border-white/15 bg-white dark:bg-[#12211A]'
              }`}>
                
                {/* Top Bar */}
                <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-moss-100 dark:border-white/10">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    cardHasHazard ? 'bg-red-600 text-white animate-pulse' : 'bg-moss-700 text-white'
                  }`}>
                    {cardHasHazard ? <AlertTriangle size={11} /> : <ScanBarcode size={11} />}
                    <span>Barcode: {scannedBarcodeProduct.barcode || 'Verified'}</span>
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    cardHasHazard ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800' : 'text-leaf-dark dark:text-leaf-light bg-leaf/10'
                  }`}>
                    {cardHasRxConflict ? '🩺 Rx Conflict' : (cardHasAllergens ? '⚠️ Allergen Warning' : (scannedBarcodeProduct.category || 'Food Item'))}
                  </span>
                </div>

                {/* Product Header */}
                <div className="flex items-start gap-4 justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ink/40 dark:text-white/40 uppercase tracking-wider">
                      {scannedBarcodeProduct.brand || 'Product Brand'}
                    </p>
                    <h2 className="font-display font-black text-lg sm:text-xl text-ink dark:text-white mt-0.5 leading-snug">
                      {scannedBarcodeProduct.name}
                    </h2>
                  </div>

                  {/* Health Score Ring */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <HealthScoreRing score={cardHasHazard ? Math.min(scannedBarcodeProduct.healthScore, 30) : scannedBarcodeProduct.healthScore} size={64} strokeWidth={6} />
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      cardHasHazard ? 'bg-red-600 text-white' : getHealthStatus(scannedBarcodeProduct.healthScore).color
                    }`}>
                      {cardHasHazard ? 'Health Danger' : getHealthStatus(scannedBarcodeProduct.healthScore).label}
                    </span>
                  </div>
                </div>

              {/* Nutrition Highlights Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 pt-3 border-t border-moss-100/70 dark:border-white/5">
                <div className="p-2 rounded-xl bg-moss-50 dark:bg-white/5 text-center">
                  <p className="text-[10px] text-ink/40 dark:text-white/40 font-semibold">Calories</p>
                  <p className="text-xs font-black text-ink dark:text-white mt-0.5">{scannedBarcodeProduct.calories || 0} kcal</p>
                </div>
                <div className="p-2 rounded-xl bg-moss-50 dark:bg-white/5 text-center">
                  <p className="text-[10px] text-ink/40 dark:text-white/40 font-semibold">Sugar</p>
                  <p className="text-xs font-black text-ink dark:text-white mt-0.5">{scannedBarcodeProduct.sugar || 0}g</p>
                </div>
                <div className="p-2 rounded-xl bg-moss-50 dark:bg-white/5 text-center">
                  <p className="text-[10px] text-ink/40 dark:text-white/40 font-semibold">Protein</p>
                  <p className="text-xs font-black text-ink dark:text-white mt-0.5">{scannedBarcodeProduct.protein || 0}g</p>
                </div>
                <div className="p-2 rounded-xl bg-moss-50 dark:bg-white/5 text-center">
                  <p className="text-[10px] text-ink/40 dark:text-white/40 font-semibold">Fat</p>
                  <p className="text-xs font-black text-ink dark:text-white mt-0.5">{scannedBarcodeProduct.fat || 0}g</p>
                </div>
                <div className="p-2 rounded-xl bg-moss-50 dark:bg-white/5 text-center">
                  <p className="text-[10px] text-ink/40 dark:text-white/40 font-semibold">Carbs</p>
                  <p className="text-xs font-black text-ink dark:text-white mt-0.5">{scannedBarcodeProduct.carbs || scannedBarcodeProduct.carbohydrates || 0}g</p>
                </div>
                <div className="p-2 rounded-xl bg-moss-50 dark:bg-white/5 text-center">
                  <p className="text-[10px] text-ink/40 dark:text-white/40 font-semibold">Sodium</p>
                  <p className="text-xs font-black text-ink dark:text-white mt-0.5">{scannedBarcodeProduct.sodium || 0}mg</p>
                </div>
              </div>

              {/* 👨‍👩‍👧‍👦 WHOLE FAMILY SAFETY & ALLERGY AUDIT */}
              {(() => {
                const familyAudit = auditProductForFamily(scannedBarcodeProduct, profile, familyMembers)
                const hasAffected = familyAudit.affectedMembers.length > 0

                return (
                  <div className="mt-4 p-4 rounded-2xl bg-moss-50/70 dark:bg-black/20 border border-moss-100 dark:border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-ink dark:text-white flex items-center gap-1.5">
                        <Users size={15} className="text-leaf" />
                        <span>Family & Household Safety Audit</span>
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        hasAffected 
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300' 
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {hasAffected ? '⚠️ Caution for Family' : '✅ 100% Safe for All'}
                      </span>
                    </div>

                    {hasAffected ? (
                      <div className="space-y-1.5">
                        {familyAudit.affectedMembers.map((m, mIdx) => (
                          <div key={mIdx} className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-xs">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span className="font-bold text-red-900 dark:text-red-100 flex items-center gap-1">
                                <span>👤 {m.name}</span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-red-200 dark:bg-red-900/80 text-red-800 dark:text-red-200">
                                  ({m.relationship})
                                </span>
                              </span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800">
                                {m.trigger}
                              </span>
                            </div>
                            {m.clinicalDetail && (
                              <p className="text-[11px] text-red-800 dark:text-red-300 mt-1 leading-snug">
                                {m.clinicalDetail}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
                        <span>100% safe for all {familyAudit.totalHouseholdCount} family members!</span>
                      </div>
                    )}

                    {familyAudit.safeMembers.length > 0 && (
                      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          ✅ Safe for:
                        </span>
                        {familyAudit.safeMembers.map((sm, sIdx) => (
                          <span key={sIdx} className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200/60 dark:border-emerald-900/40">
                            {sm.name} ({sm.relationship})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* 🩺 ACTIVE PRESCRIPTIONS & DRUG-FOOD INTERACTION AUDIT (BARCODE SCAN) */}
              {(() => {
                const rxAudit = auditProductForPrescriptions(scannedBarcodeProduct, prescriptions)
                const hasRxConflict = rxAudit.hasConflict

                return (
                  <div className={`mt-4 p-4 rounded-2xl border space-y-3 ${
                    hasRxConflict 
                      ? 'bg-red-50/50 dark:bg-red-950/30 border-red-300 dark:border-red-900/60' 
                      : 'bg-moss-50/70 dark:bg-black/20 border-moss-100 dark:border-white/5'
                  }`}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-ink dark:text-white flex items-center gap-1.5">
                        <Stethoscope size={15} className={hasRxConflict ? 'text-red-600' : 'text-leaf'} />
                        <span>Doctor Prescription & Medication Safety</span>
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        hasRxConflict 
                          ? 'bg-red-600 text-white animate-pulse' 
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {hasRxConflict ? '🚨 Medication Conflict' : `✅ Safe for ${prescriptions.length} Active Rx`}
                      </span>
                    </div>

                    {hasRxConflict ? (
                      <div className="space-y-2">
                        {rxAudit.conflicts.map((c, cIdx) => (
                          <div key={cIdx} className="p-3 rounded-xl bg-white dark:bg-[#1f0a0a] border border-red-300 dark:border-red-900 text-xs space-y-1 shadow-2xs">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span className="font-bold text-red-900 dark:text-red-100 flex items-center gap-1.5">
                                <Pill size={14} className="text-red-600" />
                                <span>{c.medication}</span>
                                <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 px-1.5 py-0.2 rounded font-semibold border border-red-200 dark:border-red-800">
                                  ({c.condition})
                                </span>
                              </span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white">
                                {c.nutrientOrTrigger}
                              </span>
                            </div>
                            <p className="text-[11px] text-red-900 dark:text-red-200 leading-snug font-medium">
                              {c.detail}
                            </p>
                            {c.tamilAdvice && (
                              <p className="text-[11px] text-red-800 dark:text-red-300 italic pt-0.5 font-medium">
                                📌 {c.tamilAdvice}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
                        <span>No conflicts with your {prescriptions.length} doctor prescribed medication(s)!</span>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-3 border-t border-moss-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    const prodId = scannedBarcodeProduct.id || scannedBarcodeProduct.barcode
                    navigate(`/product/${prodId}`)
                  }}
                  className="btn-primary py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs shadow-soft"
                >
                  <Search size={14} />
                  <span>View In-Depth Nutrition Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScannedBarcodeProduct(null)
                    if (activeTab === 'barcode') startScanner()
                  }}
                  className="btn-secondary py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs"
                >
                  <RefreshCw size={14} />
                  <span>{activeTab === 'barcode' ? 'Scan Another Barcode' : 'Search Another Product'}</span>
                </button>
              </div>
            </div>
          </div>
        )
      })()}



        {/* Danger Allergen / Prescription Alert Modal */}
        {dangerAlert && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9999] bg-red-950/85 backdrop-blur-md flex items-center justify-center p-4 fade-in-up">
            <div className="bg-white dark:bg-[#150505] rounded-3xl w-full max-w-sm p-7 shadow-2xl flex flex-col items-center text-center border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]">
              <div className="h-20 w-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4 animate-bounce border-2 border-red-500/50">
                {dangerAlert.isRxConflict ? (
                  <Stethoscope size={42} className="text-red-600 dark:text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                ) : (
                  <AlertTriangle size={42} className="text-red-600 dark:text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                )}
              </div>
              
              <span className="px-3 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-widest mb-2 shadow-sm animate-pulse">
                {dangerAlert.isRxConflict ? '🩺 PRESCRIPTION CONFLICT DETECTED 🩺' : '🚨 ALLERGEN ALERT DETECTED 🚨'}
              </span>

              <h2 className="font-display font-black text-2xl text-red-600 dark:text-red-400 uppercase tracking-tight mb-2">
                {dangerAlert.isRxConflict ? 'Doctor Rx Warning!' : 'Allergy Warning!'}
              </h2>
              
              <p className="text-xs sm:text-sm font-semibold text-ink/80 dark:text-white/80 mb-5 leading-relaxed">
                {dangerAlert.isRxConflict ? (
                  <>
                    This product contains nutrients that directly conflict with your active prescribed medications: <span className="font-black text-red-600 dark:text-red-400 underline decoration-red-500">{Array.isArray(dangerAlert.allergens) ? dangerAlert.allergens.join(', ') : dangerAlert.allergens}</span>!
                  </>
                ) : (
                  <>
                    This product contains <span className="font-black text-red-600 dark:text-red-400 underline decoration-red-500">{Array.isArray(dangerAlert.allergens) ? dangerAlert.allergens.join(' and ') : dangerAlert.allergens}</span>, which matches your allergy health profile!
                  </>
                )}
              </p>
              
              <div className="flex flex-col gap-2.5 w-full">
                <button
                  onClick={() => {
                    const prod = dangerAlert.product
                    setDangerAlert(null)
                    navigate(`/product/${prod.id || prod.barcode}`)
                  }}
                  className="btn-secondary w-full py-3 rounded-2xl text-xs font-bold border border-red-200 dark:border-red-900/40"
                >
                  I Understand, View Details Anyway
                </button>
                <button
                  onClick={() => {
                    setDangerAlert(null)
                    setScannedBarcodeProduct(null)
                    if (activeTab === 'barcode') startScanner()
                  }}
                  className="w-full py-3 rounded-2xl font-bold text-xs text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5"
                >
                  <X size={15} />
                  <span>Dismiss & Scan Another</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ── Saved Bills History Modal ─────────────────────────────────────── */}
        {showBillHistory && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel max-w-lg w-full max-h-[85vh] p-6 rounded-2xl shadow-glow border border-moss-200 dark:border-white/15 flex flex-col fade-in-up bg-white dark:bg-[#0E1A14] text-ink dark:text-white">
              <div className="flex items-center justify-between pb-3 border-b border-moss-100 dark:border-white/10 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-moss-700 text-white flex items-center justify-center shadow-xs">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-ink dark:text-white leading-tight">
                      Saved Grocery Bills History
                    </h3>
                    <p className="text-[11px] text-ink/50 dark:text-white/40">
                      All scanned receipts and health audits saved in MongoDB
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBillHistory(false)}
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink/60 dark:text-white/60"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {loadingBills ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-ink/50 dark:text-white/50">
                    <Loader2 size={26} className="animate-spin text-leaf" />
                    <p className="text-xs font-semibold">Loading saved bills from MongoDB...</p>
                  </div>
                ) : savedBillsHistory.length === 0 ? (
                  <div className="py-12 text-center text-ink/40 dark:text-white/40 space-y-2">
                    <Receipt size={40} className="mx-auto opacity-40 text-moss-700 dark:text-leaf" />
                    <p className="text-xs font-bold text-ink dark:text-white">No scanned bills saved yet.</p>
                    <p className="text-[11px]">Upload a supermarket receipt photo or try the sample bill!</p>
                  </div>
                ) : (
                  savedBillsHistory.map((bill) => {
                    const isHarmful = bill.harmfulCount > 0
                    const isCaution = bill.cautionCount > 0 && !isHarmful

                    return (
                      <div
                        key={bill._id}
                        onClick={() => {
                          setAnalyzedBill(bill)
                          setShowBillHistory(false)
                        }}
                        className="p-4 rounded-xl border border-moss-200/80 dark:border-white/10 bg-moss-50/60 dark:bg-white/5 hover:border-leaf hover:bg-mint-tint/50 dark:hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-ink dark:text-white truncate">
                              {bill.storeName || 'Supermarket'}
                            </h4>
                            <span className="text-[10px] font-bold bg-black/5 dark:bg-white/10 px-1.5 py-0.2 rounded text-ink/70 dark:text-white/70">
                              {bill.items?.length || 0} items
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-ink/60 dark:text-white/40 mt-1">
                            <span>{bill.billDate || new Date(bill.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="font-bold text-ink dark:text-white">
                              {bill.currency || '₹'}{bill.totalAmount || 0}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-2">
                            {isHarmful ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 flex items-center gap-1">
                                <ShieldAlert size={11} /> {bill.harmfulCount} Harmful
                              </span>
                            ) : isCaution ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                <AlertTriangle size={11} /> {bill.cautionCount} Caution
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                <ShieldCheck size={11} /> All Safe
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteBill(bill._id, e)}
                            title="Delete bill record"
                            className="p-2 rounded-lg text-ink/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                          <ArrowRight size={15} className="text-ink/40 group-hover:text-leaf group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="pt-3 border-t border-moss-100 dark:border-white/10 mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowBillHistory(false)}
                  className="btn-secondary text-xs px-4 py-2 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ── Live In-App Camera Viewfinder Modal for Bill Scanning ── */}
        {isLiveBillCameraOpen && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 text-white">
            {/* Header Bar */}
            <div className="w-full max-w-md flex items-center justify-between py-2 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-leaf flex items-center justify-center text-white shadow-sm">
                  <Receipt size={17} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">Live Grocery Bill Camera</h3>
                  <p className="text-[10px] text-white/60">Position your supermarket receipt inside frame</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={flipBillCamera}
                  title="Switch Camera (Front/Back)"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  type="button"
                  onClick={stopLiveBillCamera}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Video Viewfinder */}
            <div className="relative w-full max-w-md aspect-[3/4] max-h-[62vh] rounded-3xl overflow-hidden bg-black flex items-center justify-center border-2 border-white/20 shadow-2xl my-auto">
              <video
                ref={billVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Alignment Reticles Overlay */}
              <div className="absolute inset-4 pointer-events-none border-2 border-leaf/60 rounded-2xl flex flex-col justify-between p-3">
                <div className="w-full h-0.5 bg-leaf shadow-[0_0_12px_#4CAE7A] animate-pulse" />
                
                <div className="flex justify-between text-leaf text-base font-mono font-bold">
                  <span>┌</span>
                  <span>┐</span>
                </div>
                <div className="text-center">
                  <span className="text-[11px] font-semibold bg-black/60 backdrop-blur-xs text-white px-3 py-1 rounded-full border border-white/15">
                    📄 Keep receipt flat & well lit
                  </span>
                </div>
                <div className="flex justify-between text-leaf text-base font-mono font-bold">
                  <span>└</span>
                  <span>┘</span>
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="w-full max-w-md flex items-center justify-around py-4">
              <button
                type="button"
                onClick={() => {
                  stopLiveBillCamera()
                  billFileInputRef.current?.click()
                }}
                className="flex flex-col items-center gap-1 text-white/70 hover:text-white text-[11px] font-semibold"
              >
                <div className="p-3 rounded-2xl bg-white/10 hover:bg-white/20">
                  <UploadCloud size={20} />
                </div>
                <span>Upload File</span>
              </button>

              {/* Big Round Shutter Capture Button */}
              <button
                type="button"
                onClick={captureBillSnapshot}
                title="Capture & Scan Bill"
                className="group relative flex items-center justify-center p-1 rounded-full bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-glow"
              >
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-leaf to-emerald-400 border-4 border-white flex items-center justify-center shadow-lg group-hover:from-leaf-dark group-hover:to-emerald-500">
                  <Camera size={26} className="text-white" />
                </div>
              </button>

              <button
                type="button"
                onClick={stopLiveBillCamera}
                className="flex flex-col items-center gap-1 text-white/70 hover:text-white text-[11px] font-semibold"
              >
                <div className="p-3 rounded-2xl bg-white/10 hover:bg-white/20">
                  <X size={20} />
                </div>
                <span>Cancel</span>
              </button>
            </div>
          </div>,
          document.body
        )}

      </div>
    </AppShell>
  )
}