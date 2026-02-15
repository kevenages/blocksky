// Google Analytics 4 helper
// Only active in production (blocksky.app)

const GA_MEASUREMENT_ID = 'G-RVY854R6WS'

export function isProduction(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'blocksky.app'
}

// Track page views (called automatically by GA, but can be used for SPA navigation)
export function trackPageView(path?: string) {
  if (!isProduction()) return

  window.gtag?.('config', GA_MEASUREMENT_ID, {
    page_path: path || window.location.pathname,
  })
}

// Track custom events
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (!isProduction()) return

  window.gtag?.('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  })
}

// Set user property for auth method segmentation
export function setAuthMethod(method: 'oauth' | 'app_password') {
  if (!isProduction()) return

  window.gtag?.('set', 'user_properties', {
    auth_method: method,
  })
}

// Common events for BlockSky
export const analytics = {
  // Auth events
  loginStart: (method: 'oauth' | 'app_password') =>
    trackEvent('login_start', 'auth', method),

  loginSuccess: (method: 'oauth' | 'app_password') => {
    trackEvent('login_success', 'auth', method)
    setAuthMethod(method)
  },

  logout: () =>
    trackEvent('logout', 'auth'),

  // Blocking events
  blockingStart: (type: 'followers' | 'following', count: number) =>
    trackEvent('blocking_start', 'blocking', type, count),

  blockingComplete: (type: 'followers' | 'following', blocked: number) =>
    trackEvent('blocking_complete', 'blocking', type, blocked),

  blockingRateLimit: (blocked: number) =>
    trackEvent('rate_limit_hit', 'blocking', undefined, blocked),

  blockingResume: (remaining: number) =>
    trackEvent('blocking_resume', 'blocking', undefined, remaining),

  // UI interactions
  clickFaq: (question: string) =>
    trackEvent('faq_click', 'engagement', question),

  clickExternalLink: (url: string) =>
    trackEvent('external_link', 'engagement', url),

  openPolicy: (policy: 'terms' | 'privacy' | 'cookies') =>
    trackEvent('policy_open', 'engagement', policy),

  // Cookie consent
  cookieConsent: (accepted: boolean) =>
    trackEvent('cookie_consent', 'privacy', accepted ? 'accepted' : 'declined'),

  // Block Following UX
  blockFollowingConfirm: (handle: string, count: number) =>
    trackEvent('block_following_confirm', 'blocking', handle, count),

  blockFollowingCancel: (handle: string) =>
    trackEvent('block_following_cancel', 'blocking', handle),

  blockAlsoTargetToggle: (on: boolean) =>
    trackEvent('block_also_target_toggle', 'blocking', on ? 'on' : 'off'),

  // Easter egg
  easterEggFound: () =>
    trackEvent('easter_egg_found', 'engagement'),

  easterEggGameOver: (score: number) =>
    trackEvent('easter_egg_game_over', 'engagement', undefined, score),

  easterEggWin: (score: number) =>
    trackEvent('easter_egg_win', 'engagement', undefined, score),
}

// Type declaration for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}
