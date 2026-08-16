/**
 * seed.js
 * CSV → MongoDB products collection
 *
 * Run:
 *   npm run seed
 */

const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')
const mongoose = require('mongoose')
require('dotenv').config()

const Product = require('./models/Product')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodie-ai'

const CSV_PATH = path.join(__dirname, 'products.csv')

// ── Helpers ────────────────────────────────────────────────────────────────

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

function toArray(value) {
  if (!value) return []
  return String(value)
    .split(/[,;|]/)
    .map(item => item.trim())
    .filter(Boolean)
}

/**
 * Convert NutriScore numeric score → 0-100 health score.
 */
function computeHealthScore(nutriscoreScore) {
  if (nutriscoreScore === null || nutriscoreScore === undefined) return null
  const score = Number(nutriscoreScore)
  if (Number.isNaN(score)) return null
  return Math.max(0, Math.min(100, Math.round(100 - ((score + 15) / 55) * 100)))
}

function readCSV() {
  return new Promise((resolve, reject) => {
    const products = []
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', row => products.push(row))
      .on('end', () => resolve(products))
      .on('error', error => reject(error))
  })
}

// ── Main ───────────────────────────────────────────────────────────────────

async function seed() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV file not found: ${CSV_PATH}`)
    return
  }

  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}`)
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log(`📂 Reading CSV file from ${CSV_PATH}...`)
    const rows = await readCSV()
    console.log(`📦 Found ${rows.length} rows in CSV.`)

    if (rows.length === 0) {
      console.log('⚠️ CSV file is empty.')
      await mongoose.disconnect()
      return
    }

    let uploaded = 0
    let skipped = 0

    const bulkOps = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const barcode = String(row.barcode || row.code || '').trim()

      if (!barcode) {
        skipped++
        continue
      }

      const nutriscoreScore = toNumber(row.nutriscore_score)
      const healthScore = computeHealthScore(nutriscoreScore)

      const product = {
        id: `p_${barcode}`,
        barcode,
        name: row.product_name || row.name || '',
        brand: row.brands || row.brand || '',
        category: row.categories || row.category || '',
        price: toNumber(row.price) || 50,

        calories: toNumber(row.energy_kcal || row.calories),
        energy_kcal: toNumber(row.energy_kcal),
        fat: toNumber(row.fat_g || row.fat),
        fat_g: toNumber(row.fat_g),
        saturatedFat: toNumber(row.saturated_fat_g || row.saturatedFat),
        saturated_fat_g: toNumber(row.saturated_fat_g),
        carbohydrates: toNumber(row.carbohydrates_g || row.carbs),
        carbohydrates_g: toNumber(row.carbohydrates_g),
        sugar: toNumber(row.sugars_g || row.sugar),
        sugars_g: toNumber(row.sugars_g),
        fiber: toNumber(row.fiber_g || row.fiber),
        fiber_g: toNumber(row.fiber_g),
        protein: toNumber(row.protein_g || row.protein),
        protein_g: toNumber(row.protein_g),
        salt: toNumber(row.salt_g || row.salt),
        salt_g: toNumber(row.salt_g),
        sodium: row.sodium_g ? Math.round(Number(row.sodium_g) * 1000) : (toNumber(row.sodium) || null),
        sodium_g: toNumber(row.sodium_g),

        nutriScore: (row.nutriscore_grade || '').toLowerCase(),
        nutriscoreGrade: (row.nutriscore_grade || '').toLowerCase(),
        nutriscore_grade: (row.nutriscore_grade || '').toLowerCase(),
        nutriscore_score: nutriscoreScore,
        novaGroup: row.nova_group || '',
        nova_group: row.nova_group || '',

        healthScore: healthScore ?? toNumber(row.healthScore),

        ingredients: toArray(row.ingredients),
        ingredientList: toArray(row.ingredients),
        allergens: toArray(row.allergens || ''),

        imageUrl: row.imageUrl || row.image_url || '',
        image: row.image || '',

        product_name: row.product_name || '',
        brands: row.brands || '',
        categories: row.categories || '',

        servingSize: '100 g',
        insight: row.insight || ''
      }

      bulkOps.push({
        updateOne: {
          filter: { barcode: product.barcode },
          update: { $set: product },
          upsert: true
        }
      })
    }

    if (bulkOps.length > 0) {
      console.log(`⏳ Seeding ${bulkOps.length} products to MongoDB in batches...`)
      const chunkSize = 500
      for (let i = 0; i < bulkOps.length; i += chunkSize) {
        const chunk = bulkOps.slice(i, i + chunkSize)
        await Product.bulkWrite(chunk)
        uploaded += chunk.length
        console.log(`✅ Seeded ${uploaded}/${bulkOps.length} products...`)
      }
    }

    console.log('')
    console.log('══════════════════════════════════════')
    console.log('🎉 MONGODB CSV SEED COMPLETED')
    console.log('══════════════════════════════════════')
    console.log(`📦 Uploaded/Updated: ${uploaded}`)
    console.log(`⚠️ Skipped: ${skipped}`)
    console.log('══════════════════════════════════════')

    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  } catch (error) {
    console.error('❌ MongoDB seed failed:', error)
    process.exit(1)
  }
}

seed()