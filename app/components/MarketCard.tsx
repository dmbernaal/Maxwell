'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import type { UnifiedMarket } from '@/app/lib/markets/types';
import { PolymarketLogo, KalshiLogo, PLATFORM_COLORS } from './icons/PlatformIcons';

interface MarketCardProps {
  market: UnifiedMarket;
  onClick?: (market: UnifiedMarket) => void;
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
  return `$${volume.toFixed(0)}`;
}

export default function MarketCard({ market, onClick }: MarketCardProps) {
  const isPoly = market.platform === 'polymarket';
  const brandColor = isPoly ? PLATFORM_COLORS.polymarket : PLATFORM_COLORS.kalshi;

  const odds = Math.round(market.yesPrice * 100);
  const formattedVolume = formatVolume(market.volume);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={() => onClick?.(market)}
      className="group relative flex flex-col h-[160px] p-5 rounded-2xl bg-[#18151d] border border-white/[0.03] hover:border-white/[0.08] hover:bg-[#1c1922] cursor-pointer overflow-hidden transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4 z-10">
        <div 
          className="flex items-center justify-center w-8 h-8 rounded-lg backdrop-blur-md"
          style={{ 
            backgroundColor: `${brandColor}15`,
            borderWidth: 1,
            borderColor: `${brandColor}30`,
            color: brandColor
          }}
        >
          {isPoly ? (
            <PolymarketLogo className="w-4 h-4" />
          ) : (
            <KalshiLogo className="w-4 h-4" />
          )}
        </div>
        
        <div className="flex flex-col items-end">
          <span 
            className="text-2xl font-mono font-medium tracking-tight"
            style={{ color: brandColor }}
          >
            {odds}%
          </span>
        </div>
      </div>

      <h3 className="text-[15px] font-medium text-white/90 leading-snug line-clamp-2 mb-auto z-10 group-hover:text-white transition-colors">
        {market.title}
      </h3>

      <div className="flex items-center justify-between pt-4 mt-auto z-10">
        <div className="flex items-center gap-2 text-white/30 group-hover:text-white/50 transition-colors">
          <Activity size={12} />
          <span className="text-xs font-mono">{formattedVolume}</span>
        </div>
        
        {market.trending && (
          <div className="flex items-center gap-1.5 text-amber-400/80">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span>
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
