// src/app/layout.tsx
import './globals.css';
import ClientWrapper from '../components/ClientWrapper';
import { TooltipProvider } from '../components/ui/tooltip';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <TooltipProvider>
          <ClientWrapper>{children}</ClientWrapper>
        </TooltipProvider>
      </body>
    </html>
  );
}