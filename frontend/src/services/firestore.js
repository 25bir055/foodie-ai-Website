import { db } from '../firebase'
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore'

const COLLECTION = 'products'

/** Fetch all products from Firestore */
export async function getAllProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION))
    const products = []
    querySnapshot.forEach((docSnap) => {
      products.push({ firestoreId: docSnap.id, ...docSnap.data() })
    })
    return products
  } catch (err) {
    console.error('Error fetching all products from Firestore:', err)
    return []
  }
}

/** Fetch product by dataset id (e.g. 'p1') */
export async function getProductById(id) {
  try {
    const docRef = doc(db, COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { firestoreId: docSnap.id, ...docSnap.data() }
    }
    // Fallback query by 'id' field if document ID isn't 'id'
    const q = query(collection(db, COLLECTION), where('id', '==', id))
    const qSnap = await getDocs(q)
    if (!qSnap.empty) {
      const first = qSnap.docs[0]
      return { firestoreId: first.id, ...first.data() }
    }
    return null
  } catch (err) {
    console.error('Error fetching product by ID:', err)
    return null
  }
}

/** Fetch product by barcode */
export async function getProductByBarcode(barcode) {
  try {
    const q = query(collection(db, COLLECTION), where('barcode', '==', String(barcode).trim()))
    const qSnap = await getDocs(q)
    if (!qSnap.empty) {
      const first = qSnap.docs[0]
      return { firestoreId: first.id, ...first.data() }
    }
    return null
  } catch (err) {
    console.error('Error fetching product by barcode:', err)
    return null
  }
}

/** Search products by name, brand, category, or barcode */
export async function searchProducts(searchTerm) {
  try {
    const all = await getAllProducts()
    if (!searchTerm || !searchTerm.trim()) return all
    const term = searchTerm.toLowerCase().trim()
    return all.filter((p) =>
      p.name?.toLowerCase().includes(term) ||
      p.brand?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term) ||
      p.barcode?.includes(term)
    )
  } catch (err) {
    console.error('Error searching products:', err)
    return []
  }
}

/** Add a new product to Firestore */
export async function addProduct(productData) {
  try {
    const docId = productData.id || `p_${Date.now()}`
    const finalData = { ...productData, id: docId }
    await setDoc(doc(db, COLLECTION, docId), finalData)
    return { firestoreId: docId, ...finalData }
  } catch (err) {
    console.error('Error adding product to Firestore:', err)
    throw err
  }
}

/** Update an existing product */
export async function updateProduct(id, productData) {
  try {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, productData)
    return true
  } catch (err) {
    console.error('Error updating product:', err)
    throw err
  }
}

/** Delete a product */
export async function deleteProduct(id) {
  try {
    const docRef = doc(db, COLLECTION, id)
    await deleteDoc(docRef)
    return true
  } catch (err) {
    console.error('Error deleting product:', err)
    throw err
  }
}
