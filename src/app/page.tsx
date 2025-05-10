"use client"; // Mark as a Client Component

import { useState, useEffect } from "react";
import PullRequestItem from "../components/PullRequestItem";

// Define the expected structure of a diff object
interface DiffItem {
  id: string;
  description: string;
  diff: string;
  url: string; // Added URL field
}

// Define the expected structure of the API response
interface ApiResponse {
  diffs: DiffItem[];
  nextPage: number | null;
  currentPage: number;
  perPage: number;
}

// Generate stars for the background using a deterministic approach
const StarBackground = ({ count = 50 }: { count?: number }) => {
  // Using useEffect to ensure client-side only rendering
  const [stars, setStars] = useState<React.ReactNode[]>([]);
  
  useEffect(() => {
    // This will run only on the client side
    const generatedStars = Array.from({ length: count }, (_, i) => {
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const size = Math.random() * 2 + 1;
      
      return (
        <div 
          key={i} 
          className="star" 
          style={{ 
            top: `${top}%`, 
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            animationDelay: `${Math.random() * 4}s`
          }}
        />
      );
    });
    
    setStars(generatedStars);
  }, [count]);
  
  return <div className="fixed inset-0 z-0 overflow-hidden">{stars}</div>;
};

export default function Home() {
  const [diffs, setDiffs] = useState<DiffItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState<boolean>(false);

  const fetchDiffs = async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/sample-diffs?page=${page}&per_page=10`
      );
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.details || errorMsg;
        } catch {
          // Ignore if response body is not JSON
          console.warn("Failed to parse error response as JSON");
        }
        throw new Error(errorMsg);
      }
      const data: ApiResponse = await response.json();

      setDiffs((prevDiffs) =>
        page === 1 ? data.diffs : [...prevDiffs, ...data.diffs]
      );
      setCurrentPage(data.currentPage);
      setNextPage(data.nextPage);
      if (!initialFetchDone) setInitialFetchDone(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchClick = () => {
    setDiffs([]); // Clear existing diffs when fetching the first page again
    fetchDiffs(1);
  };

  const handleLoadMoreClick = () => {
    if (nextPage) {
      fetchDiffs(nextPage);
    }
  };

  return (
    <>
      <StarBackground count={100} />
      <main className="flex min-h-screen flex-col items-center p-8 sm:p-12 lg:p-24 relative z-10">
        <div className="w-full max-w-5xl">
          <h1 className="text-5xl font-bold mb-6 text-center glow-text tracking-tight">
            Diff Digest <span className="text-blue-400">✍️</span>
          </h1>
          <p className="text-lg text-center text-blue-200/80 mb-12">
            Transforming Git diffs into dual-tone release notes with AI
          </p>

          {/* Controls Section */}
          <div className="mb-10 flex justify-center">
            <button
              className="px-6 py-3 rounded-full glow-button flex items-center gap-2 text-lg font-medium"
              onClick={handleFetchClick}
              disabled={isLoading}
            >
              {isLoading && currentPage === 1 ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Fetching...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Fetch Latest Diffs
                </>
              )}
            </button>
          </div>

          {/* Results Section */}
          <div className="card p-8">
            <h2 className="text-2xl font-semibold mb-6 glow-text">Merged Pull Requests</h2>

            {error && (
              <div className="text-red-400 bg-red-900/30 p-4 rounded-lg mb-6 border border-red-500/50">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Error: {error}
                </div>
              </div>
            )}

            {!initialFetchDone && !isLoading && (
              <div className="text-center p-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-blue-400 mb-6 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <p className="text-blue-200/80 text-lg">
                  Click the button above to fetch the latest merged pull requests
                </p>
              </div>
            )}

            {initialFetchDone && diffs.length === 0 && !isLoading && !error && (
              <div className="text-center p-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-blue-400 mb-6 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-blue-200/80 text-lg">
                  No merged pull requests found or fetched
                </p>
              </div>
            )}

            {diffs.length > 0 && (
              <div className="space-y-6">
                {diffs.map((item) => (
                  <PullRequestItem key={item.id} pr={item} />
                ))}
              </div>
            )}

            {isLoading && currentPage > 1 && (
              <div className="text-center py-6">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                <p className="text-blue-200/80 mt-2">Loading more...</p>
              </div>
            )}

            {nextPage && !isLoading && (
              <div className="mt-8 text-center">
                <button
                  className="px-6 py-2 rounded-full glow-button"
                  onClick={handleLoadMoreClick}
                  disabled={isLoading}
                >
                  Load More (Page {nextPage})
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
