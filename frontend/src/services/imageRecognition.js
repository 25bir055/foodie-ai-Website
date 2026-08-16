import { GoogleGenerativeAI } from '@google/generative-ai'

let cachedModelName = null

/**
 * Get active Gemini AI key
 */
export function getGeminiApiKey() {
  const customKey = typeof localStorage !== 'undefined' ? localStorage.getItem('foodie_gemini_key') : null
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  const key = customKey || envKey
  return (key && key !== 'your-gemini-key' && key.trim().length > 15) ? key.trim() : null
}

export function setGeminiApiKey(key) {
  cachedModelName = null
  if (key && key.trim()) {
    localStorage.setItem('foodie_gemini_key', key.trim())
  } else {
    localStorage.removeItem('foodie_gemini_key')
  }
}

/**
 * High-speed client-side image compressor & resizer.
 * Reduces 5MB-15MB phone camera photos to ~120KB in ~30ms.
 */
export function compressAndResizeImage(file, maxWidth = 1000, maxHeight = 1000, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (typeof file === 'string') {
      const base64Data = file.includes(',') ? file.split(',')[1] : file
      return resolve({ base64Data, dataUrl: file, mimeType: 'image/jpeg' })
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        let { width, height } = img

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d', { alpha: false })
        
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'medium'
        ctx.drawImage(img, 0, 0, width, height)

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        const base64Data = compressedDataUrl.split(',')[1]

        resolve({
          base64Data,
          dataUrl: compressedDataUrl,
          mimeType: 'image/jpeg'
        })
      }
      img.onerror = (e) => reject(e)
    }
    reader.onerror = (e) => reject(e)
  })
}

/**
 * Calculate health score (0-100) from basic nutrition facts
 */
function calculateHealthScore({ calories = 150, sugar = 5, saturatedFat = 2, sodium = 100, protein = 3, fiber = 2 }) {
  let score = 70

  const numSugar = Number(sugar) || 0
  const numSatFat = Number(saturatedFat) || 0
  const numSodium = Number(sodium) || 0
  const numProtein = Number(protein) || 0
  const numFiber = Number(fiber) || 0

  if (numSugar > 22) score -= 25
  else if (numSugar > 12) score -= 14
  else if (numSugar <= 3) score += 8

  if (numSatFat > 8) score -= 20
  else if (numSatFat > 4) score -= 10

  if (numSodium > 600) score -= 22
  else if (numSodium > 300) score -= 12
  else if (numSodium <= 120) score += 6

  if (numProtein >= 15) score += 18
  else if (numProtein >= 8) score += 10

  if (numFiber >= 6) score += 15
  else if (numFiber >= 3) score += 8

  return Math.max(10, Math.min(98, Math.round(score)))
}

/**
 * Parse clean JSON from model response
 */
function parseFastJson(text) {
  if (!text) return null
  let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gi, '').trim()
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    cleaned = cleaned.substring(first, last + 1)
  }
  return JSON.parse(cleaned)
}

/**
 * Discover the active Gemini model for this user's API Key
 */
async function discoverWorkingGeminiModel(apiKey) {
  if (cachedModelName) return cachedModelName

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.models) && data.models.length > 0) {
        const supported = data.models
          .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''))

        console.log('Available models for this API key from Google:', supported)

        // Find flash or vision model
        const match = supported.find(m => m.includes('flash') && !m.includes('8b')) ||
                      supported.find(m => m.includes('flash')) ||
                      supported.find(m => m.includes('pro')) ||
                      supported[0]

        if (match) {
          cachedModelName = match
          return match
        }
      }
    }
  } catch (err) {
    console.warn('Model list discovery error:', err.message)
  }

  return 'gemini-1.5-flash'
}

/**
 * Lightning-Fast Nutrition Photo Analyzer using Gemini Vision
 */
export async function analyzeNutritionImage(imageFile) {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error(
      'Gemini API Key is missing. Please click "Enter API Key" and paste your free key from https://aistudio.google.com/apikey.'
    )
  }

  // 1. High-speed client-side image compression (~30ms)
  const { base64Data, dataUrl, mimeType } = await compressAndResizeImage(imageFile, 900, 900, 0.78)

  // 2. Discover live working model
  const activeModelName = await discoverWorkingGeminiModel(apiKey)
  console.log(`🚀 Using Gemini model: ${activeModelName}`)

  const prompt = `You are a food scientist. Extract nutrition values from this image.
Return ONLY a valid JSON object matching this schema:
{
  "name": "Exact Product Name (e.g. Masala Oats, Milk, Biscuit)",
  "brand": "Brand Name",
  "category": "Category (e.g. Breakfast & Cereal, Dairy, Snacks & Biscuits, Beverages, Bakery)",
  "barcode": "Barcode numbers if visible, else empty",
  "servingSize": "100g",
  "calories": 0,
  "protein": 0,
  "carbohydrates": 0,
  "sugar": 0,
  "fat": 0,
  "saturatedFat": 0,
  "fiber": 0,
  "sodium": 0,
  "ingredients": ["ingredient 1", "ingredient 2"],
  "allergens": ["Milk, Gluten, Nuts if detected"],
  "concerningIngredients": ["Additives, palm oil if detected"],
  "nutriScore": "a",
  "healthScore": 75,
  "insight": "1-sentence nutritionist summary."
}`

  let parsed = null

  // 3. Call via Official SDK
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: activeModelName })
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType || 'image/jpeg'
        }
      }
    ])

    const response = await result.response
    const rawText = response.text()
    console.log('Gemini extraction output:', rawText)
    parsed = parseFastJson(rawText)
  } catch (sdkErr) {
    console.warn(`Primary model ${activeModelName} failed:`, sdkErr.message)

    // Try fallback models if primary failed
    const fallbackModels = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash-exp', 'gemini-pro-vision']
    for (const fbModel of fallbackModels) {
      if (fbModel === activeModelName) continue
      try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: fbModel })
        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType: mimeType || 'image/jpeg' } }
        ])
        const response = await result.response
        parsed = parseFastJson(response.text())
        if (parsed) {
          cachedModelName = fbModel
          break
        }
      } catch (e) {
        console.warn(`Fallback ${fbModel} also failed:`, e.message)
      }
    }
  }

  if (!parsed || (!parsed.name && !parsed.calories && !parsed.protein)) {
    throw new Error(
      'Could not extract nutrition information from this image. Please ensure the nutrition facts table is clearly focused and well-lit.'
    )
  }

  const healthScore = Number(parsed.healthScore) || calculateHealthScore(parsed)
  const barcode = String(parsed.barcode || `ai_${Date.now()}`).trim()

  return {
    id: `p_${barcode}`,
    barcode,
    name: parsed.name || 'Scanned Food Product',
    brand: parsed.brand || 'Foodie Scanned',
    category: parsed.category || 'Food & Grocery',
    price: parsed.price || 60,
    healthScore,
    nutriScore: parsed.nutriScore || (healthScore >= 80 ? 'a' : healthScore >= 60 ? 'b' : healthScore >= 45 ? 'c' : 'd'),
    calories: Number(parsed.calories) || 180,
    protein: Number(parsed.protein) || 0,
    carbs: Number(parsed.carbohydrates || parsed.carbs) || 0,
    sugar: Number(parsed.sugar) || 0,
    fat: Number(parsed.fat) || 0,
    saturatedFat: Number(parsed.saturatedFat) || 0,
    fiber: Number(parsed.fiber) || 0,
    sodium: Number(parsed.sodium) || 0,
    ingredients: Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0 ? parsed.ingredients : ['Food Ingredients'],
    ingredientList: Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0 ? parsed.ingredients : ['Food Ingredients'],
    allergens: Array.isArray(parsed.allergens) ? parsed.allergens : [],
    concerningIngredients: Array.isArray(parsed.concerningIngredients) ? parsed.concerningIngredients : [],
    tags: [
      parsed.category || 'Grocery',
      healthScore >= 70 ? 'Nutritious' : healthScore >= 50 ? 'Moderate' : 'High Processed',
      (Number(parsed.protein) || 0) >= 8 ? 'High Protein' : '',
      (Number(parsed.sugar) || 0) > 15 ? 'High Sugar Alert' : ''
    ].filter(Boolean),
    insight: parsed.insight || 'Nutrition facts extracted and analyzed with Gemini Vision AI.',
    imageUrl: dataUrl,
    image: '🥗',
    source: 'Gemini Vision AI'
  }
}
