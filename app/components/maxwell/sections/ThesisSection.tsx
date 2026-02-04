import React from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { FactorStrengthBar } from '../primitives/FactorStrengthBar';
import { ChevronDown } from 'lucide-react';
import { CornerGridDecoration } from '../primitives/CornerGridDecoration';

interface ThesisSectionProps {
  data: MaxwellIntelligence;
}

export function ThesisSection({ data }: ThesisSectionProps) {
  const { thesis } = data;

  return (
    <div className="border-b border-[#2A2A2A] relative overflow-visible">
      <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
      
      <div className="h-12 flex items-center px-6 bg-transparent select-none border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2">
          <ChevronDown className="w-3.5 h-3.5 text-[#FA5D19]" />
          <span className="font-semibold text-[16px] text-white tracking-tight uppercase">Thesis</span>
        </div>
      </div>

      <div className="p-6 bg-[#141414] relative overflow-visible">
        <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
        <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
        
        <div className="space-y-8 text-[14px]">

          <div className="space-y-4">
            <h3 className="text-[12px] text-[#4ade80] uppercase tracking-wider font-medium">
              Supporting Factors
            </h3>
            {thesis.factorsFor && thesis.factorsFor.length > 0 ? (
              <ul className="space-y-4">
                {thesis.factorsFor.map((factor, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="text-[#4ade80] font-mono text-[10px] pt-1">+{i + 1}</span>
                    <div className="space-y-2">
                      <p
                        className="text-white/90 cursor-help leading-relaxed"
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
              <div className="text-[14px] text-white/30 font-mono py-6">
                └─ No factors identified for this outcome
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-[12px] text-[#f87171] uppercase tracking-wider font-medium">
              Risk Factors
            </h3>
            {thesis.factorsAgainst && thesis.factorsAgainst.length > 0 ? (
              <ul className="space-y-4">
                {thesis.factorsAgainst.map((factor, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="text-[#f87171] font-mono text-[10px] pt-1">-{i + 1}</span>
                    <div className="space-y-2">
                      <p
                        className="text-white/90 cursor-help leading-relaxed"
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
              <div className="text-[14px] text-white/30 font-mono py-6">
                └─ No risk factors identified
              </div>
            )}
          </div>

        </div>
      </div>
      
      <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
    </div>
  );
}
