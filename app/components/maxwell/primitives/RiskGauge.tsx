import React from 'react';
import { cn } from '@/app/lib/utils';
import { ResolutionRiskLevel } from '@/app/lib/maxwell/types';

interface RiskGaugeProps {
  level: ResolutionRiskLevel;
  score: number; // 0-100
  className?: string;
}

export function RiskGauge({ level, score, className }: RiskGaugeProps) {
  const blocks = Math.round(score / 20);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-[11px] font-mono font-medium text-white/60">
        {level} RISK
      </span>
      <div className="flex gap-[2px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "w-2 h-3 rounded-[1px]",
              i < blocks ? "bg-white/40" : "bg-white/10"
            )}
          />
        ))}
      </div>
    </div>
  );
}
