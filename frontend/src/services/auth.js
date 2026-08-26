import { auth, googleProvider } from '../firebase'
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth'

import { getApiBaseUrl } from './api'

// TOKEN & USER KEYS
const TOKEN_KEY = 'foodie_auth_token'
const USER_KEY = 'foodie_auth_user'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setAuthSession(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem('token', token)
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('token')
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem('foodie_family_members')
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('foodie_family_members_'))
    keys.forEach(k => localStorage.removeItem(k))
  } catch (e) {}
}

/** Login with Email & Password */
export async function loginWithEmail(email, password) {
  const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Invalid email or password.')
  }

  setAuthSession(data.token, data.user)
  return data.user
}

/** Signup with Email, Password & Display Name */
export async function signupWithEmail(email, password, displayName) {
  const res = await fetch(`${getApiBaseUrl()}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName })
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Signup failed. Please try again.')
  }

  setAuthSession(data.token, data.user)
  return data.user
}

/** Login with Google Popup (Firebase) & sync with MongoDB */
export async function loginWithGoogle() {
  const isMobileApp = typeof window !== 'undefined' && (
    window.Capacitor !== undefined ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'))
  )

  if (isMobileApp) {
    throw new Error('Google Browser Popup is not supported in mobile APK. Please sign in with Email/Password or tap "🚀 Explore as Guest".')
  }

  try {
    // Opens official Firebase Google account selection popup
    const result = await signInWithPopup(auth, googleProvider)
    return await syncGoogleUserWithBackend(result.user)
  } catch (err) {
    if (err.code === 'auth/missing-initial-state' || err.message?.includes('sessionStorage') || err.message?.includes('initial state')) {
      throw new Error('Google Web Popup is not supported in mobile app environment. Please use Email / Password or tap "🚀 Explore as Guest".')
    }
    if (err.code === 'auth/popup-blocked') {
      console.warn('Popup blocked, falling back to Google Sign-In Redirect...')
      await signInWithRedirect(auth, googleProvider)
      return null
    }
    if (err.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'domain'
      throw new Error(
        `Google Sign-In blocked for "${currentHost}". Please add "${currentHost}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`
      )
    }
    throw err
  }
}

/** Helper to sync Google user with backend */
async function syncGoogleUserWithBackend(firebaseUser) {
  const email = firebaseUser.email
  const displayName = firebaseUser.displayName || email.split('@')[0]
  const photoUrl = firebaseUser.photoURL || ''

  const res = await fetch(`${getApiBaseUrl()}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, displayName, photoUrl })
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Google Sign-In server sync failed.')
  }

  setAuthSession(data.token, data.user)
  return data.user
}

/** Handle redirect result on startup if user came back from Google Sign-In redirect */
export async function handleGoogleRedirect() {
  try {
    const isMobileApp = typeof window !== 'undefined' && (
      window.Capacitor !== undefined ||
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'))
    )
    if (isMobileApp) return null

    const result = await getRedirectResult(auth)
    if (result && result.user) {
      console.log('✅ Redirect Sign-In detected, syncing user...')
      return await syncGoogleUserWithBackend(result.user)
    }
  } catch (err) {
    // Silently ignore storage-partitioned redirect checks on mobile
    if (err.code !== 'auth/missing-initial-state') {
      console.warn('Google redirect check:', err.message)
    }
  }
  return null
}

/** Fetch Current User Profile from backend */
export async function getCurrentUser() {
  const token = getStoredToken()
  if (!token) return null

  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) {
      clearAuthSession()
      return null
    }
    const user = await res.json()
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    return user
  } catch (err) {
    console.warn('Could not fetch user from backend:', err)
    return getStoredUser()
  }
}

/** Update User Profile (displayName and/or profile settings) */
export async function updateUserProfile(profileData) {
  const token = getStoredToken()
  if (!token) throw new Error('Not logged in')

  const res = await fetch(`${getApiBaseUrl()}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update profile')

  localStorage.setItem(USER_KEY, JSON.stringify(data))
  return data
}

/** Change Password */
export async function changeUserPassword(newPassword) {
  const token = getStoredToken()
  if (!token) throw new Error('Not logged in')

  const res = await fetch(`${getApiBaseUrl()}/auth/change-password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ newPassword })
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to change password')
  return data
}

/** Delete Account */
export async function deleteUserAccount() {
  const token = getStoredToken()
  if (!token) throw new Error('Not logged in')

  const res = await fetch(`${getApiBaseUrl()}/auth/account`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete account')

  clearAuthSession()
  return data
}

/** Logout */
export async function logoutUser() {
  try {
    if (auth) {
      await signOut(auth)
    }
  } catch (e) {
    console.warn('Firebase signOut error:', e)
  }
  clearAuthSession()
  try {
    localStorage.removeItem('foodie_auth_token')
    localStorage.removeItem('token')
    localStorage.removeItem('foodie_auth_user')
    localStorage.removeItem('foodie_family_members')
  } catch (e) {}
}
