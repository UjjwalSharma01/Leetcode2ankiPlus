'use client';

import { useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import Link from 'next/link';
import { useData } from '@/context/DataContext';

export default function Dashboard() {
  const { 
    problems, 
    stats, 
    loading, 
    error, 
    refreshData, 
    lastFetched,
    dueReviews,
    reviewsLoading,
    refreshAllData
  } = useData();

  return (
    <AuthLayout>
      <div className="px-4 py-6 space-y-6">
        {/* Header section with subtle gradient background */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 shadow-premium p-6">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-green-500/20 filter blur-xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-24 w-24 rounded-full bg-blue-500/20 filter blur-xl"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400">
                LeetCode Tracker Dashboard
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Track and review your LeetCode progress
              </p>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={refreshAllData}
              disabled={loading || reviewsLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-md text-white bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all duration-200 hover:shadow-lg transform hover:scale-105 active:scale-95"
              title="Refresh all data"
            >
              {loading || reviewsLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh All
                </>
              )}
            </button>
          </div>
        </div>

        {loading && !problems.length ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 dark:border-green-400"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-md shadow-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 011.414 0L10 8.586l1.293-1.293a1 1 0 111.414 1.414L11.414 10l1.293 1.293a1 1 0 01-1.414 1.414L10 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L8.586 10 7.293 8.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid - Mobile-friendly grid with improved cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Total Problems Card */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-gray-100 dark:border-gray-700 group">
                <div className="px-6 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-br from-green-400 to-green-500 text-white shadow-md group-hover:scale-110 transition-transform duration-300">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">Total Problems</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-800 dark:from-green-400 dark:to-green-300">
                          {stats.total || 0}
                        </div>
                      </dd>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 px-6 py-4">
                  <div className="text-sm">
                    <Link href="/problems" className="font-medium text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 flex items-center">
                      <span>View all problems</span>
                      <svg className="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Unique Tags Card */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-gray-100 dark:border-gray-700 group">
                <div className="px-6 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-md group-hover:scale-110 transition-transform duration-300">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">Unique Tags</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-300">
                          {stats.tagsCount || 0}
                        </div>
                      </dd>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 px-6 py-4">
                  <div className="text-sm">
                    <Link href="/problems" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 flex items-center">
                      <span>Explore problem tags</span>
                      <svg className="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Reviews Card */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-gray-100 dark:border-gray-700 group">
                <div className="px-6 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md group-hover:scale-110 transition-transform duration-300">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">Reviews Due</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-amber-800 dark:from-amber-400 dark:to-amber-300">
                          {reviewsLoading ? (
                            <span className="inline-block w-5 h-5">
                              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </span>
                          ) : dueReviews && dueReviews.length > 0 ? dueReviews.length : "0"}
                        </div>
                      </dd>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 px-6 py-4">
                  <div className="text-sm">
                    <Link href="/reviews" className="font-medium text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 flex items-center">
                      <span>Manage reviews</span>
                      <svg className="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Difficulty Distribution - Enhanced design */}
            <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-xl shadow-card border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Problem Difficulty Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 transform transition hover:scale-105 duration-300 shadow-md hover:shadow-lg border border-green-100 dark:border-green-800">
                  <div className="text-center py-2">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {stats.byDifficulty?.Easy || 0}
                    </div>
                    <div className="mt-1 text-base font-medium text-green-800 dark:text-green-300">Easy</div>
                    <div className="mt-3 h-3 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full" 
                        style={{ width: `${stats.total ? (stats.byDifficulty?.Easy / stats.total * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-xl p-4 transform transition hover:scale-105 duration-300 shadow-md hover:shadow-lg border border-amber-100 dark:border-amber-800">
                  <div className="text-center py-2">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {stats.byDifficulty?.Medium || 0}
                    </div>
                    <div className="mt-1 text-base font-medium text-amber-800 dark:text-amber-300">Medium</div>
                    <div className="mt-3 h-3 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" 
                        style={{ width: `${stats.total ? (stats.byDifficulty?.Medium / stats.total * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-xl p-4 transform transition hover:scale-105 duration-300 shadow-md hover:shadow-lg border border-red-100 dark:border-red-800">
                  <div className="text-center py-2">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {stats.byDifficulty?.Hard || 0}
                    </div>
                    <div className="mt-1 text-base font-medium text-red-800 dark:text-red-300">Hard</div>
                    <div className="mt-3 h-3 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full" 
                        style={{ width: `${stats.total ? (stats.byDifficulty?.Hard / stats.total * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Problems - Improved card layout */}
            <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-xl shadow-card border border-gray-100 dark:border-gray-700">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Problems</h2>
                <Link href="/problems" className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 flex items-center">
                  View all
                  <svg className="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              
              {/* Desktop table view */}
              <div className="hidden md:block overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Problem</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Difficulty</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date Added</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {problems.slice(0, 5).map((problem, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {problem.ID}. {problem.Title}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full 
                              ${problem.Difficulty === 'Easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 
                              problem.Difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 
                              'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                              {problem.Difficulty}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {new Date(problem.Timestamp).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <a href={problem.URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:underline">
                              View
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Mobile card view - Enhanced appearance */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {problems.slice(0, 5).map((problem, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {problem.ID}. {problem.Title}
                        </p>
                        <div className="mt-1 flex items-center">
                          <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full 
                            ${problem.Difficulty === 'Easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 
                            problem.Difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 
                            'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                            {problem.Difficulty}
                          </span>
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            {new Date(problem.Timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <a href={problem.URL} target="_blank" rel="noopener noreferrer" className="ml-2 px-3 py-1 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-500/20 transition-colors">
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {lastFetched && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Last updated: {new Date(lastFetched).toLocaleString()}
              </div>
            )}
            
            {/* Legal Disclaimer */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                <strong>Disclaimer:</strong> This application is not affiliated with, endorsed by, or sponsored by LeetCode or Anki. 
                LeetCode and Anki are registered trademarks of their respective owners. This is an independent tool created for educational purposes.
              </p>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}