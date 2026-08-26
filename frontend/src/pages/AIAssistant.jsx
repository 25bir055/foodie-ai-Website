import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

/**
 * AIAssistant legacy page redirector.
 * The full-page chatbot has been replaced with the global floating Foodie AI assistant widget.
 */
export default function AIAssistant() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    const prompt = params.get('prompt')
    const productId = params.get('product')

    // Trigger opening the global floating chatbot
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('open-foodie-chat', {
          detail: {
            prompt: prompt || null,
            product: productId ? { id: productId } : null
          }
        })
      )
    }, 200)

    // Redirect to dashboard
    navigate('/dashboard', { replace: true })
  }, [navigate, params])

  return null
}
