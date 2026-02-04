import React from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { RiskGauge } from '../primitives/RiskGauge';
import { ChevronDown } from 'lucide-react';
import { CornerGridDecoration } from '../primitives/CornerGridDecoration';

interface ResolutionRiskSectionProps {
  data: MaxwellIntelligence;
}

export function ResolutionRiskSection({ data }: ResolutionRiskSectionProps) {
  const { resolutionRisk } = data;

  return (
    <div className="border-b border-[#2A2A2A] relative overflow-visible">
      <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
      
      <div className="h-14 flex items-center justify-between px-6 bg-transparent select-none border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2">
          <ChevronDown className="w-3.5 h-3.5 text-[#FA5D19]" />
          <span className="font-medium text-[13px] text-white tracking-tight">Resolution Risk</span>
        </div>
        {resolutionRisk && (
          <RiskGauge level={resolutionRisk.level} score={resolutionRisk.score} />
        )}
      </div>

      <div className="p-6 pl-10 bg-[#141414]">
        <div className="space-y-6 text-[14px]">
          <p className="text-[#A3A3A3] leading-relaxed">
            Analysis of potential ambiguity or dispute risks in market resolution.
          </p>

          {resolutionRisk ? (
            <>
              <ul className="list-disc pl-4 space-y-3 text-[#e8e8e8]">
                {resolutionRisk.factors.map((factor, i) => (
                  <li key={i} className="leading-relaxed">{factor}</li>
                ))}
              </ul>

              {resolutionRisk.historicalDisputes && (
                <div className="bg-[#fbbf24]/5 border border-[#fbbf24]/20 p-4 rounded-md mt-4">
                  <p className="text-[#fbbf24] text-[11px] uppercase tracking-wide mb-2 font-medium">Historical Precedent</p>
                  <p className="text-[#A3A3A3] text-[13px] leading-relaxed">{resolutionRisk.historicalDisputes}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-[#525252] font-mono py-6">
              └─ No resolution risk data available
            </div>
          )}
        </div>
      </div>
      
      <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
    </div>
  );
}
