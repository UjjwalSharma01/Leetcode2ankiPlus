import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import EmailVerificationAlert from "@/components/EmailVerificationAlert";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "LeetCode2AnkiPlus Tracker",
  description: "Track, review, and manage your LeetCode problems - Part of the LeetCode2AnkiPlus project",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} dark:bg-gray-900 dark:text-white`} suppressHydrationWarning={true}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            className: 'rounded-lg shadow-premium text-sm font-medium',
            style: {
              background: '#333',
              color: '#fff',
              padding: '12px 16px',
            },
            success: {
              icon: '✓',
              style: {
                background: 'linear-gradient(to right, #047857, #065f46)', // Green gradient
                borderLeft: '4px solid #10b981',
              },
            },
            error: {
              icon: '✕',
              style: {
                background: 'linear-gradient(to right, #991b1b, #7f1d1d)', // Red gradient
                borderLeft: '4px solid #ef4444',
              },
            },
            loading: {
              style: {
                background: 'linear-gradient(to right, #1e40af, #1e3a8a)', // Blue gradient
                borderLeft: '4px solid #3b82f6',
              },
            },
            custom: {
              style: {
                background: 'linear-gradient(to right, #4f46e5, #4338ca)', // Indigo gradient
                borderLeft: '4px solid #6366f1',
              },
            },
          }}
        />
        <AuthProvider>
          <DataProvider>
            {children}
            <EmailVerificationAlert />
          </DataProvider>
        </AuthProvider>
        
        {/* Script to clean up Grammarly extension attributes */}
        <Script id="clean-body-attrs" strategy="afterInteractive">
          {`
            // Remove attributes added by browser extensions
            if (typeof window !== 'undefined') {
              const cleanBodyAttributes = () => {
                const body = document.body;
                
                // List of attributes that might be added by extensions
                const attributesToRemove = [
                  'data-new-gr-c-s-check-loaded',
                  'data-gr-ext-installed'
                ];
                attributesToRemove.forEach(attr => {
                  if (body.hasAttribute(attr)) {
                    body.removeAttribute(attr);
                  }
                });
              };
              
              // Run immediately and also on any dynamic changes
              cleanBodyAttributes();
              const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  if (mutation.type === 'attributes' && 
                      (mutation.attributeName.startsWith('data-gr-') || 
                       mutation.attributeName.startsWith('data-new-gr-'))) {
                    cleanBodyAttributes();
                  }
                });
              });
              
              observer.observe(document.body, { 
                attributes: true, 
                attributeFilter: ['data-new-gr-c-s-check-loaded', 'data-gr-ext-installed'] 
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
