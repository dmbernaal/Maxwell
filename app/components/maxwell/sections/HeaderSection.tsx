import React from 'react';
import { WaveformSignature } from '../primitives/WaveformSignature';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';

interface HeaderSectionProps {
  data: MaxwellIntelligence;
}

export function HeaderSection({ data }: HeaderSectionProps) {
  const { market, verification } = data;

  return (
    <div className="flex items-center justify-between pb-6">
      <div className="flex items-center gap-3">
        <span className="text-[#e8e8e8] font-bold tracking-tight flex items-center gap-2">
          <span className="text-[#4ade80]">⚡</span> MAXWELL
        </span>
        <WaveformSignature active={true} className="text-[#4ade80]" />
      </div>
      
      <div className="flex items-center gap-4 text-[11px] font-mono text-white/40">
        <span>{market.deadline}</span>
        <span>●</span>
        <span className="tabular-nums">{Math.round(verification.score * 100)}%</span>
      </div>
    </div>
  );
}
