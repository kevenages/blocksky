import { defineEventHandler, readBody } from 'h3'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Initialize Firebase Admin if not already initialized
function getDb() {
  if (getApps().length === 0) {
    // In production, use GOOGLE_APPLICATION_CREDENTIALS or default credentials
    // In development, you may need to set up a service account
    initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'blocksky-app',
    })
  }
  return getFirestore()
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string }>(event)
  const email = body?.email?.trim().toLowerCase()

  if (!email || !EMAIL_REGEX.test(email)) {
    return { success: false, error: 'Invalid email address' }
  }

  try {
    const db = getDb()
    const waitlistRef = db.collection('premium_waitlist')

    // Check if email already exists
    const existing = await waitlistRef.where('email', '==', email).limit(1).get()
    if (!existing.empty) {
      return { success: true, message: 'already_subscribed' }
    }

    // Add to waitlist
    await waitlistRef.add({
      email,
      createdAt: new Date(),
      source: 'website',
    })

    return { success: true, message: 'subscribed' }
  } catch (error) {
    console.error('Waitlist signup error:', error)
    return { success: false, error: 'Failed to join waitlist' }
  }
})
