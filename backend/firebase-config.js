const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

let db = null
let auth = null
let firebaseInitialized = false

try {
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json'
  const absoluteSaPath = path.resolve(__dirname, saPath)

  if (fs.existsSync(absoluteSaPath)) {
    const serviceAccount = require(absoluteSaPath)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    })
    firebaseInitialized = true
    console.log('✅ Firebase Admin initialized with Service Account Cert.')
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== 'foodie-ai-xxxx') {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID
    })
    firebaseInitialized = true
    console.log('✅ Firebase Admin initialized with Project ID:', process.env.FIREBASE_PROJECT_ID)
  } else {
    console.warn('⚠️ Firebase Admin running in uninitialized mode. Add service account key or set FIREBASE_PROJECT_ID in backend/.env')
  }

  if (firebaseInitialized) {
    db = admin.firestore()
    auth = admin.auth()
  }
} catch (err) {
  console.error('❌ Error initializing Firebase Admin:', err.message)
}

module.exports = { admin, db, auth, firebaseInitialized }
