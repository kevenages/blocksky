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
            Effective Date: January 31, 2025
          </p>

          <section className="space-y-2">
            <h3 className="font-semibold">1. Acceptance of Terms</h3>
            <p className="text-muted-foreground">
              By accessing or using BlockSky ("the Service"), you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do not use the Service.
              Your continued use of the Service constitutes acceptance of these terms and any
              future modifications.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">2. Description of Service</h3>
            <p className="text-muted-foreground">
              BlockSky is a tool that helps Bluesky users block multiple accounts at once.
              The Service interacts with Bluesky's API on your behalf using your authorized
              credentials. BlockSky is not affiliated with, endorsed by, or officially
              connected to Bluesky or its parent company.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">3. Authentication and Security</h3>
            <div className="space-y-2 text-muted-foreground">
              <p>BlockSky offers two authentication methods:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>OAuth (Recommended):</strong> Most secure option where your credentials never touch our servers</li>
                <li><strong>App Password:</strong> Alternative method with reduced security; by choosing this option, you acknowledge and accept all associated risks</li>
              </ul>
              <p className="mt-2">
                You are solely responsible for the security of your Bluesky account,
                including any App Passwords you create. BlockSky is not responsible for
                any unauthorized access to your account.
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">4. User Responsibilities</h3>
            <div className="space-y-2 text-muted-foreground">
              <p>By using the Service, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Comply with Bluesky's Terms of Service and Community Guidelines</li>
                <li>Use the Service only for lawful purposes</li>
                <li>Not use the Service to harass, target, or coordinate abuse against individuals</li>
                <li>Take full responsibility for all actions performed through your Bluesky account</li>
                <li>Not attempt to circumvent rate limits or other restrictions</li>
                <li>Accept all consequences resulting from your use of the Service</li>
              </ul>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">5. Service Availability</h3>
            <p className="text-muted-foreground">
              The Service is provided on an "as available" basis. We make no guarantees
              regarding uptime, availability, or functionality. We reserve the right to
              modify, suspend, or discontinue the Service at any time without notice
              or liability.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">6. Rate Limits and Third-Party Restrictions</h3>
            <p className="text-muted-foreground">
              Bluesky imposes rate limits on API operations including blocking. These
              limits are enforced by Bluesky, not BlockSky. We are not responsible for
              any rate limiting, throttling, account restrictions, suspensions, or other
              actions taken by Bluesky or any third party against your account as a
              result of using this Service.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">7. Assumption of Risk</h3>
            <p className="text-muted-foreground">
              YOU EXPRESSLY UNDERSTAND AND AGREE THAT YOUR USE OF THE SERVICE IS AT YOUR
              SOLE RISK. You assume full responsibility for any consequences arising from
              your use of the Service, including but not limited to account suspension,
              data loss, or any other adverse effects on your Bluesky account or any
              connected services.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">8. Disclaimer of Warranties</h3>
            <p className="text-muted-foreground">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF
              ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED
              WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE,
              AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
              UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL
              COMPONENTS.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">9. Limitation of Liability</h3>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL
              BLOCKSKY, ITS OPERATORS, DEVELOPERS, AFFILIATES, OR CONTRIBUTORS BE LIABLE
              FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR
              EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS,
              GOODWILL, USE, DATA, ACCOUNT ACCESS, OR OTHER INTANGIBLE LOSSES, REGARDLESS
              OF WHETHER WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES, AND
              REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, STRICT LIABILITY,
              OR OTHERWISE).
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">10. Indemnification</h3>
            <p className="text-muted-foreground">
              You agree to indemnify, defend, and hold harmless BlockSky, its operators,
              developers, affiliates, and contributors from and against any and all claims,
              damages, losses, liabilities, costs, and expenses (including reasonable
              attorneys' fees) arising out of or related to your use of the Service,
              your violation of these Terms, or your violation of any rights of a third party.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">11. Termination</h3>
            <p className="text-muted-foreground">
              We reserve the right to terminate or restrict your access to the Service
              at any time, for any reason or no reason, without notice or liability.
              You may stop using the Service at any time by logging out.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">12. Governing Law</h3>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with applicable
              law, without regard to conflict of law principles. Any disputes arising under
              these Terms shall be subject to the exclusive jurisdiction of the courts in
              the applicable jurisdiction.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">13. Severability</h3>
            <p className="text-muted-foreground">
              If any provision of these Terms is found to be unenforceable or invalid,
              that provision shall be limited or eliminated to the minimum extent necessary
              so that these Terms shall otherwise remain in full force and effect.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">14. Changes to Terms</h3>
            <p className="text-muted-foreground">
              We may update these Terms of Service at any time without notice. Continued
              use of the Service after any changes constitutes acceptance of the updated
              terms. It is your responsibility to review these Terms periodically.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">15. Contact Us</h3>
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
