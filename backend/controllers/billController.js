const fs = require('fs')
const path = require('path')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const Groq = require('groq-sdk')
const Bill = require('../models/Bill')
const { exec } = require('child_process')

// Initialize Groq client
const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured in backend environment.')
  return new Groq({ apiKey })
}

/**
 * Clean, repair, and parse JSON safely (handles truncated responses gracefully)
 */
function parseBillJson(responseText) {
  if (!responseText) throw new Error('Empty AI response received.')
  let clean = responseText.trim()
  clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim()
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

  // 1. Direct parse attempt
  try {
    return JSON.parse(clean)
  } catch (e) {}

  // 2. Locate first '{'
  const startIdx = clean.indexOf('{')
  if (startIdx === -1) throw new Error('No JSON object found in AI response.')
  clean = clean.substring(startIdx)

  // 3. Try to parse to last valid '}'
  const lastBrace = clean.lastIndexOf('}')
  if (lastBrace !== -1) {
    try {
      return JSON.parse(clean.substring(0, lastBrace + 1))
    } catch (e) {}
  }

  // 4. Auto-repair truncated JSON
  let s = clean
  // Clean dangling unclosed keys or values at the tail
  s = s.replace(/,\s*"[^"]*":?\s*("[^"]*)?$/, '')
  s = s.replace(/,\s*$/, '')

  // Close unclosed string quote
  const quoteMatches = s.match(/(?<!\\)"/g)
  if (quoteMatches && quoteMatches.length % 2 !== 0) {
    s += '"'
  }

  // Count open brackets
  let openBrackets = 0
  let openBraces = 0
  let inString = false

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '"' && (i === 0 || s[i - 1] !== '\\')) {
      inString = !inString
    } else if (!inString) {
      if (c === '[') openBrackets++
      else if (c === ']') openBrackets = Math.max(0, openBrackets - 1)
      else if (c === '{') openBraces++
      else if (c === '}') openBraces = Math.max(0, openBraces - 1)
    }
  }

  for (let i = 0; i < openBrackets; i++) s += ']'
  for (let i = 0; i < openBraces; i++) s += '}'

  try {
    const parsed = JSON.parse(s)
    if (parsed && typeof parsed === 'object') {
      console.log('✅ Successfully auto-repaired truncated AI JSON output.')
      return parsed
    }
  } catch (repairErr) {
    console.error('Repaired JSON parse failed on string:', s.slice(-200))
  }

  throw new Error('AI output could not be parsed as structured JSON.')
}/**
 * Build Prompt for Bill / Receipt Analysis across User + Family Members
 */
function buildBillPrompt(userProfile = {}, prescriptionInfo = [], familyMembers = []) {
  const userName = userProfile.name || 'You (Primary User)'
  const userAllergies = Array.isArray(userProfile.allergies) && userProfile.allergies.length > 0 
    ? userProfile.allergies.join(', ') 
    : 'None'

  const userConditions = Array.isArray(userProfile.medicalConditions) && userProfile.medicalConditions.length > 0 
    ? userProfile.medicalConditions.join(', ') 
    : (userProfile.medicalCondition || 'None')

  const userDiet = Array.isArray(userProfile.dietaryPreferences) && userProfile.dietaryPreferences.length > 0
    ? userProfile.dietaryPreferences.join(', ')
    : (userProfile.dietaryPreference || 'Standard / No strict preference')

  const goals = Array.isArray(userProfile.goals) && userProfile.goals.length > 0
    ? userProfile.goals.join(', ')
    : 'Healthy Eating'

  const medicines = Array.isArray(prescriptionInfo) && prescriptionInfo.length > 0
    ? prescriptionInfo.map(rx => rx.medicines?.map(m => m.name).join(', ')).filter(Boolean).join('; ')
    : 'None'

  let familyRosterText = `1. Primary User: ${userName}
   - Allergies: ${userAllergies}
   - Medical Conditions: ${userConditions}
   - Dietary Preference: ${userDiet}
   - Health Goals: ${goals}
   - Active Prescriptions / Medications: ${medicines}`

  if (Array.isArray(familyMembers) && familyMembers.length > 0) {
    familyMembers.forEach((member, idx) => {
      const mName = member.name || `Family Member #${idx + 1}`
      const mRel = member.relationship || 'Family Member'
      const mAllergies = Array.isArray(member.allergies) && member.allergies.length > 0 ? member.allergies.join(', ') : 'None'
      const mConds = Array.isArray(member.healthConditions) && member.healthConditions.length > 0 
        ? member.healthConditions.join(', ') 
        : (Array.isArray(member.diseases) && member.diseases.length > 0 ? member.diseases.join(', ') : 'None')
      const mDiet = Array.isArray(member.dietaryPreferences) && member.dietaryPreferences.length > 0 ? member.dietaryPreferences.join(', ') : 'Standard'
      const mAge = member.age ? `${member.age} yrs` : ''
      const mGender = member.gender || ''

      familyRosterText += `\n${idx + 2}. Family Member: ${mName} (${mRel} ${mAge ? `· ${mAge}` : ''} ${mGender ? `· ${mGender}` : ''})
   - Allergies: ${mAllergies}
   - Medical Conditions: ${mConds}
   - Dietary Preference: ${mDiet}`
    })
  }

  return `
You are Foodie AI, an elite clinical nutritionist, family food safety auditor, and receipt analyzer.
Analyze this supermarket grocery receipt / store bill carefully for the ENTIRE FAMILY HOUSEHOLD.

=== HOUSEHOLD HEALTH & ALLERGY ROSTER ===
${familyRosterText}

=== YOUR TASK ===
1. Extract the store name, bill date, and total bill amount.
2. STRICT EXTRACTION: Extract ONLY the actual food, beverage, and grocery items clearly printed in the receipt text. DO NOT invent items not present on the receipt.
3. Rigorously evaluate EVERY item against the Primary User AND ALL Family Members:
   - "Harmful": The item contains an allergen matching ANY family member or user (e.g. peanuts, dairy, gluten, eggs, soy, tree nuts, shellfish, fish, sesame, mustard), or violates a critical Medical Condition (e.g. high sugar / sodas / sweets for Diabetes; high sodium for Hypertension; trans fats for High Cholesterol), or violates strict Dietary Preference (e.g. non-veg/meat/gelatin for Vegetarian/Vegan).
   - "Caution": The item is highly ultra-processed or high in saturated fats/added sugars.
   - "Safe": The item is nutritious, safe, and free from allergens/risks for all household members.
4. DETECT EXACTLY WHO IS AFFECTED:
   - For every Harmful or Caution item, identify in "affectedMembers" WHICH person(s) (e.g. "Ramesh (Father)", "Priya (Daughter)", or "You (Primary User)") is at risk, the specific trigger (e.g. "Peanuts Allergy" or "Diabetes - High Glycemic Sugar"), and clinical detail.
5. FAMILY-SAFE ALTERNATIVE RECOMMENDATIONS:
   - If an item is "Safe": Return "safeAlternatives": [] (no recommendations needed for safe items).
   - ONLY if an item is "Harmful" or "Caution": Provide 1 to 2 concise healthy alternatives that are 100% SAFE FOR ALL FAMILY MEMBERS.

Return ONLY a valid JSON object strictly matching this schema:

{
  "storeName": "Store name (e.g. Supermarket)",
  "billDate": "25/08/2026",
  "totalAmount": 497.00,
  "currency": "₹",
  "summary": "Short 2-sentence summary of the household food safety evaluation",
  "overallSafety": "Harmful" | "Caution" | "Safe",
  "cartHealthScore": 70,
  "items": [
    {
      "name": "Product Name",
      "brand": "Brand name",
      "category": "Snacks | Dairy | Beverages | Grocery",
      "quantity": "1 pc",
      "price": 45.00,
      "status": "Harmful" | "Caution" | "Safe",
      "healthScore": 50,
      "riskReason": "Short clinical reason why item is harmful/caution for specific member(s)",
      "matchedAllergens": ["Peanuts"],
      "matchedConditions": ["Diabetes"],
      "affectedMembers": [
        {
          "name": "Ramesh",
          "relationship": "Father",
          "status": "Harmful",
          "trigger": "Peanuts Allergy",
          "clinicalDetail": "Contains roasted peanuts which triggers severe anaphylactic allergy."
        }
      ],
      "safeAlternatives": [
        {
          "name": "Family-Safe Healthy Alternative Name",
          "reason": "1-sentence reason why it is safe for all family members",
          "category": "Snacks",
          "healthScore": 88
        }
      ]
    }
  ]
}
`
}

/**
 * 1. Analyze with Google Gemini Vision
 */
async function analyzeBillWithGemini(base64Image, mimeType, prompt, apiKey) {
  const cleanKey = (apiKey || process.env.GEMINI_API_KEY || '').trim()
  if (!cleanKey || cleanKey.length < 15) throw new Error('No valid Gemini key')

  const candidateModels = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-pro']
  const genAI = new GoogleGenerativeAI(cleanKey)

  for (const modelName of candidateModels) {
    try {
      console.log(`🧾 Trying Gemini SDK Bill Vision model: ${modelName}...`)
      const model = genAI.getGenerativeModel({ model: modelName })
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimeType || 'image/jpeg'
        }
      }
      const result = await model.generateContent([prompt, imagePart])
      const responseText = await result.response.text()
      if (responseText && responseText.length > 20) {
        return parseBillJson(responseText)
      }
    } catch (err) {
      console.warn(`Gemini SDK ${modelName} error:`, err.message)
    }
  }

  throw new Error('Gemini Vision failed to analyze bill image.')
}

/**
 * 2. Fallback: Local PaddleOCR / Tesseract + Groq AI LLM analysis
 */
async function analyzeBillWithOcrAndGroq(filePath, prompt, rawTextFallback = '') {
  let ocrText = rawTextFallback

  if (!ocrText && filePath && fs.existsSync(filePath)) {
    // Try local Python PaddleOCR if available
    try {
      const scriptPath = path.join(__dirname, '../scripts/paddle_ocr.py')
      if (fs.existsSync(scriptPath)) {
        ocrText = await new Promise((resolve) => {
          exec(`python "${scriptPath}" "${filePath}"`, { timeout: 12000 }, (error, stdout) => {
            if (!error && stdout) {
              const match = stdout.match(/__OCR_JSON_OUT__(.*)/)
              if (match) {
                try {
                  const parsed = JSON.parse(match[1].trim())
                  return resolve(parsed.fullText || '')
                } catch (e) {
                  // ignore
                }
              }
            }
            resolve('')
          })
        })
      }
    } catch (e) {
      console.warn('PaddleOCR execution error:', e.message)
    }
  }

  // If no OCR text was extracted, raise clear user error instead of fake data
  if (!ocrText || ocrText.trim().length < 5) {
    throw new Error('Could not detect readable text from this receipt photo. Please capture a clear, well-lit photo of your grocery bill.')
  }

  console.log(`⚡ Analyzing OCR Receipt Text (${ocrText.length} chars) with Groq AI model for family safety...`)
  const groq = getGroqClient()
  const candidateModels = [
    'qwen/qwen3.6-27b',
    'openai/gpt-oss-120b',
    'groq/compound',
    'groq/compound-mini'
  ]

  const textAnalysisPrompt = `${prompt}\n\n=== EXTRACTED RECEIPT RAW OCR TEXT ===\n${ocrText}`

  for (const model of candidateModels) {
    try {
      console.log(`Trying Groq model for bill analysis: ${model}...`)
      const completionParams = {
        model,
        messages: [
          {
            role: 'system',
            content: 'You are Foodie AI, an elite household grocery receipt and food safety auditor. Extract all line items, evaluate harm vs user & family member health context, detect affected members, recommend family-safe alternatives, and return a single valid JSON object strictly matching the schema.'
          },
          {
            role: 'user',
            content: textAnalysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 8000
      }

      if (model.includes('llama')) {
        completionParams.response_format = { type: 'json_object' }
      }

      const completion = await groq.chat.completions.create(completionParams)

      const textOut = completion.choices[0]?.message?.content
      if (textOut) {
        const parsed = parseBillJson(textOut)
        parsed.rawOcrText = ocrText
        return parsed
      }
    } catch (groqErr) {
      console.warn(`Groq model ${model} failed for bill:`, groqErr.message)
    }
  }

  throw new Error('Groq AI could not process receipt text.')
}

/**
 * Controller: Analyze Bill Image, Compare with User & Family Members, Suggest Alternatives, and Auto-Save to MongoDB
 * POST /api/bills/analyze
 */
async function analyzeAndSaveBill(req, res) {
  let tempFilePath = null

  try {
    if (!req.file && !req.body.image && !req.body.rawText) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a grocery bill / receipt image or provide receipt text.'
      })
    }

    let base64Image = ''
    let mimeType = 'image/jpeg'

    if (req.file) {
      tempFilePath = req.file.path
      mimeType = req.file.mimetype || 'image/jpeg'
      const fileBuffer = fs.readFileSync(tempFilePath)
      base64Image = fileBuffer.toString('base64')
    } else if (req.body.image) {
      base64Image = req.body.image.includes(',') ? req.body.image.split(',')[1] : req.body.image
      mimeType = req.body.mimeType || 'image/jpeg'
    }

    // Parse user profile and prescriptions from request
    let userProfile = {}
    if (req.body.userProfile) {
      try {
        userProfile = typeof req.body.userProfile === 'string' 
          ? JSON.parse(req.body.userProfile) 
          : req.body.userProfile
      } catch (e) {
        userProfile = {}
      }
    }

    let prescriptionInfo = []
    if (req.body.prescriptionInfo) {
      try {
        prescriptionInfo = typeof req.body.prescriptionInfo === 'string'
          ? JSON.parse(req.body.prescriptionInfo)
          : req.body.prescriptionInfo
      } catch (e) {
        prescriptionInfo = []
      }
    }

    // Fetch family members from request body or MongoDB
    let familyMembers = []
    if (req.body.familyMembers) {
      try {
        familyMembers = typeof req.body.familyMembers === 'string'
          ? JSON.parse(req.body.familyMembers)
          : req.body.familyMembers
      } catch (e) {
        familyMembers = []
      }
    }

    const userId = req.user?._id ? String(req.user._id) : (req.userId || 'guest_user')

    // If familyMembers is empty, check MongoDB
    if (!familyMembers || familyMembers.length === 0) {
      try {
        const FamilyMember = require('../models/FamilyMember')
        const dbMembers = await FamilyMember.find({ userId })
        if (dbMembers && dbMembers.length > 0) {
          familyMembers = dbMembers
        }
      } catch (e) {
        // non-blocking
      }
    }

    console.log(`👨‍👩‍👧‍👦 Analyzing bill for User + ${familyMembers.length} family members...`)

    const clientKey = req.headers['x-gemini-api-key'] || req.body?.geminiKey || null
    const prompt = buildBillPrompt(userProfile, prescriptionInfo, familyMembers)

    let billData = null

    // Attempt 1: Gemini Vision
    if (base64Image && (clientKey || process.env.GEMINI_API_KEY)) {
      try {
        billData = await analyzeBillWithGemini(base64Image, mimeType, prompt, clientKey)
      } catch (geminiErr) {
        console.warn('Gemini Bill Vision failed, falling back to OCR + Groq AI:', geminiErr.message)
      }
    }

    // Attempt 2: OCR + Groq AI
    if (!billData) {
      billData = await analyzeBillWithOcrAndGroq(tempFilePath, prompt, req.body.rawText || '')
    }

    if (!billData || !Array.isArray(billData.items)) {
      throw new Error('Failed to extract products from grocery bill.')
    }

    // Calculate Summary Counts
    let safeCount = 0
    let cautionCount = 0
    let harmfulCount = 0

    billData.items.forEach(item => {
      const status = (item.status || '').toLowerCase()
      if (status === 'harmful') harmfulCount++
      else if (status === 'caution') cautionCount++
      else safeCount++
    })

    const overallSafety = harmfulCount > 0 ? 'Harmful' : (cautionCount > 0 ? 'Caution' : 'Safe')

    // ─────────────────────────────────────────────
    // AUTOMATICALLY SAVE TO MONGODB DATABASE!
    // ─────────────────────────────────────────────
    let savedBill = null
    try {
      const newBill = new Bill({
        userId,
        storeName: billData.storeName || 'Supermarket Store',
        billDate: billData.billDate || new Date().toLocaleDateString(),
        totalAmount: typeof billData.totalAmount === 'number' ? billData.totalAmount : parseFloat(billData.totalAmount) || 0,
        currency: billData.currency || '₹',
        overallSafety,
        cartHealthScore: typeof billData.cartHealthScore === 'number' ? billData.cartHealthScore : 72,
        summary: billData.summary || `Evaluated ${billData.items.length} items. ${harmfulCount} harmful, ${cautionCount} caution, ${safeCount} safe.`,
        items: billData.items,
        safeCount,
        cautionCount,
        harmfulCount,
        rawOcrText: billData.rawOcrText || ''
      })

      savedBill = await newBill.save()
      console.log(`✅ Bill automatically saved to MongoDB! ID: ${savedBill._id} (User: ${userId})`)
    } catch (dbErr) {
      console.warn('⚠️ Could not save bill to MongoDB, returning memory object:', dbErr.message)
      savedBill = {
        _id: `mem_bill_${Date.now()}`,
        userId,
        ...billData,
        overallSafety,
        safeCount,
        cautionCount,
        harmfulCount,
        createdAt: new Date()
      }
    }

    return res.status(200).json({
      success: true,
      data: savedBill
    })

  } catch (err) {
    console.error('❌ Error in analyzeAndSaveBill:', err.message)
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to analyze grocery bill.'
    })
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlink(tempFilePath, (err) => {
        if (err) console.warn('Could not delete temp bill file:', err.message)
      })
    }
  }
}

/**
 * Controller: Get All Saved Bills for User
 * GET /api/bills
 */
async function getUserBills(req, res) {
  try {
    const userId = req.user?._id ? String(req.user._id) : (req.userId || 'guest_user')
    const bills = await Bill.find({ userId }).sort({ createdAt: -1 }).limit(50)
    return res.json({ success: true, data: bills || [] })
  } catch (err) {
    console.error('Error fetching bills:', err.message)
    return res.status(500).json({ success: false, error: 'Failed to fetch saved bills.' })
  }
}

/**
 * Controller: Get Single Bill Details
 * GET /api/bills/:id
 */
async function getBillById(req, res) {
  try {
    const userId = req.user?._id ? String(req.user._id) : (req.userId || 'guest_user')
    const bill = await Bill.findOne({ _id: req.params.id, userId })
    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found.' })
    }
    return res.json({ success: true, data: bill })
  } catch (err) {
    console.error('Error fetching bill details:', err.message)
    return res.status(500).json({ success: false, error: 'Failed to fetch bill.' })
  }
}

/**
 * Controller: Delete Saved Bill
 * DELETE /api/bills/:id
 */
async function deleteBill(req, res) {
  try {
    const userId = req.user?._id ? String(req.user._id) : (req.userId || 'guest_user')
    const result = await Bill.findOneAndDelete({ _id: req.params.id, userId })
    if (!result) {
      return res.status(404).json({ success: false, error: 'Bill not found or unauthorized.' })
    }
    return res.json({ success: true, message: 'Bill deleted successfully.' })
  } catch (err) {
    console.error('Error deleting bill:', err.message)
    return res.status(500).json({ success: false, error: 'Failed to delete bill.' })
  }
}

module.exports = {
  analyzeAndSaveBill,
  getUserBills,
  getBillById,
  deleteBill
}
