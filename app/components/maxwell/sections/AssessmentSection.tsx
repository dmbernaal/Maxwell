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
            <div className="flex items-center gap-2.5 mb-3">
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
            </div>
            <div className="mb-4">
              <span className="text-[20px] font-semibold text-white tracking-tight">
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
          <div className="relative">
            <div className="h-[5px] bg-white/[0.06] rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full rounded-full bg-white/10"
                style={{ width: `${marketPrice}%` }}
              />
              <div 
                className="absolute top-0 left-0 h-full rounded-full"
                style={{ width: `${maxwellMid}%`, backgroundColor: signal.cssVar, opacity: 0.35 }}
              />
            </div>

            <div 
              className="absolute top-1/2 -translate-y-1/2 group/market cursor-default px-3 -mx-3"
              style={{ left: `${marketPrice}%` }}
            >
              <div className="w-[3px] h-[13px] bg-white/50 -translate-x-1/2" />
              <span className="absolute top-[18px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-mono text-white/40">
                Market
              </span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#111111] border border-[#2A2A2A] rounded-md opacity-0 group-hover/market:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                <span className="text-[10px] font-mono text-white/70">Current market price: <span className="text-white font-medium">{marketPrice}%</span></span>
              </div>
            </div>

            <div 
              className="absolute top-1/2 -translate-y-1/2 group/target cursor-default px-3 -mx-3"
              style={{ left: `${maxwellMid}%` }}
            >
              <div className="w-[3px] h-[13px] -translate-x-1/2" style={{ backgroundColor: signal.cssVar }} />
              <span className="absolute top-[18px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-mono font-medium" style={{ color: signal.cssVar }}>
                Target
              </span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#111111] border border-[#2A2A2A] rounded-md opacity-0 group-hover/target:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                <span className="text-[10px] font-mono text-white/70">AI target: <span className="font-medium" style={{ color: signal.cssVar }}>{maxwellMid}%</span> <span className="text-white/30">({maxwellLow}%–{maxwellHigh}%)</span></span>
              </div>
            </div>
          </div>
          <div className="h-8" />
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

          <div className="mt-6">
            <div className="text-[8px] font-mono text-white/[0.08] tracking-[0.3em] select-none mb-3 overflow-hidden whitespace-nowrap">
              ·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·&nbsp;·
            </div>
            <p className="text-[10px] text-white/20 leading-relaxed">
              This is not financial advice. AI predictions may be inaccurate — always do your own research before trading. Below is a comprehensive analysis with verified sources to help you make an informed decision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
