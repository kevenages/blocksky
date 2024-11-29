// src/components/HelpSheet.tsx

import React from 'react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetDescription, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Button } from '../components/ui/button';

export default function CookiePolicySheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="link" size="lg">
            Read our Cookie Policy
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="min-w-[80vw] overflow-auto z-[300]">
        <SheetHeader>
          <SheetTitle>Cookie Policy</SheetTitle>
          <SheetDescription />
        </SheetHeader>
        <div className="grid grid-cols-1 divide-y space-y-4">
            <div>
                <p><strong>Effective Date</strong>: Nov 29, 2024</p>
                <p>BlockSky uses cookies and similar technologies to improve your experience on our Service. This Cookie Policy explains what cookies we use, why we use them, and your options regarding cookies.</p>
            </div>
            <div>
                <h3 className="my-4">
                    1. What Are Cookies?
                </h3>
                <p>
                    Cookies are small data files stored on your device by your browser. They help us remember your preferences and improve your experience on our Service.
                </p>
            </div>
            <div>
                <h3 className="my-4">
                    2. How We Use Cookies
                </h3>
                <p className="mb-4">
                    We use cookies for:
                </p>
                <ul>
                    <li>
                        <strong>Essential Cookies</strong>: Necessary for the operation of the Service (e.g., access tokens, refresh tokens).
                    </li>
                    <li>
                        <strong>Functional Cookies</strong>: Store user preferences like handles and display names during active sessions.
                    </li>
                    <li>
                        <strong>Analytics Cookies</strong>: Collected via <strong>Microsoft Clarity</strong> and <strong>Google Analytics</strong> to understand user behavior.
                    </li>
                </ul>
            </div>
            <div>
                <h3 className="my-4">
                    3. Analytics Tools
                </h3>
                <ul>
                    <li>
                        <strong>Microsoft Clarity</strong>: Tracks session replays, heatmaps, and interaction data to understand how users engage with the Service. For more information, visit <Link href="https://clarity.microsoft.com/terms" target="_blank">Microsoft Clarity Privacy Policy</Link>.
                    </li>
                    <li>
                        <strong>Google Analytics</strong>: Collects anonymized data such as page views, session durations, and user navigation. For more information, visit <Link href="https://policies.google.com/privacy" target="_blank">Google Analytics Privacy Policy</Link>.
                    </li>
                </ul>
            </div>
            <div>
                <h3 className="my-4">
                    4. Managing Cookies
                </h3>
                <p>
                    You can control or disable cookies through your browser settings. However, doing so may impact the functionality of our Service. To opt out of analytics tracking:
                </p>
                <ul>
                    <li>
                        Use <Link href="https://tools.google.com/dlpage/gaoptout" target="_blank">Google Analytics Opt-Out Browser Add-On</Link>.
                    </li>
                    <li>
                        Adjust tracking preferences as described in Microsoft Clarity’s documentation.
                    </li>
                </ul>
            </div>
            <div>
                <h3 className="my-4">
                    5. Contact Us
                </h3>
                <p>
                    For questions about our Cookie Policy, contact us at <Link href="mailto:privacy@blocksky.app">privacy@blocksky.app</Link>
                </p>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}