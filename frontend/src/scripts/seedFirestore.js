/**
 * seedFirestore.js — Run to populate Firestore with all 12 products.
 *
 * Usage from frontend directory:
 *   npx vite-node src/scripts/seedFirestore.js
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { PRODUCTS } from '../data/mockData.js'

// Reads from .env if vite-node is used
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

async function seed() {
  console.log('🌱 Initializing Firebase for Seeding...')
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'your-api-key') {
    console.warn('⚠️ Please fill in VITE_FIREBASE_* variables in .env file before running seed script!')
    return
  }

  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  console.log(`📦 Seeding ${PRODUCTS.length} products to Firestore collection 'products'...`)

  for (const product of PRODUCTS) {
    try {
      await setDoc(doc(db, 'products', product.id), product)
      console.log(` ✅ Seeded: ${product.name} (${product.id})`)
    } catch (err) {
      console.error(` ❌ Failed to seed ${product.id}:`, err.message)
    }
  }

  console.log('✨ Firestore seeding complete!')
}

seed()
