'use client';

import { useState } from 'react';
import AuthLayout from '@/components/AuthLayout';
import Link from 'next/link';

export default function ReviewsPage() {
  // This is a placeholder for future implementation of review functionality
  // In the future, this could connect to your Google Sheets SRS system
  
  return (
    <AuthLayout>
      <div className="px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Scheduled Reviews</h1>
          <p className="mt-2 text-gray-600">
            Review your LeetCode problems with spaced repetition
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-2 text-lg font-medium text-gray-900">No Reviews Due</h2>
            <p className="mt-1 text-sm text-gray-500">
              There are no problems scheduled for review at this time.
            </p>
            <div className="mt-6">
              <Link href="/problems" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                View All Problems
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                This is a placeholder for scheduled reviews. Integration with your full spaced repetition system will be available in a future update.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}