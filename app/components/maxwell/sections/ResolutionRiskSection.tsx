import React from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { DisclosureRow } from '../primitives/DisclosureRow';
import { RiskGauge } from '../primitives/RiskGauge';

interface ResolutionRiskSectionProps {
  data: MaxwellIntelligence;
}

export function ResolutionRiskSection({ data }: ResolutionRiskSectionProps) {
  const { resolutionRisk } = data;

  return (
    <div className="py-2">
      <DisclosureRow
        label="Resolution Risk"
        rightElement={
          resolutionRisk ? (
            <RiskGauge level={resolutionRisk.level} score={resolutionRisk.score} />
          ) : (
            <div className="w-16 h-6" />
          )
        }
      >
        <div className="space-y-3 text-[13px] text-white/80">
          <p className="text-white/40 text-[11px]">
            Analysis of potential ambiguity or dispute risks in market resolution.
          </p>

          {resolutionRisk ? (
            <>
              <ul className="list-disc pl-4 space-y-1 text-white/70">
                {resolutionRisk.factors.map((factor, i) => (
                  <li key={i}>{factor}</li>
                ))}
              </ul>

              {resolutionRisk.historicalDisputes && (
                <div className="bg-[#fbbf24]/5 border border-[#fbbf24]/10 p-2 rounded-sm mt-2">
                  <p className="text-[#fbbf24] text-[11px] uppercase tracking-wide mb-1">Historical Precedent</p>
                  <p className="text-white/60 text-[11px]">{resolutionRisk.historicalDisputes}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-white/40 font-mono py-4">
              └─ No resolution risk data available
            </div>
          )}
        </div>
      </DisclosureRow>
    </div>
  );
}
