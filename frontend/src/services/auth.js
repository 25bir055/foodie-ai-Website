import { auth, googleProvider } from '../firebase'
import { signInWithPopup } from 'firebase/auth'

import { getApiBaseUrl } from './api'

const API_BASE_URL = getApiBaseUrl()

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
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/** Login with Email & Password */
export async function loginWithEmail(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
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
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
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
  try {
    // Opens official Firebase Google account selection popup
    const result = await signInWithPopup(auth, googleProvider)
    const firebaseUser = result.user

    const email = firebaseUser.email
    const displayName = firebaseUser.displayName || email.split('@')[0]
    const photoUrl = firebaseUser.photoURL || ''

    // Sync / create in MongoDB backend
    const res = await fetch(`${API_BASE_URL}/auth/google`, {
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
  } catch (err) {
    if (err.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'domain'
      throw new Error(
        `Google Sign-In blocked for "${currentHost}". Please add "${currentHost}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`
      )
    }
    throw err
  }
}

/** Fetch Current User Profile from backend */
export async function getCurrentUser() {
  const token = getStoredToken()
  if (!token) return null

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
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

  const res = await fetch(`${API_BASE_URL}/auth/profile`, {
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

  const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
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

  const res = await fetch(`${API_BASE_URL}/auth/account`, {
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
  clearAuthSession()
}
