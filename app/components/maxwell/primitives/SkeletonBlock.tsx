import React from 'react';
import { cn } from '@/app/lib/utils';
import { motion, useReducedMotion } from 'framer-motion';

interface SkeletonBlockProps {
  width?: string | number;
  height?: string | number;
  variant?: 'block' | 'text' | 'chart' | 'waveform';
  className?: string;
}

export function SkeletonBlock({
  width = '100%',
  height = '100%',
  variant = 'block',
  className = '',
}: SkeletonBlockProps) {
  const shouldReduceMotion = useReducedMotion();

  const baseClasses = `
    rounded-sm
    ${shouldReduceMotion ? 'bg-[#1a1a1a]' : 'skeleton-terminal'}
  `;

  const variantStyles: Record<string, string> = {
    block: `w-[${width}] h-[${height}]`,
    text: `w-[${width}] h-4`,
    chart: `w-[${width}] h-40`,
    waveform: `w-[${width}] h-8`,
  };

  if (variant === 'chart') {
    return (
      <div
        className={`
          ${baseClasses}
          w-[${width}]
          h-[${height}]
          flex items-end justify-between px-4 py-2
          ${className}
        `}
        role="status"
        aria-label="Loading chart data"
      >
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`
              w-4 rounded-sm bg-cyan-500/20
              ${shouldReduceMotion ? '' : 'skeleton-terminal'}
            `}
            style={{
              height: `${30 + Math.random() * 40}%`,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'waveform') {
    return (
      <div
        className={`
          ${baseClasses}
          w-[${width}]
          h-[${height}]
          flex items-end gap-0.5 px-2 py-1
          ${className}
        `}
        role="status"
        aria-label="Loading waveform data"
      >
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`
              w-2 rounded-sm bg-white/20
              ${shouldReduceMotion ? '' : 'skeleton-terminal'}
            `}
            style={{
              height: `${20 + i * 10}%`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantStyles[variant]} ${className}`}
      style={{ width, height }}
      role="status"
      aria-label={variant === 'text' ? 'Loading text' : 'Loading content'}
    />
  );
}
