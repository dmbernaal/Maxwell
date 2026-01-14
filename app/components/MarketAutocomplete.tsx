'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Search, TrendingUp } from 'lucide-react';
import type { UnifiedMarket } from '@/app/lib/markets/types';
import { PolymarketLogo, KalshiLogo } from './icons/PlatformIcons';

interface MarketAutocompleteProps {
  query: string;
  results: UnifiedMarket[];
  topMarkets: UnifiedMarket[];
  onSelectMarket: (market: UnifiedMarket) => void;
  isVisible: boolean;
  selectedIndex?: number;
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
  return `$${volume.toFixed(0)}`;
}

export default function MarketAutocomplete({
  query,
  results,
  topMarkets,
  onSelectMarket,
  isVisible,
  selectedIndex = -1
}: MarketAutocompleteProps) {
  
  if (!isVisible) return null;

  const displayMarkets = query ? results : topMarkets;
  const sectionLabel = query ? 'Top Matches' : 'Top Markets';
  const showCount = query && results.length > 0;

  return (
    <div className="absolute top-full left-0 w-[480px] mt-2 z-50">
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full bg-[#141414]/95 backdrop-blur-xl rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.6)]"
      >
        {displayMarkets.length > 0 && (
          <div className="p-2">
            <div className="px-3 py-2 text-[11px] font-medium text-white/30 uppercase tracking-widest flex justify-between items-center">
              <span className="flex items-center gap-2">
                {!query && <TrendingUp size={10} />}
                {sectionLabel}
              </span>
              {showCount && (
                <span className="text-[10px] bg-white/5 px-1.5 rounded text-white/20">
                  {results.length} found
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {displayMarkets.map((market, index) => (
                <button
                  key={market.id}
                  onClick={() => onSelectMarket(market)}
                  className={`flex items-center gap-3 w-full px-3 py-3 rounded-md group transition-all text-left ${
                    index === selectedIndex 
                      ? 'bg-white/10' 
                      : 'hover:bg-[#1a1a1a]'
                  }`}
                >
                  <div className="shrink-0">
                    {market.platform === 'polymarket' ? (
                      <div className="w-8 h-8 rounded-md bg-[#1a1a1a] flex items-center justify-center">
                        <PolymarketLogo className="w-4 h-4 text-[#2E5CFF]" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-[#1a1a1a] flex items-center justify-center">
                        <KalshiLogo className="w-4 h-4 text-[#09C285]" />
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
                    <div className={`text-sm font-bold ${market.platform === 'polymarket' ? 'text-[#2E5CFF]' : 'text-[#09C285]'}`}>
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
            <div className="w-12 h-12 rounded-md bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
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
