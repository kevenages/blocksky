import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

let app: App

if (getApps().length === 0) {
  // In production, use service account credentials
  // In development with emulators, we can use a dummy project
  if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    app = initializeApp({
      credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
      projectId: process.env.FIREBASE_PROJECT_ID,
    })
  } else {
    // Development mode - connect to emulators
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'

    app = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'blocksky-dev',
    })
  }
} else {
  app = getApps()[0]
}

export const adminDb = getFirestore(app)

export default app
