import { initializeApp, getApps, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import type { NodeSavedState, NodeSavedSession } from '@atproto/oauth-client-node'

// Initialize Firebase Admin
let app: App
let db: Firestore

function getFirestoreDb(): Firestore {
  if (db) return db

  if (getApps().length === 0) {
    // In production (Cloud Run), uses default credentials automatically
    // Locally, uses Application Default Credentials from `gcloud auth application-default login`
    app = initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
    })
  } else {
    app = getApps()[0]
  }

  // Use named database instead of default
  const databaseId = process.env.FIRESTORE_DATABASE_ID || 'blocksky-prod-firestore'
  db = getFirestore(app, databaseId)

  // OAuth state objects can contain undefined values, which Firestore rejects by default
  db.settings({ ignoreUndefinedProperties: true })

  return db
}

// Collection names
const STATE_COLLECTION = 'oauth_states'
const SESSION_COLLECTION = 'oauth_sessions'
const LOCKS_COLLECTION = 'oauth_locks'

// Lock configuration
const LOCK_TIMEOUT_MS = 30000 // 30 seconds max lock duration
const LOCK_RETRY_MS = 100 // Retry every 100ms
const LOCK_MAX_RETRIES = 50 // Max 5 seconds of retrying

// Distributed lock implementation using Firestore
async function acquireLock(lockId: string): Promise<boolean> {
  const db = getFirestoreDb()
  const lockRef = db.collection(LOCKS_COLLECTION).doc(lockId)
  const now = Date.now()

  try {
    const result = await db.runTransaction(async (transaction) => {
      const lockDoc = await transaction.get(lockRef)

      if (lockDoc.exists) {
        const data = lockDoc.data()
        // Check if lock is expired
        if (data && data.expiresAt && data.expiresAt.toMillis() > now) {
          // Lock is held by someone else and not expired
          return false
        }
      }

      // Acquire the lock
      transaction.set(lockRef, {
        acquiredAt: new Date(),
        expiresAt: new Date(now + LOCK_TIMEOUT_MS),
      })
      return true
    })

    return result
  } catch {
    return false
  }
}

async function releaseLock(lockId: string): Promise<void> {
  const db = getFirestoreDb()
  try {
    await db.collection(LOCKS_COLLECTION).doc(lockId).delete()
  } catch {
    // Ignore errors when releasing lock
  }
}

async function withLock<T>(lockId: string, fn: () => Promise<T>): Promise<T> {
  // Try to acquire lock with retries
  for (let i = 0; i < LOCK_MAX_RETRIES; i++) {
    if (await acquireLock(lockId)) {
      try {
        return await fn()
      } finally {
        await releaseLock(lockId)
      }
    }
    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS))
  }

  // If we couldn't get the lock after retries, run anyway (fail-open)
  // This prevents deadlocks if something goes wrong with lock cleanup
  return await fn()
}

// State store for OAuth flow (temporary, used during auth)
export const firestoreStateStore = {
  async set(key: string, state: NodeSavedState): Promise<void> {
    const db = getFirestoreDb()
    await db.collection(STATE_COLLECTION).doc(key).set({
      state,
      createdAt: new Date(),
      // States expire after 10 minutes (OAuth flow should complete quickly)
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    })
  },

  async get(key: string): Promise<NodeSavedState | undefined> {
    const db = getFirestoreDb()
    const doc = await db.collection(STATE_COLLECTION).doc(key).get()
    if (!doc.exists) return undefined

    const data = doc.data()
    if (!data) return undefined

    // Check if expired
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
      await this.del(key)
      return undefined
    }

    return data.state as NodeSavedState
  },

  async del(key: string): Promise<void> {
    const db = getFirestoreDb()
    await db.collection(STATE_COLLECTION).doc(key).delete()
  },
}

// Session store for authenticated users (persistent)
export const firestoreSessionStore = {
  async set(sub: string, session: NodeSavedSession): Promise<void> {
    const db = getFirestoreDb()
    // Use a sanitized version of the DID as the document ID
    const docId = sub.replace(/[:/]/g, '_')
    await db.collection(SESSION_COLLECTION).doc(docId).set({
      sub,
      session,
      updatedAt: new Date(),
    })
  },

  async get(sub: string): Promise<NodeSavedSession | undefined> {
    const db = getFirestoreDb()
    const docId = sub.replace(/[:/]/g, '_')
    const doc = await db.collection(SESSION_COLLECTION).doc(docId).get()
    if (!doc.exists) return undefined

    const data = doc.data()
    return data?.session as NodeSavedSession | undefined
  },

  async del(sub: string): Promise<void> {
    const db = getFirestoreDb()
    const docId = sub.replace(/[:/]/g, '_')
    await db.collection(SESSION_COLLECTION).doc(docId).delete()
  },

  // Lock mechanism to prevent concurrent token refreshes
  async lock<T>(sub: string, fn: () => Promise<T>): Promise<T> {
    const lockId = `session_${sub.replace(/[:/]/g, '_')}`
    return withLock(lockId, fn)
  },
}
