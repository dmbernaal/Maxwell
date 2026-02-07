'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function MarketGridSkeleton() {
  return (
    <div className="w-full bg-[#111111] border-t border-l border-[#2A2A2A]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
            className="h-[140px] p-4 bg-[#1A1A1A] border-b border-r border-[#2A2A2A] flex flex-col gap-3"
          >
            <div className="flex justify-between items-start">
              <div className="w-7 h-7 rounded bg-[#0F0F0F] animate-pulse" />
              <div className="w-4 h-4 rounded bg-[#0F0F0F] animate-pulse" />
            </div>
            
            <div className="flex flex-col gap-1.5 mt-auto">
              <div className="w-full h-3.5 rounded bg-[#0F0F0F] animate-pulse" />
              <div className="w-2/3 h-3.5 rounded bg-[#0F0F0F] animate-pulse" />
            </div>

            <div className="flex justify-between items-center">
              <div className="w-10 h-2.5 rounded bg-[#0F0F0F] animate-pulse" />
              <div className="w-3 h-3 rounded bg-[#0F0F0F] animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
