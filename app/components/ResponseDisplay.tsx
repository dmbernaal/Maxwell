'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, ExternalLink, ChevronDown } from 'lucide-react';
import { Message } from '../types';

interface ResponseDisplayProps {
  message: Message | null;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.01,
      delayChildren: 0.2
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

export default function ResponseDisplay({ message }: ResponseDisplayProps) {
  if (!message) return null;

  // Split content into words for staggered animation
  const words = message.content.split(' ');

  return (
    <div className="w-full max-w-3xl mx-auto mt-2 mb-8 relative z-10">
      
      {/* Answer Header - Brand Aligned */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 rounded-full bg-[#6f3bf5]/10 flex items-center justify-center border border-[#6f3bf5]/20">
          <Sparkles size={10} className="text-[#6f3bf5]" />
        </div>
        <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Maxwell's Analysis</span>
      </div>

      {/* Main Content */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="prose prose-invert prose-lg leading-relaxed text-white/90"
      >
        <p className="inline leading-relaxed text-[17px]">
          {words.map((word, i) => (
            <React.Fragment key={i}>
              <motion.span variants={item} className="inline-block mr-1">
                {word}
              </motion.span>
              {/* Mock Inline Verification for demo purposes */}
              {i === 15 && (
                <motion.span 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 }}
                  className="inline-flex items-center justify-center w-3.5 h-3.5 align-middle bg-teal-500/10 border border-teal-500/20 rounded-full ml-0.5 mr-1 cursor-help"
                  title="Verified Source"
                >
                  <Check size={8} className="text-teal-500" />
                </motion.span>
              )}
            </React.Fragment>
          ))}
        </p>
      </motion.div>

      {/* Sources Footnote */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="mt-8 pt-4 border-t border-white/5"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-medium text-white/30 uppercase tracking-widest">Sources</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/5 text-[9px] text-white/40">3</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { title: "Maxwell's Equations - Britannica", site: "britannica.com" },
            { title: "Electromagnetism Physics", site: "hyperphysics.phy" },
            { title: "IEEE Spectrum: History", site: "spectrum.ieee.org" }
          ].map((source, i) => (
            <a 
              key={i}
              href="#"
              className="group flex flex-col p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[#6f3bf5]/20 transition-all"
            >
              <span className="text-xs text-white/70 font-medium line-clamp-1 group-hover:text-white mb-1.5">
                {source.title}
              </span>
              <div className="flex items-center gap-1.5">
                <img 
                  src={`https://www.google.com/s2/favicons?domain=${source.site}&sz=16`} 
                  alt="" 
                  className="w-3 h-3 opacity-40 grayscale group-hover:grayscale-0 transition-all"
                />
                <span className="text-[10px] text-white/30 group-hover:text-[#6f3bf5] transition-colors">{source.site}</span>
              </div>
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
