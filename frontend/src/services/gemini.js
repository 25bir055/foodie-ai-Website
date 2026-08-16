import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY
let genAI = null

if (apiKey && apiKey !== 'your-gemini-key' && apiKey.startsWith('AIzaSy')) {
  genAI = new GoogleGenerativeAI(apiKey)
}

/**
 * Ask Gemini AI nutrition assistant for text insights
 */
export async function askGeminiAI(userQuestion, product = null) {
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      let prompt = `You are Foodie AI, an expert nutrition assistant. Give concise, helpful, friendly, and accurate nutrition advice formatted in clean markdown (using bolding, bullet points, etc.). Keep response under 150 words.`

      if (product) {
        prompt += `\nCurrently inspecting Product:\n- Name: ${product.name}\n- Brand: ${product.brand}\n- Category: ${product.category}\n- Health Score: ${product.healthScore}/100\n- Calories: ${product.calories} kcal\n- Protein: ${product.protein}g, Sugar: ${product.sugar}g, Fat: ${product.fat}g, Sodium: ${product.sodium}mg\n- Ingredients: ${product.ingredients?.join(', ')}\n- Allergens: ${product.allergens?.join(', ')}`
      }

      prompt += `\n\nUser Question: ${userQuestion}`

      const result = await model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local nutrition engine:', err.message)
    }
  }

  // Fallback Rule Engine if API key is not provided or fails
  return fallbackNutritionReply(userQuestion, product)
}

function fallbackNutritionReply(question, product) {
  const q = question.toLowerCase()

  if (q.includes('healthy') || q.includes('good') || q.includes('score')) {
    if (product)
      return `**${product.name}** scores **${product.healthScore}/100** on our health scale.\n\n${product.insight || 'This score considers sugar, saturated fat, sodium, fiber, and protein levels.'}`
    return 'Scan or open a product and I can score it out of 100 based on sugar, sodium, fibre, protein, and additive content.'
  }
  if (q.includes('sugar')) {
    if (product)
      return `**${product.name}** has **${product.sugar}g of sugar** per ${product.servingSize}.\n\nThe WHO recommends keeping added sugar under about **25g/day** for an adult — this uses ${Math.round((product.sugar / 25) * 100)}% of that budget in one serving.`
    return 'Most health bodies recommend keeping added sugar under roughly **25g a day** (≈6 teaspoons) for an adult.'
  }
  if (q.includes('protein')) {
    if (product)
      return `**${product.name}** provides **${product.protein}g of protein** per ${product.servingSize}.\n\nAn average adult needs about 50–60g protein per day. This product covers ${Math.round((product.protein / 55) * 100)}% of that baseline.`
    return 'Protein needs vary by person — roughly **0.8–1.2g per kg of body weight** is a good general target.'
  }
  if (q.includes('allerg')) {
    if (product)
      return product.allergens?.length
        ? `⚠️ **${product.name}** contains: **${product.allergens.join(', ')}**.`
        : `✅ **${product.name}** doesn't list any of the common allergens I track (milk, nuts, soy, gluten, eggs).`
    return 'Open a product and I\'ll check it against **milk, nuts, soy, gluten and eggs**.'
  }

  return product
    ? `Looking at **${product.name}** (${product.calories} kcal, ${product.healthScore}/100 health score). Ask me about its sugar, protein, sodium, allergens, or healthy alternatives!`
    : "I'm Foodie AI 🌿 Ask me about food health scores, sugar limits, allergen checks, or nutrition advice."
}
