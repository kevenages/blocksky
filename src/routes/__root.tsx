import { HeadContent, Scripts, createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { Header } from '@/components/layout/header'
import { CookieConsentBanner } from '@/components/cookie-consent-banner'
import { CookiePolicySheet } from '@/components/cookie-policy-sheet'
import { PrivacyPolicySheet } from '@/components/privacy-policy-sheet'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { RiBlueskyFill } from 'react-icons/ri'
import { Heart } from 'lucide-react'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'BlockSky - Mass Blocking for Bluesky',
      },
      {
        name: 'description',
        content: 'Protect yourself on Bluesky. Mass block followers of problematic accounts with one click.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/favicon.png',
      },
      {
        rel: 'apple-touch-icon',
        href: '/logo192.png',
      },
    ],
  }),

  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Prevent FOUC - hide body until styles load */}
        <style dangerouslySetInnerHTML={{ __html: `
          body { opacity: 0; }
          body.ready { opacity: 1; transition: opacity 0.1s ease-in; }
        `}} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <TooltipProvider>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              <Outlet />
            </main>
            <footer className="border-t py-6">
              <div className="container mx-auto px-4">
                <div className="flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  <div className="flex gap-4">
                    <a
                      href="https://bsky.app/profile/blocksky.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                    >
                      <RiBlueskyFill className="h-4 w-4" />
                      @blocksky.app
                    </a>
                    <a
                      href="https://ko-fi.com/blockskyapp"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-pink-500 transition-colors"
                    >
                      <Heart className="h-4 w-4" />
                      Support us
                    </a>
                  </div>
                  <div className="flex gap-4">
                    <PrivacyPolicySheet />
                    <CookiePolicySheet />
                  </div>
                  <p>&copy; {new Date().getFullYear()} BlockSky. All rights reserved.</p>
                </div>
              </div>
            </footer>
          </div>
          <Toaster />
          <CookieConsentBanner />
          </TooltipProvider>
        </ThemeProvider>
        <Scripts />
        <script dangerouslySetInnerHTML={{ __html: `document.body.classList.add('ready');` }} />
      </body>
    </html>
  )
}
