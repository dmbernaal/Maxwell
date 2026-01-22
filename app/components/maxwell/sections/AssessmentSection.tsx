import React from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { VerdictPill } from '../primitives/VerdictPill';

interface AssessmentSectionProps {
  data: MaxwellIntelligence;
}

export function AssessmentSection({ data }: AssessmentSectionProps) {
  const { assessment } = data;
  
  return (
    <div className="py-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-[10px] uppercase tracking-widest text-white/40 font-medium">
            Assessment
          </h2>
          <div className="text-[15px] font-medium text-[#e8e8e8]">
            {assessment.primaryOutcome}
          </div>
        </div>
        <VerdictPill verdict={assessment.verdict} />
      </div>

      <div className="flex items-center gap-3 font-mono text-[13px] tabular-nums">
        <span className="text-white/40">{Math.round(assessment.marketPrice * 100)}%</span>
        <span className="text-white/20">→</span>
        <div className="flex items-center gap-1.5">
          <span className="text-white/60">{Math.round(assessment.maxwellRange.low * 100)}%</span>
          <span className="text-[#4ade80] font-bold">– {Math.round(assessment.maxwellRange.mid * 100)}% –</span>
          <span className="text-white/60">{Math.round(assessment.maxwellRange.high * 100)}%</span>
        </div>
      </div>

      <p
        className="text-[13px] text-white/80 leading-relaxed border-l-2 border-[#4ade80]/20 pl-3 line-clamp-3 cursor-help"
        title={assessment.headline.length > 200 ? assessment.headline : undefined}
      >
        {assessment.headline}
      </p>
    </div>
  );
}
