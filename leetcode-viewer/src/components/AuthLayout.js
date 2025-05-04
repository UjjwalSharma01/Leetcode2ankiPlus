'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from './Navbar';

export default function AuthLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/landing');
      } else {
        setIsReady(true);
      }
    }
  }, [loading, user, router]);

  if (loading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 dark:border-green-400"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10">
        <Navbar />
      </header>
      <main className="flex-grow w-full max-w-full overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl">
          {children}
        </div>
      </main>
      <footer className="bg-green-800 dark:bg-gray-800 text-white text-center py-4 text-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-white text-opacity-90">
            © {new Date().getFullYear()} LeetCode2AnkiPlus | <a href="https://github.com/UjjwalSharma01/Leetcode2ankiPlus" className="text-white hover:text-green-200 dark:hover:text-gray-300 underline">GitHub</a>
          </p>
        </div>
      </footer>
    </div>
  );
}