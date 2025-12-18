'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, ArrowRight, Search, Zap, Globe, FileText, Plus, ChevronDown, Paperclip, ScanEye } from 'lucide-react';
import { AgentState } from '../types';

interface InputInterfaceProps {
  state: AgentState;
  onQuery: (query: string) => void;
}

export default function InputInterface({ state, onQuery }: InputInterfaceProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onQuery(query);
    }
  };

  const handlePillClick = (text: string) => {
    setQuery(text);
  };

  return (
    <div className="w-full max-w-3xl mx-auto z-10 flex flex-col gap-6">
      {/* Greeting - Only visible in Relaxed state */}
      <AnimatePresence>
        {state === 'relaxed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-2 mb-4"
          >
            <h1 className="text-xl md:text-2xl text-white/80 font-medium tracking-normal">
              I am Maxwell's AI.
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Central Command Input */}
      <motion.form
        onSubmit={handleSubmit}
        className="relative group w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div 
          className={`
            relative flex flex-col w-full rounded-[24px]
            bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-2xl
            border border-white/5 ring-1 ring-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]
            transition-all duration-300 ease-out
            overflow-hidden
            ${isFocused 
              ? 'ring-white/10 shadow-[0_0_50px_-10px_rgba(139,92,246,0.1),_inset_0_1px_0_0_rgba(255,255,255,0.1)]' 
              : 'hover:ring-white/10 hover:shadow-lg'
            }
          `}
        >
          {/* Top Section: Text Area */}
          <div className="p-4 pb-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask anything..."
              className="w-full bg-transparent text-lg text-white placeholder-white/40 focus:outline-none font-light py-2"
            />
          </div>

          {/* Bottom Section: Controls */}
          <div className="px-4 pb-4 flex items-center justify-between">
            
            {/* Left: Tools & Attachments */}
            <div className="flex items-center gap-2">
              <button 
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-xs font-medium text-white/70"
              >
                <Plus size={14} />
                <span>Focus</span>
              </button>
              
              <button 
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-xs font-medium text-white/70"
              >
                <Paperclip size={14} />
                <span>Attach</span>
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Model Selector (Placeholder for future entropy feature) */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-white/50 cursor-pointer hover:bg-white/10 transition-colors">
                <span>Pro</span>
                <ChevronDown size={12} />
              </div>

              <div className="h-4 w-[1px] bg-white/10 mx-1 hidden md:block" />

              <button 
                type="button" 
                className="text-white/40 hover:text-white transition-colors p-2"
              >
                <Mic size={18} />
              </button>
              
              <button 
                type="submit" 
                disabled={!query}
                className={`
                  p-2 rounded-full transition-all duration-300
                  ${query 
                    ? 'bg-white text-black hover:scale-105' 
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }
                `}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </motion.form>

      {/* Quick Actions - Pills */}
      <AnimatePresence>
        {state === 'relaxed' && !query && (
          <motion.div 
            className="flex flex-wrap justify-center gap-3 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2 }}
          >
            {[
              { icon: Search, label: 'Deep Research' },
              { icon: Zap, label: 'Brainstorm' },
              { icon: Globe, label: 'Market Analysis' },
              { icon: FileText, label: 'Summarize' },
            ].map((item, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePillClick(item.label)}
                className="
                  flex items-center gap-2 px-4 py-2
                  rounded-full bg-transparent border border-white/5 backdrop-blur-sm
                  text-white/40 hover:text-white hover:bg-white/5 hover:border-white/10 transition-all duration-300
                "
              >
                <item.icon size={14} className="opacity-70" />
                <span className="text-xs font-medium">{item.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
