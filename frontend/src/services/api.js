import { PRODUCTS } from '../data/mockData'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function normalizeProduct(product) {
  if (!product) return null

  // Health score
  let healthScore = product.healthScore

  if (
    healthScore === null ||
    healthScore === undefined ||
    healthScore === ''
  ) {
    const score = Number(product.nutriscore_score)

    if (!Number.isNaN(score)) {
      healthScore = Math.max(
        0,
        Math.min(
          100,
          Math.round(100 - ((score + 15) / 55) * 100)
        )
      )
    }
  }

  // Sodium CSV is usually in grams → convert to mg
  let sodium = product.sodium ?? product.sodium_mg ?? null

  if (
    sodium === null ||
    sodium === undefined ||
    sodium === ''
  ) {
    const sodiumG = Number(product.sodium_g)

    if (!Number.isNaN(sodiumG)) {
      sodium = Math.round(sodiumG * 1000)
    }
  }

  return {
    ...product,
    id: product.id || (product._id ? String(product._id) : (product.barcode ? `p_${product.barcode}` : `p_${Date.now()}`)),

    // Basic information
    name: product.name || product.product_name || 'Unnamed Product',
    brand: product.brand || product.brands || '',
    category: product.category || product.categories || 'Food & Grocery',
    barcode: String(product.barcode || '').trim(),
    price: product.price ?? 50,

    // Health
    healthScore: healthScore ?? 65,
    nutriscoreScore: product.nutriscore_score ?? null,
    nutriscoreGrade: product.nutriscore_grade || product.nutriScore || '',

    // Nutrition
    calories: product.calories ?? product.energy_kcal ?? 180,
    protein: product.protein ?? product.protein_g ?? 4,
    carbs: product.carbs ?? product.carbohydrates ?? product.carbohydrates_g ?? 24,
    sugar: product.sugar ?? product.sugars_g ?? 6,
    fat: product.fat ?? product.fat_g ?? 5,

    saturatedFat:
      product.saturatedFat ??
      product.saturated_fat_g ??
      2,

    fiber:
      product.fiber ??
      product.fiber_g ??
      2,

    sodium: sodium ?? 120,

    // Ingredients
    ingredients: Array.isArray(product.ingredients)
      ? product.ingredients
      : Array.isArray(product.ingredientList)
        ? product.ingredientList
        : (product.ingredients ? [String(product.ingredients)] : []),

    allergens: Array.isArray(product.allergens)
      ? product.allergens
      : [],

    concerningIngredients:
      Array.isArray(product.concerningIngredients)
        ? product.concerningIngredients
        : [],

    tags: Array.isArray(product.tags)
      ? product.tags
      : [],

    // Other CSV fields
    novaGroup: product.nova_group ?? product.novaGroup ?? null,
    salt: product.salt ?? product.salt_g ?? null,
    image: product.image || '🥣',
    imageUrl: product.imageUrl || product.image_url || '',
    insight: product.insight || 'Balanced nutrition profile.'
  }
}

// Get all products from MongoDB backend
export async function fetchAllProducts() {
  try {
    const res = await fetch(`${API_BASE_URL}/products?limit=200`)
    if (res.ok) {
      const products = await res.json()
      if (Array.isArray(products) && products.length > 0) {
        return products.map(normalizeProduct)
      }
    }
  } catch (err) {
    console.warn('Backend products fetch failed, using fallback mock data:', err)
  }
  return (PRODUCTS || []).map(normalizeProduct)
}

// Get product by ID
export async function fetchProductById(id) {
  if (!id) return null

  // Check if it's an AI-generated/scanned product in session storage
  try {
    const cachedAi = sessionStorage.getItem(`foodie_product_${id}`)
    if (cachedAi) {
      return normalizeProduct(JSON.parse(cachedAi))
    }
  } catch (e) {
    // ignore
  }

  try {
    const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`)
    if (res.ok) {
      const product = await res.json()
      if (product) return normalizeProduct(product)
    }
  } catch (err) {
    console.warn('Backend fetch by ID failed, using fallback:', err)
  }

  const fallback = PRODUCTS.find((p) =>
    String(p.id) === String(id) ||
    String(p.barcode) === String(id)
  )
  return fallback ? normalizeProduct(fallback) : null
}

// Get product by barcode
export async function fetchProductByBarcode(barcode) {
  if (!barcode) return null
  const cleanBarcode = String(barcode).trim()

  try {
    const res = await fetch(`${API_BASE_URL}/products/barcode/${encodeURIComponent(cleanBarcode)}`)
    if (res.ok) {
      const product = await res.json()
      if (product) return normalizeProduct(product)
    }
  } catch (err) {
    console.warn('Backend fetch by barcode failed, using fallback:', err)
  }

  const fallback = PRODUCTS.find((p) =>
    String(p.barcode || '').trim() === cleanBarcode ||
    String(p.id) === cleanBarcode
  )
  return fallback ? normalizeProduct(fallback) : null
}

// Search products
export async function fetchSearchProducts(q) {
  const queryTerm = String(q || '').trim()

  try {
    const res = await fetch(`${API_BASE_URL}/products?search=${encodeURIComponent(queryTerm)}`)
    if (res.ok) {
      const products = await res.json()
      if (Array.isArray(products) && products.length > 0) {
        return products.map(normalizeProduct)
      }
    }
  } catch (err) {
    console.warn('Backend search failed, using fallback:', err)
  }

  if (!queryTerm) return (PRODUCTS || []).map(normalizeProduct)

  const lower = queryTerm.toLowerCase()
  const filtered = PRODUCTS.filter((p) =>
    p.name?.toLowerCase().includes(lower) ||
    p.brand?.toLowerCase().includes(lower) ||
    p.category?.toLowerCase().includes(lower) ||
    p.barcode?.includes(lower)
  )
  return filtered.map(normalizeProduct)
}

// Add product
export async function createProduct(productData) {
  try {
    const res = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    })
    if (res.ok) {
      return normalizeProduct(await res.json())
    }
  } catch (err) {
    console.warn('Create product error:', err)
  }
  return normalizeProduct({ id: `p_${Date.now()}`, ...productData })
}

// Update product
export async function updateProduct(id, productData) {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    })
    if (res.ok) {
      return normalizeProduct(await res.json())
    }
  } catch (err) {
    console.warn('Update product error:', err)
  }
  return normalizeProduct({ id, ...productData })
}

// Delete product
export async function deleteProduct(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Delete product error:', err)
  }
  return { message: `Product ${id} deleted` }
}

// Scan tracking
export async function saveScanRecord({ userId, barcode, productName, healthScore }) {
  try {
    const res = await fetch(`${API_BASE_URL}/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, barcode, productName, healthScore })
    })
    return res.ok
  } catch (err) {
    console.warn('Could not save scan record:', err)
    return false
  }
}