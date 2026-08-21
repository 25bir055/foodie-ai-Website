/**
 * fix-nutrition.js
 * 
 * Fetches missing nutrition data from OpenFoodFacts API
 * for products that have zero/null nutrition values.
 * 
 * Run: node fix-nutrition.js
 */

const mongoose = require('mongoose')
require('dotenv').config()
const Product = require('./models/Product')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodie-ai'
const DELAY_MS = 1200 // respect rate limits

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function safeNum(val) {
  if (val === undefined || val === null || val === '') return null
  const n = Number(val)
  return Number.isNaN(n) ? null : n
}

function computeHealthScore(nutriscoreScore) {
  if (nutriscoreScore === null || nutriscoreScore === undefined) return null
  const score = Number(nutriscoreScore)
  if (Number.isNaN(score)) return null
  return Math.max(0, Math.min(100, Math.round(100 - ((score + 15) / 55) * 100)))
}

async function fetchFromOFF(barcode) {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=nutriments,nutriscore_grade,nutrition_grades,nutriscore_score,nova_group,ingredients_text,ingredients_text_en`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FoodieAI/1.0 (venkatdevaraj044@gmail.com)' }
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    return data.product
  } catch (err) {
    return null
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║  🔧 Fix Missing Nutrition Data                   ║')
  console.log('║  Source: OpenFoodFacts API (per-product lookup)   ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log()

  await mongoose.connect(MONGODB_URI)
  console.log('✅ Connected to MongoDB')

  // Find products with all main nutrition missing
  const missingProducts = await Product.find({
    $or: [
      { calories: null }, { calories: 0 },
      { protein: null }, { protein: 0 },
      { fat: null }, { fat: 0 },
      { carbohydrates: null }, { carbohydrates: 0 }
    ]
  }).lean()

  console.log(`📦 Found ${missingProducts.length} products with missing/zero nutrition data`)
  console.log()

  let fixed = 0
  let notFound = 0
  let stillMissing = 0

  for (let i = 0; i < missingProducts.length; i++) {
    const product = missingProducts[i]
    const barcode = product.barcode

    process.stdout.write(`[${i + 1}/${missingProducts.length}] ${barcode} ${(product.name || '').substring(0, 30).padEnd(30)} `)

    const offData = await fetchFromOFF(barcode)

    if (!offData) {
      console.log('❌ Not found on OFF')
      notFound++
      await sleep(DELAY_MS)
      continue
    }

    const nutriments = offData.nutriments || {}

    const calories = safeNum(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'])
    const fat = safeNum(nutriments.fat_100g || nutriments.fat)
    const saturatedFat = safeNum(nutriments['saturated-fat_100g'] || nutriments['saturated-fat'])
    const carbohydrates = safeNum(nutriments.carbohydrates_100g || nutriments.carbohydrates)
    const sugar = safeNum(nutriments.sugars_100g || nutriments.sugars)
    const fiber = safeNum(nutriments.fiber_100g || nutriments.fiber)
    const protein = safeNum(nutriments.proteins_100g || nutriments.proteins)
    const salt = safeNum(nutriments.salt_100g || nutriments.salt)
    const sodium = safeNum(nutriments.sodium_100g || nutriments.sodium)

    // Check if OFF actually has nutrition data
    if (!calories && !fat && !protein && !carbohydrates) {
      console.log('⚠️ OFF has no nutrition either')
      stillMissing++
      await sleep(DELAY_MS)
      continue
    }

    // Build update object - only update fields that are currently missing
    const update = {}

    if (!product.calories && calories) {
      update.calories = calories
      update.energy_kcal = calories
    }
    if (!product.fat && fat) {
      update.fat = fat
      update.fat_g = fat
    }
    if ((!product.saturatedFat) && saturatedFat) {
      update.saturatedFat = saturatedFat
      update.saturated_fat_g = saturatedFat
    }
    if (!product.carbohydrates && carbohydrates) {
      update.carbohydrates = carbohydrates
      update.carbohydrates_g = carbohydrates
    }
    if (!product.sugar && sugar) {
      update.sugar = sugar
      update.sugars_g = sugar
    }
    if (!product.fiber && fiber) {
      update.fiber = fiber
      update.fiber_g = fiber
    }
    if (!product.protein && protein) {
      update.protein = protein
      update.protein_g = protein
    }
    if (!product.salt && salt) {
      update.salt = salt
      update.salt_g = salt
    }
    if (!product.sodium && sodium) {
      update.sodium = Math.round(sodium * 1000)
      update.sodium_g = sodium
    }

    // Update nutriscore if missing
    const grade = (offData.nutriscore_grade || offData.nutrition_grades || '').toLowerCase()
    if (grade && grade !== 'unknown' && (!product.nutriScore || product.nutriScore === 'unknown')) {
      update.nutriScore = grade
      update.nutriscoreGrade = grade
      update.nutriscore_grade = grade
    }

    const nScore = safeNum(offData.nutriscore_score)
    if (nScore !== null && !product.nutriscore_score) {
      update.nutriscore_score = nScore
      update.healthScore = computeHealthScore(nScore)
    }

    // Update nova group if missing
    if (offData.nova_group && !product.novaGroup) {
      const novaLabels = {
        1: '1 - Unprocessed or minimally processed foods',
        2: '2 - Processed culinary ingredients',
        3: '3 - Processed foods',
        4: '4 - Ultra processed food and drink products'
      }
      update.novaGroup = novaLabels[offData.nova_group] || String(offData.nova_group)
      update.nova_group = update.novaGroup
    }

    // Update ingredients if missing
    const ingText = offData.ingredients_text || offData.ingredients_text_en || ''
    if (ingText && (!product.ingredients || product.ingredients.length === 0)) {
      const ingArray = ingText.split(/[,;|]/).map(i => i.trim()).filter(Boolean)
      update.ingredients = ingArray
      update.ingredientList = ingArray
    }

    if (Object.keys(update).length === 0) {
      console.log('⚠️ No new data to update')
      stillMissing++
      await sleep(DELAY_MS)
      continue
    }

    await Product.updateOne({ _id: product._id }, { $set: update })
    console.log(`✅ Fixed (${Object.keys(update).length} fields)`)
    fixed++

    await sleep(DELAY_MS)
  }

  console.log()
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║  🎉 NUTRITION FIX COMPLETED                      ║')
  console.log('╠══════════════════════════════════════════════════╣')
  console.log(`║  📦 Total checked: ${String(missingProducts.length).padEnd(29)}║`)
  console.log(`║  ✅ Fixed: ${String(fixed).padEnd(37)}║`)
  console.log(`║  ❌ Not on OpenFoodFacts: ${String(notFound).padEnd(23)}║`)
  console.log(`║  ⚠️  Still missing (no data on OFF): ${String(stillMissing).padEnd(11)}║`)
  console.log('╚══════════════════════════════════════════════════╝')

  await mongoose.disconnect()
}

main().catch(err => { console.error('❌ Error:', err); process.exit(1) })
