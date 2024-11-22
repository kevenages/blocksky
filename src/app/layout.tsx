// src/app/layout.tsx
import './globals.css';
import ClientWrapper from '../components/ClientWrapper';
import { TooltipProvider } from '../components/ui/tooltip';
import ToastProvider from '../components/ToastProvider';

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