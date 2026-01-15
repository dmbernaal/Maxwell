'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import MarketDataPanel from '../../components/MarketDataPanel';
import { MarketIntelligencePanel } from '../../components/maxwell/MarketIntelligencePanel';
import { useMaxwell } from '../../hooks/use-maxwell';
import type { UnifiedMarket } from '../../lib/markets/types';
import { getCachedAnalysis, setCachedAnalysis, type CachedAnalysis } from '../../lib/markets/analysis-cache';

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
    
    const query = `Analyze the prediction market: "${market.title}". 
Resolution rules: ${market.rules || 'Standard resolution based on official sources.'}
Deadline: ${market.endDate ? new Date(market.endDate).toLocaleDateString() : 'Not specified'}

Provide a probability verdict (YES/NO/LIKELY/UNLIKELY) with confidence level and key supporting evidence.`;
    maxwell.search(query);
  }, [market, maxwell]);

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
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-[55%] lg:pr-4">
            <MarketDataPanel market={market} />
          </div>

          <div className="w-full lg:w-[45%] lg:pl-4">
            <div className="lg:sticky lg:top-24">
              <MarketIntelligencePanel 
                phase={maxwell.phase}
                subQueries={maxwell.subQueries}
                searchMetadata={maxwell.searchMetadata}
                sources={maxwell.sources}
                verification={maxwell.verification}
                verificationProgress={maxwell.verificationProgress}
                phaseDurations={maxwell.phaseDurations}
                phaseStartTimes={maxwell.phaseStartTimes}
                events={maxwell.events}
                answer={maxwell.answer}
                adjudication={maxwell.adjudication}
                config={maxwell.config}
                onQuery={(q) => maxwell.search(q)}
                onRunAnalysis={handleRunAnalysis}
                market={market}
                isCached={!!cachedAnalysis}
                cacheTimestamp={cachedAnalysis?.timestamp}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
