'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  bulkAddProblemsToReview,
  addTodaysProblemsToReview,
  addMultipleProblemsToReview
} from '@/utils/reviewService';

export default function BulkReviewActions({ problems, onClose, selectedIds = [] }) {
  const [isLoading, setIsLoading] = useState(false);
  const [daysUntilReview, setDaysUntilReview] = useState(1);
  const [showOptions, setShowOptions] = useState(false);
  
  const handleDaysChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setDaysUntilReview(value);
    }
  };
  
  const handleBulkAdd = async (type) => {
    setIsLoading(true);
    
    try {
      let result;
      
      switch (type) {
        case 'all':
          result = await bulkAddProblemsToReview();
          break;
        case 'today':
          result = await addTodaysProblemsToReview(daysUntilReview);
          break;
        case 'selected':
          if (selectedIds.length === 0) {
            toast.error('No problems selected. Please select problems first.');
            setIsLoading(false);
            return;
          }
          result = await addMultipleProblemsToReview(selectedIds, daysUntilReview);
          break;
        default:
          toast.error('Invalid operation type');
          setIsLoading(false);
          return;
      }
      
      if (result.success) {
        const count = result.addedCount || 0;
        toast.success(`Successfully added ${count} problems to review in ${daysUntilReview} day(s)`);
        
        // Show errors if any
        if (result.errors && result.errors.length > 0) {
          console.warn('Some problems could not be added:', result.errors);
          toast.error(`${result.errors.length} problems could not be added. Check console for details.`);
        }
        
        // Close modal if provided
        if (onClose) {
          onClose();
        }
      } else {
        toast.error(result.error || 'Failed to add problems to review');
      }
    } catch (error) {
      console.error('Error bulk adding problems:', error);
      toast.error('Failed to add problems to review. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-md">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
        Bulk Add to Review
      </h3>
      
      <div>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="mb-4 text-sm text-gray-600 dark:text-gray-400 underline cursor-pointer"
        >
          {showOptions ? 'Hide options' : 'Show options'}
        </button>
        
        {showOptions && (
          <div className="mb-4">
            <label htmlFor="daysUntilReview" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Days until first review
            </label>
            <div className="mt-1">
              <input
                type="number"
                min="1"
                name="daysUntilReview"
                id="daysUntilReview"
                className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                value={daysUntilReview}
                onChange={handleDaysChange}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              How many days from now until you want to review these problems
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => handleBulkAdd('all')}
            disabled={isLoading}
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Adding...' : 'Add All Problems'}
          </button>
          
          <button
            onClick={() => handleBulkAdd('today')}
            disabled={isLoading}
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {isLoading ? 'Adding...' : 'Add Today\'s Problems'}
          </button>
          
          <button
            onClick={() => handleBulkAdd('selected')}
            disabled={isLoading || selectedIds.length === 0}
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {isLoading ? 'Adding...' : `Add Selected (${selectedIds.length})`}
          </button>
        </div>
        
        {selectedIds.length > 0 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {selectedIds.length} problem(s) selected
          </p>
        )}
      </div>
    </div>
  );
}