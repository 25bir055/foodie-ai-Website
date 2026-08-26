import React, { useState, useEffect, useRef } from 'react'
import { 
  Upload, FileText, Activity, AlertTriangle, Plus, X, Trash2, Clock, 
  Camera, Sparkles, RefreshCw, CheckCircle2, ShieldAlert, Heart, Pill, 
  Search, ShieldCheck, ArrowRight, Layers, AlertCircle, Info, Stethoscope
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { analyzePrescriptionImage } from '../services/imageRecognition'
import { fetchPrescriptions, savePrescription, deletePrescription } from '../services/api'
import { useApp } from '../store.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function Prescription() {
  const navigate = useNavigate()
  const { isAuthed } = useApp()
  const { t } = useLanguage()
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [analysisStep, setAnalysisStep] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [latestAnalyzedRx, setLatestAnalyzedRx] = useState(null)

  // Live Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraFacing, setCameraFacing] = useState('environment')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadHistory()
  }, [isAuthed])

  const loadHistory = async () => {
    try {
      const data = await fetchPrescriptions()
      if (Array.isArray(data)) {
        setPrescriptions(data)
      }
    } catch (e) {
      console.warn('Prescriptions fetch warning:', e)
    }
  }

  // ── Camera Handlers ────────────────────────────────────────────────────────
  const startCamera = async (facing = cameraFacing) => {
    setError(null)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      fileInputRef.current?.click()
      return
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }

      let stream = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false
        })
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }

      if (stream) {
        streamRef.current = stream
        setIsCameraOpen(true)
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play().catch(e => console.warn('Video play warning:', e))
          }
        }, 100)
      }
    } catch (err) {
      console.error('Camera open error:', err)
      setIsCameraOpen(false)
      fileInputRef.current?.click()
      setError('Camera access unavailable. Opened file selector instead.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setIsCameraOpen(false)
  }

  const captureSnapshot = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const w = video.videoWidth > 0 ? video.videoWidth : 1280
    const h = video.videoHeight > 0 ? video.videoHeight : 720
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, w, h)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setPreviewUrl(dataUrl)
    stopCamera()

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `prescription_${Date.now()}.jpg`, { type: 'image/jpeg' })
        setSelectedFile(file)
        processPrescription(file)
      }
    }, 'image/jpeg', 0.92)
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError(null)
      setSuccess('')
      processPrescription(file)
    }
  }

  // ── Core Prescription Processing Pipeline ──────────────────────────────────
  const processPrescription = async (file) => {
    if (!file) return
    setLoading(true)
    setError(null)
    setSuccess('')
    setLatestAnalyzedRx(null)
    setAnalysisStep('🔬 Clinical OCR reading doctor handwriting & clinic details...')

    try {
      const data = await analyzePrescriptionImage(file, (step) => setAnalysisStep(step))

      setAnalysisStep('🛡️ Mapping dietary restrictions (Sugar, Sodium, Cholesterol) against food interactions...')
      const saved = await savePrescription(data)
      
      setLatestAnalyzedRx(saved || data)
      setSuccess('✅ Prescription successfully analyzed & auto-saved! Foodie AI will now automatically check food scans for medication conflicts.')
      await loadHistory()
    } catch (err) {
      console.error('Prescription processing error:', err)
      setError(err.message || 'Could not parse prescription. Please ensure the image is clear and well lit.')
    } finally {
      setLoading(false)
      setAnalysisStep('')
    }
  }

  // ── 1-Click Sample Prescription Demo ─────────────────────────────────────────
  const handleSamplePrescription = async () => {
    setLoading(true)
    setError(null)
    setSuccess('')
    setLatestAnalyzedRx(null)
    setAnalysisStep('📑 Loading sample Diabetes & Hypertension doctor prescription...')

    try {
      const sampleRx = {
        doctorName: 'Dr. K. Ramanathan, MD (Endocrinology & Diabetology)',
        clinicName: 'Apollo Multi-Speciality Clinic',
        patientName: 'Self (Primary User)',
        prescriptionDate: new Date().toISOString().split('T')[0],
        ocrText: 'Dr. K. Ramanathan, MD\\nApollo Clinic\\nRx:\\n1. Tab Metformin 500mg (1-0-1 After Food) - Type 2 Diabetes\\n2. Tab Telmisartan 40mg (1-0-0 Morning) - Hypertension / High BP\\n3. Tab Atorvastatin 10mg (0-0-1 Night) - High Cholesterol\\nDiet Advice: Strictly avoid sweets, refined sugar, high sodium snacks & pickles. Avoid grapefruit.',
        detectedConditions: [
          'Type 2 Diabetes (High Blood Sugar)',
          'Hypertension (High Blood Pressure)',
          'High Cholesterol (Dyslipidemia)'
        ],
        restrictedNutrients: [
          'High Added Sugar',
          'High Sodium / Salt',
          'Saturated & Trans Fats'
        ],
        avoidFoods: [
          'Sweets, Sugary Sodas & Candies (Spikes Glucose)',
          'Pickles, Salted Namkeens & Instant Noodles (Spikes BP)',
          'Grapefruit / Pomelo (Interacts with Statins)',
          'Deep-Fried Palm Oil Foods (Raises LDL Cholesterol)'
        ],
        medicines: [
          {
            name: 'Metformin Hydrochloride',
            dosage: '500mg',
            frequency: '1-0-1 (Morning & Night)',
            purpose: 'Blood Glucose & Diabetes Control',
            timing: 'After meals'
          },
          {
            name: 'Telmisartan',
            dosage: '40mg',
            frequency: '1-0-0 (Morning)',
            purpose: 'Blood Pressure (Hypertension) Reduction',
            timing: 'Morning'
          },
          {
            name: 'Atorvastatin',
            dosage: '10mg',
            frequency: '0-0-1 (Night)',
            purpose: 'LDL Cholesterol Reduction & Heart Protection',
            timing: 'Night before bedtime'
          }
        ],
        aiExplanation: 'Comprehensive doctor prescription for managing Type 2 Diabetes, High Blood Pressure, and Cholesterol. Foodie AI will monitor food scans and alert you if scanned products contain excess sugar, sodium, or harmful fats.',
        foodInteractions: [
          '🚨 Severe: High sugar foods directly counteract Metformin and cause rapid blood sugar surges.',
          '⚠️ Caution: High sodium (>300mg/serving) blunts Telmisartan blood pressure control.',
          '🚨 Danger: Do not consume Grapefruit with Atorvastatin (causes severe hepatic metabolism inhibition).'
        ],
        fileUrl: ''
      }

      setAnalysisStep('💾 Saving sample prescription to MongoDB...')
      const saved = await savePrescription(sampleRx)
      setLatestAnalyzedRx(saved || sampleRx)
      setSuccess('✅ Sample Diabetes & BP Prescription loaded and active! Try scanning food in the Scanner to see live conflict alerts.')
      await loadHistory()
    } catch (err) {
      console.error('Sample Rx error:', err)
      setError('Failed to load sample prescription.')
    } finally {
      setLoading(false)
      setAnalysisStep('')
    }
  }

  const handleDelete = async (id, e) => {
    e?.stopPropagation()
    if (!confirm('Are you sure you want to remove this prescription?')) return
    await deletePrescription(id)
    if (latestAnalyzedRx?._id === id) setLatestAnalyzedRx(null)
    await loadHistory()
  }

  return (
    <AppShell title={t('prescriptionOCR') || "Prescription OCR & Medical Safety"}>
      <div className="max-w-3xl mx-auto space-y-6 pb-12 fade-in-up">
        
        {/* Header Banner */}
        <div className="glass-panel p-6 bg-gradient-to-r from-moss-700 via-moss-800 to-leaf text-white border-none rounded-3xl shadow-glow relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <Stethoscope size={26} className="text-white animate-pulse" />
              </div>
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight">
                  Doctor Prescription OCR & Food Safety Auditor
                </h1>
                <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
                  Upload or scan your prescription. Foodie AI extracts your medicines & conditions (Diabetes, BP, Cholesterol) and automatically warns you during food scans!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSamplePrescription}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0"
            >
              <Sparkles size={14} className="text-leaf-light" />
              <span>Try Sample Rx</span>
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {success && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-red-950/40 border border-rose-300 dark:border-red-800 text-rose-800 dark:text-red-200 text-xs font-bold flex items-center gap-2.5 shadow-sm">
            <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── SCAN / UPLOAD SECTION ── */}
        <div className="glass-panel p-6 rounded-3xl border border-moss-100 dark:border-white/10 shadow-soft bg-white dark:bg-[#12211A]">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
            id="prescription-upload-input"
          />

          {!previewUrl && !isCameraOpen && (
            <div className="text-center py-6">
              <div className="h-16 w-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-moss-50 to-mint-tint dark:from-white/5 dark:to-white/10 border border-moss-100 dark:border-white/10 flex items-center justify-center shadow-xs">
                <FileText size={32} className="text-moss-700 dark:text-leaf-light" />
              </div>
              <h3 className="font-display font-bold text-base text-ink dark:text-white mb-1">
                Scan or Upload Doctor's Prescription
              </h3>
              <p className="text-xs text-ink/50 dark:text-white/40 max-w-md mx-auto mb-6 leading-relaxed">
                Take a clear photo of your prescription or lab slip. AI will extract your medications and check all scanned groceries for harmful food-drug interactions.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  disabled={loading}
                  className="w-full sm:w-auto btn-primary py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 font-bold text-xs shadow-soft"
                >
                  <Camera size={16} />
                  <span>📸 Live Camera Scan</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="w-full sm:w-auto btn-secondary py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 font-bold text-xs"
                >
                  <Upload size={16} />
                  <span>📁 Upload Image / PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* Live Camera Viewfinder */}
          {isCameraOpen && (
            <div className="space-y-4">
              <div className="relative w-full aspect-[4/3] max-h-80 rounded-2xl overflow-hidden bg-black flex items-center justify-center border-2 border-leaf/60">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                
                {/* Viewfinder overlay */}
                <div className="absolute inset-4 pointer-events-none border-2 border-white/40 rounded-xl flex flex-col justify-between p-3">
                  <span className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded-full self-center">
                    Position prescription paper clearly inside box
                  </span>
                  <div className="w-full h-0.5 bg-leaf animate-pulse" />
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={captureSnapshot}
                  className="btn-primary py-3 px-6 rounded-xl font-bold text-xs flex items-center gap-2"
                >
                  <Camera size={16} />
                  <span>Capture Prescription</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="btn-secondary py-3 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5"
                >
                  <X size={15} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}

          {/* Image Preview & Loading Indicator */}
          {previewUrl && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden max-h-72 mx-auto border border-moss-100 dark:border-white/10 bg-black/5 flex justify-center">
                <img src={previewUrl} alt="Prescription Preview" className="max-h-72 object-contain" />
                
                {loading && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white">
                    <Activity size={36} className="animate-spin text-leaf-light mb-3" />
                    <p className="font-bold text-sm text-center">{analysisStep || 'Analyzing Prescription with Medical AI...'}</p>
                    <p className="text-[11px] text-white/70 mt-1">Reading medications, dosages, and food-nutrient restrictions</p>
                  </div>
                )}
              </div>

              {!loading && (
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null)
                      setSelectedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} />
                    <span>Scan Another Prescription</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {loading && !previewUrl && (
            <div className="p-6 text-center space-y-3">
              <Activity size={32} className="animate-spin text-leaf mx-auto" />
              <p className="font-bold text-xs text-ink dark:text-white">{analysisStep}</p>
            </div>
          )}
        </div>

        {/* ── LATEST ANALYZED PRESCRIPTION DETAILS CARD ── */}
        {latestAnalyzedRx && (
          <div className="glass-panel p-6 rounded-3xl border-2 border-leaf/40 shadow-glow bg-white dark:bg-[#12211A] space-y-5 fade-in-up">
            
            {/* Header / Clinic details */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-moss-100 dark:border-white/10">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-leaf/20 text-leaf-dark dark:text-leaf text-[10px] font-black uppercase tracking-wider">
                  Active Medical Profile
                </span>
                <h3 className="font-display font-black text-lg text-ink dark:text-white mt-1">
                  {latestAnalyzedRx.doctorName || latestAnalyzedRx.clinicName || 'Medical Prescription'}
                </h3>
                <p className="text-xs text-ink/50 dark:text-white/40">
                  {latestAnalyzedRx.clinicName && latestAnalyzedRx.clinicName !== latestAnalyzedRx.doctorName ? `${latestAnalyzedRx.clinicName} • ` : ''}
                  Date: {latestAnalyzedRx.prescriptionDate || new Date().toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold self-start sm:self-auto">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Monitoring Food Scans</span>
              </div>
            </div>

            {/* 1. Detected Medical Conditions */}
            {latestAnalyzedRx.detectedConditions && latestAnalyzedRx.detectedConditions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-ink/60 dark:text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                  <Heart size={14} className="text-rose-500" />
                  <span>Diagnosed / Detected Conditions:</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {latestAnalyzedRx.detectedConditions.map((cond, i) => (
                    <span key={i} className="px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      <span>{cond}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Prescribed Medicines List */}
            {latestAnalyzedRx.medicines && latestAnalyzedRx.medicines.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-ink/60 dark:text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                  <Pill size={14} className="text-leaf" />
                  <span>Prescribed Medications ({latestAnalyzedRx.medicines.length}):</span>
                </p>

                <div className="grid sm:grid-cols-2 gap-2.5">
                  {latestAnalyzedRx.medicines.map((med, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-moss-50/70 dark:bg-white/5 border border-moss-100 dark:border-white/10 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-xs sm:text-sm text-ink dark:text-white">
                          {med.name}
                        </h4>
                        {med.dosage && (
                          <span className="text-[10px] font-bold bg-leaf/15 text-leaf-dark dark:text-leaf px-2 py-0.2 rounded-full">
                            {med.dosage}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink/60 dark:text-white/60 font-medium">
                        Timing: <strong>{med.frequency || 'Daily'}</strong> {med.timing ? `(${med.timing})` : ''}
                      </p>
                      {med.purpose && (
                        <p className="text-[11px] text-moss-800 dark:text-leaf-light font-semibold">
                          Target: {med.purpose}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Restricted Nutrients & Food Warnings */}
            {(latestAnalyzedRx.restrictedNutrients?.length > 0 || latestAnalyzedRx.avoidFoods?.length > 0) && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  <ShieldAlert size={16} className="text-amber-600" />
                  <span>Dietary Restrictions Triggered by this Prescription:</span>
                </div>

                {latestAnalyzedRx.restrictedNutrients?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {latestAnalyzedRx.restrictedNutrients.map((r, i) => (
                      <span key={i} className="px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 text-[11px] font-bold border border-amber-300 dark:border-amber-800">
                        🚫 Limit: {r}
                      </span>
                    ))}
                  </div>
                )}

                {latestAnalyzedRx.avoidFoods?.length > 0 && (
                  <ul className="text-xs text-amber-900/90 dark:text-amber-200/90 space-y-1 list-disc pl-4 font-medium">
                    {latestAnalyzedRx.avoidFoods.map((food, i) => (
                      <li key={i}>{food}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* 4. AI Explanation & Guidance */}
            {latestAnalyzedRx.aiExplanation && (
              <div className="p-3.5 rounded-2xl bg-mint-tint/40 dark:bg-white/5 border border-moss-100 dark:border-white/10 text-xs text-ink/80 dark:text-white/80 leading-relaxed">
                <strong>Medical Summary:</strong> {latestAnalyzedRx.aiExplanation}
              </div>
            )}

            {/* Action CTA */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/scanner')}
                className="flex-1 btn-primary py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-soft"
              >
                <Search size={15} />
                <span>Test a Food Scan with this Prescription</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── SAVED PRESCRIPTIONS HISTORY ── */}
        {prescriptions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-base text-ink dark:text-white flex items-center gap-2">
                <Clock size={18} className="text-leaf" />
                <span>Active Prescriptions in Database ({prescriptions.length})</span>
              </h2>
            </div>

            <div className="space-y-3">
              {prescriptions.map((rx) => (
                <div
                  key={rx._id}
                  onClick={() => setLatestAnalyzedRx(rx)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                    latestAnalyzedRx?._id === rx._id
                      ? 'border-leaf bg-leaf/5 shadow-soft'
                      : 'border-moss-100 dark:border-white/10 bg-white dark:bg-[#12211A] hover:border-leaf/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-ink dark:text-white">
                          {rx.doctorName || rx.clinicName || 'Medical Prescription'}
                        </h4>
                        <span className="text-[10px] font-bold bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded text-ink/60 dark:text-white/60">
                          {rx.medicines?.length || 0} meds
                        </span>
                      </div>
                      <p className="text-xs text-ink/50 dark:text-white/40 mt-0.5">
                        Date: {rx.prescriptionDate || new Date(rx.createdAt).toLocaleDateString()}
                      </p>

                      {/* Condition Tags */}
                      {rx.detectedConditions?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {rx.detectedConditions.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                              🩺 {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(rx._id, e)}
                        title="Delete prescription"
                        className="p-2 rounded-lg text-ink/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}
