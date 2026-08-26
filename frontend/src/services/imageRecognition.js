import { GoogleGenerativeAI } from '@google/generative-ai'
import { searchUsdaFood, getUsdaApiKey } from './usdaFoodApi'
import { fetchSearchProducts, getApiBaseUrl } from './api'
import Tesseract from 'tesseract.js'

let cachedModelName = null



/**
 * Get active Gemini AI key
 */
export function getGeminiApiKey() {
  const customKey = typeof localStorage !== 'undefined' ? localStorage.getItem('foodie_gemini_key') : null
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  const key = (customKey || envKey || '').trim()
  return (key && key !== 'your-gemini-key' && key.length > 20) ? key : null
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
 * Clean numbers from string values (e.g. "450 kcal" -> 450, "8.5g" -> 8.5)
 */
function parseCleanNumber(val, fallback = 0) {
  if (typeof val === 'number') return val
  if (!val) return fallback
  const match = String(val).match(/[-+]?[0-9]*\.?[0-9]+/)
  if (match) {
    const num = parseFloat(match[0])
    return isNaN(num) ? fallback : num
  }
  return fallback
}

/**
 * High-speed client-side image compressor & resizer.
 * Reduces 5MB-15MB phone camera photos to ~120KB in ~30ms.
 */
export function compressAndResizeImage(file, maxWidth = 1000, maxHeight = 1000, quality = 0.82) {
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
        ctx.imageSmoothingQuality = 'high'
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

  const numSugar = parseCleanNumber(sugar, 5)
  const numSatFat = parseCleanNumber(saturatedFat, 2)
  const numSodium = parseCleanNumber(sodium, 100)
  const numProtein = parseCleanNumber(protein, 3)
  const numFiber = parseCleanNumber(fiber, 2)

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
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    console.warn('JSON direct parse error:', e.message)
    return null
  }
}


async function parseOcrText(rawText, dataUrl, engineName = 'Local Tesseract OCR') {
  const text = rawText.toLowerCase()
  
  // Regex to extract numbers after keywords
  const extractNum = (keyword) => {
    const regex = new RegExp(`${keyword}[^0-9]*([0-9]+\\.?[0-9]*)`, 'i')
    const match = text.match(regex)
    return match ? parseFloat(match[1]) : 0
  }

  const calories = extractNum('calories|energy') || 0
  const protein = extractNum('protein') || 0
  const carbs = extractNum('carbohydrate|carbs') || 0
  const sugar = extractNum('sugar') || 0
  const fat = extractNum('total fat|fat') || 0
  const saturatedFat = extractNum('saturated fat|sat fat') || 0
  const fiber = extractNum('fiber|dietary fiber') || 0
  const sodium = extractNum('sodium') || 0

  const healthScore = calculateHealthScore({ calories, sugar, saturatedFat, sodium, protein, fiber })
  const barcode = `ocr_${Date.now()}`

  // Check if we actually found any meaningful numbers
  const hasData = (calories + protein + carbs + sugar + fat + sodium) > 0
  if (!hasData) {
    // FRONT LABEL FALLBACK:
    const cleanText = text.replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim()
    const words = cleanText.split(' ').filter(w => w.length > 2) // keep words > 2 chars
    const searchKeywords = words.slice(0, 4).join(' ')
    
    if (searchKeywords.length > 3) {
      console.log(`🔍 OCR found no numbers. Searching Foodie AI DB for Front Label Product: "${searchKeywords}"`)
      const localResults = await fetchSearchProducts(searchKeywords)
      if (localResults && localResults.length > 0) {
         return {
           ...localResults[0],
           imageUrl: dataUrl,
           insight: `Identified product from front label text (Foodie AI Database).`,
           source: 'Foodie AI Database'
         }
      }

      console.log(`🔍 Not in Foodie DB. Searching USDA API for: "${searchKeywords}"`)
      const usdaResults = await searchUsdaFood(searchKeywords)
      if (usdaResults && usdaResults.length > 0) {
         return {
           ...usdaResults[0],
           imageUrl: dataUrl,
           insight: `Identified product from front label text (USDA).`,
           source: 'Front Label Recognition'
         }
      }
    }

    throw new Error("Could not extract any clear nutrition numbers or product name. Please scan the Nutrition Facts label clearly.")
  }

  return {
    id: `p_${barcode}`,
    barcode,
    name: 'Scanned Nutrition Label',
    brand: 'Foodie AI OCR',
    category: 'Scanned Label',
    price: 0,
    healthScore,
    nutriScore: healthScore >= 80 ? 'a' : healthScore >= 60 ? 'b' : healthScore >= 45 ? 'c' : 'd',
    calories, protein, carbs, sugar, fat, saturatedFat, fiber, sodium,
    ingredients: [`Extracted from photo via ${engineName}`],
    ingredientList: [`Extracted from photo via ${engineName}`],
    allergens: [],
    concerningIngredients: sugar > 18 ? ['High Added Sugar'] : sodium > 500 ? ['High Sodium'] : [],
    tags: [`${engineName} Scan`],
    insight: `Securely extracted ${calories} kcal and ${protein}g protein directly on your device.`,
    imageUrl: dataUrl,
    image: '📝',
    source: engineName
  }
}

async function localPaddleOcrExtractor(imageFile) {
  const formData = new FormData()
  formData.append('image', imageFile)

  const baseUrl = getApiBaseUrl()
  const res = await fetch(`${baseUrl}/ocr/paddle`, {
    method: 'POST',
    body: formData
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'PaddleOCR server error')
  }
  const data = await res.json()
  return data.text // Returns combined string
}

async function localOcrNutritionExtractor(imageFile, dataUrl) {
  console.log('🔍 Running Local OCR Vision Engine (Tesseract.js)...')
  
  try {
    const result = await Tesseract.recognize(dataUrl, 'eng', {
      logger: m => console.log('OCR Progress:', m.status, Math.round(m.progress * 100) + '%')
    })
    
    return await parseOcrText(result.data.text, dataUrl, 'Local Tesseract OCR')
  } catch (err) {
    console.error('OCR Engine Error:', err)
    if (err.message && err.message.includes('Could not extract')) {
      throw err
    }
    throw new Error('Could not read the image clearly. Please ensure the text is well-lit and in focus.')
  }
}

/**
 * Multi-Engine Photo & Food Scanner:
 * 1. OpenAI GPT-4o-mini Vision AI (if sk- key is available) -> TOP PRIORITY
 * 2. Google Gemini Vision AI (if AIzaSy key is available)
 * 3. Official USDA FoodData Central API (if USDA Key is available)
 * 4. Smart Vision Engine (Dynamic visual hashing fallback)
 */
export async function analyzeNutritionImage(imageFile, userProfile = null) {
  const { base64Data, dataUrl, mimeType } = await compressAndResizeImage(imageFile, 1000, 1000, 0.82)

  const usdaKey = getUsdaApiKey()
  const USE_ONLY_OCR = false

  // Engine 2: Groq Vision AI via Backend
  if (!USE_ONLY_OCR) {
    if (geminiKey === 'TEST_MODE_ACTIVATE') {
      console.log('🧪 Running Gemini in TEST MODE...')
      await new Promise(r => setTimeout(r, 1500))
      return {
        id: `p_gemini_test`,
        barcode: `test_mock_123`,
        name: 'Healthy Oat Crunch',
        brand: 'Foodie Mock',
        category: 'Snacks',
        price: 150,
        healthScore: 88,
        nutriScore: 'a',
        calories: 120, protein: 6.5, carbs: 15, sugar: 3.2, fat: 4.0, saturatedFat: 0.5, fiber: 4.5, sodium: 80,
        ingredients: ['Rolled Oats', 'Honey', 'Almonds', 'Chia Seeds', 'Sea Salt'],
        ingredientList: ['Rolled Oats', 'Honey', 'Almonds', 'Chia Seeds', 'Sea Salt'],
        allergens: ['Almonds (Tree Nuts)'],
        concerningIngredients: [],
        tags: ['Scanned', 'Nutritious', 'High Fiber'],
        insight: 'Excellent source of fiber and protein with low added sugars.',
        imageUrl: dataUrl,
        image: '🥗',
        source: 'Gemini Vision AI (Test Mode)'
      }
    }

    try {
      console.log('🧠 Running Google Gemini Vision AI...')
      
      let userContext = ''
      if (userProfile) {
        userContext = `
USER PROFILE CONTEXT:
- Dietary Preferences: ${userProfile.dietaryPreferences?.join(', ') || 'None'}
- Allergies: ${userProfile.allergies?.join(', ') || 'None'}
- Health Goals: ${userProfile.goals?.join(', ') || 'None'}

CRITICAL INSTRUCTION:
Check the ingredients against the User's Allergies. If an allergen is found, provide a CLEAR warning in "allergenWarning" AND recommend a specific alternative brand/product that is allergen-free in "recommendation".
If NO allergen is found, but the product is unhealthy (e.g. high sugar, high fat), recommend a healthier alternative in "recommendation". If the product is perfectly healthy, recommend a complimentary pairing.`
      }

      const prompt = `You are a food scientist and nutritionist for Foodie AI.
Analyze this food image and output ONLY a valid JSON object matching this schema:
{
  "name": "Product Name",
  "brand": "Brand Name",
  "category": "Category",
  "barcode": "Barcode if visible else empty",
  "calories": 0, "protein": 0, "carbohydrates": 0, "sugar": 0, "fat": 0, "saturatedFat": 0, "fiber": 0, "sodium": 0,
  "ingredients": ["ingredient 1", "ingredient 2"],
  "allergens": ["Milk, Wheat, Peanuts if detected"],
  "concerningIngredients": ["Additives if detected"],
  "allergenWarning": "String warning if user allergies match ingredients, else null",
  "recommendation": "String recommending a safer/healthier alternative brand or product based on context",
  "healthScore": 75,
  "insight": "1-sentence nutritionist summary."
}
${userContext}`

      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/chat/vision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: typeof localStorage !== 'undefined' ? `Bearer ${localStorage.getItem('token')}` : ''
        },
        body: JSON.stringify({
          prompt,
          base64Data,
          mimeType: mimeType || 'image/jpeg'
        })
      });

      if (!res.ok) throw new Error('Backend Vision request failed');
      const responseJson = await res.json();
      const parsed = parseFastJson(responseJson.text);

      if (parsed && (parsed.name || parsed.calories)) {
        const calories = parseCleanNumber(parsed.calories, 180)
        const protein = parseCleanNumber(parsed.protein, 4.0)
        const carbs = parseCleanNumber(parsed.carbohydrates || parsed.carbs, 25.0)
        const sugar = parseCleanNumber(parsed.sugar, 4.0)
        const fat = parseCleanNumber(parsed.fat, 5.0)
        const saturatedFat = parseCleanNumber(parsed.saturatedFat, 1.5)
        const fiber = parseCleanNumber(parsed.fiber, 2.5)
        const sodium = parseCleanNumber(parsed.sodium, 120)
        const healthScore = Number(parsed.healthScore) || calculateHealthScore({ calories, sugar, saturatedFat, sodium, protein, fiber })

        return {
          id: `p_gemini_${Date.now()}`,
          barcode: parsed.barcode || `ai_${Date.now()}`,
          name: parsed.name || 'Scanned Product',
          brand: parsed.brand || 'Foodie AI',
          category: parsed.category || 'Food & Grocery',
          price: 60,
          healthScore,
          nutriScore: healthScore >= 80 ? 'a' : healthScore >= 60 ? 'b' : healthScore >= 45 ? 'c' : 'd',
          calories, protein, carbs, sugar, fat, saturatedFat, fiber, sodium,
          ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : ['Natural Ingredients'],
          ingredientList: Array.isArray(parsed.ingredients) ? parsed.ingredients : ['Natural Ingredients'],
          allergens: Array.isArray(parsed.allergens) ? parsed.allergens : [],
          concerningIngredients: Array.isArray(parsed.concerningIngredients) ? parsed.concerningIngredients : [],
          tags: ['Scanned', healthScore >= 70 ? 'Nutritious' : 'Standard'],
          insight: parsed.insight || `AI Vision analyzed product (${calories} kcal).`,
          allergenWarning: parsed.allergenWarning || null,
          recommendation: parsed.recommendation || null,
          imageUrl: dataUrl,
          image: '🥗',
          source: 'Groq Vision AI'
        }
      }
    } catch (err) {
      console.error('Groq Vision API Error:', err)
      throw new Error(`Groq AI Error: ${err.message}. Please check if backend is running.`)
    }
  }

  // Engine 4: Local OCR Vision Fallback (No API Keys needed)



  // Try PaddleOCR Server first
  if (USE_ONLY_OCR) {
    try {
      console.log('🔍 Attempting local PaddleOCR Server Engine...')
      const rawText = await localPaddleOcrExtractor(imageFile)
      if (rawText) {
        console.log('📄 PaddleOCR Raw Text:', rawText)
        return await parseOcrText(rawText, dataUrl, 'PaddleOCR Local Engine')
      }
    } catch (err) {
      console.warn('PaddleOCR server fallback failed:', err.message)
    }
  }

  // Tesseract.js Fallback
  return await localOcrNutritionExtractor(imageFile, dataUrl)
}

export async function analyzePrescriptionImage(imageFile, onProgress = null) {
  const { dataUrl, base64Data, mimeType } = await compressAndResizeImage(imageFile, 1500, 1500, 0.90)

  // 1. Run Real Client-Side Tesseract OCR on the user's uploaded photo
  let extractedOcrText = ''
  try {
    if (onProgress) onProgress('🔬 Running Tesseract Optical Character Recognition (OCR) on your prescription...')
    const ocrRes = await Tesseract.recognize(imageFile, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(`Reading prescription text... ${Math.round((m.progress || 0) * 100)}%`)
        }
      }
    })
    extractedOcrText = (ocrRes?.data?.text || '').trim()
    console.log('Real Tesseract OCR Extracted Text:', extractedOcrText)
  } catch (tessErr) {
    console.warn('Tesseract client OCR warning:', tessErr)
  }

  // 2. Send Real Extracted OCR Text to Backend Groq AI Clinical Parser
  if (onProgress) onProgress('🩺 Clinical AI analyzing medications, dosages, and health conditions...')
  const baseUrl = getApiBaseUrl()

  try {
    const res = await fetch(`${baseUrl}/prescription/analyze-ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: typeof localStorage !== 'undefined' ? `Bearer ${localStorage.getItem('token')}` : ''
      },
      body: JSON.stringify({
        ocrText: extractedOcrText,
        fileUrl: dataUrl
      })
    })

    if (res.ok) {
      const parsedData = await res.json()
      return {
        ...parsedData,
        fileUrl: dataUrl,
        ocrText: extractedOcrText || parsedData.ocrText || ''
      }
    }
  } catch (apiErr) {
    console.warn('Backend OCR analyze API error:', apiErr)
  }

  // 3. If backend endpoint was unreachable, parse the actual OCR text locally
  if (extractedOcrText.length > 5) {
    const lines = extractedOcrText.split('\n').map(l => l.trim()).filter(Boolean)
    return {
      doctorName: lines.find(l => /dr\.?|doctor/i.test(l)) || 'Physician',
      clinicName: lines.find(l => /hospital|clinic|center|care/i.test(l)) || 'Medical Center',
      patientName: 'Self',
      prescriptionDate: new Date().toISOString().split('T')[0],
      ocrText: extractedOcrText,
      detectedConditions: [],
      restrictedNutrients: [],
      avoidFoods: [],
      medicines: lines.filter(l => /tab|cap|syr|inj|mg|\d-\d-\d/i.test(l)).map(l => ({
        name: l,
        dosage: 'As prescribed',
        frequency: 'As directed',
        purpose: 'Prescribed Medication',
        timing: 'Follow physician advice'
      })),
      aiExplanation: `OCR scanned ${lines.length} lines from your uploaded prescription image.`,
      foodInteractions: [],
      fileUrl: dataUrl
    }
  }

  // 4. If image was completely blank or unreadable
  return {
    doctorName: 'Not detected',
    clinicName: 'Not detected',
    patientName: 'Self',
    prescriptionDate: new Date().toISOString().split('T')[0],
    ocrText: '',
    detectedConditions: [],
    restrictedNutrients: [],
    avoidFoods: [],
    medicines: [],
    aiExplanation: 'Could not clearly recognize doctor handwriting or printed text from this image. Please take a clear, well-lit close-up photo of the prescription.',
    foodInteractions: [],
    fileUrl: dataUrl
  }
}
