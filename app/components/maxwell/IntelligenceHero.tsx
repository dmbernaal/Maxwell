import { motion, AnimatePresence } from 'framer-motion';
import { StatusBadge } from './primitives/StatusBadge';
import { UnifiedMarket } from '@/app/lib/markets/types';
import { Zap, Clock } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { ResearchProgress, ResearchProgressProps } from './ResearchProgress';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';

interface IntelligenceHeroProps {
  market: UnifiedMarket;
  intelligence: MaxwellIntelligence | null;
  isLoading?: boolean;
  isAnalyzing?: boolean;
  onAnalyze?: () => void;
  researchProgressProps?: ResearchProgressProps;
}

function getMaxwellProbability(intelligence: MaxwellIntelligence): number {
  return intelligence.assessment.maxwellRange.mid;
}

export function IntelligenceHero({
  market,
  intelligence,
  isAnalyzing = false,
  onAnalyze,
  researchProgressProps
}: IntelligenceHeroProps) {
  const isBinary = market.marketType === 'binary' || (!market.marketType && market.outcomes.length === 2);
  const isMultiOption = market.marketType === 'multi-option' || (!isBinary && market.outcomes.length >= 2);

  let tickerData = {
    outcomeName: '',
    marketProb: market.yesPrice * 100,
    maxwellProb: 0,
    verdict: ''
  };

  if (intelligence) {
    if (isMultiOption && intelligence.outcomes && intelligence.outcomes.length > 0) {
      const bestOutcome = [...intelligence.outcomes].sort((a, b) => {
        const edgeA = Math.abs(a.maxwellRange.mid - a.marketPrice);
        const edgeB = Math.abs(b.maxwellRange.mid - b.marketPrice);
        return edgeB - edgeA;
      })[0];

      if (bestOutcome) {
        tickerData = {
          outcomeName: bestOutcome.name,
          marketProb: bestOutcome.marketPrice * 100,
          maxwellProb: bestOutcome.maxwellRange.mid * 100,
          verdict: bestOutcome.view
        };
      }
    } else {
      tickerData = {
        outcomeName: '',
        marketProb: market.yesPrice * 100,
        maxwellProb: getMaxwellProbability(intelligence) * 100,
        verdict: intelligence.assessment.verdict
      };
    }
  }

  const platformDotColor = market.platform === 'polymarket' ? 'bg-blue-500' : 'bg-white/40';
  const mode = intelligence ? 'ticker' : isAnalyzing ? 'analyzing' : 'initial';

  return (
    <div className="w-full flex flex-col gap-4">
      <AnimatePresence mode="wait">
        {(mode === 'initial' || mode === 'analyzing') && (
          <motion.div
            key="analysis-container"
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              opacity: { duration: 0.2 },
              layout: { duration: 0.4, ease: [0.32, 0.72, 0, 1] }
            }}
            className={cn(
              "w-full border-b border-[#2A2A2A]",
              mode === 'initial' ? "px-6 py-5" : "min-h-[240px]"
            )}
          >
            <AnimatePresence mode="wait">
              {mode === 'initial' ? (
                <motion.div
                  key="initial-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="flex items-center justify-between"
                >
                  <span className="text-[13px] text-[#525252] font-mono">No analysis yet</span>
                  {onAnalyze && (
                    <button
                      onClick={onAnalyze}
                      className="px-5 py-2.5 bg-[#FA5D19] text-white font-semibold text-[12px] rounded-[4px] hover:bg-[#EA580C] transition-colors flex items-center gap-2"
                    >
                      <Zap className="w-3.5 h-3.5 fill-white" />
                      Run Analysis
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="analyzing-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: 0.15 }}
                  className="h-full flex flex-col"
                >
                  {researchProgressProps && <ResearchProgress {...researchProgressProps} />}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {mode === 'ticker' && intelligence && (
          <motion.div
            key="active-ticker"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="w-full border-b border-[#2A2A2A]"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2.5 text-white">
                  <span className={cn("w-2 h-2 rounded-full", platformDotColor)} />
                  <span className="text-[14px] font-medium font-sans tracking-tight">
                    {market.platform === 'polymarket' ? 'Polymarket' : 'Kalshi'}
                  </span>
                </div>
                
                <div className="h-4 w-px bg-[#2A2A2A]" />
                
                <span className="font-mono text-[11px] text-[#525252] tracking-wider select-none uppercase">
                  {market.id.split(':')[1] || market.id}
                </span>
              </div>

              <div className="flex items-center gap-5">
                {tickerData.outcomeName && (
                  <>
                    <span className="text-[14px] text-white font-medium truncate max-w-[200px]">
                      {tickerData.outcomeName}
                    </span>
                    <div className="h-4 w-px bg-[#2A2A2A]" />
                  </>
                )}
                <div className="flex items-center gap-3 font-mono text-[14px] tabular-nums tracking-tight">
                  <span className="text-[#666666]">{tickerData.marketProb.toFixed(0)}%</span>
                  <span className="text-[#3A3A3A]">→</span>
                  <span className="text-white">{tickerData.maxwellProb.toFixed(0)}%</span>
                </div>
                
                <StatusBadge
                  label={tickerData.verdict}
                  color="zinc"
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-[#2A2A2A] flex items-center justify-between bg-[#1A1A1A]">
              <div className="flex items-center gap-5">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[12px] text-[#666666]">Range</span>
                  <span className="text-[12px] font-mono text-[#A3A3A3]">
                    {Math.round((isMultiOption && intelligence.outcomes?.[0] 
                      ? intelligence.outcomes[0].maxwellRange.low 
                      : intelligence.assessment.maxwellRange.low) * 100)}%
                    <span className="text-[#525252] mx-1.5">-</span>
                    {Math.round((isMultiOption && intelligence.outcomes?.[0]
                      ? intelligence.outcomes[0].maxwellRange.high
                      : intelligence.assessment.maxwellRange.high) * 100)}%
                  </span>
                </div>
                
                <div className="h-4 w-px bg-[#2A2A2A]" />
                
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[12px] text-[#666666]">Confidence</span>
                  <span className="text-[12px] font-mono text-[#A3A3A3]">
                    {intelligence.verification.score}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-[11px] text-[#666666] font-mono">
                <span>{intelligence.verification.sourcesAnalyzed} sources</span>
                <span className="text-[#2A2A2A]">|</span>
                <span>{Math.round(intelligence.pipelineDurationMs / 1000)}s</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
