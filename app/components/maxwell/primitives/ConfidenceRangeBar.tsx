import React from 'react';
import { cn } from '@/app/lib/utils';

interface ProbabilityEstimateProps {
  estimate: number;
  rangeLow: number;
  rangeHigh: number;
  marketPrice?: number;
  className?: string;
}

export function ProbabilityEstimate({
  estimate,
  rangeLow,
  rangeHigh,
  marketPrice,
  className,
}: ProbabilityEstimateProps) {
  const estimatePct = Math.round(estimate * 100);
  const lowPct = Math.round(rangeLow * 100);
  const highPct = Math.round(rangeHigh * 100);
  const marketPct = marketPrice ? Math.round(marketPrice * 100) : null;

  const edge = marketPrice ? estimate - marketPrice : 0;
  const isUnderpriced = edge > 0.02;
  const isOverpriced = edge < -0.02;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline gap-2">
        <span className={cn(
          'text-lg font-mono tabular-nums font-medium',
          isUnderpriced ? 'text-white' : isOverpriced ? 'text-white/60' : 'text-white/90'
        )}>
          {estimatePct}%
        </span>
        <span className="text-[11px] text-white/40">
          estimate (range {lowPct}-{highPct}%)
        </span>
      </div>

      <div className="relative h-1.5 bg-white/[0.06] rounded-full">
        <div
          className="absolute top-0 bottom-0 bg-white/[0.15] rounded-full"
          style={{
            left: `${lowPct}%`,
            width: `${highPct - lowPct}%`,
          }}
        />

        {marketPct !== null && (
          <div
            className="absolute top-0 bottom-0 w-px bg-white/30"
            style={{ left: `${marketPct}%` }}
          />
        )}

        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full',
            isUnderpriced ? 'bg-white/70' : isOverpriced ? 'bg-white/40' : 'bg-white/70'
          )}
          style={{ left: `${estimatePct}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {marketPct !== null && (
        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <span>Market: {marketPct}%</span>
          <span className="text-white/20">|</span>
          <span className={cn(
            isUnderpriced ? 'text-white/60' : isOverpriced ? 'text-white/40' : 'text-white/50'
          )}>
            Edge: {edge > 0 ? '+' : ''}{Math.round(edge * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

interface ConfidenceRangeCompactProps {
  estimate: number;
  rangeLow: number;
  rangeHigh: number;
  className?: string;
}

export function ConfidenceRangeCompact({
  estimate,
  rangeLow,
  rangeHigh,
  className,
}: ConfidenceRangeCompactProps) {
  const estimatePct = Math.round(estimate * 100);
  const lowPct = Math.round(rangeLow * 100);
  const highPct = Math.round(rangeHigh * 100);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative w-20 h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="absolute top-0 bottom-0 bg-white/[0.20]"
          style={{
            left: `${lowPct}%`,
            width: `${highPct - lowPct}%`,
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/60"
          style={{ left: `${estimatePct}%` }}
        />
      </div>
      
      <span className="text-[10px] text-white/50">
        {estimatePct}% <span className="text-white/30">({lowPct}-{highPct}%)</span>
      </span>
    </div>
  );
}
