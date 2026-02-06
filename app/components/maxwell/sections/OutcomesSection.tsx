import React, { useState } from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { OutcomeDataBar } from '../primitives/OutcomeDataBar';
import { PaginationControls } from '../PaginationControls';
import { ChevronDown } from 'lucide-react';
import { CornerGridDecoration } from '../primitives/CornerGridDecoration';

interface OutcomesSectionProps {
  data: MaxwellIntelligence;
}

export function OutcomesSection({ data }: OutcomesSectionProps) {
  const { outcomes } = data;

  if (!outcomes || outcomes.length === 0) return null;

  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(outcomes.length / pageSize);

  const paginatedOutcomes = outcomes.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="border-b border-[#2A2A2A] relative overflow-visible">
       <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
       <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
       
        <div className="h-12 flex items-center px-6 border-b border-[#2A2A2A] select-none">
          <div className="flex items-center gap-2">
            <ChevronDown className="w-3.5 h-3.5 text-white/30" />
            <h2 className="text-[16px] font-semibold text-white tracking-tight uppercase">
              Outcomes ({outcomes.length})
            </h2>
          </div>
        </div>

        <div className="divide-y divide-[#2A2A2A]">
          {paginatedOutcomes.map((outcome, index) => (
            <div key={outcome.name} className="px-6 py-6 bg-[#141414] hover:bg-[#1A1A1A] transition-colors relative overflow-visible">
              {index === 0 && (
                <>
                  <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
                  <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
                </>
              )}
              <OutcomeDataBar
                name={outcome.name}
                percentage={Math.round(outcome.marketPrice * 100)}
                verdict={outcome.view}
                confidence={outcome.confidence}
                maxwellRange={outcome.maxwellRange}
                className="p-0"
              />
              <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
              <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
            </div>
          ))}
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
