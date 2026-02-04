import React from 'react';
import { Check, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/app/lib/utils';

export type VerificationLevel = 'VERIFIED' | 'PARTIAL' | 'LOW_CONFIDENCE';

interface VerificationIndicatorProps {
  level: VerificationLevel;
  score: number;
  sourcesAnalyzed: number;
  className?: string;
}

export function VerificationIndicator({
  level,
  score,
  sourcesAnalyzed,
  className,
}: VerificationIndicatorProps) {
  const isVerified = level === 'VERIFIED';
  
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-1.5">
        {isVerified ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        )}
        <span className={cn(
          'text-[11px] font-medium',
          isVerified ? 'text-emerald-400' : 'text-amber-400'
        )}>
          {score}% verified
        </span>
      </div>
      
      <span className="text-[10px] text-white/40 font-mono">
        {sourcesAnalyzed} sources
      </span>
    </div>
  );
}
