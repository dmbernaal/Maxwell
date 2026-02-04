import React from 'react';
import { cn } from '@/app/lib/utils';
import { IntelligenceVerdict, ConfidenceLevel } from '@/app/lib/maxwell/types';
import { VerdictPill } from './VerdictPill';

interface OutcomeDataBarProps {
  name: string;
  percentage: number; // 0-100
  verdict: IntelligenceVerdict;
  confidence: ConfidenceLevel;
  maxwellRange?: { low: number; mid: number; high: number };
  className?: string;
}

export function OutcomeDataBar({
  name,
  percentage,
  verdict,
  confidence,
  maxwellRange,
  className
}: OutcomeDataBarProps) {
  return (
    <div className={cn("w-full py-2", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[14px] font-medium text-white truncate pr-4 max-w-[240px]">
          {name}
        </span>
        <div className="flex items-center gap-6">
          <span className="text-[14px] font-mono tabular-nums text-white/60">
            {percentage}%
          </span>
          <VerdictPill verdict={verdict} size="sm" />
        </div>
      </div>
      
      {/* Range Visualization */}
      <div className="relative h-2 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
        {/* Market Price Marker */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white z-20" 
          style={{ left: `${percentage}%` }}
        />
        
        {/* Maxwell Range (if available) */}
        {maxwellRange && (
          <div 
            className="absolute top-0 bottom-0 bg-[#4ade80]/40 rounded-full z-10"
            style={{ 
              left: `${maxwellRange.low * 100}%`, 
              right: `${100 - (maxwellRange.high * 100)}%` 
            }}
          />
        )}
      </div>
      
       {maxwellRange && (
         <div className="flex justify-between mt-2 text-[10px] text-white/40 font-mono">
            <span>Range: {Math.round(maxwellRange.low * 100)}% - {Math.round(maxwellRange.high * 100)}%</span>
            <span>Target: {Math.round(maxwellRange.mid * 100)}%</span>
         </div>
      )}
    </div>
  );
}
