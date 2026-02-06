import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { OutcomeAnalysis } from '@/app/lib/maxwell/types';
import { cn } from '@/app/lib/utils';
import { StatusBadge } from './primitives/StatusBadge';
import { ConfidenceRangeCompact } from './primitives/ConfidenceRangeBar';

interface OutcomesAnalysisTableProps {
  outcomes: OutcomeAnalysis[];
}

function getEdgeColor(edge: number) {
  if (edge > 2) return 'text-white/80';
  if (edge < -2) return 'text-white/40';
  return 'text-[#666666]';
}

function formatVerdict(verdict: string): string {
  switch (verdict) {
    case 'UNDERPRICED':
      return 'Underpriced';
    case 'OVERPRICED':
      return 'Overpriced';
    case 'FAIR':
      return 'Fair Value';
    default:
      return verdict;
  }
}

export function OutcomesAnalysisTable({ outcomes }: OutcomesAnalysisTableProps) {
  const sortedOutcomes = [...outcomes].sort((a, b) => {
    const edgeA = Math.abs(a.maxwellRange.mid - a.marketPrice);
    const edgeB = Math.abs(b.maxwellRange.mid - b.marketPrice);
    return edgeB - edgeA;
  });

  const [expandedRow, setExpandedRow] = useState<string | null>(
    sortedOutcomes[0]?.name || null
  );

  if (!outcomes || outcomes.length === 0) return null;

  return (
    <div className="w-full">
      <div className="h-12 border-b border-[#2A2A2A] flex items-center bg-transparent">
        <div className="flex-1 text-[11px] font-medium uppercase tracking-wider text-[#666666] select-none pl-4 border-r border-[#2A2A2A] h-full flex items-center">Outcome</div>
        <div className="w-20 text-right text-[11px] font-medium uppercase tracking-wider text-[#666666] select-none border-r border-[#2A2A2A] h-full flex items-center justify-end pr-3">Market</div>
        <div className="w-20 text-right text-[11px] font-medium uppercase tracking-wider text-[#666666] select-none border-r border-[#2A2A2A] h-full flex items-center justify-end pr-3">AI Est.</div>
        <div className="w-20 text-right text-[11px] font-medium uppercase tracking-wider text-[#666666] select-none border-r border-[#2A2A2A] h-full flex items-center justify-end pr-3">Diff</div>
        <div className="w-28 text-center text-[11px] font-medium uppercase tracking-wider text-[#666666] select-none h-full flex items-center justify-center">Signal</div>
      </div>

      <div className="divide-y divide-[#2A2A2A]">
        {sortedOutcomes.map((outcome) => {
          const marketProb = outcome.marketPrice * 100;
          const maxwellProb = outcome.maxwellRange.mid * 100;
          const edge = maxwellProb - marketProb;
          
          const isExpanded = expandedRow === outcome.name;

          const isActionable = outcome.view === 'UNDERPRICED';
          
          return (
            <div key={outcome.name} className="group flex flex-col bg-transparent">
              <div
                className={cn(
                  "h-14 flex items-center cursor-pointer transition-colors duration-150 relative",
                  isExpanded ? "bg-[#1F1F1F]" : "hover:bg-[#1A1A1A]"
                )}
                onClick={() => setExpandedRow(isExpanded ? null : outcome.name)}
              >
                {isExpanded ? (
                  <motion.div
                    layoutId="activeRow"
                    className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#FA5D19] z-10"
                  />
                ) : isActionable && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#3A3A3A] z-10" />
                )}

                <div className="flex-1 flex items-center gap-2 border-r border-[#2A2A2A] h-full pl-4 pr-2">
                  <span className="text-[14px] font-medium text-white truncate">
                    {outcome.name}
                  </span>
                  <div className="text-[#525252]">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>

                <div className="w-20 text-right text-[13px] font-mono text-[#A3A3A3] border-r border-[#2A2A2A] h-full flex items-center justify-end pr-3">
                  {Math.round(marketProb)}%
                </div>

                <div className="w-20 text-right text-[13px] font-mono text-[#A3A3A3] border-r border-[#2A2A2A] h-full flex items-center justify-end pr-3">
                  {Math.round(maxwellProb)}%
                </div>

                <div className={cn("w-20 text-right text-[13px] font-mono font-medium flex justify-end items-center gap-1 border-r border-[#2A2A2A] h-full pr-3", getEdgeColor(edge))}>
                  {edge > 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : edge < 0 ? (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  ) : (
                    <Minus className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(Math.round(edge))}%
                </div>

                <div className="w-28 flex justify-center h-full items-center">
                  <StatusBadge 
                    label={formatVerdict(outcome.view)} 
                    color="default" 
                  />
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden bg-[#141414]"
                  >
                    <div className="p-6 pl-8 border-b border-[#2A2A2A]">
                      <div className="mb-5">
                        <p className="text-[14px] text-[#A3A3A3] leading-relaxed">
                          {outcome.oneLiner}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-[12px] text-[#525252] mb-4">
                        <span className="font-mono text-[#737373]">{Math.round(outcome.maxwellRange.low * 100)}-{Math.round(outcome.maxwellRange.high * 100)}%</span>
                        <span className="text-[#3A3A3A]">|</span>
                        <span>{outcome.confidence.toLowerCase()}</span>
                      </div>

                      <div className="relative">
                        <div className="flex items-center justify-between mb-2 text-[12px]">
                          <span className="text-[#525252]">Market {Math.round(marketProb)}%</span>
                          <span className={cn(
                            "font-mono",
                            edge > 0 ? 'text-white/60' : edge < 0 ? 'text-white/30' : 'text-[#737373]'
                          )}>
                            {edge > 0 ? '+' : ''}{Math.round(edge)}%
                          </span>
                        </div>
                        <div className="h-2.5 bg-[#2A2A2A] rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-[#3A3A3A]"
                            style={{ width: `${Math.min(marketProb, maxwellProb)}%` }}
                          />
<div 
                             className={cn(
                               "h-full",
                               edge > 0 ? 'bg-white/30' : edge < 0 ? 'bg-white/15' : 'bg-[#525252]'
                             )}
                            style={{ width: `${Math.abs(edge)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
