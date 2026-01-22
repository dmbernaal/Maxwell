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
    <main className="relative min-h-screen w-full bg-[var(--bg-primary)] overflow-y-auto overflow-x-hidden selection:bg-brand-accent/30 font-sans">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-24 px-6 lg:px-10 pb-16"
      >
        <div className="max-w-[1350px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col gap-6"
          >
            {availableCategories.length > 0 && (
              <CategoryTabs
                categories={availableCategories}
                selected={category}
                onSelect={setCategory}
              />
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-white/40">
                {category || 'All Markets'}
              </h2>
              
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                <div className="flex p-0.5 bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm shrink-0">
                  {(['all', 'polymarket', 'kalshi'] as Platform[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`px-3 py-1 rounded-md text-[10px] uppercase font-mono tracking-wider transition-all ${
                        platform === p 
                          ? 'bg-white/10 text-white shadow-sm' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {p === 'all' ? 'All' : p}
                    </button>
                  ))}
                </div>

                <div className="flex p-0.5 bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm shrink-0">
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
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] uppercase font-mono tracking-wider transition-all ${
                          sort === item.id 
                            ? 'bg-white/10 text-white shadow-sm' 
                            : 'text-zinc-500 hover:text-zinc-300'
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

            {isMarketsLoading ? (
              <MarketGridSkeleton />
            ) : (
              <>
                <MarketGrid 
                  markets={marketResults} 
                  onSelectMarket={(market) => router.push(`/markets/${market.id}`)}
                />
                
                {nextCursor && (
                  <div className="flex justify-center pt-8 pb-4">
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 transition-all border border-white/5 hover:border-white/10 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingMore ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                      )}
                      <span>{isLoadingMore ? 'Loading...' : 'Load More'}</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
