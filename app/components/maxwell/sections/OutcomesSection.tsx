import React, { useState } from 'react';
import { MaxwellIntelligence, IntelligenceVerdict } from '@/app/lib/maxwell/types';
import { OutcomeDataBar } from '../primitives/OutcomeDataBar';
import { PaginationControls } from '../PaginationControls';
import { ChevronDown } from 'lucide-react';
import { CornerGridDecoration } from '../primitives/CornerGridDecoration';

const VERDICT_RGB: Record<IntelligenceVerdict, string> = {
  UNDERPRICED: '34, 197, 94',
  OVERPRICED: '239, 68, 68',
  FAIR: '107, 114, 128',
  UNCERTAIN: '107, 114, 128',
};

interface OutcomesSectionProps {
  data: MaxwellIntelligence;
}

export function OutcomesSection({ data }: OutcomesSectionProps) {
  const { outcomes, assessment } = data;

  if (!outcomes || outcomes.length === 0) return null;

  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(outcomes.length / pageSize);

  const paginatedOutcomes = outcomes.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const primaryOutcomeName = assessment?.primaryOutcome;

  return (
    <div className="border-b border-[#2A2A2A] relative overflow-visible">
       <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
       <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
       
        <div className="h-14 flex items-center px-6 border-b border-[#2A2A2A] select-none">
          <div className="flex items-center gap-2">
            <ChevronDown className="w-3.5 h-3.5 text-white/30" />
            <h2 className="text-[16px] font-semibold text-white tracking-tight uppercase">
              Outcomes ({outcomes.length})
            </h2>
          </div>
        </div>

        <div className="divide-y divide-[#2A2A2A]">
          {paginatedOutcomes.map((outcome, index) => {
            const isPrimary = outcome.name === primaryOutcomeName;
            const rgb = VERDICT_RGB[outcome.view] ?? VERDICT_RGB.UNCERTAIN;

            return (
              <div 
                key={outcome.name} 
                className="px-6 py-6 bg-[#141414] hover:bg-[#1A1A1A] transition-colors relative overflow-visible"
              >
                {isPrimary && (
                  <div
                    className="absolute inset-0 z-0"
                    style={{
                      background: `linear-gradient(to right, rgba(${rgb}, 0.06) 0%, rgba(${rgb}, 0.03) 50%, transparent 80%)`,
                    }}
                  />
                )}
                {index === 0 && (
                  <>
                    <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
                    <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
                  </>
                )}
                <div className="relative z-10">
                  <OutcomeDataBar
                    name={outcome.name}
                    percentage={Math.round(outcome.marketPrice * 100)}
                    verdict={outcome.view}
                    confidence={outcome.confidence}
                    maxwellRange={outcome.maxwellRange}
                    isPrimary={isPrimary}
                    className="p-0"
                  />
                </div>
                <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
                <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
              </div>
            );
          })}
        </div>

       {totalPages > 1 && (
         <div className="p-4">
           <PaginationControls
             total={outcomes.length}
             current={page}
             pageSize={pageSize}
             onPageChange={setPage}
           />
         </div>
       )}
       
       <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
       <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
    </div>
  );
}
