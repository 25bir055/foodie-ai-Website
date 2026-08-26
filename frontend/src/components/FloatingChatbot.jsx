import React, { useState, useEffect, useRef } from 'react'
import {
  Bot, Sparkles, Send, Mic, MicOff, X, Minimize2, RefreshCw,
  User, AlertTriangle, ShieldAlert, Pill, ShoppingCart,
  ScanBarcode, Loader2, Volume2, VolumeX, Languages, Check,
  Radio, Globe
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { askOpenAI, fetchChatHistory, clearChatHistory, transcribeAudio } from '../services/openai.js'
import { fetchPrescriptions } from '../services/api.js'

// Helper to strip markdown before speech synthesis
function cleanMarkdownForSpeech(text) {
  if (!text) return ''
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/[*#_~`>-]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

// Helper to detect language script / family
function detectScript(text) {
  if (!text) return 'en-IN'
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'
  if (/[\u0900-\u097F]/.test(text)) return 'hi-IN'
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN'
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN'

  const lower = text.toLowerCase()
  if (/\b(sapadu|sapadlama|sapadalam|enaku|unakku|nalla|iruku|irukkum|pannunga|kudikalam|romba|illa|thanni|sollunga)\b/i.test(lower)) {
    return 'ta-IN'
  }
  if (/\b(khao|khana|karein|hoga|hogi|hai|hain|kya|nahi|mujhe|tumhe|batao|sahi|accha)\b/i.test(lower)) {
    return 'hi-IN'
  }
  return 'en-IN'
}

export default function FloatingChatbot() {
  const { profile, scanHistory, isAuthed, addToShoppingList } = useApp()
  const { t } = useLanguage()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [activeProduct, setActiveProduct] = useState(null)
  const [prescriptions, setPrescriptions] = useState([])
  const [showContextDetails, setShowContextDetails] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const [addedItems, setAddedItems] = useState({})
  
  // Voice & Speech Synthesis states
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null)
  const [detectedVoiceLang, setDetectedVoiceLang] = useState(null)

  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const speechSynthRef = useRef(window.speechSynthesis || null)

  // Load prescriptions when authed
  useEffect(() => {
    if (isAuthed) {
      fetchPrescriptions().then((data) => {
        if (Array.isArray(data)) setPrescriptions(data)
      }).catch((e) => console.warn('FloatingChatbot rx load error:', e))
    }
  }, [isAuthed])

  // Load chat history or initial multilingual welcome
  useEffect(() => {
    if (!isAuthed) return

    const loadHistory = async () => {
      try {
        const history = await fetchChatHistory()
        if (history && history.length > 0) {
          setMessages(
            history.map((m) => ({
              id: `hist_${Math.random()}`,
              role: m.role === 'ai' || m.role === 'assistant' ? 'ai' : 'user',
              text: m.content,
              lang: detectScript(m.content),
              time: m.timestamp
                ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }))
          )
        } else {
          setInitialWelcome()
        }
      } catch (err) {
        setInitialWelcome()
      }
    }

    loadHistory()
  }, [isAuthed])

  const setInitialWelcome = () => {
    const allergenNote = profile?.allergies?.length
      ? ` 🛡️ Monitored Allergies: **${profile.allergies.join(', ')}**`
      : ''
    const rxNote = prescriptions?.length
      ? ` 💊 Active Prescriptions: **${prescriptions.length} tracked**`
      : ''

    setMessages([
      {
        id: 'welcome_msg',
        role: 'ai',
        lang: 'en-IN',
        langName: 'Multilingual',
        text: `வணக்கம்! Hello! 🙏 I'm **Foodie AI**, your multilingual nutrition & food safety assistant. 🌿\n\nAsk me anything in **Tamil, English, Tanglish, Hindi, Telugu, Malayalam, or Kannada**! I automatically detect your language, check allergen risks & medication interactions, and suggest healthy food alternatives.\n\n${allergenNote}${rxNote}\n\nEnna saapida virumbureenga? How can I help you today?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ])
  }

  // Listen to global open chat events (from Scanner, ProductDetails, etc.)
  useEffect(() => {
    const handleOpenChat = (event) => {
      setIsOpen(true)
      if (event.detail) {
        if (event.detail.product) {
          setActiveProduct(event.detail.product)
        }
        if (event.detail.prompt) {
          handleSend(event.detail.prompt, event.detail.product, false)
        }
      }
    }

    window.addEventListener('open-foodie-chat', handleOpenChat)
    return () => window.removeEventListener('open-foodie-chat', handleOpenChat)
  }, [profile, prescriptions, scanHistory])

  // Check sessionStorage for scanned product context if available
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('foodie_chat_product_context')
      if (stored) {
        const prod = JSON.parse(stored)
        setActiveProduct(prod)
      } else if (scanHistory && scanHistory.length > 0 && !activeProduct) {
        setActiveProduct(scanHistory[0])
      }
    } catch (e) {
      // ignore
    }
  }, [scanHistory])

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages, loading])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false)
      setTimeout(() => inputRef.current?.focus(), 150)
    } else {
      stopSpeaking()
    }
  }, [isOpen])

  // Stop speech when unmounted
  useEffect(() => {
    return () => stopSpeaking()
  }, [])

  // ─────────────────────────────────────────────
  // TEXT-TO-SPEECH (TTS) ENGINE FOR ALL LANGUAGES
  // ─────────────────────────────────────────────
  const stopSpeaking = () => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel()
    }
    setCurrentlySpeakingId(null)
  }

  const speakMessage = (msgId, text, langCode = 'en-IN') => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported on this browser.')
      return
    }

    if (currentlySpeakingId === msgId) {
      stopSpeaking()
      return
    }

    stopSpeaking()

    const cleanText = cleanMarkdownForSpeech(text)
    if (!cleanText) return

    const utterance = new SpeechSynthesisUtterance(cleanText)
    const targetLang = langCode || detectScript(text)
    utterance.lang = targetLang

    // Select matching voice
    const voices = window.speechSynthesis.getVoices()
    const matchingVoice = voices.find((v) =>
      v.lang.toLowerCase().startsWith(targetLang.slice(0, 2).toLowerCase()) ||
      v.lang.toLowerCase().includes('india') ||
      v.lang.toLowerCase().includes(targetLang.toLowerCase())
    )

    if (matchingVoice) {
      utterance.voice = matchingVoice
    }

    utterance.rate = 1.0
    utterance.pitch = 1.0

    utterance.onstart = () => setCurrentlySpeakingId(msgId)
    utterance.onend = () => setCurrentlySpeakingId(null)
    utterance.onerror = () => setCurrentlySpeakingId(null)

    speechSynthRef.current.speak(utterance)
  }

  // ─────────────────────────────────────────────
  // SEND MESSAGE HANDLER
  // ─────────────────────────────────────────────
  const handleSend = async (customText = null, overrideProduct = null, triggeredByVoice = false) => {
    const textToSend = (customText || input).trim()
    if (!textToSend || loading) return

    stopSpeaking()

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsgId = `user_${Date.now()}`
    const promptLang = detectScript(textToSend)

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', text: textToSend, lang: promptLang, time }
    ])
    if (!customText) setInput('')
    setLoading(true)

    const prodToUse = overrideProduct !== undefined ? overrideProduct : activeProduct

    try {
      const res = await askOpenAI(
        textToSend,
        prodToUse,
        profile,
        prescriptions,
        scanHistory
      )

      const replyText = typeof res === 'object' ? res.reply : res
      const replyLang = res.detectedLanguage || detectScript(replyText)
      const langName = res.languageName || 'Auto'
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const aiMsgId = `ai_${Date.now()}`

      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          role: 'ai',
          text: replyText,
          lang: replyLang,
          langName,
          time: replyTime
        }
      ])

      // Auto-speak response if autoSpeak is enabled or message was spoken
      if (autoSpeak || triggeredByVoice) {
        setTimeout(() => {
          speakMessage(aiMsgId, replyText, replyLang)
        }, 200)
      }

      if (!isOpen) {
        setHasNewMessage(true)
      }
    } catch (err) {
      console.error('Chat send error:', err)
      const errorMsg = err.message?.includes('Groq API key')
        ? '⚠️ Groq API key is not configured in the backend `.env` file.'
        : '⚠️ Sorry, I encountered an issue analyzing that request. Please try again.'

      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'ai',
          text: errorMsg,
          lang: 'en-IN',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────
  // AI SPEECH RECOGNITION (Whisper STT)
  // ─────────────────────────────────────────────
  const toggleMic = async () => {
    if (isListening && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsListening(false)
      return
    }

    stopSpeaking()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setIsTranscribing(true)
        try {
          const res = await transcribeAudio(audioBlob)
          if (res && res.transcript) {
            setDetectedVoiceLang(res.languageName || res.detectedLanguage)
            // Auto-send the transcribed voice query!
            handleSend(res.transcript, activeProduct, true)
          }
        } catch (error) {
          console.error('Transcription error:', error)
          alert('Failed to transcribe audio. Please try speaking clearly or type your message.')
        } finally {
          setIsTranscribing(false)
          stream.getTracks().forEach((t) => t.stop())
        }
      }

      mediaRecorder.start()
      setIsListening(true)
    } catch (err) {
      console.error('Mic access error:', err)
      alert('Microphone access is required for voice input.')
    }
  }

  // Clear chat
  const handleClearChat = async () => {
    stopSpeaking()
    await clearChatHistory()
    setInitialWelcome()
  }

  // Smart suggestions across languages
  const getSmartSuggestions = () => {
    const list = []

    if (activeProduct) {
      list.push(`Is "${activeProduct.name}" safe for my allergies?`)
      list.push(`Ithu sapadlama? Alternative sollunga`)
      list.push(`Suggest 3 healthier alternatives`)
    }

    if (profile?.allergies?.length > 0) {
      list.push(`Safe snacks without ${profile.allergies[0]}`)
      list.push(`Enaku ${profile.allergies[0]} allergy iruku, enna sapadalam?`)
    }

    if (prescriptions?.length > 0) {
      list.push('Which foods to avoid with my prescriptions?')
      list.push('Medicine kooda entha food safe?')
    }

    list.push('Diet-ku nalla morning breakfast sollunga')
    list.push('High protein vegetarian snacks')
    list.push('Low sugar healthy alternatives')

    return list.slice(0, 6)
  }

  // Add alternative item to user's shopping list
  const handleAddAlternativeToCart = (itemText) => {
    const cleanName = itemText.replace(/^[-*•\d.)\s]+/, '').replace(/[:*].*$/, '').trim()
    addToShoppingList({
      id: `ai_alt_${Date.now()}`,
      name: cleanName || itemText,
      brand: 'Recommended Alternative',
      healthScore: 92,
      qty: 1
    })
    setAddedItems((prev) => ({ ...prev, [itemText]: true }))
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [itemText]: false }))
    }, 2500)
  }

  // Parse markdown formatting and render interactive alternatives & speaker
  const renderMessageContent = (msg, isAi) => {
    const lines = msg.text.split('\n')
    const isPlaying = currentlySpeakingId === msg.id

    return (
      <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim()
          if (!trimmed) return <div key={idx} className="h-1" />

          const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')
          const cleanLine = isBullet ? trimmed.replace(/^[-*•]\s*/, '') : trimmed
          const parts = cleanLine.split(/\*\*(.*?)\*\*/)

          return (
            <div key={idx} className={`${isBullet ? 'flex items-start gap-1.5 pl-1' : ''}`}>
              {isBullet && <span className="h-1.5 w-1.5 rounded-full bg-leaf mt-1.5 shrink-0" />}
              <div className="flex-1">
                <p>
                  {parts.map((part, pIdx) =>
                    pIdx % 2 === 1 ? (
                      <strong key={pIdx} className="font-bold text-moss-700 dark:text-leaf-light">
                        {part}
                      </strong>
                    ) : (
                      part
                    )
                  )}
                </p>

                {/* Quick Add button for alternatives */}
                {isAi && (trimmed.toLowerCase().includes('alternative') || trimmed.toLowerCase().includes('substitute') || trimmed.toLowerCase().includes('instead') || trimmed.toLowerCase().includes('sapadalam')) && (
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      onClick={() => handleAddAlternativeToCart(cleanLine)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-leaf dark:text-leaf-light bg-leaf/10 hover:bg-leaf/20 px-2 py-0.5 rounded-md transition-colors"
                      title="Add to Shopping List"
                    >
                      {addedItems[cleanLine] ? (
                        <>
                          <Check size={12} className="text-leaf" /> Added!
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={12} /> Add to List
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (!isAuthed) return null

  return (
    <>
      {/* ─────────────────────────────────────────────
          FLOATING CHAT TRIGGER BUTTON (Bottom-Right)
         ───────────────────────────────────────────── */}
      {!isOpen && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 group">
          {/* Multilingual Tooltip */}
          <div className="hidden sm:flex items-center gap-1.5 bg-moss-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none transform -translate-x-1">
            <Globe size={13} className="text-leaf" />
            <span>Foodie AI (Tamil, English, Hindi...)</span>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open Multilingual Foodie AI Assistant"
            className="relative h-14 w-14 rounded-2xl bg-gradient-to-tr from-moss-700 via-leaf to-moss-600 text-white flex items-center justify-center shadow-xl shadow-leaf/30 hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-white/20 focus-ring"
          >
            <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-leaf to-moss-500 opacity-40 blur-sm group-hover:opacity-75 animate-pulse transition duration-500" />

            <div className="relative flex items-center justify-center">
              <Bot size={26} className="text-white drop-shadow" />
              <Sparkles size={14} className="absolute -top-1.5 -right-2 text-yellow-300 animate-bounce" />
            </div>

            {(hasNewMessage || activeProduct) && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 border-2 border-white dark:border-[#0E1A14] flex items-center justify-center text-[9px] font-bold text-white shadow-sm" />
            )}
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          FLOATING CHAT WINDOW / MODAL
         ───────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[440px] h-[610px] max-h-[88vh] bg-white/95 dark:bg-[#0E1A14]/95 backdrop-blur-2xl border border-moss-200/80 dark:border-white/10 rounded-2xl shadow-2xl shadow-moss-900/20 flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-moss-700 to-leaf text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Bot size={20} className="text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-moss-700" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display font-bold text-sm tracking-wide text-white truncate">
                    Foodie AI
                  </h3>
                  <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded text-white/90 flex items-center gap-1">
                    <Globe size={11} /> Multilingual
                  </span>
                </div>
                <p className="text-[10px] text-white/80 truncate">
                  Tamil • Tanglish • English • Hindi • Telugu • Malayalam
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Voice auto-speak toggle button */}
              <button
                onClick={() => {
                  if (autoSpeak) stopSpeaking()
                  setAutoSpeak((v) => !v)
                }}
                title={autoSpeak ? 'AI Voice Active (Click to Mute)' : 'AI Voice Muted (Click to Enable)'}
                className={`p-1.5 rounded-lg transition-colors ${
                  autoSpeak
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                onClick={handleClearChat}
                title="Clear Chat History"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              >
                <RefreshCw size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          {/* Context Tag Bar (Allergies, Prescriptions, Active Product) */}
          <div className="bg-moss-50/80 dark:bg-white/5 border-b border-moss-100 dark:border-white/10 px-3 py-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                {/* Allergies tag */}
                {profile?.allergies?.length > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium shrink-0">
                    <ShieldAlert size={11} />
                    {profile.allergies.join(', ')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium shrink-0">
                    <ShieldAlert size={11} /> No Allergies
                  </span>
                )}

                {/* Prescriptions tag */}
                {prescriptions?.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium shrink-0">
                    <Pill size={11} /> {prescriptions.length} Meds
                  </span>
                )}

                {/* Language badge */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium shrink-0">
                  <Languages size={11} /> Auto-Detect
                </span>
              </div>

              <button
                onClick={() => setShowContextDetails((p) => !p)}
                className="text-moss-700 dark:text-leaf text-[10px] font-semibold underline shrink-0 pl-1"
              >
                {showContextDetails ? 'Hide' : 'Info'}
              </button>
            </div>

            {/* Context details drawer */}
            {showContextDetails && (
              <div className="mt-2 p-2 rounded-xl bg-white dark:bg-[#13221A] border border-moss-100 dark:border-white/10 space-y-1 text-[11px] text-ink/70 dark:text-white/70">
                <p>
                  <strong>Diet:</strong> {profile?.dietaryPreference || 'Standard'} ·{' '}
                  <strong>Goals:</strong> {profile?.goals?.join(', ') || 'Wellness'}
                </p>
                {profile?.allergies?.length > 0 && (
                  <p className="text-red-600 dark:text-red-400">
                    <strong>Allergies:</strong> {profile.allergies.join(', ')}
                  </p>
                )}
                {prescriptions?.length > 0 && (
                  <p className="text-blue-600 dark:text-blue-400">
                    <strong>Tracked Meds:</strong>{' '}
                    {prescriptions
                      .map((rx) => rx.medicines?.map((m) => m.name).join(', '))
                      .filter(Boolean)
                      .join('; ')}
                  </p>
                )}
              </div>
            )}

            {/* Active product banner */}
            {activeProduct && (
              <div className="mt-1 flex items-center justify-between bg-mint-tint dark:bg-white/8 px-2 py-1 rounded-lg border border-moss-200/60 dark:border-white/10">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ScanBarcode size={12} className="text-moss-700 dark:text-leaf shrink-0" />
                  <p className="font-semibold text-ink dark:text-white truncate text-[11px]">
                    {activeProduct.name}{' '}
                    {activeProduct.healthScore !== undefined && (
                      <span className="text-leaf font-bold">({activeProduct.healthScore}/100)</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveProduct(null)
                    sessionStorage.removeItem('foodie_chat_product_context')
                  }}
                  title="Remove product context"
                  className="text-ink/40 hover:text-red-500 p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Messages Stream */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-cream/40 dark:bg-transparent"
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user'
              const isPlaying = currentlySpeakingId === msg.id

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isUser
                        ? 'bg-moss-700 text-white'
                        : 'bg-gradient-to-br from-moss-700 to-leaf text-white'
                    }`}
                  >
                    {isUser ? <User size={13} /> : <Bot size={13} />}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${
                      isUser
                        ? 'bg-moss-700 text-white rounded-tr-sm shadow-sm'
                        : 'bg-white dark:bg-[#13221A] border border-moss-100/80 dark:border-white/10 text-ink dark:text-white/90 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {renderMessageContent(msg, !isUser)}

                    {/* Bottom row: Time + Speaker button */}
                    <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-1.5">
                        {!isUser && (
                          <button
                            onClick={() => speakMessage(msg.id, msg.text, msg.lang)}
                            title={isPlaying ? 'Stop Voice' : 'Listen with AI Voice'}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                              isPlaying
                                ? 'bg-leaf text-white animate-pulse'
                                : 'text-ink/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/10 hover:text-moss-700 dark:hover:text-leaf'
                            }`}
                          >
                            <Volume2 size={12} />
                            <span>{isPlaying ? 'Speaking...' : 'Listen'}</span>
                          </button>
                        )}
                        {msg.langName && !isUser && (
                          <span className="text-[9px] text-ink/40 dark:text-white/40 font-medium">
                            • {msg.langName}
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-[9px] ${
                          isUser ? 'text-white/60 text-right' : 'text-ink/35 dark:text-white/35'
                        }`}
                      >
                        {msg.time}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}

            {loading && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-moss-700 to-leaf text-white flex items-center justify-center shrink-0">
                  <Bot size={13} />
                </div>
                <div className="bg-white dark:bg-[#13221A] border border-moss-100 dark:border-white/10 rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1.5 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-leaf animate-bounce" />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-leaf animate-bounce"
                    style={{ animationDelay: '0.15s' }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-leaf animate-bounce"
                    style={{ animationDelay: '0.3s' }}
                  />
                  <span className="text-[11px] text-ink/50 dark:text-white/50 ml-1.5 font-medium">
                    Detecting language & analyzing nutrition...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 pt-1.5 pb-1 bg-white/80 dark:bg-[#0E1A14]/80 border-t border-moss-100/60 dark:border-white/5 flex gap-1.5 overflow-x-auto scrollbar-none">
            {getSmartSuggestions().map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSend(chip)}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-full border border-moss-200 dark:border-white/10 text-moss-800 dark:text-white/80 bg-mint-tint/50 dark:bg-white/5 hover:bg-leaf hover:text-white dark:hover:bg-leaf transition-all whitespace-nowrap"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Active Listening Indicator */}
          {isListening && (
            <div className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 border-t border-red-200 dark:border-red-900/30 flex items-center justify-between text-xs text-red-600 dark:text-red-400 animate-pulse">
              <div className="flex items-center gap-2">
                <Radio size={14} className="animate-spin" />
                <span className="font-semibold">Listening... Speak in Tamil, English, Hindi, Telugu...</span>
              </div>
              <button
                onClick={toggleMic}
                className="text-[11px] font-bold underline bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded"
              >
                Done
              </button>
            </div>
          )}

          {/* Transcribing Indicator */}
          {isTranscribing && (
            <div className="px-3 py-1.5 bg-leaf/10 border-t border-leaf/20 flex items-center gap-2 text-xs text-leaf font-semibold">
              <Loader2 size={13} className="animate-spin" />
              <span>Transcribing & detecting speech language with Whisper AI...</span>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="p-3 bg-white dark:bg-[#0E1A14] border-t border-moss-100 dark:border-white/10 flex items-center gap-2"
          >
            {/* Mic button */}
            <button
              type="button"
              onClick={toggleMic}
              disabled={isTranscribing}
              title={isListening ? 'Stop listening' : 'Voice input (Whisper Multilingual)'}
              className={`h-9 w-9 shrink-0 rounded-xl border flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500 text-white border-red-500 animate-pulse shadow-md shadow-red-500/30'
                  : 'border-moss-200 dark:border-white/10 text-ink/60 dark:text-white/60 hover:bg-mint-tint dark:hover:bg-white/5 hover:text-moss-700'
              }`}
            >
              {isTranscribing ? (
                <Loader2 size={15} className="animate-spin text-leaf" />
              ) : isListening ? (
                <MicOff size={15} />
              ) : (
                <Mic size={15} />
              )}
            </button>

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening
                  ? 'Listening... Speak now'
                  : 'Type in Tamil, Tanglish, English, Hindi, Telugu...'
              }
              className="flex-1 bg-mint-tint/50 dark:bg-white/5 border border-moss-200/80 dark:border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-leaf text-ink dark:text-white placeholder:text-ink/35 dark:placeholder:text-white/30"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-9 w-9 shrink-0 rounded-xl bg-moss-700 hover:bg-moss-600 disabled:opacity-40 text-white flex items-center justify-center transition-all focus-ring"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </form>
        </div>
      )}
    </>
  )
}
