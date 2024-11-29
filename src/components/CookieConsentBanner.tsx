"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { Card, CardContent, CardFooter } from "../components/ui/card";
import { Button } from '../components/ui/button';
import CookiePolicySheet from '../components/CookiePolicySheet';

export const CookieConsentBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const analyticsConsent = Cookies.get('analyticsConsent');
    if (!analyticsConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    Cookies.set('analyticsConsent', 'true', { expires: 365 });
    setShowBanner(false);
    loadAnalytics();
  };

  const handleDecline = () => {
    Cookies.set('analyticsConsent', 'false', { expires: 365 });
    setShowBanner(false);
  };

  const loadAnalytics = () => {
    // Example: Load Google Analytics
    if (typeof window !== 'undefined' && !window['gaInitialized']) {
      window['gaInitialized'] = true;
      // Insert your Google Analytics setup code here
      console.log('Google Analytics loaded');
    }

    // Example: Load Microsoft Clarity
    if (typeof window !== 'undefined' && !window['clarityInitialized']) {
      window['clarityInitialized'] = true;
      // Insert your Microsoft Clarity setup code here
      console.log('Microsoft Clarity loaded');
    }
  };

  useEffect(() => {
    const analyticsConsent = Cookies.get('analyticsConsent');
    if (analyticsConsent === 'true') {
      loadAnalytics();
    }
  }, []);

  if (!showBanner) return null;

  return (
    <>
        <Card className="fixed z-[300] bottom-4 left-0 right-0 w-full bg-gray-600 text-white bg-opacity-95">
        <CardContent className="pt-5">
            We use cookies to improve your experience and for analytics purposes. By clicking "Accept," you consent to analytics cookies. You can opt out by clicking "Decline."
        </CardContent>
        <CardFooter className="flex justify-center">
          <div>
            <Button 
                onClick={handleAccept} 
                className="mr-5 bg-green-600 text-white hover:bg-green-700"
            >
                Accept
            </Button>
            <Button 
                onClick={handleDecline}
                className="bg-blue-600 text-white hover:bg-blue-700"
            >
                Decline
            </Button>
          </div>
            

        </CardFooter>
        <div>
          <CookiePolicySheet />
        </div>
        </Card>
    </>
  );
};

export default CookieConsentBanner;