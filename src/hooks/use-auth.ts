import { useState, useEffect, useCallback } from 'react'

export interface User {
  did: string
  handle: string
  displayName: string
  avatar: string
}

export interface AuthState {
  isLoading: boolean
  isAuthenticated: boolean
  user: User | null
}

// Parse cookies from document.cookie
function parseCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {}
  return Object.fromEntries(
    document.cookie.split(';').map((cookie) => {
      const [key, ...value] = cookie.trim().split('=')
      return [key, decodeURIComponent(value.join('='))]
    })
  )
}

export function useAuth() {
  // Start with loading state to prevent flash of login button
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
  })

  const checkAuthStatus = useCallback(() => {
    const cookies = parseCookies()
    const handle = cookies.bsky_handle

    if (!handle) {
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
      })
      return
    }

    setState({
      isLoading: false,
      isAuthenticated: true,
      user: {
        did: cookies.bsky_did || '',
        handle: handle,
        displayName: cookies.bsky_display_name || '',
        avatar: cookies.bsky_avatar || '',
      },
    })
  }, [])

  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

  const login = useCallback(async (handle: string) => {
    // For now, we'll handle OAuth initiation differently
    // This will be updated when we have the proper OAuth flow
    const baseUrl = window.location.origin
    window.location.href = `${baseUrl}/auth/login?handle=${encodeURIComponent(handle)}`
  }, [])

  const logout = useCallback(async () => {
    // Clear cookies by setting them to expired
    document.cookie = 'bsky_did=; path=/; max-age=0'
    document.cookie = 'bsky_handle=; path=/; max-age=0'
    document.cookie = 'bsky_display_name=; path=/; max-age=0'
    document.cookie = 'bsky_avatar=; path=/; max-age=0'

    setState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
    })
  }, [])

  return {
    ...state,
    login,
    logout,
    refresh: checkAuthStatus,
  }
}
