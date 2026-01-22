import React from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { DisclosureRow } from '../primitives/DisclosureRow';
import { FactorStrengthBar } from '../primitives/FactorStrengthBar';

interface ThesisSectionProps {
  data: MaxwellIntelligence;
}

export function ThesisSection({ data }: ThesisSectionProps) {
  const { thesis } = data;

  return (
    <div className="py-2">
      <DisclosureRow label="Thesis">
        <div className="space-y-6 text-[13px]">

          <div className="space-y-3">
            <h3 className="text-[11px] text-[#4ade80] uppercase tracking-wider font-medium">
              Supporting Factors
            </h3>
            {thesis.factorsFor && thesis.factorsFor.length > 0 ? (
              <ul className="space-y-3">
                {thesis.factorsFor.map((factor, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-[#4ade80] font-mono text-[10px] pt-0.5">+{i + 1}</span>
                    <div className="space-y-1">
                      <p
                        className="text-[#e8e8e8] line-clamp-2 cursor-help"
                        title={factor.point.length > 200 ? factor.point : undefined}
                      >
                        {factor.point}
                      </p>
                      <FactorStrengthBar strength={factor.confidence} color="text-[#4ade80]" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-white/40 font-mono py-4">
                └─ No factors identified for this outcome
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] text-[#f87171] uppercase tracking-wider font-medium">
              Risk Factors
            </h3>
            {thesis.factorsAgainst && thesis.factorsAgainst.length > 0 ? (
              <ul className="space-y-3">
                {thesis.factorsAgainst.map((factor, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-[#f87171] font-mono text-[10px] pt-0.5">-{i + 1}</span>
                    <div className="space-y-1">
                      <p
                        className="text-[#e8e8e8] line-clamp-2 cursor-help"
                        title={factor.point.length > 200 ? factor.point : undefined}
                      >
                        {factor.point}
                      </p>
                      <FactorStrengthBar strength={factor.confidence} color="text-[#f87171]" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-white/40 font-mono py-4">
                └─ No risk factors identified
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/5 space-y-2">
              <div className="flex justify-between items-baseline">
                 <span className="text-[11px] text-white/40 uppercase tracking-wider">Next Catalyst</span>
                 <span className="text-[11px] text-white/60 font-mono">{thesis.nextCatalyst.date}</span>
              </div>
              <p
                className="text-white/80 line-clamp-2 cursor-help"
                title={thesis.nextCatalyst.event.length > 200 ? thesis.nextCatalyst.event : undefined}
              >
                {thesis.nextCatalyst.event}
              </p>
              <p
                className="text-[11px] text-white/50 italic line-clamp-1 cursor-help"
                title={thesis.nextCatalyst.impact.length > 150 ? thesis.nextCatalyst.impact : undefined}
              >
                Impact: {thesis.nextCatalyst.impact}
              </p>
            </div>

        </div>
      </DisclosureRow>
    </div>
  );
}
