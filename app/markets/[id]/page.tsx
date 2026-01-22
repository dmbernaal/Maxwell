'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react';

import MarketDataPanel from '../../components/MarketDataPanel';
import { IntelligencePanel } from '../../components/maxwell/IntelligencePanel';
import { useMaxwell } from '../../hooks/use-maxwell';
import type { UnifiedMarket } from '../../lib/markets/types';
import type { MarketContext, MarketOutcomeContext, IntelligenceMarketType } from '../../lib/maxwell/types';
import { getCachedAnalysis, setCachedAnalysis, type CachedAnalysis } from '../../lib/markets/analysis-cache';

function buildMarketContext(market: UnifiedMarket): MarketContext {
  const outcomes: MarketOutcomeContext[] = market.outcomes.map(outcome => ({
    name: outcome.name,
    price: outcome.price,
    priceChange24h: undefined,
    volume: undefined,
  }));

  let type: IntelligenceMarketType;
  if (market.marketType === 'binary') {
    type = 'binary';
  } else if (market.marketType === 'matchup') {
    type = 'matchup';
  } else {
    type = 'multi-option';
  }

  return {
    id: market.id,
    platform: market.platform,
    title: market.title,
    type,
    outcomes,
    rules: market.rules || '',
    resolutionSource: market.resolutionSource,
    endDate: market.endDate,
    volume: market.volume,
    volume24h: market.volume24h,
    liquidity: market.liquidity,
    crossPlatformOdds: undefined,
  };
}

type Params = Promise<{ id: string }>;

function extractVerdict(adjudication: string | null): string {
  if (!adjudication) return 'UNCERTAIN';
  const upper = adjudication.toUpperCase();
  if (upper.includes('YES') || upper.includes('LIKELY YES')) return 'YES';
  if (upper.includes('NO') || upper.includes('LIKELY NO')) return 'NO';
  if (upper.includes('LIKELY')) return 'LIKELY';
  if (upper.includes('UNLIKELY')) return 'UNLIKELY';
  return 'UNCERTAIN';
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MarketDetailPage(props: { params: Params }) {
  const params = use(props.params);
  const router = useRouter();
  const maxwell = useMaxwell();
  
  const [market, setMarket] = useState<UnifiedMarket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedAnalysis, setCachedAnalysisState] = useState<CachedAnalysis | null>(null);
  const [isCacheLoading, setIsCacheLoading] = useState(true);

  useEffect(() => {
    const loadCachedAnalysis = async () => {
      try {
        const cached = await getCachedAnalysis(params.id);
        if (cached) {
          setCachedAnalysisState(cached);
          maxwell.hydrate({
            phase: 'complete',
            subQueries: [],
            sources: cached.sources,
            searchMetadata: [],
            verification: cached.verification,
            verificationProgress: null,
            answer: cached.answer,
            adjudication: cached.adjudication,
            intelligence: cached.intelligence,
            phaseDurations: { total: cached.durationMs },
            phaseStartTimes: {},
            events: [],
            error: null,
          });
        }
      } catch (e) {
        console.error('Error loading cached analysis:', e);
      } finally {
        setIsCacheLoading(false);
      }
    };
    
    loadCachedAnalysis();
  }, [params.id]);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/markets/${encodeURIComponent(params.id)}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            setError('Market not found');
          } else {
            setError('Failed to load market');
          }
          return;
        }
        
        const data = await res.json();
        setMarket(data.market);
      } catch (e) {
        setError('Failed to load market');
        console.error('Error fetching market:', e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMarket();
  }, [params.id]);

  useEffect(() => {
    const saveToCache = async () => {
      if (
        maxwell.phase === 'complete' && 
        market && 
        maxwell.answer && 
        maxwell.adjudication &&
        !cachedAnalysis
      ) {
        const analysis: CachedAnalysis = {
          marketId: params.id,
          query: market.title,
          verdict: extractVerdict(maxwell.adjudication),
          confidence: maxwell.verification?.overallConfidence || 0,
          answer: maxwell.answer,
          adjudication: maxwell.adjudication,
          sources: maxwell.sources,
          verification: maxwell.verification,
          intelligence: maxwell.intelligence,
          timestamp: Date.now(),
          durationMs: maxwell.phaseDurations.total || 0,
        };
        
        await setCachedAnalysis(analysis);
        setCachedAnalysisState(analysis);
      }
    };
    
    saveToCache();
  }, [maxwell.phase, maxwell.answer, maxwell.adjudication, market, params.id, cachedAnalysis, maxwell.verification, maxwell.sources, maxwell.phaseDurations.total]);

  const handleRunAnalysis = useCallback((forceRefresh = false) => {
    if (!market) return;
    
    if (forceRefresh) {
      setCachedAnalysisState(null);
      maxwell.reset();
    }
    
    const marketContext = buildMarketContext(market);
    const query = `Analyze: "${market.title}"`;
    maxwell.search(query, marketContext);
  }, [market, maxwell]);

  const isAnalyzing = maxwell.phase !== 'idle' && maxwell.phase !== 'complete';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-4">
        <span className="text-white/40 font-mono">{error || 'Market not found'}</span>
        <button 
          onClick={() => router.push('/')}
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          ← Back to markets
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-white pt-20 pb-6 px-6 lg:px-10">
      <div className="max-w-[1350px] mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <MarketDataPanel market={market} />
          </div>
          
          <div className="shrink-0 flex flex-col items-end gap-2 pt-10">
            {cachedAnalysis && (
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
                Analyzed {formatTimestamp(cachedAnalysis.timestamp)}
              </span>
            )}
            <button
              onClick={() => handleRunAnalysis(!!cachedAnalysis)}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                bg-white/5 hover:bg-white/10 text-white/70 hover:text-white
                disabled:opacity-50 disabled:cursor-not-allowed
                border border-white/10 hover:border-white/20"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{cachedAnalysis ? 'Re-run' : 'Analyze'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <IntelligencePanel
          data={maxwell.intelligence}
          isLoading={isAnalyzing}
          error={maxwell.error ? new Error(maxwell.error) : null}
          onRetry={() => handleRunAnalysis(true)}
          phase={maxwell.phase}
          sourceCount={maxwell.sources.length}
          verificationProgress={maxwell.verificationProgress}
          phaseDurations={maxwell.phaseDurations}
          phaseStartTimes={maxwell.phaseStartTimes}
        />
      </div>
    </main>
  );
}
