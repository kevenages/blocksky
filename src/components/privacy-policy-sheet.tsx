'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { analytics } from '@/lib/analytics'

interface PrivacyPolicySheetProps {
  trigger?: React.ReactNode
  className?: string
}

export function PrivacyPolicySheet({ trigger, className }: PrivacyPolicySheetProps) {
  return (
    <Sheet onOpenChange={(open) => { if (open) analytics.openPolicy('privacy') }}>
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
            Effective Date: January 31, 2025
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
            <h3 className="font-semibold">2. Authentication Methods</h3>
            <div className="space-y-3 text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">OAuth Authentication (Recommended)</p>
                <p>
                  OAuth is the most secure method. Your Bluesky credentials never touch
                  BlockSky's servers. Authentication is handled entirely by Bluesky's
                  official OAuth system. Tokens are stored in secure, httpOnly cookies
                  that cannot be accessed by JavaScript.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">App Password Authentication</p>
                <p>
                  App Passwords are an alternative authentication method. When you use
                  an App Password, your credentials are transmitted to our servers to
                  establish a session with Bluesky. While we do not store your App Password,
                  the session tokens are temporarily accessible to enable client-side
                  blocking. By choosing App Password authentication, you acknowledge and
                  accept the reduced security compared to OAuth and assume full responsibility
                  for this choice.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">3. Information We Collect</h3>
            <div className="space-y-3 text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Session Data</p>
                <p>
                  Temporary session information, such as authentication tokens,
                  is stored in cookies for functionality. This data is not retained
                  after logout or session expiration.
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
            <h3 className="font-semibold">4. Data Storage and Security</h3>
            <p className="text-muted-foreground">
              We do not permanently store your personal information, passwords, or
              Bluesky credentials on our servers. Authentication tokens are stored
              temporarily in your browser's cookies. We implement industry-standard
              security measures, but no method of transmission over the Internet is
              100% secure. You use this service at your own risk.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">5. Third-Party Services</h3>
            <p className="text-muted-foreground">
              BlockSky interacts with Bluesky's API on your behalf. We have no control
              over Bluesky's data practices, and you should review Bluesky's privacy
              policy. With your consent, we may use analytics services to understand
              how our service is used.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">6. Your Responsibilities</h3>
            <p className="text-muted-foreground">
              You are responsible for maintaining the security of your Bluesky account
              and any App Passwords you create. If you believe your credentials have
              been compromised, you should immediately revoke any App Passwords in
              your Bluesky settings and change your password.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">7. Your Rights</h3>
            <p className="text-muted-foreground">
              You can log out at any time to clear your session data. You can
              manage cookie preferences through the consent banner or your
              browser settings. You can revoke App Passwords at any time in
              Bluesky's settings.
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
