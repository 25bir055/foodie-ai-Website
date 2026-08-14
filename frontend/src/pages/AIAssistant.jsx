import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sparkles, Send, Mic, MicOff, Bot, User, RefreshCw, Loader2 } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import { AI_SUGGESTED_QUESTIONS, PRODUCTS as FALLBACK_PRODUCTS } from '../data/mockData'
import { fetchProductById } from '../services/api'
import { askGeminiAI } from '../services/gemini'

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'

  const formatted = msg.text
    .split('\n')
    .map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/)
      return (
        <p key={i} className={i > 0 ? 'mt-1' : ''}>
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
        </p>
      )
    })

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse chat-message-user' : 'chat-message-ai'}`}>
      <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
        isUser
          ? 'bg-moss-700'
          : 'bg-gradient-to-br from-leaf to-moss-700'
      }`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>
      <div className={`max-w-[78%] sm:max-w-[65%] rounded-xl2 px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-moss-700 text-white rounded-tr-sm'
          : 'bg-white dark:bg-white/8 border border-moss-100 dark:border-white/8 text-ink dark:text-white/85 rounded-tl-sm'
      }`}>
        {formatted}
        <p className={`text-[10px] mt-1.5 ${isUser ? 'text-white/50 text-right' : 'text-ink/30 dark:text-white/30'}`}>
          {msg.time}
        </p>
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const [params] = useSearchParams()
  const productId = params.get('product')

  const [product, setProduct] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (productId) {
      fetchProductById(productId).then((data) => {
        const found = data || FALLBACK_PRODUCTS.find((p) => p.id === productId)
        setProduct(found)
        setMessages([
          {
            role: 'ai',
            text: found
              ? `Hi! I can see you're looking at **${found.name}**. Ask me anything about its nutrition, ingredients, allergens, or healthier alternatives.`
              : "Hi, I'm **Foodie AI** 🌿 Ask me about food health scores, sugar limits, or nutrition advice.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ])
      })
    } else {
      setMessages([
        {
          role: 'ai',
          text: "Hi, I'm **Foodie AI** 🌿 Ask me about a product's health score, sugar content, allergens, or healthier alternatives. Powered by Gemini AI!",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    }
  }, [productId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  // Setup Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      rec.continuous = false
      rec.interimResults = false
      rec.lang = 'en-US'

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setIsListening(false)
        send(transcript)
      }

      rec.onerror = () => {
        setIsListening(false)
      }

      rec.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = rec
    }
  }, [])

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in this browser.')
      return
    }
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const send = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || typing) return
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    
    setMessages((m) => [...m, { role: 'user', text: trimmed, time }])
    setInput('')
    setTyping(true)

    try {
      const reply = await askGeminiAI(trimmed, product)
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setMessages((m) => [...m, { role: 'ai', text: reply, time: replyTime }])
    } catch (err) {
      setMessages((m) => [...m, {
        role: 'ai',
        text: 'Sorry, I ran into an error generating that response. Please try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
    } finally {
      setTyping(false)
      inputRef.current?.focus()
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'ai',
      text: "Chat cleared! What would you like to know about nutrition or food products?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }])
  }

  return (
    <AppShell title="Ask Foodie AI">
      <div className="flex flex-col h-[calc(100vh-9rem)] lg:h-[calc(100vh-7.5rem)] glass-panel overflow-hidden">

        {/* Chat header */}
        <div className="px-5 py-4 border-b border-moss-100/70 dark:border-white/10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-moss-700 to-leaf flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-ink dark:text-white">Ask Foodie AI</p>
            {product
              ? <p className="text-xs text-ink/40 dark:text-white/40">Discussing: {product.name}</p>
              : <p className="text-xs text-leaf-dark dark:text-leaf-light flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-leaf animate-pulse inline-block" />Gemini AI Connected</p>
            }
          </div>
          <button onClick={clearChat} className="p-2 rounded-xl text-ink/30 hover:text-ink/60 hover:bg-mint-tint dark:hover:bg-white/5 focus-ring transition-colors" title="Clear chat">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Product context banner */}
        {product && (
          <div className="px-5 py-3 bg-mint-tint dark:bg-white/5 border-b border-moss-100/50 dark:border-white/8 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-xl shrink-0">
              {product.image || '🥣'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink dark:text-white/90 truncate">{product.name}</p>
              <p className="text-[11px] text-ink/40 dark:text-white/35">{product.brand} · Score {product.healthScore}/100</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs data-num font-semibold text-leaf-dark dark:text-leaf-light">{product.calories} kcal</p>
              <p className="text-[11px] text-ink/30 dark:text-white/30">{product.servingSize}</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
          {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
          {typing && (
            <div className="flex gap-2.5 chat-message-ai">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-leaf to-moss-700 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-white dark:bg-white/8 border border-moss-100 dark:border-white/8 rounded-xl2 rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                <span className="h-2 w-2 rounded-full bg-leaf typing-dot" />
                <span className="h-2 w-2 rounded-full bg-leaf typing-dot" />
                <span className="h-2 w-2 rounded-full bg-leaf typing-dot" />
              </div>
            </div>
          )}
        </div>

        {/* Suggested questions */}
        <div className="px-5 pt-2 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
          {AI_SUGGESTED_QUESTIONS.slice(0, 5).map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-moss-100 dark:border-white/10 text-ink/60 dark:text-white/50 hover:bg-mint-tint dark:hover:bg-white/5 hover:border-leaf/30 transition-all focus-ring"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input area */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input) }}
          className="px-5 pb-5 pt-2 flex items-center gap-2"
        >
          <button
            type="button"
            onClick={toggleMic}
            aria-label="Voice input"
            className={`h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center focus-ring transition-all ${
              isListening
                ? 'bg-clay text-white border-clay animate-pulse'
                : 'border-moss-100 dark:border-white/10 text-ink/50 dark:text-white/40 hover:bg-mint-tint dark:hover:bg-white/5 hover:text-moss-700 dark:hover:text-white'
            }`}
          >
            {isListening ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? 'Listening… Speak now' : 'Ask about nutrition, ingredients, or a product…'}
            className="flex-1 bg-mint-tint dark:bg-white/5 border border-moss-100 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-leaf text-ink dark:text-white placeholder:text-ink/30 dark:placeholder:text-white/25 transition-shadow"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            className="h-11 w-11 shrink-0 rounded-xl bg-moss-700 hover:bg-moss-600 disabled:opacity-40 text-white flex items-center justify-center focus-ring transition-all"
          >
            {typing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
