// src/app/layout.tsx

import './globals.css';
import { TooltipProvider } from '../components/ui/Tooltip';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <TooltipProvider>
          <main className="w-full max-w-lg mx-auto p-8 text-center mt-12">
            <h1 className="text-4xl font-bold text-blue-600 mb-8">BlockSky</h1>
            {children}
          </main>
        </TooltipProvider>
      </body>
    </html>
  );
}