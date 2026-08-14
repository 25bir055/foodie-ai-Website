const express = require('express')
const router = express.Router()
const { db, firebaseInitialized } = require('../firebase-config')

// Initial seed products for local fallback if Firestore isn't connected yet
const SAMPLE_PRODUCTS = [
  { id: 'p1', barcode: '8901058851126', name: 'Crunchy Masala Oats', brand: 'FieldFresh', category: 'Breakfast & Cereal', price: 149, healthScore: 78, calories: 340 },
  { id: 'p2', barcode: '7622210996488', name: 'Choco Fudge Cream Biscuits', brand: 'Sweetline', category: 'Snacks & Biscuits', price: 40, healthScore: 32, calories: 502 },
  { id: 'p3', barcode: '8904004400152', name: 'Roasted Chana Snack Mix', brand: 'Farmhouse Bites', category: 'Snacks & Biscuits', price: 60, healthScore: 84, calories: 380 }
]

/** GET /api/products — Get all products */
router.get('/', async (req, res) => {
  try {
    if (firebaseInitialized && db) {
      const snapshot = await db.collection('products').get()
      const list = []
      snapshot.forEach((doc) => list.push({ firestoreId: doc.id, ...doc.data() }))
      return res.json(list)
    }
    return res.json(SAMPLE_PRODUCTS)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** GET /api/products/:id — Get product by ID */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (firebaseInitialized && db) {
      const docRef = await db.collection('products').doc(id).get()
      if (docRef.exists) {
        return res.json({ firestoreId: docRef.id, ...docRef.data() })
      }
      const q = await db.collection('products').where('id', '==', id).get()
      if (!q.empty) {
        const first = q.docs[0]
        return res.json({ firestoreId: first.id, ...first.data() })
      }
    }
    const found = SAMPLE_PRODUCTS.find((p) => p.id === id)
    if (found) return res.json(found)
    return res.status(404).json({ error: 'Product not found' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** GET /api/products/barcode/:barcode — Get product by barcode */
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params
    if (firebaseInitialized && db) {
      const q = await db.collection('products').where('barcode', '==', barcode.trim()).get()
      if (!q.empty) {
        const first = q.docs[0]
        return res.json({ firestoreId: first.id, ...first.data() })
      }
    }
    const found = SAMPLE_PRODUCTS.find((p) => p.barcode === barcode.trim())
    if (found) return res.json(found)
    return res.status(404).json({ error: 'Product not found' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /api/products — Create product in Firestore */
router.post('/', async (req, res) => {
  try {
    const productData = req.body
    if (firebaseInitialized && db) {
      const docId = productData.id || `p_${Date.now()}`
      await db.collection('products').doc(docId).set(productData)
      return res.status(201).json({ id: docId, ...productData })
    }
    return res.status(201).json({ id: `p_${Date.now()}`, ...productData })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// UPDATE PRODUCT
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const productData = req.body

    if (!firebaseInitialized || !db) {
      return res.status(500).json({
        error: 'Firebase is not initialized'
      })
    }

    const docRef = db.collection('products').doc(id)

    const existingDoc = await docRef.get()

    if (!existingDoc.exists) {
      return res.status(404).json({
        error: 'Product not found'
      })
    }

    await docRef.set(productData, {
      merge: true
    })

    const updatedDoc = await docRef.get()

    return res.json({
      firestoreId: updatedDoc.id,
      ...updatedDoc.data()
    })

  } catch (err) {
    console.error('❌ Update product error:', err)

    return res.status(500).json({
      error: err.message
    })
  }
})
/** DELETE /api/products/:id — Delete product from Firestore */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (firebaseInitialized && db) {
      await db.collection('products').doc(id).delete()
    }
    return res.json({ message: `Product ${id} deleted successfully` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
module.exports = router