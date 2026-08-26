/**
 * Foodie AI - Prescription & Medical Safety Auditor
 * Cross-references scanned food products & grocery items against user prescriptions,
 * diagnosed conditions, and active medications.
 */

const normalizeText = (text) => {
  if (!text) return ''
  if (Array.isArray(text)) return text.join(' ').toLowerCase()
  return String(text).toLowerCase()
}

/**
 * Audit any product against user's active prescriptions list
 * @param {Object} product - Product object (name, brand, ingredients, nutrition, sugar, sodium, etc.)
 * @param {Array} prescriptions - Array of prescription objects from MongoDB / local storage
 * @returns {Object} Safety audit result with conflict breakdown, severity, and bilingual advice
 */
export function auditProductForPrescriptions(product, prescriptions = []) {
  try {
    if (!product || !Array.isArray(prescriptions) || prescriptions.length === 0) {
      return {
        hasConflict: false,
        overallStatus: 'Safe',
        conflictCount: 0,
        conflicts: [],
        safeNutrients: [],
        recommendation: 'No active prescription conflicts detected.',
        summary: 'All clear! No medications or health conditions in your active prescriptions conflict with this product.'
      }
    }

    const textToScan = [
      product.name || '',
      product.productName || '',
      product.brand || '',
      product.category || '',
      product.description || '',
      Array.isArray(product.ingredients) ? product.ingredients.join(' ') : (product.ingredients || ''),
      Array.isArray(product.allergens) ? product.allergens.join(' ') : (product.allergens || ''),
      Array.isArray(product.visibleText) ? product.visibleText.join(' ') : ''
    ].join(' ').toLowerCase()

    const nutrients = product.nutrition || product.nutrients || {}
    const sugars = parseFloat(nutrients.sugar || nutrients.sugars || product.sugar || 0)
    const sodium = parseFloat(nutrients.sodium || product.sodium || 0)
    const saturatedFat = parseFloat(nutrients.saturatedFat || nutrients.saturated_fat || product.saturatedFat || 0)
    const transFat = parseFloat(nutrients.transFat || nutrients.trans_fat || product.transFat || 0)

    const conflicts = []

    // 1. Gather all active medicines and conditions across all uploaded prescriptions
    const allMedicines = []
    const allConditions = []
    const allRestrictions = []
    const allAvoidFoods = []

    prescriptions.forEach(rx => {
      if (!rx) return
      if (Array.isArray(rx.medicines)) {
        rx.medicines.forEach(m => {
          if (m?.name) allMedicines.push(m)
        })
      }
      if (Array.isArray(rx.detectedConditions)) {
        rx.detectedConditions.forEach(c => c && allConditions.push(String(c).toLowerCase()))
      }
      if (Array.isArray(rx.restrictedNutrients)) {
        rx.restrictedNutrients.forEach(r => r && allRestrictions.push(String(r).toLowerCase()))
      }
      if (Array.isArray(rx.avoidFoods)) {
        rx.avoidFoods.forEach(a => a && allAvoidFoods.push(String(a).toLowerCase()))
      }
      if (rx.aiExplanation) {
        const lowerExp = rx.aiExplanation.toLowerCase()
        if (lowerExp.includes('diabetes') || lowerExp.includes('sugar')) allConditions.push('diabetes')
        if (lowerExp.includes('hypertension') || lowerExp.includes('blood pressure') || lowerExp.includes('high bp')) allConditions.push('hypertension')
        if (lowerExp.includes('cholesterol') || lowerExp.includes('lipid') || lowerExp.includes('heart')) allConditions.push('cholesterol')
        if (lowerExp.includes('thyroid')) allConditions.push('thyroid')
      }
    })

    const medNamesText = allMedicines.map(m => m.name?.toLowerCase() || '').join(' ')
    const condsText = allConditions.join(' ')
    const restrText = allRestrictions.join(' ')

    // ──────────────────────────────────────────────────────────────────────────
    // RULE 1: DIABETES / HIGH BLOOD SUGAR CONFLICT
    // ──────────────────────────────────────────────────────────────────────────
    const isDiabetesRx = 
      /metformin|glimepiride|gliclazide|insulin|dapagliflozin|sitagliptin|vildagliptin|pioglitazone|teneligliptin|empagliflozin|glipizide|rybelsus|semaglutide|glycomet|januvia|galvus|forxiga|amaryl|trajenta/i.test(medNamesText) ||
      /diabetes|sugar|glycemic|hyperglycemia|pre-diabetes/i.test(condsText) ||
      /sugar|glucose/i.test(restrText)

    if (isDiabetesRx) {
      const hasAddedSugarTerms = 
        /\b(sugar|glucose|fructose|sucrose|syrup|high fructose corn syrup|maltodextrin|dextrose|cane sugar|jaggery|caramel|invert sugar|malt syrup)\b/i.test(textToScan)
      
      const isHighSugar = sugars >= 8 || (sugars >= 4 && hasAddedSugarTerms) || hasAddedSugarTerms

      if (isHighSugar || sugars >= 5) {
        const severity = (sugars >= 10 || textToScan.includes('candy') || textToScan.includes('chocolate') || textToScan.includes('soda') || textToScan.includes('biscuit')) ? 'Danger' : 'Caution'
        const activeMeds = allMedicines.filter(m => /metformin|glimepiride|gliclazide|insulin|dapagliflozin|sitagliptin|vildagliptin|pioglitazone|teneligliptin|empagliflozin|glipizide|rybelsus|semaglutide|glycomet|januvia|galvus|forxiga|amaryl/i.test(m.name || '')).map(m => m.name).join(', ') || 'Diabetes Medication'

        conflicts.push({
          condition: 'Diabetes / Blood Sugar',
          medication: activeMeds,
          nutrientOrTrigger: sugars > 0 ? `Sugar (${sugars}g)` : 'Added Refined Sugars',
          severity,
          title: '🚨 High Sugar vs. Diabetes Prescription Conflict',
          detail: `This food contains elevated sugar levels (${sugars > 0 ? `${sugars}g` : 'refined sweeteners'}), which will cause rapid blood glucose spikes and directly counteracts your prescribed ${activeMeds}.`,
          tamilAdvice: `இந்த உணவில் அதிக சர்க்கரை (${sugars > 0 ? `${sugars}g` : 'இனிப்பு'}) உள்ளது. இது உங்கள் மருத்துவர் பரிந்துரைத்த ${activeMeds} சர்க்கரை மருந்துக்கு எதிரானது. இரத்த சர்க்கரை அளவை உயர்த்தும்!`,
          hindiAdvice: `इस उत्पाद में अधिक चीनी है जो आपकी सुगर की दवा (${activeMeds}) के प्रभाव को कम कर सकती है।`
        })
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RULE 2: HYPERTENSION / HIGH BLOOD PRESSURE (SODIUM / SALT CONFLICT)
    // ──────────────────────────────────────────────────────────────────────────
    const isHypertensionRx = 
      /amlodipine|telmisartan|losartan|olmesartan|enalapril|ramipril|atenolol|metoprolol|bisoprolol|hydrochlorothiazide|furosemide|nifedipine|nebivolol|torsemide|cilnidipine|telma|stamlo|cardace|betaloc|lasix|norvasc/i.test(medNamesText) ||
      /hypertension|blood pressure|high bp|hypertensive|cardiovascular/i.test(condsText) ||
      /sodium|salt/i.test(restrText)

    if (isHypertensionRx) {
      const hasHighSodiumTerms = /\b(salt|sodium|monosodium glutamate|msg|sodium benzoate|baking soda|brine|salted|sodium nitrate)\b/i.test(textToScan)
      const isHighSodium = sodium >= 300 || (hasHighSodiumTerms && (sodium >= 200 || textToScan.includes('chips') || textToScan.includes('pickle') || textToScan.includes('mixture') || textToScan.includes('namkeen') || textToScan.includes('instant noodle')))

      if (isHighSodium) {
        const severity = (sodium >= 500 || textToScan.includes('pickle') || textToScan.includes('salted chips') || textToScan.includes('instant noodle')) ? 'Danger' : 'Caution'
        const activeMeds = allMedicines.filter(m => /amlodipine|telmisartan|losartan|olmesartan|enalapril|ramipril|atenolol|metoprolol|bisoprolol|hydrochlorothiazide|furosemide|nifedipine|nebivolol|torsemide|cilnidipine|telma|stamlo|cardace|betaloc|lasix/i.test(m.name || '')).map(m => m.name).join(', ') || 'Blood Pressure Medication'

        conflicts.push({
          condition: 'Hypertension / High BP',
          medication: activeMeds,
          nutrientOrTrigger: sodium > 0 ? `Sodium (${sodium}mg)` : 'Excess Salt / Sodium',
          severity,
          title: '⚠️ High Sodium vs. Blood Pressure Medication',
          detail: `Contains high sodium content (${sodium > 0 ? `${sodium}mg` : 'elevated salt'}), which causes fluid retention and blunts the therapeutic effect of your prescribed ${activeMeds}.`,
          tamilAdvice: `இதில் அதிக உப்பு/சோடியம் (${sodium > 0 ? `${sodium}mg` : 'உப்பு'}) உள்ளது. இது உங்கள் இரத்த அழுத்த மருந்து (${activeMeds}) செயல்படுவதைத் தடுத்து BP-ஐ உயர்த்தும்!`,
          hindiAdvice: `इसमें नमक/सोडियम की मात्रा अधिक है जो आपकी बीपी की दवा (${activeMeds}) के असर को कम कर सकती है।`
        })
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RULE 3: STATINS / HIGH CHOLESTEROL & GRAPEFRUIT INTERACTION
    // ──────────────────────────────────────────────────────────────────────────
    const isStatinRx = 
      /atorvastatin|rosuvastatin|simvastatin|fenofibrate|ezetimibe|lipitor|crestor|atorva|rosuvas|rozavel/i.test(medNamesText) ||
      /cholesterol|lipid|hyperlipidemia|dyslipidemia/i.test(condsText)

    if (isStatinRx) {
      const hasGrapefruit = /\b(grapefruit|pummelo|pomelo)\b/i.test(textToScan)
      const hasHighFats = transFat > 0 || saturatedFat >= 4 || /\b(palm oil|hydrogenated vegetable oil|vanaspati|trans fat|lard)\b/i.test(textToScan)
      const activeMeds = allMedicines.filter(m => /atorvastatin|rosuvastatin|simvastatin|fenofibrate|ezetimibe|lipitor|crestor|atorva|rosuvas/i.test(m.name || '')).map(m => m.name).join(', ') || 'Statin / Cholesterol Med'

      if (hasGrapefruit) {
        conflicts.push({
          condition: 'Drug-Food Interaction (Statins)',
          medication: activeMeds,
          nutrientOrTrigger: 'Grapefruit / Pomelo',
          severity: 'Danger',
          title: '🚨 Severe Grapefruit-Statin Interaction Warning',
          detail: `Grapefruit inhibits the CYP3A4 enzyme, causing dangerous accumulation of ${activeMeds} in your bloodstream and increasing muscle breakdown (rhabdomyolysis) risk.`,
          tamilAdvice: `கிரேப்ஃபுரூட் (Grapefruit) உங்கள் கொலஸ்ட்ரால் மருந்துடன் (${activeMeds}) ஆபத்தான முறையில் வினைபுரியும்! தவிர்க்கவும்!`,
          hindiAdvice: `ग्रेपफ्रूट (Grapefruit) आपकी स्टेटिन कोलेस्ट्रॉल दवा (${activeMeds}) के साथ गंभीर दुष्प्रभाव कर सकता है।`
        })
      } else if (hasHighFats) {
        conflicts.push({
          condition: 'High Cholesterol / Heart Health',
          medication: activeMeds,
          nutrientOrTrigger: 'Saturated & Trans Fats',
          severity: 'Caution',
          title: '⚠️ Unhealthy Fats Counteract Cholesterol Treatment',
          detail: `Contains saturated / hydrogenated palm oils that raise LDL bad cholesterol, working against your prescribed ${activeMeds}.`,
          tamilAdvice: `இதில் உள்ள பாமாயில்/ஹைட்ரஜனேற்றப்பட்ட கொழுப்புகள் கெட்ட கொழுப்பை (LDL) அதிகரிக்கும். உங்கள் ${activeMeds} மருந்துக்கு எதிரானது!`,
          hindiAdvice: `इसमें मौजूद फैट्स आपके बैड कोलेस्ट्रॉल को बढ़ा सकते हैं जो आपकी दवा (${activeMeds}) के विपरीत है।`
        })
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RULE 4: THYROID (LEVOTHYROXINE) & SOY / CALCIUM BINDING
    // ──────────────────────────────────────────────────────────────────────────
    const isThyroidRx = /levothyroxine|thyroxine|eltroxin|thyronorm/i.test(medNamesText) || /thyroid|hypothyroidism/i.test(condsText)
    if (isThyroidRx) {
      const hasSoyOrBinding = /\b(soy|soya|soybean|edamame|soy protein|soya chunks|tofu)\b/i.test(textToScan)
      if (hasSoyOrBinding) {
        const activeMeds = allMedicines.filter(m => /levothyroxine|thyroxine|eltroxin|thyronorm/i.test(m.name || '')).map(m => m.name).join(', ') || 'Thyroid Medication'
        conflicts.push({
          condition: 'Thyroid Medication Absorption',
          medication: activeMeds,
          nutrientOrTrigger: 'Soybean / Soya Protein',
          severity: 'Caution',
          title: '⚠️ Soy Interferes with Thyroid Hormone Absorption',
          detail: `Unfermented soy compounds bind with ${activeMeds} in the gut, reducing blood absorption. Space consumption at least 4 hours away.`,
          tamilAdvice: `சோயா உணவுகள் உங்கள் தைராய்டு மருந்து (${activeMeds}) உறிஞ்சப்படுவதைத் தடுக்கும்! குறைந்தது 4 மணி நேரம் இடைவெளி தேவை!`,
          hindiAdvice: `सोयाबीन आपकी थायराइड दवा (${activeMeds}) के अवशोषण में बाधा डाल सकता है।`
        })
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RULE 5: ANTIBIOTICS & HIGH CALCIUM / DAIRY CHELATION
    // ──────────────────────────────────────────────────────────────────────────
    const isAntibioticRx = /ciprofloxacin|levofloxacin|ofloxacin|norfloxacin|doxycycline|tetracycline|minocycline|cipro|cifran|doxy/i.test(medNamesText)
    if (isAntibioticRx) {
      const hasHighDairy = /\b(milk|cheese|paneer|curd|yogurt|whey protein|calcium fortified)\b/i.test(textToScan)
      if (hasHighDairy) {
        const activeMeds = allMedicines.filter(m => /ciprofloxacin|levofloxacin|ofloxacin|norfloxacin|doxycycline|tetracycline|minocycline|cipro|cifran|doxy/i.test(m.name || '')).map(m => m.name).join(', ') || 'Antibiotic'
        conflicts.push({
          condition: 'Antibiotic-Calcium Chelation',
          medication: activeMeds,
          nutrientOrTrigger: 'High Calcium / Dairy',
          severity: 'Caution',
          title: '⚠️ Dairy / Calcium Reduces Antibiotic Potency',
          detail: `Calcium binds directly to ${activeMeds}, reducing its infection-fighting potency by up to 50%. Space dairy intake by at least 2 hours.`,
          tamilAdvice: `அதிக பால்/கால்சியம் உங்கள் ஆன்டிபயாடிக் (${activeMeds}) மருந்தை செயலற்றதாக்கும்! 2 மணி நேரம் இடைவெளி விடவும்!`,
          hindiAdvice: `डेयरी उत्पाद आपकी एंटीबायोटिक दवा (${activeMeds}) के असर को कम कर सकते हैं।`
        })
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RULE 6: GASTRITIS / ACID REFLUX (GERD / PPIs) & HIGH CHILI / ACID
    // ──────────────────────────────────────────────────────────────────────────
    const isGerdRx = /pantoprazole|omeprazole|rabeprazole|esomeprazole|ranitidine|famotidine|pan-d|pantocid|omez|nexpro/i.test(medNamesText) || /gerd|acid reflux|gastritis|acidity|ulcer/i.test(condsText)
    if (isGerdRx) {
      const hasSevereIrritants = /\b(chili|chilli|red pepper|caffeine|energy drink|extreme spicy|deep fried)\b/i.test(textToScan)
      if (hasSevereIrritants) {
        const activeMeds = allMedicines.filter(m => /pantoprazole|omeprazole|rabeprazole|esomeprazole|ranitidine|famotidine|pan-d|pantocid|omez/i.test(m.name || '')).map(m => m.name).join(', ') || 'Acidity / GERD Medication'
        conflicts.push({
          condition: 'Gastritis / Acid Reflux',
          medication: activeMeds,
          nutrientOrTrigger: 'Heavy Spices / Irritants',
          severity: 'Caution',
          title: '⚠️ High Spices & Acidity Triggers Gastric Irritation',
          detail: `Contains potent stomach irritants that aggravate acid reflux and counteract your prescribed ${activeMeds}.`,
          tamilAdvice: `அதிக காரம்/அமிலத்தன்மை உங்கள் வயிற்றுப்புண் மற்றும் ${activeMeds} அமில எதிர்ப்பு மருந்துக்கு நல்லதல்ல!`,
          hindiAdvice: `अत्यधिक तीखा भोजन आपकी एसिडिटी की दवा (${activeMeds}) के असर को बिगाड़ सकता है।`
        })
      }
    }

    const hasDanger = conflicts.some(c => c.severity === 'Danger')
    const hasCaution = conflicts.some(c => c.severity === 'Caution')

    return {
      hasConflict: conflicts.length > 0,
      overallStatus: hasDanger ? 'Danger' : (hasCaution ? 'Caution' : 'Safe'),
      conflictCount: conflicts.length,
      conflicts,
      recommendation: hasDanger
        ? '🚨 DO NOT CONSUME: This product poses severe direct conflicts with your doctor’s prescribed medications.'
        : (hasCaution
          ? '⚠️ USE WITH CAUTION: Contains nutrients that may reduce the efficacy of your active prescriptions.'
          : '✅ SAFE: No medication or medical condition conflicts found in your active prescriptions.'),
      summary: conflicts.length > 0
        ? `Found ${conflicts.length} prescription conflict(s): ${conflicts.map(c => `${c.condition} (${c.medication})`).join(', ')}.`
        : 'All clear with your active prescriptions.'
    }
  } catch (err) {
    console.error('Prescription audit error:', err)
    return {
      hasConflict: false,
      overallStatus: 'Safe',
      conflictCount: 0,
      conflicts: [],
      recommendation: 'Audit completed.',
      summary: 'No conflicts detected.'
    }
  }
}
