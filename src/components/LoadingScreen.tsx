"use client";

import Image from "next/image";

interface LoadingScreenProps {
  fullScreen?: boolean;
  message?: string;
}

export default function LoadingScreen({ fullScreen = true, message }: LoadingScreenProps) {
  const containerClass = fullScreen 
    ? "fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 z-50"
    : "flex flex-col items-center justify-center p-8";

  return (
    <div className={containerClass}>
      <div className="relative">
        {/* Animated background glow */}
        <div className="absolute inset-0 blur-3xl opacity-30 animate-pulse">
          <div className="w-32 h-32 bg-orange-400 rounded-full"></div>
        </div>
        
        {/* Logo with animation */}
        <div className="relative animate-float">
          <Image
            src="/images/infobeamLogo.png"
            alt="Infobeam Logo"
            width={120}
            height={120}
            priority
            className="drop-shadow-2xl"
          />
        </div>
      </div>
      
      {/* Loading text */}
      <div className="mt-8 text-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-black to-black bg-clip-text text-transparent mb-2">
          Infobeam Solution
        </h2>
        {message && (
          <p className="text-gray-600 text-sm animate-pulse">{message}</p>
        )}
      </div>
      
      {/* Loading dots */}
      <div className="flex gap-2 mt-6">
        <div className="w-3 h-3 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 bg-yellow-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
}

// Inline loading spinner for buttons
export function LoadingSpinner({ size = "sm", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
  };

  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-gray-300 border-t-blue-600 ${className}`} />
  );
}
