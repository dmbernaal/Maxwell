'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Search, TrendingUp } from 'lucide-react';
import type { UnifiedMarket } from '@/app/lib/markets/types';
import { PolymarketLogo, KalshiLogo, PLATFORM_COLORS } from './icons/PlatformIcons';

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
    <div className="absolute top-full left-0 w-[520px] mt-2 z-50">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg overflow-hidden shadow-2xl"
      >
        {displayMarkets.length > 0 && (
          <div className="p-2">
            <div className="px-3 py-2 flex justify-between items-baseline">
              <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                {sectionLabel}
              </span>
              {showCount && (
                <span className="text-[10px] text-white/20 font-mono">
                  {results.length}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              {displayMarkets.map((market, index) => {
                const isPoly = market.platform === 'polymarket';
                const brandColor = isPoly ? PLATFORM_COLORS.polymarket : PLATFORM_COLORS.kalshi;
                
                return (
                  <button
                    key={market.id}
                    onClick={() => onSelectMarket(market)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md transition-all text-left ${
                      index === selectedIndex 
                        ? 'bg-[#252525]' 
                        : 'hover:bg-[#222222]'
                    }`}
                  >
                    <div className="shrink-0">
                      <div 
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-white/[0.05]"
                      >
                        {market.platform === 'polymarket' ? (
                          <div style={{ color: brandColor }}>
                            <PolymarketLogo className="w-4 h-4" />
                          </div>
                        ) : (
                          <div style={{ color: brandColor }}>
                            <KalshiLogo className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[14px] font-medium truncate transition-colors ${index === selectedIndex ? 'text-white' : 'text-white/60 hover:text-white'}`}>
                          {market.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-white/30">
                        <span className="capitalize font-mono">{market.platform}</span>
                        <span className="text-white/10">|</span>
                        <span className="font-mono">{formatVolume(market.volume)}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[14px] font-mono text-white/90">
                        {Math.round(market.yesPrice * 100)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {query && results.length === 0 && (
          <div className="p-6 text-center">
            <div className="w-10 h-10 rounded-lg bg-[#141414] flex items-center justify-center mx-auto mb-3">
              <Search size={18} className="text-white/30" />
            </div>
            <p className="text-[14px] text-white/30">
              No markets found for <span className="text-white/60">"{query}"</span>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
