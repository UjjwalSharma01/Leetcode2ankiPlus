'use client';

import { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import { addProblemToReview } from '@/utils/reviewService';
import { toast } from 'react-hot-toast'; // Import toast for notifications
import BulkReviewActions from '@/components/BulkReviewActions';

export default function ProblemsPage() {
  const { problems, loading, error, refreshData, lastFetched } = useData();
  
  const [filters, setFilters] = useState({
    searchTerm: '',
    difficulty: 'all',
    tags: []
  });
  const [allTags, setAllTags] = useState([]);
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [addingToReview, setAddingToReview] = useState({}); // Track which problems are being added to review
  const [selectedProblems, setSelectedProblems] = useState({}); // Track selected problems for bulk operations
  const [showBulkActions, setShowBulkActions] = useState(false); // Toggle for bulk operations panel
  const [showDaysModal, setShowDaysModal] = useState(false); // Modal for custom days selection
  const [reviewDays, setReviewDays] = useState(1); // Number of days for review
  const [selectedProblemForReview, setSelectedProblemForReview] = useState(null); // Currently selected problem for review
  const [currentPage, setCurrentPage] = useState(1); // Current page for pagination
  const [itemsPerPage, setItemsPerPage] = useState(20); // Number of items per page
  
  // Extract all unique tags whenever problems change
  useEffect(() => {
    if (problems.length > 0) {
      const tags = new Set();
      problems.forEach(problem => {
        if (problem.Tags) {
          problem.Tags.split(',').forEach(tag => {
            tags.add(tag.trim());
          });
        }
      });
      setAllTags(Array.from(tags).sort());
    }
  }, [problems]);

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

  // Get the array of selected problem IDs
  const selectedProblemIds = Object.keys(selectedProblems).filter(id => selectedProblems[id]);

  // Toggle selection of a single problem
  const toggleProblemSelection = (problemId) => {
    setSelectedProblems(prev => ({
      ...prev,
      [problemId]: !prev[problemId]
    }));
  };

  // Toggle selection of all visible problems
  const toggleSelectAll = () => {
    if (selectedProblemIds.length === sortedProblems.length) {
      // If all are selected, deselect all
      setSelectedProblems({});
    } else {
      // Select all visible problems
      const newSelected = {};
      sortedProblems.forEach(problem => {
        newSelected[problem.ID] = true;
      });
      setSelectedProblems(newSelected);
    }
  };

  // Add function to handle adding problems to review
  const handleAddToReview = async (problem) => {
    setAddingToReview(prev => ({ ...prev, [problem.ID]: true }));
    try {
      const response = await addProblemToReview(
        problem.ID, 
        problem.Title, 
        1, // Default to reviewing tomorrow
        false // Don't update if exists
      );
      
      if (response.success) {
        toast.success(`Problem ${problem.ID} (${problem.Title}) added to review schedule!`);
      } else if (response.exists) {
        toast.error(`Problem ${problem.ID} already exists in review schedule.`);
      } else {
        toast.error(`Error: ${response.error}`);
      }
    } catch (error) {
      console.error('Error adding problem to review:', error);
      toast.error('Failed to add problem to review. Check console for details.');
    } finally {
      setAddingToReview(prev => ({ ...prev, [problem.ID]: false }));
    }
  };

  const scheduleReview = async (days) => {
    if (!selectedProblemForReview) return;
    
    setAddingToReview(prev => ({ ...prev, [selectedProblemForReview.ID]: true }));
    try {
      const response = await addProblemToReview(
        selectedProblemForReview.ID, 
        selectedProblemForReview.Title, 
        days, // Use the selected number of days
        false // Don't update if exists
      );
      
      if (response.success) {
        toast.success(`Problem ${selectedProblemForReview.ID} added to review in ${days} day(s)!`);
        setShowDaysModal(false);
        setSelectedProblemForReview(null);
      } else if (response.exists) {
        toast.error(`Problem ${selectedProblemForReview.ID} already exists in review schedule.`);
        setShowDaysModal(false);
        setSelectedProblemForReview(null);
      } else {
        toast.error(`Error: ${response.error}`);
      }
    } catch (error) {
      console.error('Error adding problem to review:', error);
      toast.error('Failed to add problem to review. Check console for details.');
    } finally {
      setAddingToReview(prev => ({ ...prev, [selectedProblemForReview.ID]: false }));
    }
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

  // Get the current page of items
  const indexOfLastProblem = currentPage * itemsPerPage;
  const indexOfFirstProblem = indexOfLastProblem - itemsPerPage;
  const currentProblems = sortedProblems.slice(indexOfFirstProblem, indexOfLastProblem);
  
  // Calculate total pages
  const totalPages = Math.ceil(sortedProblems.length / itemsPerPage);
  
  // Handle page changes
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top when changing pages
    window.scrollTo(0, 0);
  };
  
  // Handle items per page change
  const handleItemsPerPageChange = (e) => {
    const value = parseInt(e.target.value);
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Handle custom items per page input
  const handleCustomItemsPerPageChange = (e) => {
    // Use default value if invalid input
    const value = parseInt(e.target.value) || 20;
    
    // Limit to reasonable values between 5 and 100
    const limitedValue = Math.min(Math.max(value, 5), 100);
    
    setItemsPerPage(limitedValue);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  return (
    <AuthLayout>
      {/* Custom Days Selection Modal */}
      {showDaysModal && selectedProblemForReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Schedule Review for Problem #{selectedProblemForReview.ID}
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {selectedProblemForReview.Title}
            </p>
            <div className="mb-4">
              <label htmlFor="reviewDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Days until review:
              </label>
              <input
                type="number"
                min="1"
                id="reviewDays"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={reviewDays}
                onChange={(e) => {
                  // Get the value from the input
                  const value = e.target.value;
                  
                  // Convert to number or set to empty string if invalid
                  const numValue = value === '' ? 0 : parseInt(value);
                  
                  // Update state with the parsed value
                  setReviewDays(numValue);
                }}
                onFocus={(e) => {
                  // Select all text when input is focused
                  e.target.select();
                }}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Problem will be scheduled for review in {reviewDays} day{reviewDays !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                onClick={() => {
                  setShowDaysModal(false);
                  setSelectedProblemForReview(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => scheduleReview(reviewDays)}
                disabled={reviewDays < 1}
              >
                Schedule Review
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="px-4 py-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">LeetCode Problems</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Browse and filter your LeetCode problems
            </p>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={refreshData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            title="Refresh data"
          >
            {loading ? (
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
                Refresh
              </>
            )}
          </button>
        </div>
        
        {loading && !problems.length ? (
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
            {/* Filters and Search - Responsive redesign */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 mb-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Search - Full width on mobile */}
                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Search
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="search"
                      id="search"
                      className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full py-3 sm:py-2 pl-3 pr-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md min-h-[44px]"
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
                    className="mt-1 block w-full pl-3 pr-10 py-3 sm:py-2 text-base sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-green-500 focus:border-green-500 rounded-md min-h-[44px]"
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
                      className="block w-full pl-3 pr-10 py-3 sm:py-2 text-base sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-green-500 focus:border-green-500 rounded-l-md min-h-[44px]"
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
                      className="inline-flex items-center justify-center px-4 sm:px-3 border border-l-0 border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm text-sm leading-4 font-medium rounded-r-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 min-h-[44px]"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Results
                  </label>
                  <div className="mt-1 flex min-h-[44px] items-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Showing <span className="font-medium text-gray-900 dark:text-white">{currentProblems.length}</span> of{' '}
                      <span className="font-medium text-gray-900 dark:text-white">{sortedProblems.length}</span> problems
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Tags - Collapsible on mobile */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags</h3>
                  <button 
                    type="button"
                    onClick={() => {
                      const tagsSection = document.getElementById('tags-section');
                      tagsSection.classList.toggle('hidden');
                      tagsSection.classList.toggle('flex');
                    }}
                    className="md:hidden text-green-600 dark:text-green-400 text-sm flex items-center"
                    aria-expanded="false"
                  >
                    <span className="mr-1">Toggle Tags</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <div id="tags-section" className="hidden md:flex flex-wrap gap-2 mt-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium min-h-[30px] ${
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
            
            {/* Problems Table/Cards - Responsive design */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
              {/* Bulk Actions Button */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center">
                    <button
                      onClick={toggleSelectAll}
                      className={`mr-3 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium 
                      ${selectedProblemIds.length > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                    >
                      {selectedProblemIds.length === currentProblems.length && currentProblems.length > 0 
                        ? 'Deselect All' 
                        : 'Select All'}
                    </button>
                    {selectedProblemIds.length > 0 && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedProblemIds.length} problem{selectedProblemIds.length === 1 ? '' : 's'} selected
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setShowBulkActions(!showBulkActions)}
                    className={`px-4 py-2 rounded-md border border-transparent text-sm font-medium shadow-sm
                    ${showBulkActions 
                      ? 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {showBulkActions ? 'Hide Bulk Actions' : 'Bulk Actions'}
                  </button>
                </div>
                
                {showBulkActions && (
                  <div className="mt-4">
                    <BulkReviewActions 
                      problems={problems} 
                      selectedIds={selectedProblemIds}
                      onClose={() => {
                        setShowBulkActions(false);
                        setSelectedProblems({});
                      }}
                    />
                  </div>
                )}
              </div>
              
              {/* Desktop view - Traditional table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">
                        <span className="sr-only">Select</span>
                      </th>
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
                        Remarks
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date Added
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentProblems.map((problem, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">
                          <input
                            type="checkbox"
                            checked={!!selectedProblems[problem.ID]}
                            onChange={() => toggleProblemSelection(problem.ID)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                          />
                        </td>
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
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                          <div className="max-w-xs md:max-w-sm break-words">
                            {problem.Remarks ? problem.Remarks : '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {new Date(problem.Timestamp).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          <button
                            onClick={() => {
                              setSelectedProblemForReview(problem);
                              setShowDaysModal(true);
                            }}
                            disabled={addingToReview[problem.ID]}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {addingToReview[problem.ID] ? 'Adding...' : 'Add to Review'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {currentProblems.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No problems found matching your filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Mobile view - Card layout */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {currentProblems.map((problem, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <div className="mr-2">
                          <input
                            type="checkbox"
                            checked={!!selectedProblems[problem.ID]}
                            onChange={() => toggleProblemSelection(problem.ID)}
                            className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white mr-2">#{problem.ID}</span>
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${problem.Difficulty === 'Easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                          problem.Difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                          {problem.Difficulty}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(problem.Timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <a 
                      href={problem.URL} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-base font-medium text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:underline block mb-2 ml-7"
                    >
                      {problem.Title}
                    </a>
                    
                    {problem.Tags && (
                      <div className="mb-2 ml-7">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tags:</div>
                        <div className="flex flex-wrap gap-1">
                          {problem.Tags.split(',').map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {problem.Remarks && (
                      <div className="mt-2 ml-7">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remarks:</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 break-words">
                          {problem.Remarks}
                        </div>
                      </div>
                    )}

                    <div className="mt-2 ml-7">
                      <button
                        onClick={() => {
                          setSelectedProblemForReview(problem);
                          setShowDaysModal(true);
                        }}
                        disabled={addingToReview[problem.ID]}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {addingToReview[problem.ID] ? 'Adding...' : 'Add to Review'}
                      </button>
                    </div>
                  </div>
                ))}
                
                {currentProblems.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No problems found matching your filters
                  </div>
                )}
              </div>
            </div>
            
            {/* Pagination */}
            <div className="mt-6 bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400 mr-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <label htmlFor="itemsPerPage" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    Items per page:
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      id="itemsPerPage"
                      value={itemsPerPage}
                      onChange={handleItemsPerPageChange}
                      className="block min-w-[60px] pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      {![10, 20, 50].includes(itemsPerPage) && (
                        <option value={itemsPerPage}>{itemsPerPage}</option>
                      )}
                    </select>
                    
                    <div className="relative">
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value=""
                        placeholder="Custom"
                        aria-label="Custom items per page"
                        onChange={handleCustomItemsPerPageChange}
                        className="block w-24 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-400">
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile view for page numbers */}
              <div className="mt-4 sm:hidden flex justify-center">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{indexOfFirstProblem + 1}</span>
                  {' '}-{' '}
                  <span className="font-medium">{Math.min(indexOfLastProblem, sortedProblems.length)}</span>
                  {' '}of{' '}
                  <span className="font-medium">{sortedProblems.length}</span> problems
                </p>
              </div>
            </div>

            {lastFetched && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                Last updated: {new Date(lastFetched).toLocaleString()}
              </div>
            )}
          </>
        )}
      </div>
    </AuthLayout>
  );
}