'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface TermsOfServiceSheetProps {
  trigger?: React.ReactNode
  className?: string
}

export function TermsOfServiceSheet({ trigger, className }: TermsOfServiceSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <button className={className || 'text-sm text-muted-foreground hover:underline'}>
            Terms of Service
          </button>
        )}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Terms of Service</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4 space-y-6 text-sm">
          <p className="text-muted-foreground">
            Effective Date: January 22, 2025
          </p>

          <section className="space-y-2">
            <h3 className="font-semibold">1. Acceptance of Terms</h3>
            <p className="text-muted-foreground">
              By accessing or using BlockSky ("the Service"), you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">2. Description of Service</h3>
            <p className="text-muted-foreground">
              BlockSky is a tool that helps Bluesky users block multiple accounts at once.
              The Service interacts with Bluesky's API on your behalf using your authorized
              credentials.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">3. User Responsibilities</h3>
            <div className="space-y-2 text-muted-foreground">
              <p>By using the Service, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Comply with Bluesky's Terms of Service and Community Guidelines</li>
                <li>Use the Service only for lawful purposes</li>
                <li>Not use the Service to harass, target, or coordinate abuse against individuals</li>
                <li>Take responsibility for all actions performed through your Bluesky account</li>
                <li>Not attempt to circumvent rate limits or other restrictions</li>
              </ul>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">4. Service Availability</h3>
            <p className="text-muted-foreground">
              The Service is provided on an "as available" basis. We do not guarantee
              uninterrupted access or that the Service will be available at all times.
              We reserve the right to modify, suspend, or discontinue the Service at
              any time without notice.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">5. Rate Limits and Restrictions</h3>
            <p className="text-muted-foreground">
              Bluesky imposes rate limits on API operations including blocking. These
              limits are enforced by Bluesky, not BlockSky. We are not responsible for
              any rate limiting, throttling, or restrictions imposed by Bluesky on your
              account.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">6. Account Responsibility</h3>
            <p className="text-muted-foreground">
              You are solely responsible for your Bluesky account and any actions taken
              through it while using our Service. We are not responsible for any account
              suspensions, restrictions, or other actions taken by Bluesky against your
              account.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">7. Disclaimer of Warranties</h3>
            <p className="text-muted-foreground">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF
              ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE
              ERROR-FREE, SECURE, OR UNINTERRUPTED.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">8. Limitation of Liability</h3>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BLOCKSKY SHALL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
              INCLUDING BUT NOT LIMITED TO LOSS OF DATA, ACCOUNT ACCESS, OR OTHER
              INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">9. Termination</h3>
            <p className="text-muted-foreground">
              We reserve the right to terminate or restrict your access to the Service
              at any time, for any reason, without notice. You may stop using the Service
              at any time by logging out.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">10. Changes to Terms</h3>
            <p className="text-muted-foreground">
              We may update these Terms of Service from time to time. Continued use of
              the Service after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">11. Contact Us</h3>
            <p className="text-muted-foreground">
              If you have questions about these Terms of Service, please contact us at{' '}
              <a
                href="mailto:support@blocksky.app"
                className="text-blue-500 hover:underline"
              >
                support@blocksky.app
              </a>
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
