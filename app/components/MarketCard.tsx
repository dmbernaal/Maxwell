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
    <div className="flex flex-col gap-3 mt-auto">
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-0.5">Chance</span>
          <span className="flex items-baseline gap-1 font-mono font-medium tracking-tighter text-white">
            <span className="text-3xl">{odds}</span>
            <span className="text-sm text-white/40">%</span>
          </span>
        </div>

        <div className="flex flex-col items-end">
          <abbr title="Volume" className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-0.5 no-underline">Vol</abbr>
          <span className="text-sm font-mono tracking-tight text-white/60">{formattedVolume}</span>
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
  );
}

function MatchupContent({ market, brandColor }: { market: UnifiedMarket; brandColor: string }) {
  const outcomes = market.outcomes.slice(0, 2);
  const formattedVolume = formatVolume(market.volume);
  
  return (
    <div className="flex flex-col gap-3 mt-auto">
      <div className="flex flex-col gap-2">
        {outcomes.map((outcome) => {
          const pct = Math.round(outcome.price * 100);
          const isLeading = outcome.price === Math.max(...outcomes.map(o => o.price));
          
          return (
            <div key={outcome.name} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div 
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: isLeading ? brandColor : 'rgba(255,255,255,0.2)' }}
                />
                <span className={`text-sm truncate ${isLeading ? 'text-white font-medium' : 'text-white/60'}`}>
                  {outcome.name}
                </span>
              </div>
              <span className={`text-sm font-mono shrink-0 ${isLeading ? 'text-white' : 'text-white/50'}`}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <abbr title="Volume" className="text-[10px] uppercase tracking-wider text-white/30 font-medium no-underline">Vol</abbr>
        <span className="text-xs font-mono text-white/50">{formattedVolume}</span>
      </div>
    </div>
  );
}

function MultiOptionContent({ market, brandColor }: { market: UnifiedMarket; brandColor: string }) {
  const hasMany = market.outcomes.length > 3;
  const displayCount = hasMany ? 2 : Math.min(market.outcomes.length, 3);
  const topOutcomes = [...market.outcomes]
    .sort((a, b) => b.price - a.price)
    .slice(0, displayCount);
  const remainingCount = market.outcomes.length - displayCount;
  const formattedVolume = formatVolume(market.volume);
  
  return (
    <div className="flex flex-col gap-2 mt-auto">
      <div className="flex flex-col gap-1.5">
        {topOutcomes.map((outcome, idx) => {
          const pct = Math.round(outcome.price * 100);
          const isTop = idx === 0;
          
          return (
            <div key={outcome.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`text-[10px] font-mono w-4 shrink-0 ${isTop ? 'text-white/60' : 'text-white/30'}`}>
                  {idx + 1}.
                </span>
                <span className={`text-xs truncate ${isTop ? 'text-white font-medium' : 'text-white/60'}`}>
                  {outcome.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-700"
                    style={{ 
                      width: `${Math.max(pct, 4)}%`,
                      backgroundColor: isTop ? brandColor : 'rgba(255,255,255,0.3)',
                      opacity: isTop ? 0.9 : 0.5
                    }}
                  />
                </div>
                <span className={`text-xs font-mono w-8 text-right ${isTop ? 'text-white' : 'text-white/50'}`}>
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <abbr title="Volume" className="text-[10px] uppercase tracking-wider text-white/30 font-medium no-underline">Vol</abbr>
          {remainingCount > 0 && (
            <span className="text-[10px] text-white/20">+{remainingCount}</span>
          )}
        </div>
        <span className="text-xs font-mono text-white/50">{formattedVolume}</span>
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
      className="group relative flex flex-col h-[180px] p-5 rounded-md cursor-pointer overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
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
        
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {market.imageUrl && (
              <div className="shrink-0 w-8 h-8 rounded overflow-hidden bg-white/5">
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
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              {market.category && market.category !== 'Uncategorized' && (
                <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">
                  {market.category}
                </span>
              )}
              <h3 className="text-sm font-medium text-white/90 leading-snug line-clamp-2 group-hover:text-white transition-colors duration-300">
                {market.title}
              </h3>
            </div>
          </div>
          
          <div 
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-[#1a1a1a]"
            style={{ color: brandColor }}
            aria-label={platformName}
            role="img"
          >
            {isPoly ? (
              <PolymarketLogo className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <KalshiLogo className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </div>
        </div>

        {renderContent()}
      </div>
    </motion.div>
  );
}
