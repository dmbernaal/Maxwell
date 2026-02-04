import React from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { VerdictPill } from '../primitives/VerdictPill';
import { CornerGridDecoration } from '../primitives/CornerGridDecoration';

interface AssessmentSectionProps {
  data: MaxwellIntelligence;
}

export function AssessmentSection({ data }: AssessmentSectionProps) {
  const { assessment } = data;
  
  return (
    <div className="w-full relative overflow-visible">
      <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
      
      <div className="flex h-14 items-center justify-between border-b border-[#2A2A2A] relative overflow-visible">
        <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
        <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
        <div className="flex h-full flex-col justify-center px-6 flex-1 min-w-0">
          <h2 className="text-[10px] uppercase tracking-widest text-[#666666] font-medium mb-0.5">
            Assessment
          </h2>
          <div className="text-[14px] font-medium text-white truncate">
            {assessment.primaryOutcome}
          </div>
        </div>
        <div className="flex h-full items-center justify-center px-6 shrink-0 border-l border-[#2A2A2A]">
          <VerdictPill verdict={assessment.verdict} />
        </div>
        <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
        <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
      </div>

      <div className="flex h-12 items-center px-6 border-b border-[#2A2A2A] text-[13px] font-mono tabular-nums bg-[#141414] relative overflow-visible">
        <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
        <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase text-[#666666] tracking-wider font-sans">Market</span>
          <span className="text-[#A3A3A3] text-[14px]">{Math.round(assessment.marketPrice * 100)}%</span>
        </div>
        
        <div className="flex items-center px-4 text-[#525252]">
          →
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase text-[#FA5D19] tracking-wider font-sans font-medium">Maxwell</span>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-[14px]">{Math.round(assessment.maxwellRange.mid * 100)}%</span>
            <span className="text-[#525252] text-[12px] tracking-tight">
              ({Math.round(assessment.maxwellRange.low * 100)}% - {Math.round(assessment.maxwellRange.high * 100)}%)
            </span>
          </div>
        </div>
        <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
        <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
      </div>

      <div className="p-6 bg-[#141414] relative overflow-visible">
        <p
          className="text-[14px] text-[#A3A3A3] leading-relaxed font-sans"
          title={assessment.headline.length > 200 ? assessment.headline : undefined}
        >
          {assessment.headline}
        </p>
        <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
        <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
      </div>
      
      <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
    </div>
  );
}
