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
      className="w-full max-w-3xl mx-auto flex justify-end"
    >
      <div className="bg-[#1A1A1A] border border-white/10 px-5 py-2.5 rounded-2xl rounded-tr-sm text-white/90 text-base font-light leading-relaxed max-w-[80%] shadow-sm">
        {content}
      </div>
    </motion.div>
  );
}
