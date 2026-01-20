'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const CONSENT_COOKIE_NAME = 'blocksky_cookie_consent'

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if consent has already been given
    const consent = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`))

    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const setConsentCookie = (value: 'accepted' | 'declined') => {
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 1) // 1 year
    document.cookie = `${CONSENT_COOKIE_NAME}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
  }

  const handleAccept = () => {
    setConsentCookie('accepted')
    setShowBanner(false)
    // Analytics would be loaded here if implemented
  }

  const handleDecline = () => {
    setConsentCookie('declined')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="mx-auto max-w-2xl p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            We use cookies to improve your experience and for analytics purposes.
            By clicking "Accept," you consent to analytics cookies.
            You can opt out by clicking "Decline."
          </p>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleDecline}>
              Decline
            </Button>
            <Button size="sm" onClick={handleAccept}>
              Accept
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
