import React from 'react';
import { cn } from '../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'elevated';
}

export function Card({ 
  children, 
  className, 
  padding = 'md',
  variant = 'default' 
}: CardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const variantClasses = {
    default: 'bg-white border border-secondary-200',
    outlined: 'bg-transparent border-2 border-secondary-300',
    elevated: 'bg-white shadow-lg border border-secondary-100'
  };

  return (
    <div
      className={cn(
        'rounded-lg',
        paddingClasses[padding],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
