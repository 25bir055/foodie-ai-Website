import { PRODUCTS } from '../data/mockData'
import {
  getAllProducts,
  getProductById,
  getProductByBarcode,
  searchProducts,
  addProduct ,
  updateProduct as firestoreUpdateProduct,
  deleteProduct as firestoreDeleteProduct
} from './firestore'

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
    id: product.id || product.firestoreId || (product.barcode ? `p_${product.barcode}` : `p_${Date.now()}`),

    // Basic information
    name: product.name || product.product_name || 'Unnamed Product',
    brand: product.brand || product.brands || '',
    category: product.category || product.categories || 'Food & Grocery',
    barcode: String(product.barcode || '').trim(),
    price: product.price ?? 50,

    // Health
    healthScore: healthScore ?? 65,
    nutriscoreScore: product.nutriscore_score ?? null,
    nutriscoreGrade: product.nutriscore_grade || '',

    // Nutrition
    calories: product.calories ?? product.energy_kcal ?? 180,
    protein: product.protein ?? product.protein_g ?? 4,
    carbs: product.carbs ?? product.carbohydrates_g ?? 24,
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
    novaGroup: product.nova_group ?? null,
    salt: product.salt_g ?? null,
    image: product.image || '🥣',
    insight: product.insight || 'Balanced nutrition profile.'
  }
}

// Get all products
export async function fetchAllProducts() {
  try {
    const products = await getAllProducts()
    if (products && products.length > 0) {
      return products.map(normalizeProduct)
    }
  } catch (err) {
    console.warn('Firestore fetch failed, using fallback mock data:', err)
  }
  return (PRODUCTS || []).map(normalizeProduct)
}

// Get product by ID
export async function fetchProductById(id) {
  if (!id) return null
  try {
    const product = await getProductById(id)
    if (product) return normalizeProduct(product)
  } catch (err) {
    console.warn('Firestore fetch by ID failed, using fallback:', err)
  }
  const fallback = PRODUCTS.find((p) =>
    String(p.id) === String(id) ||
    String(p.firestoreId) === String(id) ||
    String(p.barcode) === String(id)
  )
  return fallback ? normalizeProduct(fallback) : null
}

// Get product by barcode
export async function fetchProductByBarcode(barcode) {
  if (!barcode) return null
  const cleanBarcode = String(barcode).trim()
  try {
    const product = await getProductByBarcode(cleanBarcode)
    if (product) return normalizeProduct(product)
  } catch (err) {
    console.warn('Firestore fetch by barcode failed, using fallback:', err)
  }
  const fallback = PRODUCTS.find((p) =>
    String(p.barcode || '').trim() === cleanBarcode ||
    String(p.id) === cleanBarcode
  )
  return fallback ? normalizeProduct(fallback) : null
}

// Search products
export async function fetchSearchProducts(q) {
  const queryTerm = String(q || '').trim().toLowerCase()
  try {
    const products = await searchProducts(queryTerm)
    if (products && products.length > 0) {
      return products.map(normalizeProduct)
    }
  } catch (err) {
    console.warn('Firestore search failed, using fallback:', err)
  }

  if (!queryTerm) return (PRODUCTS || []).map(normalizeProduct)

  const filtered = PRODUCTS.filter((p) =>
    p.name?.toLowerCase().includes(queryTerm) ||
    p.brand?.toLowerCase().includes(queryTerm) ||
    p.category?.toLowerCase().includes(queryTerm) ||
    p.barcode?.includes(queryTerm)
  )
  return filtered.map(normalizeProduct)
}

// ADD product
export async function createProduct(productData) {
  try {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    })

    if (response.ok) {
      return normalizeProduct(await response.json())
    }
  } catch (err) {
    console.warn('Backend server unavailable, adding directly to Firestore:', err)
  }

  const firestoreRes = await firestoreAddProduct(productData)
  return normalizeProduct(firestoreRes)
}

// UPDATE product
export async function updateProduct(id, productData) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/products/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      }
    )

    if (response.ok) {
      return normalizeProduct(await response.json())
    }
  } catch (err) {
    console.warn('Backend server unavailable, updating directly in Firestore:', err)
  }

  await firestoreUpdateProduct(id, productData)
  return normalizeProduct({ id, ...productData })
}

// DELETE product
export async function deleteProduct(id) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/products/${encodeURIComponent(id)}`,
      {
        method: 'DELETE'
      }
    )

    if (response.ok) {
      return response.json()
    }
  } catch (err) {
    console.warn('Backend server unavailable, deleting directly from Firestore:', err)
  }

  await firestoreDeleteProduct(id)
  return { message: `Product ${id} deleted successfully` }
}