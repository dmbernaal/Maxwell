import React from 'react';
import { cn } from '@/app/lib/utils';
import { IntelligenceVerificationLevel, SourceSummary } from '@/app/lib/maxwell/types';
import { Check, X, AlertCircle } from 'lucide-react';

interface VerificationChecklistProps {
  level: IntelligenceVerificationLevel;
  score: number;
  sourcesCount: number;
  claimsVerified: number;
  claimsDisputed: number;
  className?: string;
}

export function VerificationChecklist({
  level,
  score,
  sourcesCount,
  claimsVerified,
  claimsDisputed,
  className
}: VerificationChecklistProps) {
  return (
    <div className={cn("font-mono text-[10px] space-y-1.5 text-white/60", className)}>
      <div className="flex items-center gap-2">
        <span className="text-[#4ade80]">├─ ✓</span>
        <span>{sourcesCount} sources analyzed</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[#4ade80]">├─ ✓</span>
        <span>{claimsVerified} claims verified</span>
      </div>
      {claimsDisputed > 0 ? (
        <div className="flex items-center gap-2 text-[#f87171]">
          <span>├─ ✗</span>
          <span>{claimsDisputed} claims disputed</span>
        </div>
      ) : (
         <div className="flex items-center gap-2 text-white/30">
          <span>├─ ✗</span>
          <span>0 claims disputed</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className={cn(
          level === 'VERIFIED' ? "text-[#4ade80]" : level === 'PARTIAL' ? "text-[#fbbf24]" : "text-[#f87171]"
        )}>└─ ●</span>
        <span className="tabular-nums">{Math.round(score * 100)}% confidence</span>
      </div>
    </div>
  );
}
