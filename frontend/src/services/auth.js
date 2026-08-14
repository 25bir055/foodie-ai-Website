import { auth, googleProvider } from '../firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  updatePassword,
  deleteUser
} from 'firebase/auth'

/** Login with Email & Password */
export async function loginWithEmail(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

/** Signup with Email, Password & Display Name */
export async function signupWithEmail(email, password, displayName) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await updateProfile(userCredential.user, { displayName })
  }
  return userCredential.user
}

/** Login with Google popup */
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

/** Logout */
export async function logoutUser() {
  await signOut(auth)
}

/** Change Password */
export async function changeUserPassword(newPassword) {
  if (!auth.currentUser) throw new Error('No authenticated user')
  await updatePassword(auth.currentUser, newPassword)
}

/** Delete Account */
export async function deleteUserAccount() {
  if (!auth.currentUser) throw new Error('No authenticated user')
  await deleteUser(auth.currentUser)
}
