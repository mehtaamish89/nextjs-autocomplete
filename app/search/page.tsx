"use client";

import { useState, useEffect, useRef } from "react";

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLimit, setSearchLimit] = useState(2);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Map<string, string[]>>(new Map());

  useEffect(() => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!keyword.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Debounce: wait 500ms before making the request
    debounceTimerRef.current = setTimeout(() => {
      handleSearch();
    }, 500);

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [keyword, searchLimit]);

  const handleSearch = async () => {
    if (!keyword.trim()) {
      return;
    }

    // Create cache key from keyword and searchLimit
    // Both keyword and searchLimit are part of the cache key
    const normalizedKeyword = keyword.trim().toLowerCase();
    const cacheKey = `${normalizedKeyword}|limit:${searchLimit}`;

    // Check cache first
    const cachedResult = cacheRef.current.get(cacheKey);
    if (cachedResult !== undefined) {
      setSearchResults(cachedResult);
      setIsSearching(false);
      return;
    }

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://autocomplete-lyart.vercel.app/api/words?query=${keyword}&limit=${searchLimit}`,
        { signal: abortController.signal }
      );
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      
      // Only update state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        // Store in cache
        cacheRef.current.set(cacheKey, data);
        setSearchResults(data);
        setIsSearching(false);
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Search error:', error);
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      handleSearch();
    }
  };

  const selectSearchResult = (result: string) => {
    console.log(result);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="w-full">
          <h1 className="mb-8 text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Search
          </h1>
          
          <div className="mb-8 flex flex-col gap-4 sm:flex-row">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter keyword to search..."
              className="flex-1 rounded-lg border border-solid border-black/[.08] bg-white px-4 py-3 text-base text-black placeholder:text-zinc-400 focus:border-black/[.2] focus:outline-none dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-white/[.3]"
            />
            <select onChange={(e) => setSearchLimit(parseInt(e.target.value))}>
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="10">10</option>
            </select>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                Results ({searchResults.length})
              </h2>
              <div className="space-y-3">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => selectSearchResult(result)}
                    className="rounded-lg border border-solid border-black/[.08] bg-zinc-50 p-4 text-base text-zinc-700 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}

          {keyword && searchResults.length === 0 && !isSearching && (
            <div className="rounded-lg border border-solid border-black/[.08] bg-zinc-50 p-4 text-base text-zinc-600 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-400">
              No results found for "{keyword}"
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

