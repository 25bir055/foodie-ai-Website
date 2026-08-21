/**
 * check-nutrition.js
 * Check how many products have missing nutrition data
 */
const mongoose = require('mongoose')
require('dotenv').config()
const Product = require('./models/Product')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodie-ai'

async function check() {
  await mongoose.connect(MONGODB_URI)
  
  const total = await Product.countDocuments()
  
  const fields = ['calories', 'fat', 'protein', 'carbohydrates', 'sugar', 'fiber']
  
  console.log('=== NUTRITION DATA REPORT ===')
  console.log('Total products:', total)
  console.log('')
  
  for (const field of fields) {
    const missing = await Product.countDocuments({
      $or: [
        { [field]: null },
        { [field]: 0 },
        { [field]: { $exists: false } }
      ]
    })
    console.log(`Missing ${field}: ${missing} / ${total} (${Math.round(missing/total*100)}%)`)
  }
  
  // Products where ALL main nutrition fields are missing/zero
  const allMissing = await Product.countDocuments({
    $and: [
      { $or: [{ calories: null }, { calories: 0 }, { calories: { $exists: false } }] },
      { $or: [{ protein: null }, { protein: 0 }, { protein: { $exists: false } }] },
      { $or: [{ fat: null }, { fat: 0 }, { fat: { $exists: false } }] }
    ]
  })
  console.log('')
  console.log(`Products with ALL nutrition missing: ${allMissing} / ${total}`)
  
  // Sample products with missing data
  const samples = await Product.find({
    $or: [
      { calories: null }, { calories: 0 }, { calories: { $exists: false } }
    ]
  }).select('barcode name brand calories protein fat carbohydrates').limit(15).lean()
  
  console.log('')
  console.log('Sample products with missing calories:')
  samples.forEach(p => {
    console.log(`  ${p.barcode} | ${(p.name || '').substring(0, 40)} | cal:${p.calories} pro:${p.protein} fat:${p.fat} carb:${p.carbohydrates}`)
  })
  
  await mongoose.disconnect()
}

check().catch(err => { console.error(err); process.exit(1) })
