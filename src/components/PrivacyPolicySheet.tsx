// src/components/HelpSheet.tsx

import React from 'react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetDescription, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Button } from '../components/ui/button';

interface PrivacyPolicySheetProps {
    triggerClassName?: string;
}

export default function PrivacyPolicySheet({ triggerClassName }: PrivacyPolicySheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
         <a className={triggerClassName} href="#">
            Privacy Policy
        </a>
      </SheetTrigger>
      <SheetContent side="right" className="min-w-[80vw] overflow-auto z-[300]">
        <SheetHeader>
          <SheetTitle>Privacy Policy</SheetTitle>
          <SheetDescription />
        </SheetHeader>
        <div className="grid grid-cols-1 divide-y space-y-4">
            <div>
                <p><strong>Effective Date</strong>: Nov 29, 2024</p>
                <p>Blocksky.app ("we", "our", or "us") values your privacy. This Privacy Policy outlines how we handle your information when you use our application or website (the "Service"). Please read this carefully. If you do not agree with the terms of this policy, do not use the Service.</p>
            </div>
            <div>
                <h3 className="my-4">
                    1. Information We Collect
                </h3>
                <p>
                    We collect minimal information strictly necessary to operate the Service:
                </p>
                <ul className="list-disc list-inside ml-4">
                    <li>
                        Session Data: Temporary session information, such as authentication tokens, is stored in cookies for functionality but not retained after logout.
                    </li>
                    <li>
                        Blocked Tweet Counter: A non-identifying tally of how many tweets have been blocked, stored without linking to individual users.
                    </li>
                    <li>
                        Analytics Data: Non-identifiable data about how users interact with the Service, collected via Microsoft Clarity and Google Analytics. This includes:
                        <ul className="list-disc list-inside ml-8">
                            <li>
                                Device type, browser type, and session duration.
                            </li>
                            <li>
                                Interaction data such as clicks and navigation paths.
                            </li>
                        </ul>
                    </li>
                </ul>
            </div>
            <div>
                <h3 className="my-4">
                    2. Data Storage
                </h3>
                <ul className="list-disc list-inside ml-4">
                    <li>
                        We do not store any personal information, login credentials, in a database or server.
                    </li>
                    <li>
                        All sensitive information, such as your handle, display name, or session tokens, is stored temporarily on your device (via cookies) and deleted upon logout.
                    </li>
                    <li>
                        Any analytics data collected by third-party tools like Microsoft Clarity and Google Analytics is anonymized and cannot be used to identify individual users.
                    </li>
                </ul>
            </div>
            <div>
                <h3 className="my-4">
                    3. How We Use Your Information
                </h3>
                <p>
                    We use session data only to:
                </p>
                <ul className="list-disc list-inside ml-4">
                    <li>
                        Authenticate your identity during login.
                    </li>
                    <li>
                        Execute blocking actions on your behalf.
                    </li>
                </ul>
                <p>
                    Analytics data is used to:
                </p>
                <ul className="list-disc list-inside ml-4">
                    <li>
                        Understand how users interact with the Service.
                    </li>
                    <li>
                        Improve usability and features based on aggregated user behavior.
                    </li>
                </ul>
            </div>
            <div>
                <h3 className="my-4">
                    4. Cookies
                </h3>
                <p>
                    We use cookies to:
                </p>
                <ul className="list-disc list-inside ml-4">
                    <li>
                        Maintain your session during login.
                    </li>
                    <li>
                        Track non-identifiable data via analytics tools (Microsoft Clarity and Google Analytics).
                    </li>
                </ul>
                <p>
                    Refer to our Cookie Policy for more details.
                </p>
            </div>
            <div>
                <h3 className="my-4">
                    5. Data Sharing
                </h3>
                <p>
                    We do not share, sell, or store your personal information. However, we use Microsoft Clarity and Google Analytics, which may collect anonymized data as described in their respective privacy policies.
                </p>
            </div>
            <div>
                <h3 className="my-4">
                    6. Data Security
                </h3>
                <p>
                    We ensure your data is processed securely while it's temporarily used in your session. Since no sensitive data is retained on our servers, risks associated with storage are minimized.
                </p>
            </div>
            <div>
                <h3 className="my-4">
                    7. Updates to This Policy
                </h3>
                <p>
                    We may update this Privacy Policy. Changes will be effective upon posting the revised policy, and your continued use of the Service constitutes acceptance of the updated terms.
                </p>
            </div>
            <div>
                <h3 className="my-4">
                    5. Contact Us
                </h3>
                <p>
                    For questions about our Privacy Policy, contact us at <Link href="mailto:privacy@blocksky.app">privacy@blocksky.app</Link>
                </p>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}