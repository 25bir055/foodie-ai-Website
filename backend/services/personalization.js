/**
 * personalization.js
 * 
 * Rules engine to calculate personalized health scores
 * based on user dietary preferences, allergies, and health goals.
 */

function calculatePersonalizedScore(product, userProfile, baseScore) {
  let score = baseScore
  let insights = []
  
  if (!userProfile) return { score, insights }

  const calories = Number(product.calories) || 0
  const sugar = Number(product.sugar) || 0
  const fat = Number(product.fat) || 0
  const protein = Number(product.protein) || 0
  const sodium = Number(product.sodium) || 0
  const fiber = Number(product.fiber) || 0

  const ingredientsText = (Array.isArray(product.ingredients) 
    ? product.ingredients.join(' ') 
    : (product.ingredients || '')).toLowerCase()

  const goals = userProfile.goals || []
  const allergies = userProfile.allergies || []
  const dietary = userProfile.dietaryPreferences || []

  // --- 1. ALLERGIES (CRITICAL) ---
  const hasAllergy = allergies.some(allergy => {
    const a = allergy.toLowerCase()
    if (a === 'nuts' && (ingredientsText.includes('peanut') || ingredientsText.includes('nut') || ingredientsText.includes('almond') || ingredientsText.includes('cashew'))) return true
    if (a === 'dairy' && (ingredientsText.includes('milk') || ingredientsText.includes('cheese') || ingredientsText.includes('butter') || ingredientsText.includes('whey'))) return true
    if (a === 'gluten' && (ingredientsText.includes('wheat') || ingredientsText.includes('barley') || ingredientsText.includes('rye') || ingredientsText.includes('malt'))) return true
    if (a === 'soy' && ingredientsText.includes('soy')) return true
    if (a === 'eggs' && (ingredientsText.includes('egg') || ingredientsText.includes('albumen'))) return true
    return ingredientsText.includes(a)
  })

  if (hasAllergy) {
    return {
      score: 0,
      insights: ['⚠️ DANGER: Contains ingredients you are allergic to!']
    }
  }

  // --- 2. HEALTH GOALS ---
  
  // Weight Loss
  if (goals.includes('Weight loss')) {
    if (calories > 400) {
      score -= 20
      insights.push('🔴 Very high in calories (Not ideal for weight loss)')
    } else if (calories < 150 && calories > 0) {
      score += 5
      insights.push('🟢 Low calorie (Good for weight loss)')
    }
    
    if (sugar > 15) {
      score -= 15
      insights.push('🔴 High sugar (Avoid for weight loss)')
    }
  }

  // Muscle Gain
  if (goals.includes('Muscle gain')) {
    if (protein >= 15) {
      score += 20
      insights.push('🟢 Excellent protein source for muscle gain!')
    } else if (protein >= 8) {
      score += 10
      insights.push('🟢 Good amount of protein')
    }
  }

  // --- 2. MEDICAL CONDITIONS ---
  const medical = userProfile.medicalConditions || []

  // Diabetes
  if (medical.includes('Diabetes') || goals.includes('Blood sugar control') || goals.includes('Diabetic')) {
    if (sugar > 10) {
      score -= 30
      insights.push('🔴 High sugar content (Dangerous for Diabetes/Blood Sugar)')
    } else if (fiber >= 5) {
      score += 10
      insights.push('🟢 High fiber helps stabilize blood sugar')
    }
  }

  // Hypertension (High Blood Pressure)
  if (medical.includes('Hypertension (High Blood Pressure)')) {
    if (sodium > 400) {
      score -= 30
      insights.push('🔴 High sodium (Dangerous for High Blood Pressure)')
    } else {
      score += 5
      insights.push('🟢 Low sodium')
    }
  }

  // High Cholesterol
  if (medical.includes('High Cholesterol')) {
    const saturatedFat = Number(product.saturatedFat) || 0
    if (saturatedFat > 3) {
      score -= 25
      insights.push('🔴 High saturated fat (Bad for Cholesterol)')
    }
  }

  // Thyroid
  if (medical.includes('Thyroid')) {
    if (ingredientsText.includes('soy')) {
      score -= 10
      insights.push('🔴 Contains soy (May interfere with Thyroid medication)')
    }
  }

  // --- 3. HEALTH GOALS ---
  if (goals.includes('Heart health')) {
    if (sodium > 500) {
      score -= 20
      insights.push('🔴 Very high sodium (Bad for heart health)')
    }
    if (fat > 20) {
      score -= 15
      insights.push('🔴 High total fat content')
    }
  }

  // --- 3. DIETARY PREFERENCES ---
  if (dietary.includes('Vegan')) {
    const hasAnimal = ['milk', 'cheese', 'butter', 'whey', 'egg', 'meat', 'chicken', 'beef', 'pork', 'fish', 'honey']
      .some(word => ingredientsText.includes(word))
    
    if (hasAnimal) {
      score -= 40
      insights.push('🔴 Contains animal products (Not Vegan)')
    } else {
      insights.push('🟢 Vegan friendly')
    }
  }

  if (dietary.includes('Keto')) {
    if (carbohydrates > 10) {
      score -= 30
      insights.push('🔴 High carbs (Not Keto friendly)')
    } else {
      score += 10
      insights.push('🟢 Low carb (Keto friendly)')
    }
  }

  // Clamp final score
  score = Math.max(0, Math.min(100, Math.round(score)))

  if (insights.length === 0) {
    insights.push(score >= 70 ? '🟢 Generally healthy fit for your profile' : '🟡 Moderate fit for your profile')
  }

  return { score, insights }
}

module.exports = {
  calculatePersonalizedScore
}
