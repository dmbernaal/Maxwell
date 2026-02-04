import React from 'react';
import { cn } from '@/app/lib/utils';
import { IntelligenceVerdict } from '@/app/lib/maxwell/types';

interface VerdictPillProps {
  verdict: IntelligenceVerdict;
  className?: string;
  size?: 'sm' | 'md';
}

export function VerdictPill({ verdict, className, size = 'md' }: VerdictPillProps) {
  const getStyles = (v: IntelligenceVerdict) => {
    switch (v) {
      case 'UNDERPRICED':
        return 'text-[#4ade80]';
      case 'OVERPRICED':
        return 'text-[#f87171]';
      case 'FAIR':
        return 'text-white/40';
      case 'UNCERTAIN':
        return 'text-[#fbbf24]';
      default:
        return 'text-white/40';
    }
  };

  return (
    <span className={cn(
      "font-[family-name:var(--font-geist-mono)] font-medium tracking-wide uppercase tabular-nums",
      getStyles(verdict),
      size === 'sm' ? "text-[10px]" : "text-[10px]",
      className
    )}>
      {verdict}
    </span>
  );
}
