import React from 'react';
import { cn } from '@/app/lib/utils';
import { ResolutionRiskLevel } from '@/app/lib/maxwell/types';

interface RiskGaugeProps {
  level: ResolutionRiskLevel;
  score: number; // 0-100
  className?: string;
}

export function RiskGauge({ level, score, className }: RiskGaugeProps) {
  const getRiskColor = () => {
    switch (level) {
      case 'LOW': return 'text-[#4ade80]';
      case 'MEDIUM': return 'text-[#fbbf24]';
      case 'HIGH': return 'text-[#f87171]';
    }
  };

  const blocks = Math.round(score / 20); // 0-5 blocks

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className={cn("text-[11px] font-mono font-medium", getRiskColor())}>
        {level} RISK
      </span>
      <div className="flex gap-[2px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "w-2 h-3 rounded-[1px]",
              i < blocks ? getRiskColor().replace('text-', 'bg-') : "bg-white/10"
            )}
          />
        ))}
      </div>
    </div>
  );
}
