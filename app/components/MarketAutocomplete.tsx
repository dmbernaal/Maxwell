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
            <div className="px-3 py-2 text-[10px] font-medium text-[#525252] uppercase tracking-wider flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                {!query && <TrendingUp size={10} />}
                {sectionLabel}
              </span>
              {showCount && (
                <span className="text-[10px] text-[#525252]">
                  {results.length}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
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
                        className="w-7 h-7 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: isPoly ? '#0F1A3D' : '#0A1F1A' }}
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
                        <span className={`text-[13px] truncate transition-colors ${index === selectedIndex ? 'text-white' : 'text-[#A3A3A3] hover:text-white'}`}>
                          {market.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#525252]">
                        <span className="capitalize">{market.platform}</span>
                        <span className="text-[#2A2A2A]">|</span>
                        <span className="font-mono">{formatVolume(market.volume)}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[13px] font-mono text-white">
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
              <Search size={18} className="text-[#525252]" />
            </div>
            <p className="text-[13px] text-[#525252]">
              No markets found for <span className="text-[#737373]">"{query}"</span>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
