/**
 * USDA FoodData Central Official API Integration Service
 * Website: https://fdc.nal.usda.gov/
 */

export function getUsdaApiKey() {
  const customKey = typeof localStorage !== 'undefined' ? localStorage.getItem('foodie_usda_key') : null
  const envKey = import.meta.env.VITE_USDA_API_KEY
  const key = (customKey || envKey || 'DEMO_KEY').trim()
  return key
}

export function setUsdaApiKey(key) {
  if (key && key.trim()) {
    localStorage.setItem('foodie_usda_key', key.trim())
  } else {
    localStorage.removeItem('foodie_usda_key')
  }
}

/**
 * Calculate health score (0-100) from USDA nutrient breakdown
 */
function calculateUsdaHealthScore({ calories, sugar, fat, sodium, protein, fiber }) {
  let score = 75

  if (sugar > 20) score -= 22
  else if (sugar > 10) score -= 12
  else if (sugar <= 2) score += 6

  if (fat > 20) score -= 15
  else if (fat > 10) score -= 8

  if (sodium > 500) score -= 20
  else if (sodium > 250) score -= 10
  else if (sodium <= 100) score += 5

  if (protein >= 12) score += 15
  else if (protein >= 6) score += 8

  if (fiber >= 5) score += 12
  else if (fiber >= 2.5) score += 6

  return Math.max(15, Math.min(98, Math.round(score)))
}

/**
 * Search official USDA FoodData Central Database
 */
export async function searchUsdaFood(query) {
  if (!query || query.trim().length < 2) return []

  const apiKey = getUsdaApiKey()
  const cleanQuery = query.trim()

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(cleanQuery)}&pageSize=12`
    console.log(`🌐 Fetching from USDA FoodData Central API for: "${cleanQuery}"...`)
    
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`USDA API HTTP Error ${response.status}`)
      return []
    }

    const data = await response.json()
    if (!data.foods || !Array.isArray(data.foods)) return []

    return data.foods.map((item) => {
      const getNutrient = (nameOrId) => {
        const found = item.foodNutrients?.find((n) =>
          (n.nutrientName && n.nutrientName.toLowerCase().includes(String(nameOrId).toLowerCase())) ||
          n.nutrientId === nameOrId
        )
        return found ? parseFloat(found.value || 0) : 0
      }

      const calories = getNutrient('energy') || getNutrient(1008) || 120
      const protein = getNutrient('protein') || getNutrient(1003) || 3.0
      const fat = getNutrient('total lipid') || getNutrient(1004) || 2.0
      const carbs = getNutrient('carbohydrate') || getNutrient(1005) || 15.0
      const sugar = getNutrient('sugar') || getNutrient(2000) || 1.5
      const fiber = getNutrient('fiber') || getNutrient(1079) || 2.0
      const sodium = getNutrient('sodium') || getNutrient(1093) || 80

      const healthScore = calculateUsdaHealthScore({ calories, sugar, fat, sodium, protein, fiber })
      const nutriScore = healthScore >= 80 ? 'a' : healthScore >= 60 ? 'b' : healthScore >= 45 ? 'c' : 'd'
      const fdcId = item.fdcId || `usda_${Date.now()}`

      return {
        id: `usda_${fdcId}`,
        barcode: String(fdcId),
        name: item.description || cleanQuery,
        brand: item.brandOwner || item.dataType || 'USDA Food Database',
        category: item.foodCategory || 'USDA Certified Food',
        price: 50,
        healthScore,
        nutriScore,
        calories: Math.round(calories),
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        sugar: Math.round(sugar * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        saturatedFat: Math.round((fat * 0.3) * 10) / 10,
        fiber: Math.round(fiber * 10) / 10,
        sodium: Math.round(sodium),
        ingredients: item.ingredients ? item.ingredients.split(',').slice(0, 8) : ['USDA Standard Ingredients'],
        ingredientList: item.ingredients ? item.ingredients.split(',').slice(0, 8) : ['USDA Standard Ingredients'],
        allergens: [],
        concerningIngredients: sugar > 15 ? ['High Sugar'] : sodium > 400 ? ['High Sodium'] : [],
        tags: ['USDA Certified', healthScore >= 70 ? 'Nutritious' : 'Standard Food'],
        insight: `Official USDA FoodData record for ${item.description || cleanQuery} (${Math.round(calories)} kcal / 100g).`,
        image: '🏛️',
        source: 'USDA FoodData Central'
      }
    })
  } catch (err) {
    console.warn('USDA Search Error:', err.message)
    return []
  }
}
