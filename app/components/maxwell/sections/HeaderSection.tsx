import React from 'react';
import { AsciiWaveform } from '../primitives/AsciiWaveform';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { CornerGridDecoration } from '../primitives/CornerGridDecoration';

interface HeaderSectionProps {
  data: MaxwellIntelligence;
}

export function HeaderSection({ data }: HeaderSectionProps) {
  const { verification } = data;

  return (
    <div className="flex h-14 items-center justify-between border-b border-[#2A2A2A] relative overflow-visible">
      <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
      
      <div className="flex h-full items-center gap-4 px-6 border-r border-[#2A2A2A]">
        <span className="text-white/90 font-bold tracking-tight text-[14px]">
          MAXWELL
        </span>
        <AsciiWaveform />
      </div>
      
      <div className="flex h-full flex-1 justify-end items-center gap-6 px-6 text-[10px] font-mono text-white/30 tracking-wide uppercase">
        <div className="flex items-center gap-2">
          <span>Sources:</span>
          <span className="text-white/60 tabular-nums">{verification.sourcesAnalyzed}</span>
        </div>
        
        <div className="w-px h-3 bg-[#2A2A2A]" />
        
        <div className="flex items-center gap-2">
          <span>Confidence:</span>
          <span className="text-white/60 tabular-nums">{verification.score}%</span>
        </div>

        <div className="w-px h-3 bg-[#2A2A2A]" />

        <div className="flex items-center gap-2">
          <span>Status:</span>
          <span className="flex items-center gap-1.5 text-[#4ade80]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#4ade80]"></span>
            </span>
            SYNCED
          </span>
        </div>
      </div>
      
      <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
    </div>
  );
}
