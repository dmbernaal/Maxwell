import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelFrame } from './primitives/PanelFrame';
import { ArrowUpRight, ArrowDownRight, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { OutcomeAnalysis } from '@/app/lib/maxwell/types';
import { cn } from '@/app/lib/utils';

interface OutcomesAnalysisTableProps {
  outcomes: OutcomeAnalysis[];
}

function getEdgeColor(edge: number) {
  if (edge > 2) return 'text-emerald-400';
  if (edge < -2) return 'text-rose-400';
  return 'text-white/40';
}

function getVerdictBadgeColor(verdict: string) {
  switch (verdict) {
    case 'UNDERPRICED':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'OVERPRICED':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'FAIR':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    default:
      return 'bg-white/5 text-white/40 border-white/10';
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
    <PanelFrame className="p-0 overflow-hidden flex flex-col bg-[#121214] border-white/[0.08]">
      <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#121214]">
        <h3 className="text-sm font-medium text-white/90">Outcome Analysis</h3>
        <span className="text-[10px] uppercase tracking-wider text-white/40 font-mono">
          {outcomes.length} Outcomes Analyzed
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wider text-white/40 font-medium font-sans">
              <th className="px-6 py-3 w-[25%]">Outcome</th>
              <th className="px-4 py-3 text-right">Mkt</th>
              <th className="px-4 py-3 text-right">Maxwell</th>
              <th className="px-4 py-3 text-right">Edge</th>
              <th className="px-4 py-3 text-center">Verdict</th>
              <th className="px-6 py-3 w-[35%] hidden md:table-cell">Analysis</th>
              <th className="px-4 py-3 w-[40px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.08]">
            {sortedOutcomes.map((outcome) => {
              const edge = outcome.maxwellRange.mid - outcome.marketPrice;
              const isExpanded = expandedRow === outcome.name;

              return (
                <React.Fragment key={outcome.name}>
                  <tr 
                    className="group hover:bg-white/[0.04] transition-colors cursor-pointer"
                    onClick={() => setExpandedRow(isExpanded ? null : outcome.name)}
                  >
                    <td className="px-6 py-3">
                      <div className="text-sm font-medium text-white/90 truncate max-w-[200px] md:max-w-none">
                        {outcome.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-white/70">
                      {Math.round(outcome.marketPrice)}%
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-white/70">
                      {Math.round(outcome.maxwellRange.mid)}%
                    </td>
                    <td className={cn("px-4 py-3 text-right text-xs font-mono font-medium", getEdgeColor(edge))}>
                      <div className="flex items-center justify-end gap-1">
                        {edge > 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : edge < 0 ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                        {Math.abs(Math.round(edge))}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border",
                        getVerdictBadgeColor(outcome.view)
                      )}>
                        {outcome.view}
                      </span>
                    </td>
                    <td className="px-6 py-3 hidden md:table-cell">
                      <div className="text-sm text-white/50 truncate max-w-[300px]">
                        {outcome.oneLiner}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-white/20 group-hover:text-white/60 transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white/[0.02] border-b border-white/5 overflow-hidden"
                          >
                            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2">
                                  Analysis
                                </h4>
                                <p className="text-sm text-white/80 leading-relaxed">
                                  {outcome.oneLiner}
                                </p>
                              </div>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                  <span className="text-white/40">Confidence Range</span>
                                  <span className="font-mono text-white/80">
                                    {Math.round(outcome.maxwellRange.low)}% - {Math.round(outcome.maxwellRange.high)}%
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
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
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </PanelFrame>
  );
}
