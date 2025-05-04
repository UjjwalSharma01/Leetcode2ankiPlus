'use client';

import { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { fetchLeetCodeProblems } from '@/utils/leetcodeData';
import Link from 'next/link';

export default function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: '',
    difficulty: 'all',
    tags: []
  });
  const [allTags, setAllTags] = useState([]);
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  
  useEffect(() => {
    async function loadProblems() {
      try {
        setLoading(true);
        const data = await fetchLeetCodeProblems();
        setProblems(data);
        
        // Extract all unique tags
        const tags = new Set();
        data.forEach(problem => {
          if (problem.Tags) {
            problem.Tags.split(',').forEach(tag => {
              tags.add(tag.trim());
            });
          }
        });
        setAllTags(Array.from(tags).sort());
      } catch (err) {
        console.error('Error fetching problems:', err);
        setError('Failed to load problems. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }
    
    loadProblems();
  }, []);

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, searchTerm: e.target.value }));
  };

  const handleDifficultyChange = (e) => {
    setFilters(prev => ({ ...prev, difficulty: e.target.value }));
  };

  const handleTagToggle = (tag) => {
    setFilters(prev => {
      const newTags = [...prev.tags];
      if (newTags.includes(tag)) {
        return { ...prev, tags: newTags.filter(t => t !== tag) };
      } else {
        return { ...prev, tags: [...newTags, tag] };
      }
    });
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const handleSortDirectionChange = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const filteredProblems = problems.filter(problem => {
    // Filter by search term
    const searchMatch = problem.Title?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                       problem.ID?.toString().includes(filters.searchTerm);
    
    // Filter by difficulty
    const difficultyMatch = filters.difficulty === 'all' || 
                           problem.Difficulty === filters.difficulty;
    
    // Filter by tags
    let tagsMatch = true;
    if (filters.tags.length > 0 && problem.Tags) {
      const problemTags = problem.Tags.split(',').map(tag => tag.trim());
      tagsMatch = filters.tags.every(tag => problemTags.includes(tag));
    }
    
    return searchMatch && difficultyMatch && tagsMatch;
  });
  
  // Sort the problems
  const sortedProblems = [...filteredProblems].sort((a, b) => {
    if (sortBy === 'id') {
      return sortDirection === 'asc' ? 
        a.ID - b.ID : 
        b.ID - a.ID;
    } else if (sortBy === 'date') {
      return sortDirection === 'asc' ? 
        new Date(a.Timestamp) - new Date(b.Timestamp) : 
        new Date(b.Timestamp) - new Date(a.Timestamp);
    } else if (sortBy === 'title') {
      return sortDirection === 'asc' ? 
        a.Title.localeCompare(b.Title) : 
        b.Title.localeCompare(a.Title);
    } else if (sortBy === 'difficulty') {
      const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
      return sortDirection === 'asc' ? 
        difficultyOrder[a.Difficulty] - difficultyOrder[b.Difficulty] : 
        difficultyOrder[b.Difficulty] - difficultyOrder[a.Difficulty];
    }
    return 0;
  });

  return (
    <AuthLayout>
      <div className="px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">LeetCode Problems</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Browse and filter your LeetCode problems
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
            {/* Filters and Search */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Search */}
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Search
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="search"
                      id="search"
                      className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                      placeholder="Search by title or ID"
                      value={filters.searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                </div>
                
                {/* Difficulty */}
                <div>
                  <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Difficulty
                  </label>
                  <select
                    id="difficulty"
                    name="difficulty"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                    value={filters.difficulty}
                    onChange={handleDifficultyChange}
                  >
                    <option value="all">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                
                {/* Sort */}
                <div>
                  <label htmlFor="sort" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sort By
                  </label>
                  <div className="mt-1 flex">
                    <select
                      id="sort"
                      name="sort"
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-l-md"
                      value={sortBy}
                      onChange={handleSortChange}
                    >
                      <option value="date">Date Added</option>
                      <option value="id">Problem ID</option>
                      <option value="title">Title</option>
                      <option value="difficulty">Difficulty</option>
                    </select>
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm text-sm leading-4 font-medium rounded-r-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800"
                      onClick={handleSortDirectionChange}
                    >
                      {sortDirection === 'asc' ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Results count */}
                <div className="flex items-end">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing <span className="font-medium text-gray-900 dark:text-white">{sortedProblems.length}</span> of{' '}
                    <span className="font-medium text-gray-900 dark:text-white">{problems.length}</span> problems
                  </p>
                </div>
              </div>
              
              {/* Tags */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${
                        filters.tags.includes(tag)
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Problems Table */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
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
                        Tags
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date Added
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedProblems.map((problem, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {problem.ID}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
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
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                          <div className="flex flex-wrap gap-1">
                            {problem.Tags?.split(',').map((tag, i) => (
                              <span key={i} className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {new Date(problem.Timestamp).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {sortedProblems.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No problems found matching your filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}