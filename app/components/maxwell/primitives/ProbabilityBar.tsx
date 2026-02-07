import React from 'react';
import { cn } from '@/app/lib/utils';

interface ProbabilityBarProps {
  marketPrice: number;
  maxwellPrice: number;
  maxwellLow?: number;
  maxwellHigh?: number;
  height?: 'sm' | 'md' | 'lg';
  showRange?: boolean;
  className?: string;
}

export function ProbabilityBar({
  marketPrice,
  maxwellPrice,
  maxwellLow,
  maxwellHigh,
  height = 'md',
  showRange = true,
  className,
}: ProbabilityBarProps) {
  const marketPct = Math.round(marketPrice * 100);
  const maxwellPct = Math.round(maxwellPrice * 100);
  const lowPct = maxwellLow ? Math.round(maxwellLow * 100) : null;
  const highPct = maxwellHigh ? Math.round(maxwellHigh * 100) : null;

  const edge = maxwellPrice - marketPrice;
  const isPositiveEdge = edge > 0.02;
  const isNegativeEdge = edge < -0.02;

  const heightClass = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  }[height];

  const maxwellColor = isPositiveEdge ? 'bg-white/70' :
                       isNegativeEdge ? 'bg-white/30' :
                       'bg-white/50';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className={cn('relative w-full bg-white/[0.06] rounded-full', heightClass)}>
        {showRange && lowPct !== null && highPct !== null && (
          <div
            className="absolute top-0 bottom-0 bg-white/[0.12] rounded-full"
            style={{
              left: `${lowPct}%`,
              width: `${highPct - lowPct}%`,
            }}
          />
        )}

        <div
          className="absolute top-0 bottom-0 bg-white/30 rounded-full"
          style={{ width: `${marketPct}%` }}
        />

        <div
          className={cn('absolute top-0 bottom-0 rounded-full', maxwellColor)}
          style={{
            left: `${Math.min(marketPct, maxwellPct)}%`,
            width: `${Math.abs(maxwellPct - marketPct)}%`,
          }}
        />

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80"
          style={{ left: `${maxwellPct}%` }}
        />
      </div>

      <div className="flex justify-between text-[9px] font-mono text-white/40 tabular-nums">
        <span>0%</span>
        <span className="text-white/50">
          {maxwellPct}%
        </span>
        <span>100%</span>
      </div>
    </div>
  );
}

interface ProbabilityComparisonProps {
  outcomes: Array<{
    name: string;
    marketPrice: number;
    maxwellPrice: number;
    maxwellLow?: number;
    maxwellHigh?: number;
  }>;
  className?: string;
}

export function ProbabilityComparison({
  outcomes,
  className,
}: ProbabilityComparisonProps) {
  const maxValue = Math.max(
    ...outcomes.map(o => Math.max(o.marketPrice, o.maxwellPrice)),
    0.5
  );

  return (
    <div className={cn('space-y-2', className)}>
      {outcomes.map((outcome) => {
        const marketPct = (outcome.marketPrice / maxValue) * 100;
        const maxwellPct = (outcome.maxwellPrice / maxValue) * 100;
        const edge = outcome.maxwellPrice - outcome.marketPrice;
        const isPositive = edge > 0.02;

        return (
          <div key={outcome.name} className="flex items-center gap-3">
            <span className="w-24 text-[10px] text-white/60 truncate">
              {outcome.name}
            </span>

            <div className="flex-1 relative h-4 bg-white/[0.03] rounded-[2px]">
              <div
                className="absolute top-1 bottom-1 bg-white/20 rounded-[1px]"
                style={{
                  left: 0,
                  width: `${marketPct}%`,
                }}
              />

              <div
                className={cn(
                  'absolute top-1 bottom-1 rounded-[1px]',
                  isPositive ? 'bg-white/50' : 'bg-white/30'
                )}
                style={{
                  left: 0,
                  width: `${maxwellPct}%`,
                }}
              />

              <div
                className="absolute top-0.5 bottom-0.5 w-px bg-white/60"
                style={{ left: `${maxwellPct}%` }}
              />
            </div>

            <div className="w-16 text-right">
              <span className={cn(
                'text-[10px] font-mono tabular-nums',
                isPositive ? 'text-white/70' : 'text-white/60'
              )}>
                {Math.round(outcome.maxwellPrice * 100)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
