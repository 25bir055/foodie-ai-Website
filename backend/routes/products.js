const express = require('express')
const router = express.Router()
const Product = require('../models/Product')

/** GET /api/products — Get all products from MongoDB or search */
router.get('/', async (req, res) => {
  try {
    const { search, limit = 200, category } = req.query
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
    const product = await Product.findOne({ barcode }).lean()

    if (product) {
      return res.json({ ...product, id: product.id || product._id.toString() })
    }

    return res.status(404).json({ error: 'Product not found in database' })
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
        { barcode: id }
      ]
    }).lean()

    // Try finding by MongoDB _id if valid ObjectId
    if (!product && id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id).lean()
    }

    if (product) {
      return res.json({ ...product, id: product.id || product._id.toString() })
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