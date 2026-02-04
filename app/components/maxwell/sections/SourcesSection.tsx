import React, { useState } from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { VerificationChecklist } from '../primitives/VerificationChecklist';
import { PaginationControls } from '../PaginationControls';
import { ChevronDown } from 'lucide-react';
import { CornerGridDecoration } from '../primitives/CornerGridDecoration';

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

  const getSourceUrl = (title: string) => {
    if (!data.raw?.allSources) return '#';
    const match = data.raw.allSources.find(s => s.title === title);
    return match?.url || '#';
  };

  return (
    <div className="border-b border-[#2A2A2A] relative overflow-visible">
      <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
      
      <div className="h-12 flex items-center px-6 bg-transparent select-none border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2">
          <ChevronDown className="w-3.5 h-3.5 text-[#FA5D19]" />
          <span className="font-semibold text-[16px] text-white tracking-tight uppercase">
            Sources ({verification.sourcesAnalyzed})
          </span>
        </div>
      </div>

      <div className="p-6 bg-[#141414] relative overflow-visible">
        <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
        <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
        
        <div className="space-y-6">
          <VerificationChecklist
            level={verification.level}
            score={verification.score}
            sourcesCount={verification.sourcesAnalyzed}
            claimsVerified={verification.claimsVerified}
            claimsDisputed={verification.claimsDisputed}
          />

          <div className="space-y-4 pt-4">
            <h4 className="text-[12px] uppercase tracking-wider text-white/40 font-medium mb-2">
              {page === 1 && totalPages > 1 ? 'Top Sources' : `Sources (${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, verification.sourcesAnalyzed)})`}
            </h4>
            
            <div className="grid grid-cols-1 gap-1">
              {paginatedSources.map((source, i) => {
                const url = getSourceUrl(source.title);
                return (
                  <a 
                    key={i} 
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex justify-between items-center py-2 px-3 -mx-3 rounded hover:bg-[#1A1A1A] transition-colors ${url === '#' ? 'pointer-events-none' : ''}`}
                  >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-white/60 text-[14px] truncate group-hover:text-white transition-colors">{source.title}</span>
                      </div>
                      <span className="text-white/30 font-mono text-[10px] shrink-0">{source.domain}</span>
                  </a>
                );
              })}
            </div>
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
      </div>
      
      <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
    </div>
  );
}
