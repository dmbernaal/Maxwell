import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { OutcomeAnalysis } from '@/app/lib/maxwell/types';
import { cn } from '@/app/lib/utils';
import { StatusBadge } from './primitives/StatusBadge';

interface OutcomesAnalysisTableProps {
  outcomes: OutcomeAnalysis[];
}

function getEdgeColor(edge: number) {
  if (edge > 2) return 'text-emerald-400';
  if (edge < -2) return 'text-rose-400';
  return 'text-white/40';
}

function getVerdictProps(verdict: string): { label: string; color: 'emerald' | 'rose' | 'amber' | 'zinc' } {
  switch (verdict) {
    case 'UNDERPRICED':
      return { label: 'Underpriced', color: 'emerald' };
    case 'OVERPRICED':
      return { label: 'Overpriced', color: 'rose' };
    case 'FAIR':
      return { label: 'Fair Value', color: 'zinc' };
    default:
      return { label: verdict, color: 'zinc' };
  }
}

export function OutcomesAnalysisTable({ outcomes }: OutcomesAnalysisTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  if (!outcomes || outcomes.length === 0) return null;

  const sortedOutcomes = [...outcomes].sort((a, b) => {
    const edgeA = Math.abs(a.maxwellRange.mid - a.marketPrice);
    const edgeB = Math.abs(b.maxwellRange.mid - b.marketPrice);
    return edgeB - edgeA;
  });

  return (
    <div className="w-full overflow-hidden rounded-md border border-white/[0.08] bg-[#121214]">
      <div className="h-10 border-b border-white/[0.08] flex items-center px-4 bg-[#121214]">
        <div className="flex-1 text-[10px] font-medium uppercase tracking-wider text-white/40">Outcome</div>
        <div className="w-24 text-right text-[10px] font-medium uppercase tracking-wider text-white/40">Mkt</div>
        <div className="w-24 text-right text-[10px] font-medium uppercase tracking-wider text-white/40">Maxwell</div>
        <div className="w-24 text-right text-[10px] font-medium uppercase tracking-wider text-white/40">Edge</div>
        <div className="w-32 text-center text-[10px] font-medium uppercase tracking-wider text-white/40">Verdict</div>
      </div>

      <div className="divide-y divide-white/[0.08]">
        {sortedOutcomes.map((outcome) => {
          const edge = outcome.maxwellRange.mid - outcome.marketPrice;
          const isExpanded = expandedRow === outcome.name;

          return (
            <div key={outcome.name} className="group flex flex-col bg-[#121214]">
              <div 
                className={cn(
                  "h-12 flex items-center px-4 cursor-pointer transition-colors duration-150 relative",
                  isExpanded ? "bg-white/[0.02]" : "hover:bg-white/[0.03]"
                )}
                onClick={() => setExpandedRow(isExpanded ? null : outcome.name)}
              >
                {isExpanded && (
                  <motion.div 
                    layoutId="activeRow"
                    className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500" 
                  />
                )}

                <div className="flex-1 text-sm font-medium text-white/90 truncate pr-4">
                  {outcome.name}
                </div>
                
                <div className="w-24 text-right text-xs font-mono text-white/70">
                  {Math.round(outcome.marketPrice)}%
                </div>
                
                <div className="w-24 text-right text-xs font-mono text-white/70">
                  {Math.round(outcome.maxwellRange.mid)}%
                </div>
                
                <div className={cn("w-24 text-right text-xs font-mono font-medium flex justify-end items-center gap-1", getEdgeColor(edge))}>
                  {edge > 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : edge < 0 ? (
                    <ArrowDownRight className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  {Math.abs(Math.round(edge))}%
                </div>
                
                <div className="w-32 flex justify-center">
                  <StatusBadge {...getVerdictProps(outcome.view)} />
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
                    className="overflow-hidden bg-[#121214]"
                  >
                    <div className="p-4 pl-6 border-b border-white/[0.08] flex gap-8">
                      <div className="flex-1">
                        <div className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2">Analysis</div>
                        <p className="text-sm text-white/70 leading-relaxed font-light">
                          {outcome.oneLiner}
                        </p>
                      </div>
                      
                      <div className="w-64 space-y-3 pt-1 border-l border-white/[0.08] pl-6">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/40">Confidence Range</span>
                          <span className="font-mono text-white/80">
                            {Math.round(outcome.maxwellRange.low)}% - {Math.round(outcome.maxwellRange.high)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/40">Confidence Level</span>
                          <span className={cn(
                            "font-medium",
                            outcome.confidence === 'HIGH' ? "text-emerald-400" :
                            outcome.confidence === 'MEDIUM' ? "text-amber-400" : "text-rose-400"
                          )}>
                            {outcome.confidence}
                          </span>
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
