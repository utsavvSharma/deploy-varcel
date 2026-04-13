"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean, message?: string) => void;
  withLoading: <T>(promise: Promise<T>, message?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  setLoading: () => {},
  withLoading: async (promise) => promise,
});

export function useLoading() {
  return useContext(LoadingContext);
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Please wait...');

  const setLoading = (loading: boolean, customMessage?: string) => {
    setIsLoading(loading);
    if (customMessage) {
      setMessage(customMessage);
    } else {
      setMessage('Please wait...');
    }
  };

  const withLoading = async <T,>(promise: Promise<T>, customMessage?: string): Promise<T> => {
    setLoading(true, customMessage);
    try {
      const result = await promise;
      return result;
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading, withLoading }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-4 min-w-[200px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-700 font-medium">{message}</p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}
