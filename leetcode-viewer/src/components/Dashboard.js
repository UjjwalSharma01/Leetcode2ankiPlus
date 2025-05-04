'use client';

import { useEffect, useState } from 'react';
import { fetchLeetCodeProblems, getProblemStats } from '@/utils/leetcodeData';
import AuthLayout from '@/components/AuthLayout';
import Link from 'next/link';

export default function Dashboard() {
  const [problems, setProblems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProblems() {
      try {
        setLoading(true);
        const data = await fetchLeetCodeProblems();
        setProblems(data);
        setStats(getProblemStats(data));
      } catch (err) {
        console.error('Error fetching problems:', err);
        setError('Failed to load problems. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }

    loadProblems();
  }, []);

  return (
    <AuthLayout>
      <div className="px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">LeetCode Tracker Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Track and review your LeetCode progress
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 dark:border-green-400"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4">
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
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">Total Problems</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {stats.total || 0}
                        </div>
                      </dd>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <Link href="/problems" className="font-medium text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300">
                      View all problems
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">Unique Tags</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {stats.tagsCount || 0}
                        </div>
                      </dd>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <Link href="/problems" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
                      Explore problem tags
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">Reviews Due</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                          -
                        </div>
                      </dd>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <Link href="/reviews" className="font-medium text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 dark:hover:text-yellow-300">
                      View scheduled reviews
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Problem Difficulty Distribution */}
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Problem Difficulty Distribution</h2>
              <div className="mt-4 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {stats.byDifficulty?.Easy || 0}
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Easy</div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500" 
                        style={{ width: `${stats.total ? (stats.byDifficulty?.Easy / stats.total * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">
                      {stats.byDifficulty?.Medium || 0}
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Medium</div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500" 
                        style={{ width: `${stats.total ? (stats.byDifficulty?.Medium / stats.total * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {stats.byDifficulty?.Hard || 0}
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Hard</div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500" 
                        style={{ width: `${stats.total ? (stats.byDifficulty?.Hard / stats.total * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Problems */}
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Problems</h2>
              <div className="mt-4 bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          #
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Title
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Difficulty
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date Added
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {problems.slice(0, 5).map((problem, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {problem.ID}
                          </td>
                          <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 dark:text-gray-300">
                            <a href={problem.URL} target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:underline break-words">
                              {problem.Title}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${problem.Difficulty === 'Easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                               problem.Difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                               'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                              {problem.Difficulty}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {new Date(problem.Timestamp).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {problems.length === 0 && (
                        <tr>
                          <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            No problems found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <Link href="/problems" className="font-medium text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300">
                      View all problems
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}