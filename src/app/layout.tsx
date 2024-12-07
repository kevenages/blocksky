// src/app/layout.tsx
import './globals.css';
import ClientWrapper from '../components/ClientWrapper';
import { TooltipProvider } from '../components/ui/tooltip';
import ToastProvider from '../components/ToastProvider';
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BlockSky | Take control of your bluesky space and create a safer, more personalized environment',
  description: 'BlockSky.app is a streamlined tool for managing your Bluesky experience, allowing you to mass block an account\'s followers or the accounts they follow',
  robots: {
    index: true,
    follow: true,
    nocache: true,
  },
  openGraph: {
    title: 'BlockSky | Create a safer, more personalized bluesky environment',
    description: 'BlockSky.app is a streamlined tool for managing your Bluesky experience, allowing you to mass block an account\'s followers or the accounts they follow',
    url: 'https://blocksky.app',
    siteName: 'BlockSky',
    images: 'https://blocksky.app/images/og-image-blocksky.png',
    locale: 'en_US',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <TooltipProvider>
          <ToastProvider />
          <ClientWrapper>{children}</ClientWrapper>
        </TooltipProvider>
      </body>
    </html>
  );
}