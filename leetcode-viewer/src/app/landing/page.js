'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import gsap from 'gsap';
import dynamic from 'next/dynamic';
import * as animationDataImport from './coding-animation.json';

// Dynamically import Lottie with no SSR to prevent "document is not defined" errors
const Lottie = dynamic(() => import('react-lottie'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-blue-500 blur-md opacity-70 animate-pulse"></div>
        <div className="relative animate-spin rounded-full h-10 w-10 border-4 border-t-green-500 border-r-blue-500 border-b-green-500 border-l-blue-500 border-opacity-30"></div>
      </div>
    </div>
  )
});

// Animated code particles component with proper mobile handling
const CodeParticle = ({ delay }) => {
  const symbols = ['{}', '()', '[]', '<>', ';', '=>', '&&', '||', '++', '--'];
  const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
  
  return (
    <motion.div
      className="absolute text-green-400/30 font-mono hidden sm:block"
      initial={{ opacity: 0, y: 0, x: Math.random() * 100 - 50 }}
      animate={{ 
        opacity: [0, 1, 0], 
        y: [0, -100 - Math.random() * 100],
        x: (Math.random() * 200 - 100) 
      }}
      transition={{ 
        duration: 3 + Math.random() * 2, 
        delay: delay,
        repeat: Infinity,
        repeatDelay: Math.random() * 5
      }}
      style={{
        fontSize: `${Math.random() * 20 + 10}px`,
        left: `${Math.random() * 90}%`,
        top: `${80 + Math.random() * 20}%`
      }}
    >
      {randomSymbol}
    </motion.div>
  );
};

// Fixed animation data - immediately available to prevent conditional loading issues
const dummyAnimationData = {
  v: "5.7.1",
  fr: 29.9700012207031,
  ip: 0,
  op: 180.00000733155,
  w: 800,
  h: 600,
  nm: "Coding Animation",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Shape Layer",
      sr: 1,
      ks: {},
      ao: 0,
      shapes: [],
      ip: 0,
      op: 180.00000733155,
      st: 0
    }
  ],
  markers: []
};

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [codeParticles, setCodeParticles] = useState([]);
  const heroRef = useRef(null);
  const ctaRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  // Use dummy animation data initially to avoid hydration issues
  const [animationData, setAnimationData] = useState(dummyAnimationData);
  
  // Animation refs using intersection observer with more relaxed settings
  const [featureRef1, inViewFeature1] = useInView({ 
    triggerOnce: false, 
    threshold: 0.1,
    rootMargin: "-100px 0px"
  });
  const [featureRef2, inViewFeature2] = useInView({ 
    triggerOnce: false, 
    threshold: 0.1,
    rootMargin: "-100px 0px"
  });
  const [featureRef3, inViewFeature3] = useInView({ 
    triggerOnce: false, 
    threshold: 0.1,
    rootMargin: "-100px 0px"
  });
  const [ctaSectionRef, inViewCta] = useInView({ 
    triggerOnce: false, 
    threshold: 0.1,
    rootMargin: "-100px 0px"
  });
  const [analyticsRef, inViewAnalytics] = useInView({
    triggerOnce: false,
    threshold: 0.1,
    rootMargin: "-100px 0px"
  });

  // Default options for Lottie animation - with fallback animation data
  const defaultOptions = {
    loop: true,
    autoplay: true, 
    animationData: animationData || dummyAnimationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  };
  
  // Set isMounted to true after initial render and safely load animation data
  useEffect(() => {
    setIsMounted(true);
    // Safely load animation data with a try-catch
    try {
      if (animationDataImport) {
        const animationCopy = JSON.parse(JSON.stringify(animationDataImport));
        setAnimationData(animationCopy);
      }
    } catch (error) {
      console.error("Error loading animation data:", error);
      // Keep using fallback animation data
    }
  }, []);
  
  // Check if device is mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        setIsMobile(window.innerWidth < 640);
      };
      
      // Set initial value
      handleResize();
      
      // Add event listener
      window.addEventListener('resize', handleResize);
      
      // Cleanup
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  // Generate code particles - fewer on mobile for performance
  useEffect(() => {
    const particles = [];
    const particleCount = isMobile ? 5 : 15;
    for (let i = 0; i < particleCount; i++) {
      particles.push({ id: i, delay: i * 0.3 });
    }
    setCodeParticles(particles);
  }, [isMobile]);
  
  // GSAP animations - with better cleanup and delayed execution
  useEffect(() => {
    // Only run GSAP animations after component is mounted and visible
    if (!isMounted || typeof window === 'undefined') return;
    
    let animations = [];
    
    // Small delay to ensure DOM is fully rendered
    const animationTimeout = setTimeout(() => {
      if (heroRef.current) {
        const headingAnim = gsap.fromTo(".hero-heading", 
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, stagger: 0.2, duration: 1, ease: "power3.out" }
        );
        
        const paragraphAnim = gsap.fromTo(".hero-paragraph", 
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 1, delay: 0.5, ease: "power3.out" }
        );
        
        const buttonsAnim = gsap.fromTo(".hero-buttons", 
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 1, delay: 0.8, ease: "power3.out" }
        );
        
        animations.push(headingAnim, paragraphAnim, buttonsAnim);
      }
      
      if (ctaRef.current && inViewCta) {
        const ctaAnimation = gsap.fromTo(ctaRef.current.children, 
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, stagger: 0.2, duration: 0.8, ease: "power3.out" }
        );
        animations.push(ctaAnimation);
      }
    }, 100);
    
    // Cleanup function
    return () => {
      clearTimeout(animationTimeout);
      animations.forEach(anim => {
        if (anim && anim.kill) {
          anim.kill();
        }
      });
    };
  }, [isMounted, inViewCta]);
  
  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [loading, user, router]);

  return (
    <div className="bg-white dark:bg-gray-900 overflow-hidden min-h-screen">
      {/* Hero section with animated background */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-green-900 dark:from-black dark:to-gray-800">
        {/* Animated code particles - only shown on tablet and up */}
        {isMounted && codeParticles.map((particle) => (
          <CodeParticle key={particle.id} delay={particle.delay} />
        ))}
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32 relative z-10" ref={heroRef}>
          <div className="text-center md:max-w-2xl md:mx-auto">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight md:text-5xl lg:text-6xl hero-heading">
              <span className="block">
                Track and Improve Your
              </span>
              <span className="block text-green-400 mt-2">
                LeetCode Progress
              </span>
            </h1>
            
            <p className="mt-6 text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto hero-paragraph">
              Part of the LeetCode2AnkiPlus ecosystem. A beautiful interface for your LeetCode practice with smart tracking, advanced filtering, perfect text wrapping, and intelligent spaced repetition reviews.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row sm:justify-center sm:space-x-4 hero-buttons">
              <div className="rounded-md shadow mb-4 sm:mb-0">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link 
                    href="/signup" 
                    className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 md:py-3 md:text-lg md:px-8 transition-all duration-200"
                  >
                    Get started
                  </Link>
                </motion.div>
              </div>
              <div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link 
                    href="/login"
                    className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-green-300 bg-gray-800 bg-opacity-60 hover:bg-opacity-70 md:py-3 md:text-lg md:px-8 transition-all duration-200"
                  >
                    Sign in
                  </Link>
                </motion.div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-center">
              <a 
                href="https://github.com/UjjwalSharma01/Leetcode2ankiPlus" 
                target="_blank"
                rel="noopener noreferrer" 
                className="inline-flex items-center text-gray-300 hover:text-white transition-colors duration-200"
                aria-label="View project on GitHub"
              >
                <svg className="h-6 w-6 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
          
          {/* Added mockup visualization */}
          <div className="mt-12 relative mx-auto max-w-3xl px-4 sm:px-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-green-400 to-blue-500 rounded-xl shadow-xl transform -rotate-1 scale-105 opacity-30 blur-lg"></div>
              <motion.div 
                className="relative bg-gray-900 border border-gray-800 shadow-2xl rounded-xl overflow-hidden"
                initial={isMounted ? { opacity: 0, y: 40 } : { opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <div className="h-8 bg-gray-800 flex items-center px-4">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="mx-auto text-gray-400 text-xs">leetcode2anki-plus-viewer</div>
                </div>
                <div className="p-1 bg-gray-900">
                  <div className="h-48 sm:h-64 md:h-80 bg-gray-800 rounded overflow-hidden relative flex items-center justify-center">
                    <p className="text-center text-green-500 font-mono animate-pulse">
                      <span className="text-blue-400">&lt;</span>
                      <span className="text-yellow-400">LeetCode2Anki</span>
                      <span className="text-green-400">Plus</span>
                      <span className="text-blue-400">/&gt;</span>
                    </p>
                    <div className="absolute inset-0 opacity-20">
                      {isMounted && typeof window !== 'undefined' && animationData && (
                        <div className="lottie-container">
                          <Lottie 
                            options={defaultOptions} 
                            height="100%" 
                            width="100%" 
                            isClickToPauseDisabled={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Features section with staggered animations */}
      <div className="py-12 sm:py-16 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 space-y-8 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-block">
              <motion.h2 
                className="text-base font-semibold text-green-600 dark:text-green-400 tracking-wide uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                Features
              </motion.h2>
            </span>
            <motion.p 
              className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white md:text-4xl lg:text-5xl sm:tracking-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              Everything you need for LeetCode mastery
            </motion.p>
            <motion.p 
              className="max-w-xl mt-5 mx-auto text-base sm:text-lg md:text-xl text-gray-500 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
            >
              A better way to track and systematically review your coding practice
            </motion.p>
          </motion.div>

          <div className="mt-12 sm:mt-16">
            <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
              {/* Feature 1 */}
              <motion.div 
                className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 transform transition duration-500 h-full"
                ref={featureRef1}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: inViewFeature1 ? 1 : 0.5, y: inViewFeature1 ? 0 : 20 }}
                transition={{ duration: 0.7 }}
                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
              >
                <div className="rounded-lg p-3 bg-gradient-to-r from-green-500 to-green-600 inline-block">
                  <svg className="h-6 w-6 sm:h-8 sm:w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="mt-4 sm:mt-5 text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Better Organization</h3>
                <p className="mt-2 sm:mt-3 text-base text-gray-500 dark:text-gray-400">
                  Proper text wrapping, advanced filtering by tags and complexity, and intuitive sorting make it easy to find and review your problems.
                </p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div 
                className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 transform transition duration-500 h-full"
                ref={featureRef2}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: inViewFeature2 ? 1 : 0.5, y: inViewFeature2 ? 0 : 20 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
              >
                <div className="rounded-lg p-3 bg-gradient-to-r from-blue-500 to-blue-600 inline-block">
                  <svg className="h-6 w-6 sm:h-8 sm:w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <h3 className="mt-4 sm:mt-5 text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Insightful Statistics</h3>
                <p className="mt-2 sm:mt-3 text-base text-gray-500 dark:text-gray-400">
                  Track your journey with problem difficulty distribution, completion trends over time, and detailed tag analytics for progress insights.
                </p>
              </motion.div>

              {/* Feature 3 */}
              <motion.div 
                className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 transform transition duration-500 h-full"
                ref={featureRef3}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: inViewFeature3 ? 1 : 0.5, y: inViewFeature3 ? 0 : 20 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
              >
                <div className="rounded-lg p-3 bg-gradient-to-r from-yellow-500 to-yellow-600 inline-block">
                  <svg className="h-6 w-6 sm:h-8 sm:w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 sm:mt-5 text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Scheduled Reviews</h3>
                <p className="mt-2 sm:mt-3 text-base text-gray-500 dark:text-gray-400">
                  Maximize retention with our integrated spaced repetition system that helps you review problems at the optimal time for long-term memory.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics section (new) - improved mobile layout */}
      <div className="py-12 sm:py-16 bg-gray-50 dark:bg-gray-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={analyticsRef}>
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: inViewAnalytics ? 1 : 0.6, y: inViewAnalytics ? 0 : 20 }}
            exit={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-base font-semibold text-green-600 dark:text-green-400 tracking-wide uppercase">Analytics</h2>
            <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white md:text-4xl lg:text-5xl sm:tracking-tight">
              Track your progress
            </p>
            <p className="max-w-xl mt-4 mx-auto text-base sm:text-lg md:text-xl text-gray-500 dark:text-gray-400">
              Visualize your LeetCode journey with beautiful statistics
            </p>
          </motion.div>
          
          <div className="mt-12 sm:mt-16 grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3">
            {/* Stat 1 - Problems Solved */}
            <motion.div 
              className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 sm:p-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: inViewAnalytics ? 1 : 0.6, y: inViewAnalytics ? 0 : 20 }}
              exit={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-wrap justify-between items-center">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Problems Solved</h3>
                <span className="flex items-center text-green-600 dark:text-green-400 text-sm sm:text-base">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>+23%</span>
                </span>
              </div>
              <div className="mt-4 sm:mt-6 flex flex-wrap items-baseline">
                <p className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">248</p>
                <p className="ml-2 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">from 350 attempted</p>
              </div>
              <div className="mt-3 sm:mt-4 h-3 relative max-w-xl rounded-full overflow-hidden">
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 absolute"></div>
                <motion.div 
                  className="h-full bg-green-500 absolute"
                  initial={{ width: 0 }}
                  animate={{ width: inViewAnalytics ? "70%" : "0%" }}
                  exit={{ width: "70%" }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                ></motion.div>
              </div>
            </motion.div>
            
            {/* Stat 2 - Difficulty Distribution */}
            <motion.div 
              className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 sm:p-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: inViewAnalytics ? 1 : 0.6, y: inViewAnalytics ? 0 : 20 }}
              exit={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Difficulty Distribution</h3>
              <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-green-500">122</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Easy</p>
                  <motion.div 
                    className="mt-2 h-2 bg-green-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: inViewAnalytics ? "100%" : "0%" }}
                    exit={{ width: "100%" }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  ></motion.div>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-yellow-500">84</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Medium</p>
                  <motion.div 
                    className="mt-2 h-2 bg-yellow-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: inViewAnalytics ? "70%" : "0%" }}
                    exit={{ width: "70%" }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  ></motion.div>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-red-500">42</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Hard</p>
                  <motion.div 
                    className="mt-2 h-2 bg-red-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: inViewAnalytics ? "40%" : "0%" }}
                    exit={{ width: "40%" }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
                  ></motion.div>
                </div>
              </div>
            </motion.div>
            
            {/* Stat 3 - Review Efficiency */}
            <motion.div 
              className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 sm:p-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: inViewAnalytics ? 1 : 0.6, y: inViewAnalytics ? 0 : 20 }}
              exit={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Review Efficiency</h3>
              <div className="mt-4 sm:mt-6 flex items-baseline">
                <p className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-blue-600 dark:text-blue-400">93%</p>
                <p className="ml-2 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">retention rate</p>
              </div>
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Last reviewed 24 problems with our spaced repetition system. Next review scheduled in 2 days.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* CTA section with animated gradient background - improved for mobile */}
      <div 
        className="relative overflow-hidden bg-gradient-to-r from-green-800 via-green-700 to-blue-800 dark:from-green-900 dark:via-green-800 dark:to-blue-900"
        ref={ctaSectionRef}
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute -inset-[10px] opacity-30 blur-3xl"
            animate={{ 
              background: [
                'radial-gradient(circle at 30% 50%, rgba(76, 175, 80, 0.5) 0%, rgba(25, 118, 210, 0.3) 50%, rgba(76, 175, 80, 0) 70%)',
                'radial-gradient(circle at 70% 60%, rgba(76, 175, 80, 0.5) 0%, rgba(25, 118, 210, 0.3) 50%, rgba(76, 175, 80, 0) 70%)',
                'radial-gradient(circle at 40% 70%, rgba(76, 175, 80, 0.5) 0%, rgba(25, 118, 210, 0.3) 50%, rgba(76, 175, 80, 0) 70%)',
                'radial-gradient(circle at 30% 50%, rgba(76, 175, 80, 0.5) 0%, rgba(25, 118, 210, 0.3) 50%, rgba(76, 175, 80, 0) 70%)'
              ]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          ></motion.div>
        </div>
        
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8 relative z-10" ref={ctaRef}>
          <motion.h2 
            className="text-2xl sm:text-3xl font-extrabold text-white md:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: inViewCta ? 1 : 0.6, y: inViewCta ? 0 : 20 }}
            exit={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            Ready to level up your LeetCode practice?
          </motion.h2>
          <motion.p 
            className="mt-4 text-base sm:text-lg leading-6 text-green-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: inViewCta ? 1 : 0.6, y: inViewCta ? 0 : 20 }}
            exit={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Join now to start tracking your progress and improving your coding skills with our spaced repetition system.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: inViewCta ? 1 : 0.6, y: inViewCta ? 0 : 20 }}
            exit={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-8"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block"
            >
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-green-800 bg-white hover:bg-green-50 dark:text-green-700 dark:hover:text-green-800 transition-all duration-200"
              >
                Sign up for free
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Footer with animated appearance - improved for mobile */}
      <footer className="bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="flex justify-center space-x-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            exit={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: false, amount: 0.1 }}
          >
            <a 
              href="https://github.com/UjjwalSharma01/Leetcode2ankiPlus" 
              target="_blank"
              rel="noopener noreferrer" 
              className="text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200"
              aria-label="GitHub"
            >
              <span className="sr-only">GitHub</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
          </motion.div>
          <motion.p 
            className="mt-6 sm:mt-8 text-center text-sm sm:text-base text-gray-500 dark:text-gray-400"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            viewport={{ once: false, amount: 0.1 }}
          >
            &copy; {new Date().getFullYear()} LeetCode2AnkiPlus. All rights reserved.
          </motion.p>
          <motion.p 
            className="mt-2 text-center text-xs sm:text-sm text-gray-400 dark:text-gray-500"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            viewport={{ once: false, amount: 0.1 }}
          >
            Created by <a href="https://github.com/UjjwalSharma01" className="text-green-600 dark:text-green-400 hover:underline transition-colors duration-200">Ujjwal Sharma</a>
          </motion.p>
        </div>
      </footer>
    </div>
  );
}