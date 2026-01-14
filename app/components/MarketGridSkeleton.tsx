'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function MarketGridSkeleton() {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="h-[180px] p-5 rounded-xl bg-[#0a0a0a] border border-white/5 flex flex-col gap-4"
        >
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
            <div className="w-16 h-8 rounded-lg bg-white/5 animate-pulse" />
          </div>
          
          <div className="flex flex-col gap-2 mt-auto">
            <div className="w-full h-4 rounded-md bg-white/5 animate-pulse" />
            <div className="w-2/3 h-4 rounded-md bg-white/5 animate-pulse" />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-white/[0.03]">
            <div className="w-12 h-3 rounded-md bg-white/5 animate-pulse" />
            <div className="w-4 h-4 rounded-full bg-white/5 animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
