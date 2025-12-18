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
        <div className="w-5 h-5 rounded-full bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20">
          <Sparkles size={10} className="text-brand-accent" />
        </div>
        <span className="text-[11px] font-medium text-white/40 uppercase tracking-[0.2em]">Maxwell's Analysis</span>
      </div>

      {/* Main Content */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="prose prose-invert prose-lg leading-relaxed text-white/90 mb-12"
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
                  className="inline-flex items-center justify-center w-3.5 h-3.5 align-middle bg-teal-500/10 border border-teal-500/20 rounded-full ml-0.5 mr-1 cursor-help group/verify"
                  title="Verified Source"
                >
                  <Check size={8} className="text-teal-500 group-hover/verify:text-teal-400" />
                </motion.span>
              )}
            </React.Fragment>
          ))}
        </p>
      </motion.div>

      {/* Sources - Kaiyros Data Cards Style */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/5" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-white/20 uppercase tracking-[0.3em]">Verified Sources</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/5 text-[9px] font-mono text-white/30 border border-white/5">03</span>
          </div>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: "Maxwell's Equations - Britannica", site: "britannica.com" },
            { title: "Electromagnetism Physics", site: "hyperphysics.phy" },
            { title: "IEEE Spectrum: History", site: "spectrum.ieee.org" }
          ].map((source, i) => (
            <a 
              key={i}
              href="#"
              className="group relative flex flex-col p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-brand-accent/30 transition-all duration-300"
            >
              <span className="text-xs text-white/60 font-medium line-clamp-1 group-hover:text-white mb-2 transition-colors">
                {source.title}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-md bg-white/5 flex items-center justify-center border border-white/5 overflow-hidden">
                  <img 
                    src={`https://www.google.com/s2/favicons?domain=${source.site}&sz=16`} 
                    alt="" 
                    className="w-2.5 h-2.5 opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                  />
                </div>
                <span className="text-[10px] font-mono text-white/20 group-hover:text-brand-accent/70 transition-colors uppercase tracking-tight">{source.site}</span>
              </div>
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
