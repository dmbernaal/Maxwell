import React from 'react';
import { motion } from 'framer-motion';
import { PanelFrame } from './primitives/PanelFrame';
import { SkeletonBlock } from './primitives/SkeletonBlock';
import { UnifiedMarket } from '@/app/lib/markets/types';
import { 
  Clock, 
  Layers, 
  Bot, 
  Share2, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Activity,
  Copy,
  Play,
  Loader2
} from 'lucide-react';
import { cn } from '@/app/lib/utils';

import { MaxwellIntelligence } from '@/app/lib/maxwell/types';

interface IntelligenceHeroProps {
  market: UnifiedMarket;
  intelligence: MaxwellIntelligence | null;
  isLoading?: boolean;
  isAnalyzing?: boolean;
  onAnalyze?: () => void;
}

function getMaxwellProbability(intelligence: MaxwellIntelligence): number {
  return intelligence.assessment.maxwellRange.mid;
}

function getVerdictColor(verdict: string) {
  switch (verdict) {
    case 'UNDERPRICED':
    case 'YES':
    case 'LIKELY':
      return 'text-emerald-500';
    case 'OVERPRICED':
    case 'NO':
    case 'UNLIKELY':
      return 'text-rose-500';
    case 'FAIR':
    case 'UNCERTAIN':
    default:
      return 'text-amber-500';
  }
}

function getConfidenceColor(confidence: number) {
  if (confidence >= 80) return 'bg-emerald-500';
  if (confidence >= 60) return 'bg-emerald-500/80';
  if (confidence >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
}

function formatRelativeTime(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

const ConfidenceGauge = ({ value, colorClass }: { value: number, colorClass: string }) => {
  return (
    <div className="flex gap-0.5 h-1.5 w-full max-w-[120px]">
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-[1px] transition-all duration-500",
            i < Math.floor(value / 10) ? colorClass : "bg-white/5"
          )}
        />
      ))}
    </div>
  );
};

const MarketMetaItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: React.ReactNode }) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center gap-2 text-white/30 group-hover:text-white/40 transition-colors">
      <Icon className="w-3.5 h-3.5" />
      <span className="text-[10px] uppercase tracking-widest font-medium">{label}</span>
    </div>
    <span className="font-mono text-[11px] text-white/60">{value}</span>
  </div>
);

export function IntelligenceHero({ 
  market, 
  intelligence, 
  isLoading = false,
  isAnalyzing = false,
  onAnalyze 
}: IntelligenceHeroProps) {
  const isBinary = market.marketType === 'binary' || (!market.marketType && market.outcomes.length === 2);
  const isMultiOption = market.marketType === 'multi-option' || (!isBinary && market.outcomes.length > 2);
  
  if (isLoading) {
    return (
      <PanelFrame className="h-[240px] p-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-white/5">
          <div className="p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <SkeletonBlock width={80} height={20} className="rounded-full" />
              <SkeletonBlock width="80%" height={32} />
              <SkeletonBlock width="60%" height={24} />
            </div>
            <SkeletonBlock width={120} height={16} />
          </div>
          
          <div className="p-8 flex flex-col items-center justify-center space-y-6">
            <SkeletonBlock width={160} height={64} />
            <SkeletonBlock width={200} height={8} />
            <SkeletonBlock width={140} height={24} />
          </div>
          
          <div className="p-8 flex flex-col justify-center space-y-6">
            <SkeletonBlock width="100%" height={20} />
            <SkeletonBlock width="100%" height={20} />
            <SkeletonBlock width="100%" height={20} />
          </div>
        </div>
      </PanelFrame>
    );
  }

  const marketProb = market.yesPrice * 100;
  const maxwellProb = intelligence ? getMaxwellProbability(intelligence) : 0;
  
  let edge = 0;
  let displayVerdict = intelligence?.assessment.verdict || 'UNCERTAIN';
  let topPickName = '';

  if (intelligence) {
    if (isMultiOption && intelligence.outcomes && intelligence.outcomes.length > 0) {
      const bestOutcome = [...intelligence.outcomes].sort((a, b) => {
        const edgeA = Math.abs(a.maxwellRange.mid - a.marketPrice);
        const edgeB = Math.abs(b.maxwellRange.mid - b.marketPrice);
        return edgeB - edgeA;
      })[0];

      if (bestOutcome) {
        edge = bestOutcome.maxwellRange.mid - bestOutcome.marketPrice;
        displayVerdict = bestOutcome.view;
        topPickName = bestOutcome.name;
      }
    } else {
      edge = maxwellProb - marketProb;
    }
  }
  
  const platformColor = market.platform === 'polymarket' ? 'bg-blue-500' : 'bg-emerald-500';

  return (
    <PanelFrame className="min-h-[220px] p-0 overflow-hidden relative group/hero">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.03] via-transparent to-transparent pointer-events-none" />
      
      <div className="absolute top-3 right-3 opacity-0 group-hover/hero:opacity-100 transition-opacity duration-300">
        <span className="text-[9px] font-mono text-white/20 border border-white/10 rounded px-1.5 py-0.5">V</span>
      </div>

      <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-white/5">
        
        <div className="p-6 lg:p-8 flex flex-col justify-between relative">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 text-white bg-white/5 border border-white/5")}>
                <span className={cn("w-1.5 h-1.5 rounded-full", platformColor)} />
                {market.platform}
              </div>
              <span className="font-mono text-[10px] text-white/30">ID: {market.id.split(':')[1] || market.id}</span>
            </div>
            
            <h1 className="text-xl lg:text-2xl font-medium text-white/90 leading-tight tracking-tight line-clamp-3">
              {market.title}
            </h1>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button className="p-2 rounded-md hover:bg-white/5 text-white/30 hover:text-white transition-colors border border-transparent hover:border-white/5">
              <Share2 className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-md hover:bg-white/5 text-white/30 hover:text-white transition-colors border border-transparent hover:border-white/5">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 lg:p-8 flex flex-col items-center justify-center relative">
            {!intelligence ? (
            <div className="flex flex-col items-center text-center space-y-4 max-w-xs relative z-10">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2 shadow-[0_0_30px_-5px_rgba(255,255,255,0.1)] border border-white/10">
                <Sparkles className="w-6 h-6 text-emerald-400/80" />
              </div>
              <h3 className="text-lg font-medium text-white/90">Verification Ready</h3>
              <p className="text-sm text-white/40 leading-relaxed">
                Run Maxwell to audit this market against live data sources and calculate true probability.
              </p>
              
              {onAnalyze && (
                <button
                  onClick={onAnalyze}
                  disabled={isAnalyzing}
                  className={cn(
                    "mt-4 px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                    "bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                    "flex items-center gap-2 shadow-lg shadow-white/5 ring-1 ring-white/20"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Running Audit...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Analysis</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col items-center w-full"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold">
                  {isMultiOption ? "Top Opportunity" : "Maxwell Verdict"}
                </span>
              </div>

              <div className={cn(
                "text-6xl lg:text-7xl font-bold tracking-tighter mb-4 tabular-nums",
                getVerdictColor(displayVerdict)
              )}>
                {displayVerdict}
              </div>

              <div className="w-full max-w-[240px] mb-6 flex flex-col items-center gap-2">
                <div className="flex justify-between w-full text-[10px] text-white/40 font-mono">
                  <span>Confidence</span>
                  <span>{intelligence.verification.score}%</span>
                </div>
                <ConfidenceGauge 
                  value={intelligence.verification.score} 
                  colorClass={getConfidenceColor(intelligence.verification.score)} 
                />
              </div>

              {isMultiOption && topPickName ? (
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] border border-white/5">
                  <span className="text-xs text-white/90 font-medium">
                    {topPickName}
                  </span>
                  <div className="w-px h-3 bg-white/10" />
                  <div className={cn(
                    "text-xs font-mono font-bold flex items-center gap-1",
                    edge > 0 ? "text-emerald-400" : edge < 0 ? "text-rose-400" : "text-white/40"
                  )}>
                    {edge > 0 ? <ArrowUpRight className="w-3 h-3" /> : edge < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {Math.abs(Math.round(edge))}% Edge
                  </div>
                </div>
              ) : isBinary && (
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] border border-white/5">
                  <span className="text-xs text-white/40 font-mono">
                    Max: <span className="text-white/80">{maxwellProb}%</span>
                  </span>
                  <span className="text-white/20 text-[10px]">vs</span>
                  <span className="text-xs text-white/40 font-mono">
                    Mkt: <span className="text-white/80">{Math.round(marketProb)}%</span>
                  </span>
                  <div className={cn(
                    "ml-2 pl-3 border-l border-white/10 text-xs font-mono font-bold flex items-center gap-1",
                    edge > 0 ? "text-emerald-400" : edge < 0 ? "text-rose-400" : "text-white/40"
                  )}>
                    {edge > 0 ? <ArrowUpRight className="w-3 h-3" /> : edge < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {Math.abs(Math.round(edge))}% Edge
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <div className="p-6 lg:p-8 flex flex-col justify-center space-y-6 bg-white/[0.01]">
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-2 text-white/30 group-hover:text-white/40 transition-colors">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-widest font-medium">Updated</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[11px] text-white/60">
                {formatRelativeTime(new Date())}
              </span>
            </div>
          </div>

          <MarketMetaItem 
            icon={Layers} 
            label="Sources" 
            value={
              intelligence ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-white">{intelligence.verification.sourcesAnalyzed}</span>
                  <span className="text-white/30">Total</span>
                </span>
              ) : <span className="text-white/20">-</span>
            } 
          />

          <MarketMetaItem 
            icon={Activity} 
            label="Verified" 
            value={
              intelligence ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-400">{intelligence.verification.claimsVerified}</span>
                  <span className="text-white/30">Claims</span>
                </span>
              ) : <span className="text-white/20">-</span>
            } 
          />

          <div className="h-px w-full bg-white/5 my-2" />

          <MarketMetaItem 
            icon={Bot} 
            label="Model" 
            value={
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                <span className="w-1 h-1 rounded-full bg-[#D97757]" />
                <span className="text-[10px] text-white/70">Claude 3.5 Sonnet</span>
              </div>
            } 
          />
        </div>
      </div>
    </PanelFrame>
  );
}
