const express = require('express')
const router = express.Router()
const Product = require('../models/Product')
const Groq = require('groq-sdk')

function getGroqClient() {
  const key = process.env.GROQ_API_KEY
  if (key && key.trim().length > 10) {
    return new Groq({ apiKey: key.trim() })
  }
  return null
}

async function generateAIProduct(barcode) {
  const groq = getGroqClient()
  if (!groq) return null

  try {
    const prompt = `Identify or generate realistic, accurate nutritional and ingredient analysis for packaged grocery/food product with barcode number "${barcode}".
Respond ONLY with a valid JSON object in this exact format:
{
  "name": "Product Name",
  "brand": "Brand Name",
  "category": "Snacks & Munchies",
  "calories": 240,
  "protein": 4.5,
  "fat": 8.0,
  "saturatedFat": 2.5,
  "carbohydrates": 38.0,
  "sugar": 7.0,
  "fiber": 2.0,
  "sodium": 220,
  "healthScore": 68,
  "ingredients": ["Wheat Flour", "Sugar", "Edible Vegetable Oil", "Salt"],
  "allergens": ["Gluten", "Milk"],
  "insight": "Moderate nutrition balance. Check sodium levels."
}`
    const aiRes = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'qwen/qwen3.6-27b',
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
    const parsed = JSON.parse(aiRes.choices[0]?.message?.content || '{}')
    if (parsed.name) {
      const customId = `p_${barcode}`
      const score = Math.max(10, Math.min(98, parsed.healthScore || 65))
      const newProduct = {
        id: customId,
        barcode,
        name: parsed.name,
        brand: parsed.brand || 'Grocery Item',
        category: parsed.category || 'Food & Grocery',
        price: 50,
        healthScore: score,
        nutriScore: score >= 80 ? 'a' : score >= 60 ? 'b' : score >= 45 ? 'c' : 'd',
        nutriscoreGrade: score >= 80 ? 'a' : score >= 60 ? 'b' : score >= 45 ? 'c' : 'd',
        calories: Number(parsed.calories) || 200,
        protein: Number(parsed.protein) || 4,
        carbohydrates: Number(parsed.carbohydrates) || 25,
        carbs: Number(parsed.carbohydrates) || 25,
        sugar: Number(parsed.sugar) || 6,
        fat: Number(parsed.fat) || 5,
        saturatedFat: Number(parsed.saturatedFat) || 2,
        fiber: Number(parsed.fiber) || 2,
        sodium: Number(parsed.sodium) || 150,
        salt: Number((Number(parsed.sodium || 150) / 400).toFixed(2)),
        ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
        ingredientList: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
        allergens: Array.isArray(parsed.allergens) ? parsed.allergens : [],
        imageUrl: '',
        image: '🥗',
        product_name: parsed.name,
        brands: parsed.brand || 'Grocery Item',
        categories: parsed.category || 'Food',
        servingSize: '100 g',
        insight: parsed.insight || 'Identified via Foodie AI engine.'
      }
      return await Product.create(newProduct)
    }
  } catch (err) {
    console.warn('Groq product generation fallback error:', err.message)
  }
  return null
}

/** GET /api/products — Get all products from MongoDB or search */
router.get('/', async (req, res) => {
  try {
    const { search, limit = 1000, category } = req.query
    let query = {}

    if (search && search.trim()) {
      const term = search.trim()
      query = {
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { brand: { $regex: term, $options: 'i' } },
          { category: { $regex: term, $options: 'i' } },
          { barcode: { $regex: term, $options: 'i' } },
          { product_name: { $regex: term, $options: 'i' } }
        ]
      }
    }

    if (category) {
      query.category = { $regex: category, $options: 'i' }
    }

    const products = await Product.find(query).limit(Number(limit)).lean()
    return res.json(products.map(p => ({ ...p, id: p.id || p._id.toString() })))
  } catch (err) {
    console.error('Fetch products error:', err)
    res.status(500).json({ error: err.message })
  }
})

/** GET /api/products/barcode/:barcode — Get product directly from MongoDB */
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const barcode = req.params.barcode.trim()
    let product = await Product.findOne({ barcode }).lean()

    if (product) {
      return res.json({ ...product, id: product.id || product._id.toString() })
    }

    // Fallback 1: Fetch from Open Food Facts API
    console.log(`🔍 Barcode ${barcode} not found in DB. Querying Open Food Facts...`)
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      if (response.ok) {
        const data = await response.json()
        if (data.status === 1 && data.product) {
          const offProduct = data.product
          const customId = `p_${barcode}`

          // Parse nutrients
          const nutriments = offProduct.nutriments || {}
          const calories = Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || nutriments['energy-kcal_value'] || 0)
          const fat = Number(nutriments.fat_100g || nutriments.fat || 0)
          const saturatedFat = Number(nutriments['saturated-fat_100g'] || nutriments['saturated-fat'] || 0)
          const carbohydrates = Number(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0)
          const sugar = Number(nutriments.sugars_100g || nutriments.sugars || 0)
          const fiber = Number(nutriments.fiber_100g || nutriments.fiber || 0)
          const protein = Number(nutriments.proteins_100g || nutriments.proteins || 0)
          const salt = Number(nutriments.salt_100g || nutriments.salt || 0)
          const sodium = Number(nutriments.sodium_100g || nutriments.sodium || 0)

          // Calculate healthScore
          let score = 50
          if (calories > 200) score -= 10
          if (sugar > 10) score -= 15
          if (saturatedFat > 4) score -= 10
          if (sodium > 0.4) score -= 10
          if (protein >= 8) score += 15
          if (fiber >= 3) score += 15
          score = Math.max(10, Math.min(98, score))

          const ingredients = offProduct.ingredients_text
            ? offProduct.ingredients_text.split(',').map(i => i.trim()).filter(Boolean)
            : []

          const allergens = offProduct.allergens_tags
            ? offProduct.allergens_tags.map(a => a.replace('en:', '').trim()).filter(Boolean)
            : []

          const concerningIngredients = offProduct.additives_tags
            ? offProduct.additives_tags.map(a => a.replace('en:', '').trim()).filter(Boolean)
            : []

          const name = offProduct.product_name || offProduct.product_name_en || 'Imported Product'
          const brand = offProduct.brands || 'Unknown'
          const category = offProduct.categories ? offProduct.categories.split(',')[0].trim() : 'Food'

          const newProduct = {
            id: customId,
            barcode,
            name,
            brand,
            category,
            price: 50,
            healthScore: score,
            nutriScore: score >= 80 ? 'a' : score >= 60 ? 'b' : score >= 45 ? 'c' : 'd',
            nutriscoreGrade: score >= 80 ? 'a' : score >= 60 ? 'b' : score >= 45 ? 'c' : 'd',
            nutriscore_grade: score >= 80 ? 'a' : score >= 60 ? 'b' : score >= 45 ? 'c' : 'd',
            calories,
            fat,
            saturatedFat,
            carbohydrates,
            carbs: carbohydrates,
            sugar,
            fiber,
            protein,
            salt,
            sodium: Math.round(sodium * 1000), // convert to mg
            ingredients,
            ingredientList: ingredients,
            allergens,
            concerningIngredients,
            imageUrl: offProduct.image_url || offProduct.image_front_url || '',
            image: '🥗',
            product_name: name,
            brands: brand,
            categories: offProduct.categories || category,
            servingSize: offProduct.serving_size || '100 g',
            insight: `Successfully imported from Open Food Facts.`
          }

          // Save to database
          const savedProduct = await Product.create(newProduct)
          return res.json(savedProduct)
        }
      }
    } catch (offErr) {
      console.warn('Open Food Facts API Error:', offErr.message)
    }

    // Fallback 2: Groq AI Product Generator
    console.log(`🤖 Open Food Facts missed barcode ${barcode}. Invoking Groq AI fallback...`)
    const aiGenerated = await generateAIProduct(barcode)
    if (aiGenerated) {
      return res.json(aiGenerated)
    }

    return res.status(404).json({ error: 'Product not found in database or Open Food Facts API' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** GET /api/products/:id — Get product by ID or barcode from MongoDB */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    let product = null

    // Try finding by custom id or barcode in MongoDB
    product = await Product.findOne({
      $or: [
        { id: id },
        { barcode: id },
        { barcode: id.replace('p_', '') }
      ]
    }).lean()

    // Try finding by MongoDB _id if valid ObjectId
    if (!product && id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id).lean()
    }

    if (product) {
      return res.json({ ...product, id: product.id || product._id.toString() })
    }

    // Check Open Food Facts fallback if id is a barcode or prefixed with p_
    const cleanBarcode = id.replace('p_', '').trim()
    if (/^\d{6,16}$/.test(cleanBarcode)) {
      console.log(`🔍 Querying Open Food Facts for :id route with barcode ${cleanBarcode}...`)
      try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json`)
        if (response.ok) {
          const data = await response.json()
          if (data.status === 1 && data.product) {
            const offProduct = data.product
            const customId = `p_${cleanBarcode}`

            const nutriments = offProduct.nutriments || {}
            const calories = Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || nutriments['energy-kcal_value'] || 0)
            const fat = Number(nutriments.fat_100g || nutriments.fat || 0)
            const saturatedFat = Number(nutriments['saturated-fat_100g'] || nutriments['saturated-fat'] || 0)
            const carbohydrates = Number(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0)
            const sugar = Number(nutriments.sugars_100g || nutriments.sugars || 0)
            const fiber = Number(nutriments.fiber_100g || nutriments.fiber || 0)
            const protein = Number(nutriments.proteins_100g || nutriments.proteins || 0)
            const salt = Number(nutriments.salt_100g || nutriments.salt || 0)
            const sodium = Number(nutriments.sodium_100g || nutriments.sodium || 0)

            let score = 50
            if (calories > 200) score -= 10
            if (sugar > 10) score -= 15
            if (saturatedFat > 4) score -= 10
            if (sodium > 0.4) score -= 10
            if (protein >= 8) score += 15
            if (fiber >= 3) score += 15
            score = Math.max(10, Math.min(98, score))

            const ingredients = offProduct.ingredients_text
              ? offProduct.ingredients_text.split(',').map(i => i.trim()).filter(Boolean)
              : []

            const allergens = offProduct.allergens_tags
              ? offProduct.allergens_tags.map(a => a.replace('en:', '').trim()).filter(Boolean)
              : []

            const concerningIngredients = offProduct.additives_tags
              ? offProduct.additives_tags.map(a => a.replace('en:', '').trim()).filter(Boolean)
              : []

            const name = offProduct.product_name || offProduct.product_name_en || 'Imported Product'
            const brand = offProduct.brands || 'Unknown'
            const category = offProduct.categories ? offProduct.categories.split(',')[0].trim() : 'Food'

            const newProduct = {
              id: customId,
              barcode: cleanBarcode,
              name,
              brand,
              category,
              price: 50,
              healthScore: score,
              nutriScore: score >= 80 ? 'a' : score >= 60 ? 'b' : score >= 45 ? 'c' : 'd',
              nutriscoreGrade: score >= 80 ? 'a' : score >= 60 ? 'b' : score >= 45 ? 'c' : 'd',
              nutriscore_grade: score >= 80 ? 'a' : score >= 60 ? 'b' : score >= 45 ? 'c' : 'd',
              calories,
              fat,
              saturatedFat,
              carbohydrates,
              carbs: carbohydrates,
              sugar,
              fiber,
              protein,
              salt,
              sodium: Math.round(sodium * 1000),
              ingredients,
              ingredientList: ingredients,
              allergens,
              concerningIngredients,
              imageUrl: offProduct.image_url || offProduct.image_front_url || '',
              image: '🥗',
              product_name: name,
              brands: brand,
              categories: offProduct.categories || category,
              servingSize: offProduct.serving_size || '100 g',
              insight: `Successfully imported from Open Food Facts.`
            }

            const savedProduct = await Product.create(newProduct)
            return res.json(savedProduct)
          }
        }
      } catch (offErr) {
        console.warn('Open Food Facts lookup error:', offErr.message)
      }

      // Groq AI fallback for :id route
      const aiGenerated = await generateAIProduct(cleanBarcode)
      if (aiGenerated) {
        return res.json(aiGenerated)
      }
    }

    return res.status(404).json({ error: 'Product not found in database' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /api/products — Create or upsert product into MongoDB */
router.post('/', async (req, res) => {
  try {
    const productData = req.body
    const customId = productData.id || (productData.barcode ? `p_${productData.barcode}` : `p_${Date.now()}`)

    const newProduct = await Product.findOneAndUpdate(
      { $or: [{ barcode: productData.barcode }, { id: customId }] },
      { ...productData, id: customId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return res.status(201).json(newProduct)
  } catch (err) {
    console.error('Create product error:', err)
    res.status(500).json({ error: err.message })
  }
})

/** PUT /api/products/:id — Update product in MongoDB */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const productData = req.body

    const query = id.match(/^[0-9a-fA-F]{24}$/)
      ? { $or: [{ _id: id }, { id }, { barcode: id }] }
      : { $or: [{ id }, { barcode: id }] }

    const updated = await Product.findOneAndUpdate(
      query,
      { $set: productData },
      { new: true }
    )

    if (!updated) {
      return res.status(404).json({ error: 'Product not found' })
    }

    return res.json(updated)
  } catch (err) {
    console.error('Update product error:', err)
    res.status(500).json({ error: err.message })
  }
})

/** DELETE /api/products/:id — Delete product from MongoDB */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const query = id.match(/^[0-9a-fA-F]{24}$/)
      ? { $or: [{ _id: id }, { id }, { barcode: id }] }
      : { $or: [{ id }, { barcode: id }] }

    await Product.findOneAndDelete(query)
    return res.json({ message: `Product ${id} deleted successfully from MongoDB` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router