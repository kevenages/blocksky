'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { analytics } from '@/lib/analytics'

interface CookiePolicySheetProps {
  trigger?: React.ReactNode
  className?: string
}

export function CookiePolicySheet({ trigger, className }: CookiePolicySheetProps) {
  return (
    <Sheet onOpenChange={(open) => { if (open) analytics.openPolicy('cookies') }}>
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
            Effective Date: January 31, 2025
          </p>

          <section className="space-y-2">
            <h3 className="font-semibold">1. Introduction</h3>
            <p className="text-muted-foreground">
              BlockSky ("we," "our," or "us") uses cookies to enable authentication
              and enhance your experience. This Cookie Policy explains what cookies
              are, how we use them, and your choices regarding cookies.
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
                <p className="font-medium text-foreground">Essential/Authentication Cookies</p>
                <p>
                  These cookies are necessary for the website to function properly.
                  They store authentication tokens that enable you to log in and use
                  the blocking features. For OAuth users, these are secure httpOnly
                  cookies that cannot be accessed by JavaScript. For App Password users,
                  session tokens may be temporarily accessible to enable client-side
                  blocking functionality.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Functional Cookies</p>
                <p>
                  These cookies remember your preferences and settings (such as theme
                  and cookie consent choices) to provide a more personalized experience.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Analytics Cookies</p>
                <p>
                  With your consent, we use analytics cookies to understand how
                  visitors interact with our website. This helps us improve our service.
                  You can opt out of analytics cookies at any time.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">4. Cookie Security</h3>
            <div className="space-y-2 text-muted-foreground">
              <p>
                We implement security measures for our cookies, but the level of
                protection varies by authentication method:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>OAuth:</strong> Tokens stored in httpOnly, secure cookies (highest security)</li>
                <li><strong>App Password:</strong> Tokens may be temporarily accessible during blocking operations</li>
              </ul>
              <p className="mt-2">
                By using App Password authentication, you acknowledge and accept
                that your session tokens have reduced protection compared to OAuth.
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">5. Your Cookie Choices</h3>
            <p className="text-muted-foreground">
              When you first visit BlockSky, you'll be presented with a cookie
              consent banner. You can choose to accept or decline analytics cookies.
              Essential cookies cannot be disabled as they are required for the
              Service to function. You can also manage cookies through your browser
              settings at any time, though this may affect the Service's functionality.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">6. Data Retention</h3>
            <p className="text-muted-foreground">
              Authentication cookies expire when you log out or after a period of
              inactivity. Preference cookies (like theme settings) persist until
              you clear your browser data. Analytics cookies follow the retention
              policies of our analytics providers.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">7. Contact Us</h3>
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
