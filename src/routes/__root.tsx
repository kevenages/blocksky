import { HeadContent, Scripts, createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { Header } from '@/components/layout/header'
import { CookieConsentBanner } from '@/components/cookie-consent-banner'
import { CookiePolicySheet } from '@/components/cookie-policy-sheet'
import { PrivacyPolicySheet } from '@/components/privacy-policy-sheet'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'

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
                <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
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
      </body>
    </html>
  )
}
