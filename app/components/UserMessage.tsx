'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface UserMessageProps {
  content: string;
  isHistory?: boolean;
}

export default function UserMessage({ content, isHistory = false }: UserMessageProps) {
  return (
    <motion.div
      initial={isHistory ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto flex justify-end mb-4"
    >
      <div className="bg-[#18151d] border border-white/5 px-5 py-2.5 rounded-2xl rounded-tr-sm text-white/80 text-[15px] font-light leading-relaxed max-w-[85%] shadow-2xl backdrop-blur-sm">
        {content}
      </div>
    </motion.div>
  );
}
