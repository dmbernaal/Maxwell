'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, TrendingUp, BarChart2, Clock, Filter } from 'lucide-react';
import { UnifiedMarket } from '@/app/lib/markets/types';
import MarketGrid from './MarketGrid';

type Platform = 'all' | 'polymarket' | 'kalshi';
type Sort = 'volume' | 'trending' | 'newest';

interface MarketExplorerProps {
  onBack: () => void;
  onSelectMarket: (market: UnifiedMarket) => void;
}

export default function MarketExplorer({ onBack, onSelectMarket }: MarketExplorerProps) {
  const [platform, setPlatform] = useState<Platform>('all');
  const [sort, setSort] = useState<Sort>('volume');
  const [markets, setMarkets] = useState<UnifiedMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page] = useState(1);

  const fetchMarkets = useCallback(async () => {
    setIsLoading(true);
    try {
      const limit = 50; 
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        sort,
        ...(platform !== 'all' && { platform })
      });

      const res = await fetch(`/api/markets?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMarkets(data.markets || []);
      }
    } catch (error) {
      console.error('Failed to fetch markets:', error);
    } finally {
      setIsLoading(false);
    }
  }, [platform, sort]);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-4 pb-20">
      <div className="sticky top-[100px] z-20 mb-8 -mx-4 md:-mx-6 px-4 md:px-6 py-4 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center">
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-medium text-white/90">Explore Markets</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto overflow-x-auto no-scrollbar">
          
          <div className="flex p-1 bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm">
            {(['all', 'polymarket', 'kalshi'] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  platform === p 
                    ? 'bg-white/10 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex p-1 bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm">
            {[
              { id: 'volume', icon: BarChart2, label: 'Volume' },
              { id: 'trending', icon: TrendingUp, label: 'Trending' },
              { id: 'newest', icon: Clock, label: 'Newest' }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setSort(item.id as Sort)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    sort === item.id 
                      ? 'bg-white/10 text-white shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center py-20"
          >
            <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full"
          >
            {markets.length > 0 ? (
              <MarketGrid 
                markets={markets} 
                onSelectMarket={onSelectMarket} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <Filter className="w-12 h-12 mb-4 opacity-20" />
                <p>No markets found for these filters.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
