'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [loading, user, router]);

  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Hero section */}
      <div className="relative bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="sm:text-center md:max-w-2xl md:mx-auto">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-5xl md:text-6xl">
              <span className="block">Track and Improve Your</span>
              <span className="block text-green-600 dark:text-green-400">LeetCode Progress</span>
            </h1>
            <p className="mt-6 text-xl text-gray-500 dark:text-gray-300 max-w-3xl mx-auto">
              Part of the LeetCode2AnkiPlus project. A beautiful interface for your LeetCode practice. Track progress, filter by tags, never lose context with proper text wrapping, and review problems using spaced repetition.
            </p>
            <div className="mt-10 sm:flex sm:justify-center">
              <div className="rounded-md shadow">
                <Link 
                  href="/signup" 
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 md:py-4 md:text-lg md:px-10"
                >
                  Get started
                </Link>
              </div>
              <div className="mt-3 sm:mt-0 sm:ml-3">
                <Link 
                  href="/login"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-300 dark:bg-gray-700 dark:hover:bg-gray-600 md:py-4 md:text-lg md:px-10"
                >
                  Sign in
                </Link>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <a 
                href="https://github.com/UjjwalSharma01/leetcode2anki-plus" 
                target="_blank"
                rel="noopener noreferrer" 
                className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="py-16 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 space-y-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-green-600 dark:text-green-400 tracking-wide uppercase">Features</h2>
            <p className="mt-1 text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight">
              Everything you need for LeetCode mastery
            </p>
            <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500 dark:text-gray-400">
              A better way to track and review your coding practice
            </p>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {/* Feature 1 */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <div className="rounded-lg p-2 bg-green-500 inline-block">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Better Organization</h3>
                <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                  Proper text wrapping, advanced filtering, and sorting make it easy to find and review your problems.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <div className="rounded-lg p-2 bg-blue-500 inline-block">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Insightful Statistics</h3>
                <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                  View your progress with problem difficulty distribution, completion trends, and tag analytics.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <div className="rounded-lg p-2 bg-yellow-500 inline-block">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Scheduled Reviews</h3>
                <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                  Never forget a problem with our integrated system that helps you review problems at the right time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="bg-green-700 dark:bg-green-800">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready to level up your LeetCode practice?
          </h2>
          <p className="mt-4 text-lg leading-6 text-green-100">
            Join now to start tracking your progress and improving your coding skills.
          </p>
          <Link
            href="/signup"
            className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-green-800 bg-white hover:bg-green-50 dark:text-green-700 dark:hover:text-green-800 sm:w-auto"
          >
            Sign up for free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center space-x-6">
            <a 
              href="https://github.com/UjjwalSharma01/leetcode2anki-plus" 
              target="_blank"
              rel="noopener noreferrer" 
              className="text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <span className="sr-only">GitHub</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
          <p className="mt-8 text-center text-base text-gray-500 dark:text-gray-400">
            &copy; 2025 LeetCode2AnkiPlus. All rights reserved.
          </p>
          <p className="mt-2 text-center text-sm text-gray-400 dark:text-gray-500">
            Created by <a href="https://github.com/UjjwalSharma01" className="text-green-600 dark:text-green-400 hover:underline">Ujjwal Sharma</a>
          </p>
        </div>
      </footer>
    </div>
  );
}