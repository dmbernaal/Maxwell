import React from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { CornerGridDecoration } from '../primitives/CornerGridDecoration';
import { AsciiDecoration } from '../primitives/AsciiDecoration';

interface AssessmentSectionProps {
  data: MaxwellIntelligence;
}

export function AssessmentSection({ data }: AssessmentSectionProps) {
  const { assessment } = data;
  
  const marketPrice = Math.round(assessment.marketPrice * 100);
  const maxwellMid = Math.round(assessment.maxwellRange.mid * 100);
  const maxwellLow = Math.round(assessment.maxwellRange.low * 100);
  const maxwellHigh = Math.round(assessment.maxwellRange.high * 100);
  const edge = maxwellMid - marketPrice;
  
  const getAction = () => {
    if (assessment.verdict === 'UNDERPRICED') return { text: 'BUY SIGNAL', color: '#FA5D19' };
    if (assessment.verdict === 'OVERPRICED') return { text: 'SELL SIGNAL', color: '#FA5D19' };
    return { text: 'HOLD', color: 'rgba(255,255,255,0.4)' };
  };
  
  const action = getAction();
  const isActive = assessment.verdict === 'UNDERPRICED' || assessment.verdict === 'OVERPRICED';
  
  return (
    <div className="relative bg-[#1A1A1A] overflow-hidden">
      <AsciiDecoration className="opacity-[0.10]" />
      
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
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FA5D19] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FA5D19]" />
                </span>
              )}
              <span 
                className="text-[10px] font-medium uppercase tracking-[0.15em]"
                style={{ color: action.color }}
              >
                {action.text}
              </span>
              <span className="text-white/15">·</span>
              <span className="text-[10px] uppercase tracking-wider text-white/30">
                {assessment.primaryOutcome}
              </span>
            </div>
            
            <div className="flex items-baseline gap-1">
              <span 
                className="text-[72px] font-mono font-bold tracking-tighter leading-none"
                style={{ color: isActive ? action.color : 'white' }}
              >
                {edge > 0 ? '+' : ''}{edge}
              </span>
              <span className="text-[24px] font-mono font-bold text-white/30">%</span>
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
          <div className="h-[3px] bg-[#1A1A1A] flex">
            <div 
              className="h-full bg-white/20"
              style={{ width: `${marketPrice}%` }}
            />
            <div 
              className="h-full bg-[#FA5D19]"
              style={{ width: `${Math.abs(edge)}%` }}
            />
          </div>
          
          <div className="mt-3 flex justify-between text-[11px] font-mono">
            <span className="text-white/20">Range</span>
            <span className="text-white/30">{maxwellLow}% — {maxwellHigh}%</span>
          </div>
        </div>
        
        <div className="mt-6 pt-5 border-t border-[#1A1A1A]">
          <p className="text-[14px] text-white/60 leading-relaxed max-w-[85%]">
            {assessment.headline}
          </p>
        </div>
      </div>
    </div>
  );
}
