const mongoose = require('mongoose')
require('dotenv').config()
const Product = require('./models/Product')

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/foodie-ai')
  const total = await Product.countDocuments()
  const cats = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ])
  const topBrands = await Product.aggregate([
    { $group: { _id: '$brand', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 }
  ])
  console.log('TOTAL:', total)
  console.log('CATEGORIES:', JSON.stringify(cats, null, 2))
  console.log('TOP_BRANDS:', JSON.stringify(topBrands, null, 2))
  process.exit(0)
}

main()
