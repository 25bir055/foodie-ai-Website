/**
 * replace-database.js
 * 
 * Drops the existing products collection and re-seeds from products_new.csv
 * 
 * Run: npm run replace-db
 */

const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')
const mongoose = require('mongoose')
require('dotenv').config()

const Product = require('./models/Product')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodie-ai'

// Check for new CSV first, fallback to original
const NEW_CSV = path.join(__dirname, 'products_new.csv')
const OLD_CSV = path.join(__dirname, 'products.csv')
const CSV_PATH = fs.existsSync(NEW_CSV) ? NEW_CSV : OLD_CSV

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

function computeHealthScore(nutriscoreScore) {
  if (nutriscoreScore === null || nutriscoreScore === undefined) return null
  const score = Number(nutriscoreScore)
  if (Number.isNaN(score)) return null
  return Math.max(0, Math.min(100, Math.round(100 - ((score + 15) / 55) * 100)))
}

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const products = []
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', row => products.push(row))
      .on('end', () => resolve(products))
      .on('error', error => reject(error))
  })
}

// ── Main ───────────────────────────────────────────────────────────────────

async function replaceDatabase() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║  🔄 Foodie AI - Database Replace                 ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log()

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV file not found: ${CSV_PATH}`)
    console.error('   Run "npm run fetch-data" first to download products.')
    process.exit(1)
  }

  console.log(`📂 Using CSV: ${path.basename(CSV_PATH)}`)

  try {
    // Connect to MongoDB
    console.log(`🔌 Connecting to MongoDB: ${MONGODB_URI}`)
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Read CSV
    console.log(`📖 Reading CSV file...`)
    const rows = await readCSV(CSV_PATH)
    console.log(`📦 Found ${rows.length} rows in CSV`)

    if (rows.length === 0) {
      console.log('⚠️ CSV file is empty. Aborting.')
      await mongoose.disconnect()
      return
    }

    // Step 1: Drop existing collection
    console.log('\n🗑️  Step 1: Dropping existing products collection...')
    try {
      await mongoose.connection.db.dropCollection('products')
      console.log('   ✅ Old collection dropped successfully')
    } catch (err) {
      if (err.codeName === 'NamespaceNotFound') {
        console.log('   ℹ️  Collection did not exist, creating fresh')
      } else {
        throw err
      }
    }

    // Step 2: Prepare bulk operations
    console.log('\n📝 Step 2: Preparing products for insertion...')
    let skipped = 0
    const bulkOps = []

    for (const row of rows) {
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
        insertOne: { document: product }
      })
    }

    // Step 3: Bulk insert
    console.log(`\n⏳ Step 3: Inserting ${bulkOps.length} products into MongoDB...`)
    const chunkSize = 500
    let inserted = 0

    for (let i = 0; i < bulkOps.length; i += chunkSize) {
      const chunk = bulkOps.slice(i, i + chunkSize)
      await Product.bulkWrite(chunk)
      inserted += chunk.length
      console.log(`   ✅ Inserted ${inserted}/${bulkOps.length} products...`)
    }

    // Step 4: Recreate indexes (let Mongoose handle text index from schema)
    console.log('\n🔑 Step 4: Recreating indexes...')
    await Product.syncIndexes()
    console.log('   ✅ Indexes synced from schema')

    // Done
    console.log()
    console.log('╔══════════════════════════════════════════════════╗')
    console.log('║  🎉 DATABASE REPLACE COMPLETED                   ║')
    console.log('╠══════════════════════════════════════════════════╣')
    console.log(`║  📦 Inserted: ${String(inserted).padEnd(34)}║`)
    console.log(`║  ⚠️  Skipped: ${String(skipped).padEnd(34)}║`)
    console.log(`║  📄 Source: ${String(path.basename(CSV_PATH)).padEnd(36)}║`)
    console.log('╠══════════════════════════════════════════════════╣')
    console.log('║  ✅ Old data has been completely replaced         ║')
    console.log('║  🚀 Start server: npm run dev                    ║')
    console.log('╚══════════════════════════════════════════════════╝')

    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')

  } catch (error) {
    console.error('❌ Database replace failed:', error)
    process.exit(1)
  }
}

replaceDatabase()
