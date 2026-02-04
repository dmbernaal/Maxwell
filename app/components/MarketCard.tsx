'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { UnifiedMarket, MarketOutcome } from '@/app/lib/markets/types';
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

function BinaryContent({ market, brandColor }: { market: UnifiedMarket; brandColor: string }) {
  const odds = Math.round(market.yesPrice * 100);
  const formattedVolume = formatVolume(market.volume);

  return (
    <div className="flex flex-col gap-2 mt-auto">
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-[#525252] font-medium">Chance</span>
          <span className="flex items-baseline gap-1 font-mono font-semibold tracking-tight text-white">
            <span className="text-2xl">{odds}</span>
            <span className="text-sm text-[#525252]">%</span>
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-wider text-[#525252] font-medium">Vol</span>
          <span className="text-sm font-mono text-[#737373]">{formattedVolume}</span>
        </div>
      </div>

      <div className="relative w-full h-0.5 bg-[#0F0F0F] overflow-hidden">
        <div 
          className="absolute left-0 top-0 h-full transition-all duration-700 ease-out"
          style={{ 
            width: `${odds}%`,
            backgroundColor: brandColor
          }}
        />
      </div>
    </div>
  );
}

function MatchupContent({ market, brandColor }: { market: UnifiedMarket; brandColor: string }) {
  const outcomes = market.outcomes.slice(0, 2);
  const formattedVolume = formatVolume(market.volume);
  
  return (
    <div className="flex flex-col gap-2 mt-auto">
      <div className="flex flex-col gap-1.5">
        {outcomes.map((outcome) => {
          const pct = Math.round(outcome.price * 100);
          const isLeading = outcome.price === Math.max(...outcomes.map(o => o.price));
          
          return (
            <div key={outcome.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <div 
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{ backgroundColor: isLeading ? brandColor : '#2A2A2A' }}
                />
                <span className={`text-[13px] truncate ${isLeading ? 'text-white font-medium' : 'text-[#737373]'}`}>
                  {outcome.name}
                </span>
              </div>
              <span className={`text-[13px] font-mono shrink-0 ${isLeading ? 'text-white' : 'text-[#525252]'}`}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] uppercase tracking-wider text-[#525252] font-medium">Vol</span>
        <span className="text-xs font-mono text-[#525252]">{formattedVolume}</span>
      </div>
    </div>
  );
}

function MultiOptionContent({ market, brandColor }: { market: UnifiedMarket; brandColor: string }) {
  const displayCount = Math.min(market.outcomes.length, 2);
  const topOutcomes = [...market.outcomes]
    .sort((a, b) => b.price - a.price)
    .slice(0, displayCount);
  const remainingCount = market.outcomes.length - displayCount;
  const formattedVolume = formatVolume(market.volume);
  
  return (
    <div className="flex flex-col gap-1.5 mt-auto">
      <div className="flex flex-col gap-1">
        {topOutcomes.map((outcome, idx) => {
          const pct = Math.round(outcome.price * 100);
          const isTop = idx === 0;
          
          return (
            <div key={outcome.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className={`text-[10px] font-mono w-3 shrink-0 ${isTop ? 'text-[#737373]' : 'text-[#525252]'}`}>
                  {idx + 1}
                </span>
                <span className={`text-[13px] truncate ${isTop ? 'text-white font-medium' : 'text-[#737373]'}`}>
                  {outcome.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-10 h-0.5 bg-[#0F0F0F] overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500"
                    style={{ 
                      width: `${Math.max(pct, 3)}%`,
                      backgroundColor: isTop ? brandColor : '#525252'
                    }}
                  />
                </div>
                <span className={`text-xs font-mono w-7 text-right ${isTop ? 'text-white' : 'text-[#525252]'}`}>
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-[#525252] font-medium">Vol</span>
          {remainingCount > 0 && (
            <span className="text-[10px] text-[#2A2A2A]">+{remainingCount}</span>
          )}
        </div>
        <span className="text-xs font-mono text-[#525252]">{formattedVolume}</span>
      </div>
    </div>
  );
}

export default function MarketCard({ market, onClick }: MarketCardProps) {
  const isPoly = market.platform === 'polymarket';
  const brandColor = isPoly ? PLATFORM_COLORS.polymarket : PLATFORM_COLORS.kalshi;
  const platformName = isPoly ? 'Polymarket' : 'Kalshi';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(market);
    }
  };

  const renderContent = () => {
    switch (market.marketType) {
      case 'matchup':
        return <MatchupContent market={market} brandColor={brandColor} />;
      case 'multi-option':
        return <MultiOptionContent market={market} brandColor={brandColor} />;
      case 'binary':
      default:
        return <BinaryContent market={market} brandColor={brandColor} />;
    }
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`${market.title} on ${platformName}`}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={() => onClick?.(market)}
      onKeyDown={handleKeyDown}
      className="group relative flex flex-col h-[140px] p-4 cursor-pointer overflow-hidden transition-all duration-200 focus:outline-none bg-surface hover:bg-[#1F1F1F] hover:z-10 focus-visible:z-10 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#FA5D19]"
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-200 scale-y-0 group-hover:scale-y-100"
        style={{ backgroundColor: '#FA5D19' }}
      />
      
      <div className="flex flex-col h-full justify-between z-10">
        
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            {market.category && market.category !== 'Uncategorized' ? (
              <span className="text-[10px] uppercase tracking-wider text-[#525252] font-medium truncate">
                {market.category}
              </span>
            ) : (
              <span />
            )}
            <div 
              className="shrink-0 flex items-center justify-center w-4 h-4 rounded"
              style={{ color: brandColor }}
              aria-label={platformName}
              role="img"
            >
              {isPoly ? (
                <PolymarketLogo className="w-3 h-3" aria-hidden="true" />
              ) : (
                <KalshiLogo className="w-3 h-3" aria-hidden="true" />
              )}
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            {market.imageUrl && (
              <div className="shrink-0 w-7 h-7 rounded overflow-hidden bg-[#0F0F0F]">
                <img 
                  src={market.imageUrl} 
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.style.display = 'none';
                  }}
                />
              </div>
            )}
            <h3 className="text-[13px] font-medium text-[#A3A3A3] leading-snug line-clamp-2 group-hover:text-white transition-colors duration-200">
              {market.title}
            </h3>
          </div>
        </div>

        {renderContent()}
      </div>
    </motion.div>
  );
}
