import React from 'react';
import { cn } from '@/app/lib/utils';

interface SectionDividerProps {
  className?: string;
}

export function SectionDivider({ className }: SectionDividerProps) {
  return (
    <div className={cn("h-[1px] w-full bg-[#FFFFFF] opacity-[0.05]", className)} />
  );
}
