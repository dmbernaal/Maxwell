import React from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { CornerGridDecoration } from '../primitives/CornerGridDecoration';
import { AsciiDecoration } from '../primitives/AsciiDecoration';

interface AssessmentSectionProps {
  data: MaxwellIntelligence;
}

const SIGNAL_MAP = {
  UNDERPRICED: { text: 'BUY SIGNAL', cssVar: 'var(--signal-buy)', dotClass: 'bg-signal-buy', rgb: '34, 197, 94' },
  OVERPRICED: { text: 'SELL SIGNAL', cssVar: 'var(--signal-sell)', dotClass: 'bg-signal-sell', rgb: '239, 68, 68' },
  FAIR: { text: 'HOLD', cssVar: 'var(--signal-hold)', dotClass: 'bg-signal-hold', rgb: '107, 114, 128' },
  UNCERTAIN: { text: 'HOLD', cssVar: 'var(--signal-hold)', dotClass: 'bg-signal-hold', rgb: '107, 114, 128' },
} as const;

export function AssessmentSection({ data }: AssessmentSectionProps) {
  const { assessment } = data;
  
  const marketPrice = Math.round(assessment.marketPrice * 100);
  const maxwellMid = Math.round(assessment.maxwellRange.mid * 100);
  const maxwellLow = Math.round(assessment.maxwellRange.low * 100);
  const maxwellHigh = Math.round(assessment.maxwellRange.high * 100);
  const edge = maxwellMid - marketPrice;
  
  const signal = SIGNAL_MAP[assessment.verdict] ?? SIGNAL_MAP.UNCERTAIN;
  const isActive = assessment.verdict === 'UNDERPRICED' || assessment.verdict === 'OVERPRICED';
  
  return (
    <div className="relative bg-[#1A1A1A] overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `linear-gradient(to right, rgba(${signal.rgb}, 0.10) 0%, rgba(${signal.rgb}, 0.06) 50%, rgba(${signal.rgb}, 0.02) 85%, transparent 100%)`,
        }}
      />
      
      <AsciiDecoration className="opacity-[0.10]" style={{ maskImage: 'radial-gradient(ellipse at 70% 50%, black 30%, transparent 70%)' }} />
      
      <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
      <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
      
      <div className="relative z-10 px-8 py-10">
        <div className="grid grid-cols-[1fr_auto] gap-8 items-end">
          <div>
            <div className="flex items-center gap-2 mb-4">
              {isActive && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${signal.dotClass} opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${signal.dotClass}`} />
                </span>
              )}
              <span 
                className="text-[10px] font-medium uppercase tracking-[0.15em]"
                style={{ color: signal.cssVar }}
              >
                {signal.text}
              </span>
              <span className="text-white/15">·</span>
              <span className="text-[10px] uppercase tracking-wider text-white/30">
                {assessment.primaryOutcome}
              </span>
            </div>
            
            <div className="flex items-baseline gap-1">
              <span 
                className="text-[72px] font-mono font-bold tracking-tighter leading-none"
                style={{ color: signal.cssVar }}
              >
                {edge > 0 ? '+' : ''}{edge}
              </span>
              <span className="text-[72px] font-mono font-bold tracking-tighter leading-none" style={{ color: signal.cssVar }}>%</span>
            </div>
            
            <div className="mt-1 text-[11px] uppercase tracking-wider text-white/20 font-mono">
              Edge
            </div>
          </div>
          
          <div className="flex flex-col gap-5 text-right pb-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Market</div>
              <div className="text-[20px] font-mono tabular-nums text-white/50">{marketPrice}%</div>
            </div>
            
            <div className="text-[20px] text-white/15 leading-none flex justify-end">
              {edge > 0 ? '↓' : '↑'}
            </div>
            
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Target</div>
              <div className="text-[20px] font-mono tabular-nums text-white font-medium">{maxwellMid}%</div>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <div className="relative h-[5px]" style={{ backgroundColor: `rgba(${signal.rgb}, 0.10)` }}>
            <div 
              className="absolute top-0 left-0 h-full"
              style={{ width: `${maxwellMid}%`, backgroundColor: `rgba(${signal.rgb}, 0.20)` }}
            />
            <div 
              className="absolute top-0 h-full w-[2px] bg-white/40"
              style={{ left: `${marketPrice}%` }}
            />
            <div 
              className="absolute top-0 h-full w-[2px]"
              style={{ left: `${maxwellMid}%`, backgroundColor: signal.cssVar }}
            />
          </div>
          
          <div className="relative mt-2 text-[10px] font-mono">
            <span 
              className="absolute text-white/40"
              style={{ left: `${marketPrice}%`, transform: 'translateX(-50%)' }}
            >
              {marketPrice}%
            </span>
            <span 
              className="absolute font-medium"
              style={{ left: `${maxwellMid}%`, transform: 'translateX(-50%)', color: signal.cssVar }}
            >
              {maxwellMid}%
            </span>
          </div>
        </div>
        
        <div className="mt-6">
          <p className="text-[13px] text-white/40 leading-relaxed">
            Market is priced at <span className="text-white/70 font-medium">{marketPrice}%</span>
            {' · '}
            AI target is <span className="font-medium" style={{ color: signal.cssVar }}>{maxwellMid}%</span>
          </p>
          <p className="mt-2 text-[14px] text-white/60 leading-relaxed max-w-[95%]">
            {assessment.headline}
          </p>
        </div>
      </div>
    </div>
  );
}
