import { defineEventHandler, getCookie } from 'h3'

// This endpoint provides tokens temporarily for client-side blocking
// Only works for app password auth - OAuth tokens remain httpOnly
export default defineEventHandler(async (event) => {
  const authMethod = getCookie(event, 'auth_method')

  if (authMethod !== 'app_password') {
    return { success: false, error: 'Client-side blocking only available with app password' }
  }

  const userDid = getCookie(event, 'bsky_did')
  const accessJwt = getCookie(event, 'bsky_access_jwt')
  const refreshJwt = getCookie(event, 'bsky_refresh_jwt')

  if (!userDid || !accessJwt || !refreshJwt) {
    return { success: false, error: 'Session expired. Please log in again.' }
  }

  // Return tokens for temporary client-side use
  // These should be used immediately and cleared after blocking
  return {
    success: true,
    tokens: {
      userDid,
      accessJwt,
      refreshJwt,
    },
  }
})
