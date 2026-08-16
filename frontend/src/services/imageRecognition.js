import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Get active Gemini AI instance (checks localStorage custom key or .env)
 */
export function getGeminiApiKey() {
  const customKey = typeof localStorage !== 'undefined' ? localStorage.getItem('foodie_gemini_key') : null
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  const key = customKey || envKey
  return (key && key !== 'your-gemini-key' && key.trim().length > 15) ? key.trim() : null
}

export function setGeminiApiKey(key) {
  if (key && key.trim()) {
    localStorage.setItem('foodie_gemini_key', key.trim())
  } else {
    localStorage.removeItem('foodie_gemini_key')
  }
}

/**
 * Convert a File or Blob object into a base64 string
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result
      const base64Data = result.split(',')[1]
      resolve({
        base64Data,
        dataUrl: result,
        mimeType: file.type || 'image/jpeg'
      })
    }
    reader.onerror = (error) => reject(error)
  })
}

/**
 * Calculate health score (0-100) from basic nutrition facts
 */
function calculateHealthScore({ calories = 150, sugar = 5, saturatedFat = 2, sodium = 100, protein = 3, fiber = 2 }) {
  let score = 70 // baseline

  const numSugar = Number(sugar) || 0
  const numSatFat = Number(saturatedFat) || 0
  const numSodium = Number(sodium) || 0
  const numProtein = Number(protein) || 0
  const numFiber = Number(fiber) || 0

  // Penalties
  if (numSugar > 22) score -= 25
  else if (numSugar > 12) score -= 14
  else if (numSugar <= 3) score += 8

  if (numSatFat > 8) score -= 20
  else if (numSatFat > 4) score -= 10

  if (numSodium > 600) score -= 22
  else if (numSodium > 300) score -= 12
  else if (numSodium <= 120) score += 6

  // Bonuses
  if (numProtein >= 15) score += 18
  else if (numProtein >= 8) score += 10

  if (numFiber >= 6) score += 15
  else if (numFiber >= 3) score += 8

  return Math.max(10, Math.min(98, Math.round(score)))
}

/**
 * Extract clean JSON object from raw LLM text output
 */
function extractJsonFromText(rawText) {
  if (!rawText) return null
  let text = rawText.trim()

  // Remove markdown code fences
  text = text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()

  // Find first { and last }
  const firstOpen = text.indexOf('{')
  const lastClose = text.lastIndexOf('}')

  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    const jsonSubstring = text.substring(firstOpen, lastClose + 1)
    return JSON.parse(jsonSubstring)
  }

  return JSON.parse(text)
}

/**
 * Analyze a Food Product or Nutrition Label Photo with real Gemini Vision AI
 * @param {File|Blob|string} imageFile - The image to analyze
 * @returns {Promise<Object>} Extracted product nutrition object
 */
export async function analyzeNutritionImage(imageFile) {
  let base64Data = ''
  let mimeType = 'image/jpeg'
  let dataUrl = ''

  if (typeof imageFile === 'string') {
    dataUrl = imageFile
    base64Data = imageFile.includes(',') ? imageFile.split(',')[1] : imageFile
  } else {
    const converted = await fileToBase64(imageFile)
    base64Data = converted.base64Data
    mimeType = converted.mimeType
    dataUrl = converted.dataUrl
  }

  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error(
      'Invalid or missing Google Gemini API Key. Google Gemini keys start with "AIzaSy...". Please get a free API key from https://aistudio.google.com/apikey and add it to .env (VITE_GEMINI_API_KEY) or enter it in Settings.'
    )
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro']
  let lastError = null

  const prompt = `You are an expert food scientist and OCR nutritionist for Foodie AI.
Carefully examine this image of a food product package, nutrition facts table, or ingredient label.
Extract the EXACT values printed on the package. If a field is not visible, estimate a realistic value based on the food type.
You MUST output ONLY a valid, single JSON object with no preamble, no commentary, and no markdown formatting outside JSON.

JSON Schema:
{
  "name": "Exact Product Name (e.g. Britannia NutriChoice Oats, Saffola Masala Oats, Amul Butter)",
  "brand": "Brand Name (e.g. Britannia, Nestle, Amul, Kellogg's)",
  "category": "Food Category (e.g. Breakfast & Cereal, Dairy, Snacks & Biscuits, Beverages, Bakery, Confectionery)",
  "barcode": "Barcode digits if visible in image, else leave empty string",
  "servingSize": "Serving size text e.g. 100g or 30g",
  "calories": 0 (number: energy in kcal per 100g or serving),
  "protein": 0 (number: protein in grams),
  "carbohydrates": 0 (number: carbohydrates in grams),
  "sugar": 0 (number: total sugar in grams),
  "fat": 0 (number: total fat in grams),
  "saturatedFat": 0 (number: saturated fat in grams),
  "fiber": 0 (number: dietary fiber in grams),
  "sodium": 0 (number: sodium in milligrams mg),
  "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3"],
  "allergens": ["Specific allergens found, e.g. Milk, Wheat (Gluten), Peanuts, Soy, Tree Nuts, Eggs"],
  "concerningIngredients": ["Additives, artificial colors, palm oil, MSG, high fructose corn syrup if found"],
  "nutriScore": "a" (one lowercase letter: "a", "b", "c", "d", or "e"),
  "healthScore": 75 (number between 0 and 100 based on nutritional quality),
  "insight": "1-2 sentence nutritionist summary of this specific product's health value."
}`

  for (const modelName of modelsToTry) {
    try {
      console.log(`🧠 Calling Gemini Vision AI model: ${modelName}...`)
      const model = genAI.getGenerativeModel({ model: modelName })
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ])

      const response = await result.response
      const text = response.text()
      console.log('Gemini raw response text:', text)

      const parsed = extractJsonFromText(text)
      if (!parsed || (!parsed.name && !parsed.calories)) {
        throw new Error('Gemini response did not contain expected nutrition JSON schema.')
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
        insight: parsed.insight || 'Nutrition panel scanned and verified with Gemini Vision AI.',
        imageUrl: dataUrl,
        image: '🥗',
        source: 'Gemini Vision AI'
      }
    } catch (err) {
      console.warn(`Gemini Vision model ${modelName} attempt failed:`, err.message)
      lastError = err
    }
  }

  // If all models failed, throw the genuine Gemini error so user knows what went wrong
  throw new Error(`Gemini Vision AI could not analyze the image: ${lastError?.message || 'Please ensure the photo is sharp and clear.'}`)
}
