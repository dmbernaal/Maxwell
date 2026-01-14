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
      className="group relative flex flex-col h-[180px] p-5 rounded-md cursor-pointer overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: '#141414',
      }}
    >
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          boxShadow: `inset 0 0 0 1px ${brandColor}30`,
          pointerEvents: 'none'
        }}
      />
      
      <div className="flex flex-col h-full justify-between z-10">
        
        <div className="flex justify-between items-start gap-3">
          <h3 className="text-sm font-medium text-white/90 leading-snug line-clamp-3 group-hover:text-white transition-colors duration-300">
            {market.title}
          </h3>
          
          <div 
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded bg-white/5 border border-white/5"
            style={{ color: brandColor }}
          >
            {isPoly ? (
              <PolymarketLogo className="w-3.5 h-3.5" />
            ) : (
              <KalshiLogo className="w-3.5 h-3.5" />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-0.5">Chance</span>
              <span className="flex items-baseline gap-1 font-mono font-medium tracking-tighter text-white">
                <span className="text-3xl">{odds}</span>
                <span className="text-sm text-white/40">%</span>
              </span>
            </div>

            <div className="flex flex-col items-end">
               <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-0.5">Vol</span>
               <div className="flex items-center gap-1.5 text-white/60">
                <span className="text-sm font-mono tracking-tight">{formattedVolume}</span>
              </div>
            </div>
          </div>

          <div className="relative w-full h-1 bg-white/5 rounded-none overflow-hidden">
             <div 
                className="absolute left-0 top-0 h-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${odds}%`,
                  backgroundColor: brandColor,
                  opacity: 0.8
                }}
             />
          </div>

        </div>
      </div>
    </motion.div>
  );
}
