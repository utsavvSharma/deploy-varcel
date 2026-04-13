"use client";

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  gradient?: boolean;
}

export default function StatCard({ title, value, change, trend, icon, gradient = false }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Animated counter effect
  useEffect(() => {
    if (hasAnimated) return;
    
    const duration = 1000; // 1 second
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
        setHasAnimated(true);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, hasAnimated]);

  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const colorClass = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
  const bgColorClass = trend === 'up' ? 'bg-green-50' : trend === 'down' ? 'bg-red-50' : 'bg-gray-50';

  return (
    <div 
      className={`
        bg-white rounded-lg elevation-sm p-6 
        hover:elevation-md transition-all duration-300
        ${gradient ? 'bg-gradient-to-br from-white to-blue-50' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-3xl font-bold text-gray-900 animate-count-up">
              {displayValue.toLocaleString()}
            </div>
            {change && trend && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bgColorClass} ${colorClass}`}>
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {change}
              </div>
            )}
          </div>
        </div>
        {icon && (
          <div className="flex-shrink-0 p-3 bg-blue-50 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}