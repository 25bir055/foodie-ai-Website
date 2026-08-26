import { PRODUCTS } from '../data/mockData'

export function getApiBaseUrl() {
  // 1. Check custom saved server URL (e.g. from local storage / mobile config)
  try {
    const custom = localStorage.getItem('foodie_api_base_url')
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '')
    }
  } catch (e) {}

  // 2. Check if running inside native mobile app (Capacitor)
  const isCapacitor = typeof window !== 'undefined' && (
    window.Capacitor !== undefined ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'))
  )

  if (isCapacitor) {
    // Connect to live Cloudflare tunnel
    return 'https://newspapers-thoroughly-english-physics.trycloudflare.com/api'
  }

  // 3. Check environment variable
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '')
  }

  // 4. Default for web browser on PC
  let hostname = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'
  if (hostname === 'localhost') hostname = '127.0.0.1'
  return `http://${hostname}:5000/api`
}

export function setCustomApiBaseUrl(url) {
  if (!url) {
    localStorage.removeItem('foodie_api_base_url')
  } else {
    localStorage.setItem('foodie_api_base_url', url.trim().replace(/\/+$/, ''))
  }
}

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
        : (typeof product.ingredients === 'string' && product.ingredients.trim()
            ? product.ingredients.split(',').map(s => s.trim()).filter(Boolean)
            : []),

    allergens: Array.isArray(product.allergens)
      ? product.allergens
      : (typeof product.allergens === 'string' && product.allergens.trim()
          ? product.allergens.split(',').map(s => s.trim()).filter(Boolean)
          : []),

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
    const res = await fetch(`${getApiBaseUrl()}/products?limit=1000`)
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

  // 1. Check if it's an AI-generated/scanned product in session storage
  try {
    const cachedAi = sessionStorage.getItem(`foodie_product_${id}`)
    if (cachedAi) {
      return normalizeProduct(JSON.parse(cachedAi))
    } 
  } catch (e) {
    // ignore
  }

  // 2. Check local scan history
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('foodie_scan_history'))
    for (const k of keys) {
      const list = JSON.parse(localStorage.getItem(k) || '[]')
      const match = list.find(p => String(p.id) === String(id) || String(p.barcode) === String(id))
      if (match) return normalizeProduct(match)
    }
  } catch (e) {
    // ignore
  }

  // 3. Fetch from backend MongoDB API
  try {
    const res = await fetch(`${getApiBaseUrl()}/products/${encodeURIComponent(id)}`)
    if (res.ok) {
      const product = await res.json()
      if (product) return normalizeProduct(product)
    }
  } catch (err) {
    console.warn('Backend fetch by ID failed, using fallback:', err)
  }

  // 4. Check mock products
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

  // 1. Check local session storage
  try {
    const cachedAi = sessionStorage.getItem(`foodie_product_${cleanBarcode}`)
    if (cachedAi) {
      return normalizeProduct(JSON.parse(cachedAi))
    }
  } catch (e) {}

  // 2. Fetch from backend MongoDB API
  try {
    const res = await fetch(`${getApiBaseUrl()}/products/barcode/${encodeURIComponent(cleanBarcode)}`)
    if (res.ok) {
      const product = await res.json()
      if (product) return normalizeProduct(product)
    }
  } catch (err) {
    console.warn('Backend fetch by barcode failed, using fallback:', err)
  }

  // 3. Check mock products
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
    const url = queryTerm
      ? `${getApiBaseUrl()}/products?search=${encodeURIComponent(queryTerm)}&limit=1000`
      : `${getApiBaseUrl()}/products?limit=1000`
    const res = await fetch(url)
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
    const res = await fetch(`${getApiBaseUrl()}/products`, {
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
    const res = await fetch(`${getApiBaseUrl()}/products/${encodeURIComponent(id)}`, {
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
    const res = await fetch(`${getApiBaseUrl()}/products/${encodeURIComponent(id)}`, {
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
    const res = await fetch(`${getApiBaseUrl()}/scans`, {
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

// Fetch personalized health score
export async function fetchPersonalizedHealthScore(product, userProfile) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/ml/predict-health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nutrition: product,
        profile: userProfile
      })
    })
    
    if (res.ok) {
      return await res.json()
    }
    return null
  } catch (err) {
    console.error('Failed to fetch personalized score:', err)
    return null
  }
}

// Prescription Methods
export async function fetchPrescriptions() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/prescriptions`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    if (res.ok) return await res.json()
  } catch (err) {
    console.error('Failed to fetch prescriptions', err)
  }
  return []
}

export async function savePrescription(data) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/prescriptions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify(data)
    })
    if (res.ok) return await res.json()
  } catch (err) {
    console.error('Failed to save prescription', err)
    throw err
  }
}

export async function deletePrescription(id) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/prescriptions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    if (res.ok) return await res.json()
  } catch (err) {
    console.error('Failed to delete prescription', err)
  }
}

// Helper to get authenticated user token
function getAuthToken() {
  return localStorage.getItem('foodie_auth_token') || localStorage.getItem('token') || ''
}

// Helper to get user-isolated storage key for family members
function getFamilyStorageKey() {
  try {
    const raw = localStorage.getItem('foodie_auth_user')
    if (raw) {
      const u = JSON.parse(raw)
      const uid = u._id || u.uid || u.email
      if (uid) return `foodie_family_members_${uid}`
    }
  } catch (e) {}
  return 'foodie_family_members_guest'
}

// Family Methods - 100% User-Isolated
export async function fetchFamilyMembers() {
  const cacheKey = getFamilyStorageKey()
  try {
    const token = getAuthToken()
    const headers = {}
    if (token && token !== 'null' && token !== 'undefined') {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`${getApiBaseUrl()}/family`, { headers })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) {
        localStorage.setItem(cacheKey, JSON.stringify(data))
        return data
      }
    }
  } catch (err) {
    console.error('Failed to fetch family members from server, using user-scoped local storage cache', err)
  }
  const cached = localStorage.getItem(cacheKey)
  return cached ? JSON.parse(cached) : []
}

export async function createFamilyMember(data) {
  const cacheKey = getFamilyStorageKey()
  try {
    const token = getAuthToken()
    const headers = { 'Content-Type': 'application/json' }
    if (token && token !== 'null' && token !== 'undefined') {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`${getApiBaseUrl()}/family`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })
    if (res.ok) {
      const saved = await res.json()
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]')
      localStorage.setItem(cacheKey, JSON.stringify([...cached, saved]))
      return saved
    }
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error || `Server returned ${res.status}`)
  } catch (err) {
    console.error('Failed to create family member on server:', err)
    // Local user-isolated offline save fallback
    const localMember = {
      ...data,
      _id: 'local_' + Date.now(),
      createdAt: new Date().toISOString()
    }
    const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]')
    const updated = [...cached, localMember]
    localStorage.setItem(cacheKey, JSON.stringify(updated))
    return localMember
  }
}

export async function updateFamilyMember(id, data) {
  const cacheKey = getFamilyStorageKey()
  try {
    const token = getAuthToken()
    const headers = { 'Content-Type': 'application/json' }
    if (token && token !== 'null' && token !== 'undefined') {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`${getApiBaseUrl()}/family/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    })
    if (res.ok) {
      const updatedMember = await res.json()
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]')
      const nextList = cached.map(m => m._id === id ? updatedMember : m)
      localStorage.setItem(cacheKey, JSON.stringify(nextList))
      return updatedMember
    }
  } catch (err) {
    console.error('Failed to update family member on server:', err)
  }
  // Local storage update fallback
  const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]')
  const nextList = cached.map(m => m._id === id ? { ...m, ...data } : m)
  localStorage.setItem(cacheKey, JSON.stringify(nextList))
  return { _id: id, ...data }
}

export async function deleteFamilyMember(id) {
  const cacheKey = getFamilyStorageKey()
  try {
    const token = getAuthToken()
    const headers = {}
    if (token && token !== 'null' && token !== 'undefined') {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`${getApiBaseUrl()}/family/${id}`, {
      method: 'DELETE',
      headers
    })
  } catch (err) {
    console.error('Failed to delete family member from server:', err)
  }
  // Local storage delete sync
  const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]')
  const nextList = cached.filter(m => m._id !== id)
  localStorage.setItem(cacheKey, JSON.stringify(nextList))
  return { message: 'Deleted' }
}