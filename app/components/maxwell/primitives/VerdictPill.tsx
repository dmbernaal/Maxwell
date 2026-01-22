import React from 'react';
import { cn } from '@/app/lib/utils';
import { IntelligenceVerdict } from '@/app/lib/maxwell/types';

interface VerdictPillProps {
  verdict: IntelligenceVerdict;
  className?: string;
  size?: 'sm' | 'md';
}

export function VerdictPill({ verdict, className, size = 'md' }: VerdictPillProps) {
  const getColors = (v: IntelligenceVerdict) => {
    switch (v) {
      case 'UNDERPRICED':
        return 'bg-[#4ade80]/10 text-[#4ade80]';
      case 'OVERPRICED':
        return 'bg-[#f87171]/10 text-[#f87171]';
      case 'FAIR':
        return 'bg-white/5 text-[#8f8f8f]';
      case 'UNCERTAIN':
        return 'bg-[#fbbf24]/10 text-[#fbbf24]';
      default:
        return 'bg-white/5 text-[#8f8f8f]';
    }
  };

  return (
    <div className={cn(
      "inline-flex items-center justify-center font-mono font-medium rounded-sm tracking-wide uppercase tabular-nums",
      getColors(verdict),
      size === 'sm' ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-1",
      className
    )}>
      {verdict}
    </div>
  );
}
