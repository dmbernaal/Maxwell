'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface UserMessageProps {
  content: string;
}

export default function UserMessage({ content }: UserMessageProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto flex justify-end mb-4"
    >
      <div className="bg-white/[0.03] border border-white/5 px-5 py-2.5 rounded-2xl rounded-tr-sm text-white/80 text-[15px] font-light leading-relaxed max-w-[85%] shadow-2xl backdrop-blur-sm">
        {content}
      </div>
    </motion.div>
  );
}
