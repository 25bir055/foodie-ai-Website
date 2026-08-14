/**
 * seed.js
 * CSV -> Firestore products collection
 *
 * Run:
 *   npm run seed
 */

const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')

const { db, firebaseInitialized } = require('./firebase-config')

const CSV_PATH = path.join(__dirname, 'products.csv')

function toNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

function toArray(value) {
  if (!value) {
    return []
  }

  return String(value)
    .split(/[,;|]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function readCSV() {
  return new Promise((resolve, reject) => {
    const products = []

    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', row => {
        products.push(row)
      })
      .on('end', () => {
        resolve(products)
      })
      .on('error', error => {
        reject(error)
      })
  })
}

async function seed() {
  if (!firebaseInitialized || !db) {
    console.error(
      '❌ Firebase Admin is not initialized. Check Firebase configuration.'
    )
    return
  }

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV file not found: ${CSV_PATH}`)
    console.error('Make sure products.csv is inside the backend folder.')
    return
  }

  try {
    console.log('📂 Reading CSV file...')

    const rows = await readCSV()

    console.log(`📦 Found ${rows.length} products in CSV.`)

    if (rows.length === 0) {
      console.log('⚠️ CSV file is empty.')
      return
    }

    let uploaded = 0
    let skipped = 0

    // Firestore batch supports max 500 writes.
    // We use 450 to stay safely below the limit.
    let batch = db.batch()
    let batchCount = 0

    async function commitBatch() {
      if (batchCount === 0) {
        return
      }

      await batch.commit()

      uploaded += batchCount

      console.log(`✅ Uploaded ${uploaded} products...`)

      batch = db.batch()
      batchCount = 0
    }

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]

      const barcode = String(row.barcode || '').trim()

      if (!barcode) {
        skipped++
        console.log(`⚠️ Skipping row ${index + 2}: barcode missing`)
        continue
      }

      const product = {
        barcode,

        // Existing frontend-friendly fields
        name: row.product_name || '',
        brand: row.brands || '',
        category: row.categories || '',

        // CSV fields
        product_name: row.product_name || '',
        brands: row.brands || '',
        categories: row.categories || '',
        ingredients: row.ingredients || '',

        energy_kcal: toNumber(row.energy_kcal),
        fat_g: toNumber(row.fat_g),
        saturated_fat_g: toNumber(row.saturated_fat_g),
        carbohydrates_g: toNumber(row.carbohydrates_g),
        sugars_g: toNumber(row.sugars_g),
        fiber_g: toNumber(row.fiber_g),
        protein_g: toNumber(row.protein_g),
        salt_g: toNumber(row.salt_g),
        sodium_g: toNumber(row.sodium_g),

        nutriscore_grade: row.nutriscore_grade || '',
        nutriscore_score: toNumber(row.nutriscore_score),
        nova_group: row.nova_group || '',

        // Useful array versions
        ingredientList: toArray(row.ingredients),
        tags: [],

        // Keep these null because CSV doesn't contain them
        price: null,
        image: '',
        healthScore: null,
        concerningIngredients: [],
        allergens: []
      }

      const safeId = barcode.replace(/\//g, '_')

      const ref = db.collection('products').doc(safeId)

      batch.set(ref, product, { merge: true })

      batchCount++

      if (batchCount >= 450) {
        await commitBatch()
      }
    }

    await commitBatch()

    console.log('')
    console.log('======================================')
    console.log('🎉 CSV UPLOAD COMPLETED')
    console.log('======================================')
    console.log(`📦 Uploaded: ${uploaded}`)
    console.log(`⚠️ Skipped: ${skipped}`)
    console.log('📁 Collection: products')
    console.log('======================================')
  } catch (error) {
    console.error('❌ CSV upload failed:')
    console.error(error)
  }
}

seed()