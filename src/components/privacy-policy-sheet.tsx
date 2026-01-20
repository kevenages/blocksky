'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface PrivacyPolicySheetProps {
  trigger?: React.ReactNode
  className?: string
}

export function PrivacyPolicySheet({ trigger, className }: PrivacyPolicySheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <button className={className || 'text-sm text-muted-foreground hover:underline'}>
            Privacy Policy
          </button>
        )}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Privacy Policy</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4 space-y-6 text-sm">
          <p className="text-muted-foreground">
            Effective Date: November 29, 2024
          </p>

          <section className="space-y-2">
            <h3 className="font-semibold">1. Introduction</h3>
            <p className="text-muted-foreground">
              BlockSky ("we," "our," or "us") is committed to protecting your privacy.
              This Privacy Policy explains how we handle your information when you
              use our service.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">2. Information We Collect</h3>
            <div className="space-y-3 text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Session Data</p>
                <p>
                  Temporary session information, such as authentication tokens,
                  is stored in cookies for functionality but not retained after logout.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Analytics Data</p>
                <p>
                  With your consent, we collect anonymized usage data to understand
                  how our service is used and to make improvements.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">3. How We Use Your Information</h3>
            <p className="text-muted-foreground">
              Session data is used solely to enable authentication and blocking
              functionality. Analytics data helps us understand usage patterns
              and improve the service.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">4. Data Storage</h3>
            <p className="text-muted-foreground">
              We do not store your personal information on our servers. Sensitive
              data like authentication tokens are stored temporarily in your
              browser's cookies and are deleted when you log out.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">5. Third-Party Services</h3>
            <p className="text-muted-foreground">
              BlockSky uses Bluesky's official OAuth system for authentication.
              We do not have access to your Bluesky password. With your consent,
              we may use analytics services to understand how our service is used.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">6. Data Security</h3>
            <p className="text-muted-foreground">
              We minimize data storage-related risks by not retaining sensitive
              information on our servers. All authentication is handled through
              Bluesky's secure OAuth system.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">7. Your Rights</h3>
            <p className="text-muted-foreground">
              You can log out at any time to clear your session data. You can
              manage cookie preferences through the consent banner or your
              browser settings.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">8. Contact Us</h3>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy, please contact us at{' '}
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
