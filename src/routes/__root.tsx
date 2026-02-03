import { HeadContent, Scripts, createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { Header } from '@/components/layout/header'
import { CookieConsentBanner } from '@/components/cookie-consent-banner'
import { CookiePolicySheet } from '@/components/cookie-policy-sheet'
import { PrivacyPolicySheet } from '@/components/privacy-policy-sheet'
import { TermsOfServiceSheet } from '@/components/terms-of-service-sheet'
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
      // Open Graph
      {
        property: 'og:title',
        content: 'BlockSky - Mass Blocking for Bluesky',
      },
      {
        property: 'og:description',
        content: 'Protect yourself on Bluesky. Mass block followers of problematic accounts with one click.',
      },
      {
        property: 'og:image',
        content: 'https://blocksky.app/og-image.png',
      },
      {
        property: 'og:url',
        content: 'https://blocksky.app',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      // Twitter Card
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'BlockSky - Mass Blocking for Bluesky',
      },
      {
        name: 'twitter:description',
        content: 'Protect yourself on Bluesky. Mass block followers of problematic accounts with one click.',
      },
      {
        name: 'twitter:image',
        content: 'https://blocksky.app/og-image.png',
      },
    ],
    links: [
      {
        rel: 'canonical',
        href: 'https://blocksky.app/',
      },
      {
        rel: 'preload',
        href: appCss,
        as: 'style',
      },
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

const GA_MEASUREMENT_ID = 'G-RVY854R6WS'

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline theme detection script - must be first to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var stored = localStorage.getItem('theme');
              var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              var theme = stored === 'dark' || (stored === 'system' || !stored) && systemDark ? 'dark' : 'light';
              if (theme === 'dark') document.documentElement.classList.add('dark');
            } catch(e) {}
          })();
        `}} />
        {/* Inline critical styles to prevent flash */}
        <style dangerouslySetInnerHTML={{ __html: `
          html { background-color: #fff; }
          html.dark { background-color: #242424; }
          body { opacity: 0; }
          body.css-loaded { opacity: 1; transition: opacity 0.1s ease-in; }
        `}} />
        {/* Google Analytics - production only */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            if (window.location.hostname !== 'blocksky.app') return;
            var s = document.createElement('script');
            s.async = true;
            s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}';
            document.head.appendChild(s);
            window.dataLayer = window.dataLayer || [];
            window.gtag = function() { dataLayer.push(arguments); };
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          })();
        `}} />
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
                <div className="flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  <div className="flex gap-4">
                    <TermsOfServiceSheet />
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
        {/* Show content once CSS loads */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            function show() { document.body.classList.add('css-loaded'); }
            var css = document.querySelector('link[rel="stylesheet"]');
            if (css && css.sheet) show();
            else if (css) css.onload = show;
            else show();
            setTimeout(show, 300);
          })();
        `}} />
        <Scripts />
      </body>
    </html>
  )
}
