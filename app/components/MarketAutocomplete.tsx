'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, Search } from 'lucide-react';
import type { UnifiedMarket, Platform } from '@/app/lib/markets/types';
import { PolymarketLogo, KalshiLogo } from './icons/PlatformIcons';

interface MarketAutocompleteProps {
  query: string;
  results: UnifiedMarket[];
  trendingQueries: string[];
  onSelectMarket: (market: UnifiedMarket) => void;
  onSelectQuery: (query: string) => void;
  isVisible: boolean;
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
  return `$${volume.toFixed(0)}`;
}

export default function MarketAutocomplete({
  query,
  results,
  trendingQueries,
  onSelectMarket,
  onSelectQuery,
  isVisible
}: MarketAutocompleteProps) {
  
  if (!isVisible) return null;

  return (
    <div className="absolute top-full left-0 w-full mt-2 px-2 z-50">
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full bg-[#18151d]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        {!query && (
          <div className="p-2">
            <div className="px-3 py-2 text-[10px] font-medium text-white/30 uppercase tracking-widest">
              Suggested
            </div>

            <div className="flex flex-col gap-1">
              {trendingQueries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectQuery(q)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/5 group transition-colors text-left"
                >
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-white/20 group-hover:text-white/60 transition-all">
                    <TrendingUp size={12} />
                  </div>
                  <span className="text-sm text-white/60 group-hover:text-white transition-colors">
                    {q}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {query && results.length > 0 && (
          <div className="p-2">
             <div className="px-3 py-2 text-[11px] font-medium text-white/30 uppercase tracking-widest flex justify-between items-center">

              <span>Top Matches</span>
              <span className="text-[10px] bg-white/5 px-1.5 rounded text-white/20">{results.length} found</span>
            </div>
            <div className="flex flex-col gap-1">
              {results.map((market) => (
                <button
                  key={market.id}
                  onClick={() => onSelectMarket(market)}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 group transition-all text-left"
                >
                  <div className="shrink-0">

                    {market.platform === 'polymarket' ? (
                       <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:border-blue-500/40 transition-colors">
                         <PolymarketLogo className="w-4 h-4 text-blue-400" />
                       </div>
                    ) : (
                       <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
                         <KalshiLogo className="w-4 h-4 text-emerald-400" />
                       </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">

                      <span className="text-sm font-medium text-white/90 truncate group-hover:text-white transition-colors">
                        {market.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span className="capitalize">{market.platform}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                      <span className="flex items-center gap-1">
                        <Activity size={10} />
                        {formatVolume(market.volume)} Vol
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <div className={`text-sm font-bold ${market.platform === 'polymarket' ? 'text-blue-400' : 'text-emerald-400'}`}>
                      {Math.round(market.yesPrice * 100)}%

                    </div>
                    <div className="text-[10px] text-white/30 uppercase tracking-wide">Prob</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {query && results.length === 0 && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">

              <Search size={20} className="text-white/20" />
            </div>
            <p className="text-sm text-white/40">
              No active markets found for <span className="text-white/60">"{query}"</span>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
