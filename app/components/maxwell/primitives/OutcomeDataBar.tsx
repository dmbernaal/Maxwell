import React from 'react';
import { cn } from '@/app/lib/utils';
import { IntelligenceVerdict, ConfidenceLevel } from '@/app/lib/maxwell/types';

interface OutcomeDataBarProps {
  name: string;
  percentage: number;
  verdict: IntelligenceVerdict;
  confidence: ConfidenceLevel;
  maxwellRange?: { low: number; mid: number; high: number };
  isPrimary?: boolean;
  className?: string;
}

const VERDICT_SIGNAL = {
  UNDERPRICED: { label: 'Underpriced', cssVar: 'var(--signal-buy)', rgb: '34, 197, 94' },
  OVERPRICED: { label: 'Overpriced', cssVar: 'var(--signal-sell)', rgb: '239, 68, 68' },
  FAIR: { label: 'Fair', cssVar: 'var(--signal-hold)', rgb: '107, 114, 128' },
  UNCERTAIN: { label: 'Uncertain', cssVar: 'var(--signal-hold)', rgb: '107, 114, 128' },
} as const;

export function OutcomeDataBar({
  name,
  percentage,
  verdict,
  confidence,
  maxwellRange,
  isPrimary,
  className
}: OutcomeDataBarProps) {
  const signal = VERDICT_SIGNAL[verdict] ?? VERDICT_SIGNAL.UNCERTAIN;
  const targetMid = maxwellRange ? Math.round(maxwellRange.mid * 100) : null;
  const targetLow = maxwellRange ? Math.round(maxwellRange.low * 100) : null;
  const targetHigh = maxwellRange ? Math.round(maxwellRange.high * 100) : null;
  const edge = targetMid !== null ? targetMid - percentage : null;

  return (
    <div className={cn("w-full py-2", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 truncate pr-4 max-w-[280px]">
          {isPrimary && (
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: signal.cssVar }} />
          )}
          <span className={`text-[14px] truncate ${isPrimary ? 'font-semibold text-white' : 'font-medium text-white/80'}`}>
            {name}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[14px] font-mono tabular-nums text-white/60">
            {percentage}%
          </span>
          {edge !== null && (
            <span className="text-[11px] font-mono font-medium" style={{ color: signal.cssVar }}>
              {edge > 0 ? '+' : ''}{edge}%
            </span>
          )}
          <span 
            className="text-[10px] font-mono font-medium uppercase tracking-wide"
            style={{ color: signal.cssVar }}
          >
            {signal.label}
          </span>
        </div>
      </div>
      
      <div className="relative">
        <div className="h-[4px] bg-white/[0.06] rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full rounded-full bg-white/10"
            style={{ width: `${percentage}%` }}
          />
          {targetMid !== null && (
            <div 
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ width: `${targetMid}%`, backgroundColor: signal.cssVar, opacity: 0.3 }}
            />
          )}
        </div>

        <div 
          className="absolute top-1/2 -translate-y-1/2 group/market cursor-default px-2 -mx-2"
          style={{ left: `${percentage}%` }}
        >
          <div className="w-[2px] h-[10px] bg-white/50 -translate-x-1/2" />
          <span className="absolute top-[14px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-mono text-white/35">
            Market
          </span>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-[#111111] border border-[#2A2A2A] rounded opacity-0 group-hover/market:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            <span className="text-[9px] font-mono text-white/70">Current price: <span className="text-white font-medium">{percentage}%</span></span>
          </div>
        </div>

        {targetMid !== null && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 group/target cursor-default px-2 -mx-2"
            style={{ left: `${targetMid}%` }}
          >
            <div className="w-[2px] h-[10px] -translate-x-1/2" style={{ backgroundColor: signal.cssVar }} />
            <span className="absolute top-[14px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-mono font-medium" style={{ color: signal.cssVar }}>
              Target
            </span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-[#111111] border border-[#2A2A2A] rounded opacity-0 group-hover/target:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              <span className="text-[9px] font-mono text-white/70">AI target: <span className="font-medium" style={{ color: signal.cssVar }}>{targetMid}%</span>{targetLow !== null && <span className="text-white/30"> ({targetLow}%–{targetHigh}%)</span>}</span>
            </div>
          </div>
        )}
      </div>
      <div className="h-5" />
    </div>
  );
}
