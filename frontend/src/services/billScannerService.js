import { getApiBaseUrl } from './api'
import Tesseract from 'tesseract.js'

const getHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Upload and analyze a grocery bill / receipt image with Foodie AI
 * @param {File|Blob|string} imageFile - Image file or base64 string
 * @param {Object} userProfile - User allergies, conditions, diet preferences
 * @param {Array} prescriptionInfo - Active prescriptions list
 * @param {string|null} customApiKey - Optional Gemini Key
 * @param {Function|null} onProgress - Progress status callback
 * @param {Array|null} familyMembers - List of family member profiles
 */
export async function analyzeBillWithAI(imageFile, userProfile = null, prescriptionInfo = null, customApiKey = null, onProgress = null, familyMembers = null) {
  if (!imageFile) {
    throw new Error('Please select or capture a grocery bill / receipt photo to analyze.')
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('No internet connection. Please connect to the internet to scan receipts.')
  }

  const baseUrl = getApiBaseUrl()
  const formData = new FormData()

  let ocrText = ''
  if (typeof imageFile === 'string' && !imageFile.startsWith('data:')) {
    ocrText = imageFile
    formData.append('rawText', ocrText)
  } else {
    formData.append('image', imageFile)
    
    // Run client-side Tesseract OCR on user's bill image with timeout protection
    try {
      if (onProgress) onProgress('🔍 Reading text from receipt with OCR engine...')
      const tesseractPromise = Tesseract.recognize(imageFile, 'eng')
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('OCR timeout')), 4000))
      const res = await Promise.race([tesseractPromise, timeoutPromise])
      ocrText = res?.data?.text || ''
      if (ocrText && ocrText.trim().length > 3) {
        console.log(`🧾 Client Tesseract extracted ${ocrText.length} characters from receipt.`)
        formData.append('rawText', ocrText)
      }
    } catch (ocrErr) {
      console.warn('Client OCR bypassed, backend AI will analyze image directly:', ocrErr.message)
    }
  }

  if (userProfile) {
    formData.append('userProfile', JSON.stringify(userProfile))
  }

  if (prescriptionInfo) {
    formData.append('prescriptionInfo', JSON.stringify(prescriptionInfo))
  }

  // Include family members for safety & allergy check
  let membersList = familyMembers
  if (!membersList || membersList.length === 0) {
    try {
      const cached = localStorage.getItem('foodie_family_members')
      if (cached) membersList = JSON.parse(cached)
    } catch (e) {}
  }
  if (membersList && membersList.length > 0) {
    formData.append('familyMembers', JSON.stringify(membersList))
  }

  const headers = {
    ...getHeaders()
  }

  if (customApiKey) {
    headers['x-gemini-api-key'] = customApiKey
  }

  try {
    const response = await fetch(`${baseUrl}/bills/analyze`, {
      method: 'POST',
      headers,
      body: formData
    })

    const contentType = response.headers.get('content-type') || ''
    let result = null

    if (contentType.includes('application/json')) {
      result = await response.json()
    } else {
      const textResponse = await response.text()
      console.error('Non-JSON bill scan response:', textResponse)
      throw new Error(`Server returned unexpected response (${response.status}).`)
    }

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to analyze grocery receipt. Please make sure items on receipt are legible.')
    }

    return result.data
  } catch (err) {
    console.error('Bill analysis service error:', err)
    throw err
  }
}

/**
 * Fetch all saved bills for the current user
 */
export async function fetchUserBills() {
  const baseUrl = getApiBaseUrl()
  try {
    const response = await fetch(`${baseUrl}/bills`, {
      headers: getHeaders()
    })
    const data = await response.json()
    return data.data || []
  } catch (err) {
    console.error('Failed to fetch bills history:', err)
    return []
  }
}

/**
 * Delete a saved bill
 */
export async function deleteBillRecord(billId) {
  const baseUrl = getApiBaseUrl()
  try {
    const response = await fetch(`${baseUrl}/bills/${billId}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    const data = await response.json()
    return data.success
  } catch (err) {
    console.error('Failed to delete bill:', err)
    return false
  }
}
