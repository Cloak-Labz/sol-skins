import React from 'react';
import { cn } from '../utils/cn';

interface StatsKPIProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatsKPI({ 
  title, 
  value, 
  subtitle, 
  trend = 'neutral',
  className 
}: StatsKPIProps) {
  const trendColors = {
    up: 'text-success-600',
    down: 'text-error-600',
    neutral: 'text-secondary-600'
  };

  return (
    <div className={cn('p-4 bg-white rounded-lg border border-secondary-200', className)}>
      <h3 className="text-sm font-medium text-secondary-600 mb-1">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-secondary-900">{value}</span>
        {trend !== 'neutral' && (
          <span className={cn('text-sm font-medium', trendColors[trend])}>
            {trend === 'up' ? '↗' : '↘'}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-secondary-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
