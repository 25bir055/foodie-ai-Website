const express = require('express')
const router = express.Router()
const Groq = require('groq-sdk')
const Prescription = require('../models/Prescription')
const { optionalAuth } = require('../middleware/auth')

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL DICTIONARY FOR PRECISE LOCAL OCR PARSING (RULE-BASED ENGINE)
// ─────────────────────────────────────────────────────────────────────────────
const KNOWN_MEDS_DB = [
  // Diabetes
  { name: 'Metformin', regex: /\b(metformin|glycomet|glumet|obimet)\b/i, purpose: 'Type 2 Diabetes / Blood Glucose Control', condition: 'Type 2 Diabetes', nutrientLimit: 'High Added Sugar', avoid: 'Sweets, Sugary Beverages & Refined Carbohydrates', interaction: 'Avoid high glycemic sugars that directly counteract Metformin.' },
  { name: 'Glimepiride', regex: /\b(glimepiride|amaryl|zoryl|gp)\b/i, purpose: 'Blood Sugar Reduction (Sulfonylurea)', condition: 'Type 2 Diabetes', nutrientLimit: 'High Added Sugar', avoid: 'Sweets & Sugary Foods', interaction: 'Monitor carbohydrate intake to prevent severe hypoglycemia.' },
  { name: 'Gliclazide', regex: /\b(gliclazide|diamicron|glyciphage)\b/i, purpose: 'Blood Sugar Regulation', condition: 'Type 2 Diabetes', nutrientLimit: 'High Added Sugar', avoid: 'Confectioneries & Soft Drinks', interaction: 'Maintain steady meals; avoid high sugar spikes.' },
  { name: 'Insulin', regex: /\b(insulin|lantus|humalog|novorapid|mixtard)\b/i, purpose: 'Glycemic Regulation (Insulin Therapy)', condition: 'Diabetes Mellitus', nutrientLimit: 'High Added Sugar', avoid: 'Simple Sugars & Candies', interaction: 'High sugar foods trigger erratic glucose levels.' },
  { name: 'Vildagliptin', regex: /\b(vildagliptin|galvus|jalra)\b/i, purpose: 'DPP-4 Inhibitor for Blood Sugar', condition: 'Type 2 Diabetes', nutrientLimit: 'High Added Sugar', avoid: 'High Glycemic Foods', interaction: 'Limit processed sugars.' },
  { name: 'Dapagliflozin', regex: /\b(dapagliflozin|forxiga|dapa)\b/i, purpose: 'SGLT2 Inhibitor for Diabetes & Heart', condition: 'Type 2 Diabetes', nutrientLimit: 'High Added Sugar', avoid: 'Excess Carbohydrates', interaction: 'Stay well-hydrated; limit refined sugar.' },

  // Blood Pressure / Hypertension
  { name: 'Telmisartan', regex: /\b(telmisartan|telma|telsar|telpres)\b/i, purpose: 'Blood Pressure (Hypertension) Reduction', condition: 'Hypertension (High BP)', nutrientLimit: 'High Sodium / Salt', avoid: 'Pickles, Salted Namkeens & Instant Foods', interaction: 'High sodium causes fluid retention and blunts Telmisartan efficacy.' },
  { name: 'Amlodipine', regex: /\b(amlodipine|stamlo|amlong|amlo)\b/i, purpose: 'Calcium Channel Blocker for Blood Pressure', condition: 'Hypertension (High BP)', nutrientLimit: 'High Sodium / Salt', avoid: 'High Salt Foods & Grapefruit', interaction: 'Avoid excessive sodium and grapefruit juice.' },
  { name: 'Losartan', regex: /\b(losartan|losar|cozaar)\b/i, purpose: 'Blood Pressure Control', condition: 'Hypertension (High BP)', nutrientLimit: 'High Sodium / Salt', avoid: 'Excess Salt & Processed Meats', interaction: 'Limit sodium intake strictly.' },
  { name: 'Atenolol', regex: /\b(atenolol|betacard|aten)\b/i, purpose: 'Beta-Blocker for Heart Rate & BP', condition: 'Hypertension / Cardiac', nutrientLimit: 'High Sodium / Salt', avoid: 'Salty Snacks & Excessive Caffeine', interaction: 'Avoid excess stimulants and high sodium.' },
  { name: 'Metoprolol', regex: /\b(metoprolol|betaloc|met-xl)\b/i, purpose: 'Beta-Blocker for Heart & BP', condition: 'Hypertension / Angina', nutrientLimit: 'High Sodium / Salt', avoid: 'Salted Foods & Energy Drinks', interaction: 'Reduce sodium to assist cardiac workload.' },

  // Cholesterol / Statins
  { name: 'Atorvastatin', regex: /\b(atorvastatin|atorva|lipitor|atorlip)\b/i, purpose: 'LDL Cholesterol Reduction & Heart Protection', condition: 'High Cholesterol (Dyslipidemia)', nutrientLimit: 'Saturated & Trans Fats', avoid: 'Grapefruit, Palm Oil & Deep Fried Foods', interaction: 'Do NOT consume Grapefruit with Atorvastatin (causes severe drug accumulation).' },
  { name: 'Rosuvastatin', regex: /\b(rosuvastatin|rosuvas|rozavel|crestor)\b/i, purpose: 'Statin Therapy for Cholesterol', condition: 'High Cholesterol', nutrientLimit: 'Saturated & Trans Fats', avoid: 'Hydrogenated Vanaspati Fats & Fried Foods', interaction: 'Limit saturated fats to enhance lipid lowering.' },

  // Pain / Fever
  { name: 'Paracetamol', regex: /\b(paracetamol|dolo|calpol|crocin|pcm|acetaminophen)\b/i, purpose: 'Analgesic & Antipyretic (Fever & Pain Relief)', condition: 'Fever / Body Ache / Pain', nutrientLimit: 'Excess Alcohol', avoid: 'Alcoholic Beverages', interaction: 'Do not consume with alcohol to prevent hepatic stress.' },
  { name: 'Ibuprofen', regex: /\b(ibuprofen|brufen|combiflam)\b/i, purpose: 'Anti-Inflammatory & Pain Relief (NSAID)', condition: 'Pain / Inflammation', nutrientLimit: 'Acidic & Spicy Foods', avoid: 'Empty stomach intake, High Spices', interaction: 'Take after meals to protect gastric mucosa.' },
  { name: 'Aceclofenac', regex: /\b(aceclofenac|hifenac|zerodol)\b/i, purpose: 'Joint & Muscle Pain Relief (NSAID)', condition: 'Musculoskeletal Pain', nutrientLimit: 'Extreme Spices', avoid: 'Heavy Chili & Acidic Drinks', interaction: 'Consume after food to avoid gastritis.' },

  // Antibiotics
  { name: 'Amoxicillin', regex: /\b(amoxicillin|augmentin|mox|novamox|amoxyclav)\b/i, purpose: 'Broad-Spectrum Antibiotic for Infections', condition: 'Bacterial Infection', nutrientLimit: 'Excess Calcium / Antacids', avoid: 'Unbalanced meals', interaction: 'Complete entire prescribed course; drink ample water.' },
  { name: 'Azithromycin', regex: /\b(azithromycin|azithral|zithrox|azee)\b/i, purpose: 'Macrolide Antibiotic (Respiratory/ENT)', condition: 'Bacterial Infection', nutrientLimit: 'Heavy Dairy near dose', avoid: 'Consuming directly with antacids', interaction: 'Space antacids by 2 hours.' },
  { name: 'Ciprofloxacin', regex: /\b(ciprofloxacin|cifran|cipro|ciro)\b/i, purpose: 'Fluoroquinolone Antibiotic', condition: 'Infection (Urinary / GI / Respiratory)', nutrientLimit: 'High Calcium / Milk', avoid: 'Dairy / Fortified Calcium at dose time', interaction: 'Calcium chelates with Ciprofloxacin; space dairy by 2 hours.' },
  { name: 'Doxycycline', regex: /\b(doxycycline|doxy|doxyl)\b/i, purpose: 'Tetracycline Antibiotic', condition: 'Bacterial Infection / Acne', nutrientLimit: 'High Calcium / Iron', avoid: 'Milk, Cheese & Iron Supplements at dose time', interaction: 'Avoid taking with milk/dairy as calcium blocks absorption.' },

  // Acidity / GERD
  { name: 'Pantoprazole', regex: /\b(pantoprazole|pan|pantocid|pan-d|pantosec)\b/i, purpose: 'Proton Pump Inhibitor for Acidity & GERD', condition: 'Gastritis / Acid Reflux (GERD)', nutrientLimit: 'Spices & High Acid', avoid: 'Deep Fried Foods, Chili & Carbonated Drinks', interaction: 'Take in the morning on an empty stomach; avoid spicy triggers.' },
  { name: 'Omeprazole', regex: /\b(omeprazole|omez|omiz)\b/i, purpose: 'Antacid for Gastric Ulcer & Reflux', condition: 'Gastric Hyperacidity / GERD', nutrientLimit: 'Excess Caffeine & Spices', avoid: 'Spicy Masalas & Citrus on empty stomach', interaction: 'Take 30 minutes before breakfast.' },
  { name: 'Rabeprazole', regex: /\b(rabeprazole|rabep|razo|happi)\b/i, purpose: 'Acid Suppression & Gastroprotection', condition: 'Acid Peptic Disease', nutrientLimit: 'Deep-Fried Trans Fats', avoid: 'Late night heavy meals & Chili', interaction: 'Limit gastric irritants.' },

  // Allergy / Respiratory
  { name: 'Cetirizine', regex: /\b(cetirizine|cetzine|zyrtec|okacet)\b/i, purpose: 'Antihistamine for Allergy & Cold', condition: 'Allergic Rhinitis / Cold', nutrientLimit: 'Alcohol / Sedatives', avoid: 'Chilled / Allergenic Foods', interaction: 'May cause mild drowsiness; stay hydrated.' },
  { name: 'Levocetirizine', regex: /\b(levocetirizine|levocet|montair-lc|telekast)\b/i, purpose: 'Allergy & Bronchial Relief', condition: 'Allergy / Asthma / Rhinitis', nutrientLimit: 'Cold Irritants', avoid: 'Ice-cold beverages & dust triggers', interaction: 'Take preferably at night.' },
  { name: 'Montelukast', regex: /\b(montelukast|montair|singulair)\b/i, purpose: 'Leukotriene Receptor Antagonist (Asthma/Allergy)', condition: 'Bronchial Asthma / Allergy', nutrientLimit: 'Preservatives / Sulfites', avoid: 'Processed foods with heavy sulfites', interaction: 'Maintain consistent daily timing.' },

  // Thyroid
  { name: 'Thyroxine', regex: /\b(thyronorm|eltroxin|thyroxine|levothyroxine)\b/i, purpose: 'Thyroid Hormone Replacement', condition: 'Hypothyroidism', nutrientLimit: 'Unfermented Soy & Calcium', avoid: 'Soy Protein & High Calcium near dose', interaction: 'Take early morning fasting with water; space breakfast/coffee by 45 mins.' }
]

function parseMedicalTextLocally(ocrText) {
  if (!ocrText || typeof ocrText !== 'string') {
    return {
      doctorName: 'Not specified',
      clinicName: 'Not specified',
      patientName: 'Self',
      prescriptionDate: new Date().toISOString().split('T')[0],
      ocrText: '',
      detectedConditions: [],
      restrictedNutrients: [],
      avoidFoods: [],
      medicines: [],
      aiExplanation: 'No readable text was detected from this image. Please upload a clearer photo of the prescription.',
      foodInteractions: []
    }
  }

  const lines = ocrText.split('\n').map(l => l.trim()).filter(Boolean)
  const fullText = ocrText.toLowerCase()

  // 1. Doctor & Clinic Extraction
  let doctorName = 'Not specified'
  let clinicName = 'Not specified'
  let prescriptionDate = new Date().toISOString().split('T')[0]

  lines.forEach(line => {
    if (/\b(dr\.?|doctor)\b/i.test(line) && doctorName === 'Not specified') {
      doctorName = line
    }
    if (/\b(hospital|clinic|center|centre|dispensary|health|care)\b/i.test(line) && clinicName === 'Not specified') {
      clinicName = line
    }
    const dateMatch = line.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/)
    if (dateMatch) {
      prescriptionDate = dateMatch[0]
    }
  })

  // 2. Identify medicines present in the OCR text
  const detectedMedicines = []
  const detectedConditions = new Set()
  const restrictedNutrients = new Set()
  const avoidFoods = new Set()
  const foodInteractions = new Set()

  KNOWN_MEDS_DB.forEach(item => {
    if (item.regex.test(fullText)) {
      // Find exact dosage or timing from nearby text
      let dosage = 'As directed'
      let frequency = '1-0-1'
      let timing = 'After food'

      const matchedLine = lines.find(l => item.regex.test(l)) || ''
      const doseMatch = matchedLine.match(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|iu)\b/i)
      if (doseMatch) dosage = doseMatch[0]

      const freqMatch = matchedLine.match(/\b([01]-[01]-[01]|[01]\s*x\s*[123]|once daily|twice daily|tds|sos|bd|od)\b/i)
      if (freqMatch) frequency = freqMatch[0].toUpperCase()

      if (/before food|empty stomach|ac\b/i.test(matchedLine)) timing = 'Before food / Empty stomach'
      if (/night|bedtime|hs\b/i.test(matchedLine)) timing = 'At bedtime / Night'

      detectedMedicines.push({
        name: item.name,
        dosage,
        frequency,
        purpose: item.purpose,
        timing
      })

      if (item.condition) detectedConditions.add(item.condition)
      if (item.nutrientLimit) restrictedNutrients.add(item.nutrientLimit)
      if (item.avoid) avoidFoods.add(item.avoid)
      if (item.interaction) foodInteractions.add(item.interaction)
    }
  })

  // If no known medicines matched, try finding generic prescription lines
  if (detectedMedicines.length === 0) {
    lines.forEach(line => {
      if (/\b(tab|cap|syr|inj|tablet|capsule|mg)\b/i.test(line)) {
        const words = line.split(/\s+/)
        if (words.length >= 2) {
          detectedMedicines.push({
            name: line.slice(0, 40),
            dosage: 'As printed on slip',
            frequency: 'As directed by physician',
            purpose: 'Prescribed Therapy',
            timing: 'Follow doctor advice'
          })
        }
      }
    })
  }

  let aiExplanation = ''
  if (detectedMedicines.length > 0) {
    const medNames = detectedMedicines.map(m => m.name).join(', ')
    const condList = Array.from(detectedConditions).join(', ') || 'general medical management'
    aiExplanation = `Prescription OCR identified medications (${medNames}) aimed at managing ${condList}. Foodie AI will monitor grocery scans to ensure food choices do not interfere with these treatments.`
  } else {
    aiExplanation = `Prescription OCR completed. Read ${lines.length} lines of text from your uploaded image, but specific pharmaceutical names could not be verified with 100% confidence. Please review the extracted text.`
  }

  return {
    doctorName,
    clinicName,
    patientName: 'Self',
    prescriptionDate,
    ocrText,
    detectedConditions: Array.from(detectedConditions),
    restrictedNutrients: Array.from(restrictedNutrients),
    avoidFoods: Array.from(avoidFoods),
    medicines: detectedMedicines,
    aiExplanation,
    foodInteractions: Array.from(foodInteractions)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/prescription/analyze-ocr - Real-time AI Medical OCR Parser
// ─────────────────────────────────────────────────────────────────────────────
router.post('/analyze-ocr', optionalAuth, async (req, res) => {
  try {
    const { ocrText, fileUrl } = req.body

    if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length < 3) {
      return res.json({
        doctorName: 'Not detected',
        clinicName: 'Not detected',
        patientName: 'Self',
        prescriptionDate: new Date().toISOString().split('T')[0],
        ocrText: ocrText || '',
        detectedConditions: [],
        restrictedNutrients: [],
        avoidFoods: [],
        medicines: [],
        aiExplanation: 'No readable text was detected from this image. Please upload a clear, well-lit photo of your prescription.',
        foodInteractions: [],
        fileUrl: fileUrl || ''
      })
    }

    const groqKey = process.env.GROQ_API_KEY
    if (groqKey && groqKey.trim().length > 10) {
      const groq = new Groq({ apiKey: groqKey.trim() })

      const prompt = `You are a clinical pharmacologist and medical AI assistant for Foodie AI.
Analyze the following RAW OCR TEXT extracted directly from a user's uploaded medical prescription image:

--- RAW OCR TEXT START ---
${ocrText}
--- RAW OCR TEXT END ---

Instructions:
1. Extract the EXACT doctor name, clinic/hospital name, patient name, and prescription date present in the OCR text. If not present, use "Not specified".
2. Extract ALL prescribed medicines/drugs actually present or recognized in the OCR text. For each medicine, extract:
   - name: Exact medicine name (e.g. Paracetamol, Metformin, Amoxicillin, Pantoprazole, Amlodipine, Cetirizine, etc.)
   - dosage: Dosage mentioned (e.g. 500mg, 10mg, 1 tab) or "As directed"
   - frequency: Timing/frequency (e.g. 1-0-1, Twice daily, Once daily, TDS, SOS)
   - purpose: What this specific medicine is prescribed for (e.g. Fever/Pain, Diabetes, Blood Pressure, Bacterial Infection, Acidity, Allergy)
   - timing: Before food / After food / Bedtime
3. Identify the diagnosed or inferred Medical Conditions based STRICTLY on the extracted medicines and text (e.g. "Type 2 Diabetes", "Hypertension", "Bacterial Infection", "Acid Reflux / Gastritis", "Allergic Rhinitis").
4. Determine Restricted Nutrients to avoid or limit based strictly on these conditions/medicines (e.g. "High Added Sugar", "High Sodium / Salt", "Saturated Fat").
5. Determine Specific Foods to Avoid (e.g. "Sweets and sugary drinks for Diabetes", "High salt snacks for BP", "Grapefruit with Statins", "Dairy with Antibiotics").
6. Provide a concise, clear clinical explanation of what this prescription is treating.
7. Provide actionable Food & Drug Interaction warnings for these exact medicines.

CRITICAL RULE:
- Do NOT output generic placeholder medicines. Only extract what is present or reasonable to identify from the OCR text.
- If the OCR text does not contain any medicines, return empty medicines array [] and explain that no clear medications were found.

Output ONLY a valid JSON object matching this schema:
{
  "doctorName": "Doctor name or Not specified",
  "clinicName": "Clinic or Hospital or Not specified",
  "patientName": "Patient name or Self",
  "prescriptionDate": "YYYY-MM-DD or date from text",
  "ocrText": "The raw OCR text",
  "detectedConditions": ["Condition 1", "Condition 2"],
  "restrictedNutrients": ["Nutrient 1", "Nutrient 2"],
  "avoidFoods": ["Food 1", "Food 2"],
  "medicines": [
    {
      "name": "Medicine Name",
      "dosage": "Dosage",
      "frequency": "Frequency",
      "purpose": "Medical Purpose",
      "timing": "Timing"
    }
  ],
  "aiExplanation": "Clinical explanation of the prescription.",
  "foodInteractions": ["Warning 1", "Warning 2"]
}`

      try {
        const completion = await groq.chat.completions.create({
          model: 'qwen/qwen3.6-27b',
          messages: [
            {
              role: 'system',
              content: 'You are a medical OCR parser. You output ONLY valid JSON without markdown wrapping or commentary.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1500
        })

        const replyContent = completion.choices[0]?.message?.content || ''
        let cleaned = replyContent.trim()
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '')
        else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '')

        const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          return res.json({
            ...parsed,
            ocrText,
            fileUrl: fileUrl || ''
          })
        }
      } catch (groqErr) {
        console.error('Groq OCR parsing error, using rule-based parser:', groqErr.message)
      }
    }

    // Fallback: Rule-based Medical Extraction on actual OCR Text
    const ruleBased = parseMedicalTextLocally(ocrText)
    res.json({
      ...ruleBased,
      fileUrl: fileUrl || ''
    })
  } catch (err) {
    console.error('Prescription OCR analyze error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/prescription or /api/prescriptions - Get all prescriptions
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const query = req.user ? { userId: req.user._id } : {}
    const prescriptions = await Prescription.find(query).sort({ createdAt: -1 }).limit(20)
    res.json(prescriptions)
  } catch (err) {
    console.error('Prescription fetch error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/prescription or /api/prescriptions - Save a new prescription
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      fileUrl,
      ocrText,
      doctorName,
      clinicName,
      patientName,
      prescriptionDate,
      detectedConditions,
      restrictedNutrients,
      avoidFoods,
      medicines,
      aiExplanation,
      foodInteractions
    } = req.body

    const newPrescription = new Prescription({
      userId: req.user?._id || null,
      fileUrl: fileUrl || '',
      ocrText: ocrText || '',
      doctorName: doctorName || '',
      clinicName: clinicName || '',
      patientName: patientName || '',
      prescriptionDate: prescriptionDate || new Date().toISOString().split('T')[0],
      detectedConditions: Array.isArray(detectedConditions) ? detectedConditions : [],
      restrictedNutrients: Array.isArray(restrictedNutrients) ? restrictedNutrients : [],
      avoidFoods: Array.isArray(avoidFoods) ? avoidFoods : [],
      medicines: Array.isArray(medicines) ? medicines : [],
      aiExplanation: aiExplanation || '',
      foodInteractions: Array.isArray(foodInteractions) ? foodInteractions : []
    })

    await newPrescription.save()
    res.status(201).json(newPrescription)
  } catch (err) {
    console.error('Prescription save error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/prescription/:id - Delete a prescription
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const query = req.user ? { _id: req.params.id, userId: req.user._id } : { _id: req.params.id }
    const result = await Prescription.findOneAndDelete(query)
    if (!result) return res.status(404).json({ error: 'Prescription not found' })
    res.json({ message: 'Prescription deleted successfully', id: req.params.id })
  } catch (err) {
    console.error('Prescription delete error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
