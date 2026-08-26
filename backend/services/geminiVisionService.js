const { GoogleGenerativeAI } = require('@google/generative-ai')
const Groq = require('groq-sdk')
const OpenAI = require('openai')

/**
 * Clean and parse JSON response safely
 */
function parseProductJson(responseText) {
  let cleanJson = responseText.trim()
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim()
  }

  try {
    const parsedData = JSON.parse(cleanJson)
    return {
      brand: parsedData.brand || 'Unknown Brand',
      productName: parsedData.productName || 'Food Product',
      category: parsedData.category || 'General Snack',
      description: parsedData.description || 'No product description available.',
      foodType: parsedData.foodType === 'Non-Vegetarian' ? 'Non-Vegetarian' : 'Vegetarian',
      confidence: typeof parsedData.confidence === 'number' ? parsedData.confidence : 92,
      colors: Array.isArray(parsedData.colors) && parsedData.colors.length > 0 ? parsedData.colors : ['#16A34A', '#F59E0B'],
      ingredients: Array.isArray(parsedData.ingredients) ? parsedData.ingredients : [],
      visibleText: Array.isArray(parsedData.visibleText) ? parsedData.visibleText : [],
      healthScore: typeof parsedData.healthScore === 'number' ? Math.max(0, Math.min(100, parsedData.healthScore)) : 72,
      suggestions: {
        bestTimeToEat: parsedData.suggestions?.bestTimeToEat || 'Tea-time snack or daytime munch',
        whoCanEat: parsedData.suggestions?.whoCanEat || 'Suitable for kids and adults',
        snackSuggestion: parsedData.suggestions?.snackSuggestion || 'Enjoy in moderation as part of a balanced diet.'
      }
    }
  } catch (err) {
    console.error('Failed to parse AI Vision JSON output:', responseText)
    throw new Error('UNPARSEABLE_RESPONSE: AI output could not be parsed as structured JSON.')
  }
}

/**
 * Common Nutrition Prompt for AI Vision Engines
 */
const ANALYSIS_PROMPT = `
You are Foodie AI, an expert nutritionist and food product explainer.
Analyze this food product package image (front or back of packaging) carefully.

Extract and return ONLY a single, valid JSON object (no markdown, no extra commentary).
Strict JSON Schema:

{
  "brand": "Brand name (e.g. Lay's, Parle, Maggi, Nestle, Top Ramen, 1 to 3)",
  "productName": "Full product name (e.g. Noodles Masala, Cream & Onion Potato Chips)",
  "category": "Food category (e.g. Instant Noodles, Chips & Snacks, Biscuits & Cookies, Beverages, Dairy)",
  "description": "A 2 to 3 sentence product explanation in simple, clear English explaining what the item is, main ingredients, and how it is consumed.",
  "foodType": "Vegetarian" or "Non-Vegetarian",
  "confidence": 95,
  "colors": ["#16A34A", "#F59E0B"],
  "ingredients": ["List", "of", "detected", "ingredients"],
  "visibleText": ["List", "of", "readable", "text", "lines", "on", "package"],
  "healthScore": 65,
  "suggestions": {
    "bestTimeToEat": "Best time to consume (e.g. Evening snack, Tea-time, Quick meal)",
    "whoCanEat": "Who can eat this (e.g. Suitable for kids and adults)",
    "snackSuggestion": "Healthy tip or dietary advice"
  }
}

Guidelines:
- "foodType": Green dot in green square = Vegetarian; Red/brown dot in square = Non-Vegetarian.
- "ingredients": Return empty array [] if ingredients label is not visible on image.
- "healthScore": Score 0-100 based on nutritional profile (whole/fresh foods 80-100, moderate snacks 55-79, fried/junk foods 20-54).
`

/**
 * 1. Try Gemini Vision via SDK and direct REST fallback
 */
async function analyzeWithGemini(base64Image, mimeType, apiKey) {
  const cleanKey = apiKey.replace(/^["']|["']$/g, '').trim()
  const candidateModels = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-pro']

  // Try via official SDK
  const genAI = new GoogleGenerativeAI(cleanKey)
  
  for (const modelName of candidateModels) {
    try {
      console.log(`Trying Gemini SDK model: ${modelName}...`)
      const model = genAI.getGenerativeModel({ model: modelName })
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimeType || 'image/jpeg'
        }
      }
      const result = await model.generateContent([ANALYSIS_PROMPT, imagePart])
      const responseText = await result.response.text()
      if (responseText && responseText.length > 10) {
        return parseProductJson(responseText)
      }
    } catch (sdkErr) {
      console.warn(`Gemini SDK ${modelName} attempt error:`, sdkErr.message)
      if (sdkErr.message?.includes('API_KEY_SERVICE_BLOCKED') || sdkErr.message?.includes('GenerativeService.GenerateContent are blocked')) {
        throw new Error('GEMINI_KEY_BLOCKED: This Google Gemini API Key is blocked by API restrictions in Google Cloud Console. Please create a new unrestricted key at https://aistudio.google.com/apikey')
      }
      if (sdkErr.message?.includes('API key not valid') || sdkErr.message?.includes('API_KEY_INVALID')) {
        throw new Error('GEMINI_KEY_INVALID: The provided Gemini API Key is invalid. Please verify your key at https://aistudio.google.com/apikey')
      }
    }
  }

  // Fallback to direct REST API fetch
  console.log('SDK attempts failed. Trying direct Gemini REST API fetch...')
  for (const modelName of candidateModels) {
    try {
      const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`
      const restRes = await fetch(restUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: ANALYSIS_PROMPT },
              { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Image } }
            ]
          }]
        })
      })

      const restJson = await restRes.json()
      if (restJson.error) {
        console.warn(`Gemini REST ${modelName} error:`, restJson.error.message)
        if (restJson.error.message?.includes('API key not valid')) {
          throw new Error('GEMINI_KEY_INVALID: The provided Gemini API Key is invalid. Please verify your key at https://aistudio.google.com/apikey')
        }
        continue
      }

      const textOut = restJson.candidates?.[0]?.content?.parts?.[0]?.text
      if (textOut) {
        return parseProductJson(textOut)
      }
    } catch (restErr) {
      if (restErr.message?.includes('GEMINI_KEY_INVALID')) throw restErr
      console.warn(`Gemini REST ${modelName} fetch error:`, restErr.message)
    }
  }

  throw new Error('Gemini API calls failed across all models.')
}

/**
 * 2. Fallback to Groq Vision AI (Llama 3.2 Vision)
 */
async function analyzeWithGroq(base64Image, mimeType) {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) throw new Error('No Groq key configured')

  console.log('⚡ Falling back to Groq Vision AI (Llama 3.2)...')
  const groq = new Groq({ apiKey: groqKey })
  const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${base64Image}`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.2-11b-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: ANALYSIS_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ],
    temperature: 0.2,
    max_tokens: 1024
  })

  const textOut = completion.choices[0]?.message?.content
  if (!textOut) throw new Error('Groq Vision returned empty response.')
  return parseProductJson(textOut)
}

/**
 * 3. Fallback to OpenAI Vision (GPT-4o mini)
 */
async function analyzeWithOpenAI(base64Image, mimeType) {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) throw new Error('No OpenAI key configured')

  console.log('⚡ Falling back to OpenAI Vision (GPT-4o mini)...')
  const openai = new OpenAI({ apiKey: openaiKey })
  const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${base64Image}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: ANALYSIS_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ],
    max_tokens: 1000
  })

  const textOut = response.choices[0]?.message?.content
  if (!textOut) throw new Error('OpenAI Vision returned empty response.')
  return parseProductJson(textOut)
}

/**
 * Main Service Function with Automatic Fallback Chain
 */
async function analyzeImageWithGemini(base64Image, mimeType = 'image/jpeg', clientApiKey = null) {
  const geminiKey = (clientApiKey || process.env.GEMINI_API_KEY || '').trim()

  // Primary: Try Google Gemini Vision
  if (geminiKey && geminiKey !== 'your-gemini-key' && geminiKey.length > 15) {
    try {
      return await analyzeWithGemini(base64Image, mimeType, geminiKey)
    } catch (geminiErr) {
      console.warn('Gemini Vision failed, falling back to backup AI Vision engine:', geminiErr.message)
    }
  }

  // Fallback 1: Try Groq Llama 3.2 Vision if available
  if (process.env.GROQ_API_KEY) {
    try {
      return await analyzeWithGroq(base64Image, mimeType)
    } catch (groqErr) {
      console.warn('Groq Vision fallback failed:', groqErr.message)
    }
  }

  // Fallback 2: Try OpenAI GPT-4o mini Vision if available
  if (process.env.OPENAI_API_KEY) {
    try {
      return await analyzeWithOpenAI(base64Image, mimeType)
    } catch (openaiErr) {
      console.warn('OpenAI Vision fallback failed:', openaiErr.message)
    }
  }

  // If no key or all failed
  if (!geminiKey) {
    throw new Error('GEMINI_API_KEY_MISSING: Gemini API key is missing. Please set GEMINI_API_KEY in backend/.env file or click below to enter your free key.')
  }

  throw new Error('Could not analyze product photo. Please verify your Gemini API key or upload a clearer photo.')
}

module.exports = {
  analyzeImageWithGemini
}
