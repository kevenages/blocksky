import './globals.css';
import { TooltipProvider } from '../components/ui/Tooltip';
import { AuthProvider } from '../hooks/useAuth';
import TopNav from '../components/TopNav';
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <TooltipProvider>
          <AuthProvider>
            <TopNav />
            <main className="w-full max-w-lg mx-auto p-8 text-center mt-8 relative">
              <h1 className="text-4xl font-bold text-blue-600 mb-8">
                Bl<span id="no-symbol" className="inline-block">🚫</span>cksk<span id="target-letter">y</span>
              </h1>
              {children}
            </main>
            <div 
              id="butterfly" 
              className="absolute opacity-0" // Start hidden, fade in later
              style={{ width: '96px', height: '96px' }}  // Larger size for butterfly
            >
              🦋 {/* The butterfly icon */}
            </div>
          </AuthProvider>
        </TooltipProvider>

        <Script id="butterfly-positioning" strategy="afterInteractive">
          {`
            window.onload = function() {
              const butterfly = document.getElementById("butterfly");
              const targetElement = document.getElementById("target-letter");

              if (butterfly && targetElement) {
                const targetRect = targetElement.getBoundingClientRect();

                // Set butterfly just above the final position of the "y"
                butterfly.style.position = "absolute";
                butterfly.style.left = \`\${targetRect.left + 15}px\`;
                butterfly.style.top = \`\${targetRect.top - 20}px\`; // Slightly above target

                // Apply the fade and fly-in animation only
                butterfly.classList.add("animate-fadeAndFlyIn");
              }
            };
          `}
        </Script>

      </body>
    </html>
  );
}