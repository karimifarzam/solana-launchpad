'use client';

import React from 'react';

interface GraduationProgressProps {
  progress: number;
  target: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'green' | 'blue' | 'purple';
}

export function GraduationProgress({ 
  progress, 
  target, 
  label = 'Progress',
  showPercentage = true,
  size = 'md',
  color = 'primary'
}: GraduationProgressProps) {
  const percentage = Math.min(100, (progress / target) * 100);
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const colorClasses = {
    primary: 'bg-primary-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className={`font-medium text-gray-700 ${textSizeClasses[size]}`}>
          {label}
        </span>
        {showPercentage && (
          <span className={`text-gray-600 ${textSizeClasses[size]}`}>
            {percentage.toFixed(1)}%
          </span>
        )}
      </div>
      
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {progress !== target && (
        <div className={`mt-1 text-gray-500 ${textSizeClasses[size]}`}>
          {progress.toFixed(1)} / {target} {getProgressUnit(label)}
        </div>
      )}
    </div>
  );
}

function getProgressUnit(label: string): string {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes('sol')) return 'SOL';
  if (lowerLabel.includes('token')) return 'tokens';
  if (lowerLabel.includes('volume')) return 'volume';
  return '';
}