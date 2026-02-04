'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { BarChart2, TrendingUp, Clock, Loader2, ChevronDown } from 'lucide-react';

import MarketGrid from './components/MarketGrid';
import MarketGridSkeleton from './components/MarketGridSkeleton';
import CategoryTabs from './components/CategoryTabs';
import type { UnifiedMarket } from './lib/markets/types';

type Platform = 'all' | 'polymarket' | 'kalshi';
type Sort = 'volume' | 'trending' | 'newest';

export default function Home() {
  const router = useRouter();
  const [marketResults, setMarketResults] = useState<UnifiedMarket[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarketsLoading, setIsMarketsLoading] = useState(true);
  const [platform, setPlatform] = useState<Platform>('all');
  const [sort, setSort] = useState<Sort>('volume');
  const [category, setCategory] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setIsMarketsLoading(true);
        const queryParams = new URLSearchParams({
          limit: '50',
          sort,
          ...(platform !== 'all' && { platform }),
          ...(category && { category })
        });
        const res = await fetch(`/api/markets?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const markets = data.markets || [];
          setMarketResults(markets);
          setNextCursor(data.nextCursor);
          
          if (!category) {
            const cats = [...new Set(markets.map((m: UnifiedMarket) => m.category))]
              .filter((c): c is string => c !== 'Uncategorized' && !!c);
            setAvailableCategories(cats);
          }
        }
      } catch (e) {
        console.error("Failed to fetch markets", e);
      } finally {
        setTimeout(() => setIsMarketsLoading(false), 500);
      }
    };
    fetchMarkets();
  }, [platform, sort, category]);

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    
    try {
      setIsLoadingMore(true);
        const queryParams = new URLSearchParams({
          limit: '20',
          sort,
          ...(platform !== 'all' && { platform }),
          ...(category && { category }),
          cursor: nextCursor
        });
      const res = await fetch(`/api/markets?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const newMarkets = data.markets || [];
        setMarketResults(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNew = newMarkets.filter((m: UnifiedMarket) => !existingIds.has(m.id));
          return [...prev, ...uniqueNew];
        });
        setNextCursor(data.nextCursor);
      }
    } catch (e) {
      console.error("Failed to load more markets", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-app font-sans">
      <div className="max-w-[1600px] mx-auto border-x border-border-base min-h-[calc(100vh-3.5rem)] bg-app">
        
        <div className="sticky top-16 z-40 bg-[#111111] border-b border-[#2A2A2A] px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
             {availableCategories.length > 0 && (
              <CategoryTabs
                categories={availableCategories}
                selected={category}
                onSelect={setCategory}
              />
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-0.5">
              {(['all', 'polymarket', 'kalshi'] as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider transition-all ${
                    platform === p 
                      ? 'bg-[#FA5D19] text-white' 
                      : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-[#2A2A2A]" />

            <div className="flex items-center bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-0.5">
              {[
                { id: 'volume', icon: BarChart2, label: 'Vol' },
                { id: 'trending', icon: TrendingUp, label: 'Trend' },
                { id: 'newest', icon: Clock, label: 'New' }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSort(item.id as Sort)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider transition-all ${
                      sort === item.id 
                        ? 'bg-[#FA5D19] text-white' 
                        : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          {isMarketsLoading ? (
            <MarketGridSkeleton />
          ) : (
            <>
              <MarketGrid 
                markets={marketResults} 
                onSelectMarket={(market) => router.push(`/markets/${market.id}`)}
              />
              
              {nextCursor && (
                <div className="flex justify-center pt-12 pb-8">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="group flex items-center gap-2 px-6 py-2.5 rounded-md bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-all border border-border-base text-[12px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                    )}
                    <span>{isLoadingMore ? 'Loading...' : 'Load More'}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
