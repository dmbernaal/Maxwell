import React, { useState } from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { DisclosureRow } from '../primitives/DisclosureRow';
import { VerificationChecklist } from '../primitives/VerificationChecklist';
import { PaginationControls } from '../PaginationControls';

interface SourcesSectionProps {
  data: MaxwellIntelligence;
  onViewAll?: () => void;
}

export function SourcesSection({ data, onViewAll }: SourcesSectionProps) {
  const { verification } = data;

  const [page, setPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.ceil(verification.sourcesAnalyzed / pageSize);

  const paginatedSources = verification.topSources.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="py-2">
      <DisclosureRow
        label={`Sources (${verification.sourcesAnalyzed})`}
      >
        <div className="space-y-4">
          <VerificationChecklist
            level={verification.level}
            score={verification.score}
            sourcesCount={verification.sourcesAnalyzed}
            claimsVerified={verification.claimsVerified}
            claimsDisputed={verification.claimsDisputed}
          />

          <div className="space-y-2 pt-2">
            <h4 className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
              {page === 1 && totalPages > 1 ? 'Top Sources' : `Sources (${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, verification.sourcesAnalyzed)})`}
            </h4>
            {paginatedSources.map((source, i) => (
              <div key={i} className="flex justify-between items-start text-[11px]">
                 <span className="text-white/70 truncate pr-4 max-w-[200px]">{source.title}</span>
                 <span className="text-white/30 font-mono">{source.domain}</span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <PaginationControls
              total={verification.sourcesAnalyzed}
              current={page}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          )}
        </div>
      </DisclosureRow>
    </div>
  );
}
