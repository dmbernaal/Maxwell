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
        <span className="text-white/40">├─ ✓</span>
        <span>{sourcesCount} sources analyzed</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white/40">├─ ✓</span>
        <span>{claimsVerified} claims verified</span>
      </div>
      {claimsDisputed > 0 ? (
        <div className="flex items-center gap-2 text-white/60">
          <span className="text-white/30">├─ ✗</span>
          <span>{claimsDisputed} claims disputed</span>
        </div>
      ) : (
         <div className="flex items-center gap-2 text-white/30">
          <span>├─ ✗</span>
          <span>0 claims disputed</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-[#FA5D19]">└─ ●</span>
        <span className="tabular-nums">{Math.round(score * 100)}% confidence</span>
      </div>
    </div>
  );
}
