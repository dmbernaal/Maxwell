import React, { useState } from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { OutcomeDataBar } from '../primitives/OutcomeDataBar';
import { DisclosureRow } from '../primitives/DisclosureRow';
import { PaginationControls } from '../PaginationControls';

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
    <div className="py-6 space-y-1">
       <h2 className="text-[10px] uppercase tracking-widest text-white/40 font-medium mb-3">
         Outcomes ({outcomes.length})
       </h2>

       <div className="space-y-1">
         {paginatedOutcomes.map((outcome) => (
           <OutcomeDataBar
             key={outcome.name}
             name={outcome.name}
             percentage={Math.round(outcome.marketPrice * 100)}
             verdict={outcome.view}
             confidence={outcome.confidence}
             maxwellRange={outcome.maxwellRange}
           />
         ))}
       </div>

       <PaginationControls
         total={outcomes.length}
         current={page}
         pageSize={pageSize}
         onPageChange={setPage}
       />
    </div>
  );
}
