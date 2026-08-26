import React, { createContext, useContext, useState, useEffect } from 'react'

import { TRANSLATIONS } from '../data/translations.js'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    const savedLang = localStorage.getItem('foodie_language') || 'en'
    setLanguage(savedLang)
  }, [])

  const changeLanguage = (lang) => {
    setLanguage(lang)
    localStorage.setItem('foodie_language', lang)
  }

  const t = (key) => {
    if (!TRANSLATIONS[language]) return key
    return TRANSLATIONS[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
