'use client';

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { fetchLeetCodeProblems, getProblemStats } from '@/utils/leetcodeData';
import { useAuth } from './AuthContext';

// Create the context
const DataContext = createContext();

// Provider component
export function DataProvider({ children }) {
  const [problems, setProblems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  
  const { user, loading: authLoading } = useAuth();

  // Load data function that can be called manually - wrapped in useCallback to avoid unnecessary recreations
  const loadData = useCallback(async (force = false) => {
    // Don't try to fetch data if not authenticated
    if (!user) return;
    
    // Skip fetching if data exists and force is false
    if (problems.length > 0 && !force) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchLeetCodeProblems();
      setProblems(data);
      setStats(getProblemStats(data));
      setLastFetched(new Date().toISOString());
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [user, problems.length]);

  // Initial data load when user is authenticated
  useEffect(() => {
    // Only attempt to load data when auth state is settled and user is logged in
    if (!authLoading && user) {
      loadData();
    }
  }, [user, authLoading, loadData]);

  // Refresh function for manual data reloading
  const refreshData = useCallback(() => loadData(true), [loadData]);

  // Context value
  const value = {
    problems,
    stats,
    loading: loading || (authLoading && !problems.length), // Show loading if auth is loading or data is loading
    error,
    refreshData,
    lastFetched,
    isAuthenticated: !!user
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

// Custom hook for using the data context
export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}