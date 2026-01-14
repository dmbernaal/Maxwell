'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { UnifiedMarket } from '@/app/lib/markets/types';
import MarketCard from './MarketCard';

interface MarketGridProps {
  markets: UnifiedMarket[];
  onSelectMarket?: (market: UnifiedMarket) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24
    }
  }
};

export default function MarketGrid({ markets, onSelectMarket }: MarketGridProps) {
  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {markets.map((market) => (
        <motion.div key={market.id} variants={item}>
          <MarketCard
            market={market}
            onClick={onSelectMarket}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
