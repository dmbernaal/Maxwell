import React from 'react';
import { cn } from '@/app/lib/utils';

interface MicroCornerGridProps {
  className?: string;
}

export function MicroCornerGrid({ className }: MicroCornerGridProps) {
  return (
    <svg 
      fill="none" 
      height="14" 
      viewBox="0 0 14 14" 
      width="14" 
      xmlns="http://www.w3.org/2000/svg" 
      className={cn("pointer-events-none absolute z-20 text-border-base", className)}
    >
      <path 
        d="M6.5 3C6.5 5.48528 4.48528 7.5 2 7.5H0.5V8.5H2C4.48528 8.5 6.5 10.5147 6.5 13V14.5H7.5V13C7.5 10.5147 9.51472 8.5 12 8.5H13.5V7.5H12C9.51472 7.5 7.5 5.48528 7.5 3V1.5H6.5V3Z" 
        fill="currentColor"
      />
    </svg>
  );
}
