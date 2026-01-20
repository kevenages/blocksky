'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface CookiePolicySheetProps {
  trigger?: React.ReactNode
  className?: string
}

export function CookiePolicySheet({ trigger, className }: CookiePolicySheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <button className={className || 'text-sm text-muted-foreground hover:underline'}>
            Cookie Policy
          </button>
        )}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Cookie Policy</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4 space-y-6 text-sm">
          <p className="text-muted-foreground">
            Effective Date: November 29, 2024
          </p>

          <section className="space-y-2">
            <h3 className="font-semibold">1. Introduction</h3>
            <p className="text-muted-foreground">
              BlockSky ("we," "our," or "us") uses cookies to enhance your experience
              and analyze how our service is used. This Cookie Policy explains what
              cookies are, how we use them, and your choices regarding cookies.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">2. What Are Cookies?</h3>
            <p className="text-muted-foreground">
              Cookies are small data files stored on your device by your browser.
              They help websites remember information about your visit, making your
              next visit easier and the site more useful.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">3. Types of Cookies We Use</h3>
            <div className="space-y-3 text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Essential Cookies</p>
                <p>
                  These cookies are necessary for the website to function properly.
                  They enable core features like authentication and session management.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Functional Cookies</p>
                <p>
                  These cookies remember your preferences and settings to provide
                  a more personalized experience.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Analytics Cookies</p>
                <p>
                  With your consent, we use analytics cookies to understand how
                  visitors interact with our website. This helps us improve our service.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">4. Your Cookie Choices</h3>
            <p className="text-muted-foreground">
              When you first visit BlockSky, you'll be presented with a cookie
              consent banner. You can choose to accept or decline analytics cookies.
              You can also manage cookies through your browser settings at any time.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">5. Contact Us</h3>
            <p className="text-muted-foreground">
              If you have questions about our use of cookies, please contact us at{' '}
              <a
                href="mailto:privacy@blocksky.app"
                className="text-blue-500 hover:underline"
              >
                privacy@blocksky.app
              </a>
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
