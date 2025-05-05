import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { Toaster } from "react-hot-toast";
import Script from "next/script";

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
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              style: {
                background: '#166534',  // green-800
              },
            },
            error: {
              style: {
                background: '#991b1b',  // red-800
              },
            },
          }}
        />
        <AuthProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </AuthProvider>
        
        {/* Script to clean up Grammarly extension attributes */}
        <Script id="clean-body-attrs" strategy="afterInteractive">
          {`
            // Remove attributes added by browser extensions
            if (typeof window !== 'undefined') {
              const cleanBodyAttributes = () => {
                const body = document.body;
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
