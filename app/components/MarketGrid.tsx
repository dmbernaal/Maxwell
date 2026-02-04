'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import type { UnifiedMarket } from '@/app/lib/markets/types';
import MarketCard from './MarketCard';

interface MarketGridProps {
  markets: UnifiedMarket[];
  onSelectMarket?: (market: UnifiedMarket) => void;
}

export default function MarketGrid({ markets, onSelectMarket }: MarketGridProps) {
  const animatedIds = useRef(new Set<string>());

  return (
    <div className="w-full bg-panel">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {markets.map((market, index) => {
          const shouldAnimate = !animatedIds.current.has(market.id);
          if (shouldAnimate) {
            animatedIds.current.add(market.id);
          }
          
          const staggerIndex = shouldAnimate 
            ? [...animatedIds.current].indexOf(market.id) % 20
            : 0;

          const isLastColumn = (index + 1) % 4 === 0;
          
          return (
            <motion.div 
              key={market.id}
              initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 24,
                delay: shouldAnimate ? staggerIndex * 0.03 : 0
              }}
              className={`border-b border-border-base ${isLastColumn ? '' : 'border-r'}`}
            >
              <MarketCard
                market={market}
                onClick={onSelectMarket}
                index={index}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
