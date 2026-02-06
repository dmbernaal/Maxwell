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
      
      <div className="h-12 flex items-center justify-between px-6 bg-transparent select-none border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2">
          <ChevronDown className="w-3.5 h-3.5 text-[#FA5D19]" />
          <span className="font-semibold text-[16px] text-white tracking-tight uppercase">Resolution Risk</span>
        </div>
        {resolutionRisk && (
          <RiskGauge level={resolutionRisk.level} score={resolutionRisk.score} />
        )}
      </div>

      <div className="p-6 bg-[#141414]">
        <div className="space-y-6 text-[14px]">
          <p className="text-white/60 leading-relaxed">
            Analysis of potential ambiguity or dispute risks in market resolution.
          </p>

          {resolutionRisk ? (
            <>
              <ul className="list-disc pl-4 space-y-3 text-white/90">
                {resolutionRisk.factors.map((factor, i) => (
                  <li key={i} className="leading-relaxed">{factor}</li>
                ))}
              </ul>

              {resolutionRisk.historicalDisputes && (
                <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-md mt-4">
                  <p className="text-white/60 text-[12px] uppercase tracking-wide mb-2 font-medium">Historical Precedent</p>
                  <p className="text-white/60 text-[14px] leading-relaxed">{resolutionRisk.historicalDisputes}</p>
                </div>
              )}
            </>
          ) : (
              <div className="text-[14px] text-white/30 font-mono py-6">
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
