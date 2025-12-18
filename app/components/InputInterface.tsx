'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from 'framer-motion';
import { Mic, ArrowRight, Search, Zap, Globe, FileText, Plus, ChevronDown, Paperclip, ScanEye } from 'lucide-react';
import { AgentState } from '../types';

interface InputInterfaceProps {
  state: AgentState;
  onQuery: (query: string) => void;
}

export default function InputInterface({ state, onQuery }: InputInterfaceProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  // Spotlight effect logic
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

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

      {/* Central Command Input - Kaiyros Spotlight Aesthetic */}
      <motion.form
        onSubmit={handleSubmit}
        onMouseMove={handleMouseMove}
        className="relative group w-full p-[1px] rounded-[24px] overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Spotlight Glow - Border Layer */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                450px circle at ${mouseX}px ${mouseY}px,
                rgba(111, 59, 245, 0.15),
                transparent 80%
              )
            `,
          }}
        />

        {/* Inner Container: Obsidian Surface */}
        <div 
          className={`
            relative flex flex-col w-full rounded-[23px]
            bg-[#141414]/90 backdrop-blur-xl
            border border-white/10
            transition-all duration-300 ease-out
            overflow-hidden
            ${isFocused 
              ? 'border-brand-accent/30 shadow-[0_0_50px_-10px_rgba(111,59,245,0.1)]' 
              : 'shadow-2xl'
            }
          `}
        >
          {/* Subtle top highlight gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

          {/* Top Section: Text Area */}
          <div className="p-4 pb-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask anything..."
              className="w-full bg-transparent text-lg text-white placeholder-white/30 focus:outline-none font-light py-2"
            />
          </div>

          {/* Bottom Section: Controls */}
          <div className="px-4 pb-4 flex items-center justify-between">
            
            {/* Left: Tools & Attachments */}
            <div className="flex items-center gap-2">
              <button 
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs font-medium text-white/60"
              >
                <Plus size={14} />
                <span>Focus</span>
              </button>
              
              <button 
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs font-medium text-white/60"
              >
                <Paperclip size={14} />
                <span>Attach</span>
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[11px] font-mono uppercase tracking-wider text-white/40 cursor-pointer hover:bg-white/10 transition-colors">
                <span>Pro</span>
                <ChevronDown size={12} />
              </div>

              <div className="h-4 w-[1px] bg-white/10 mx-1 hidden md:block" />

              <button 
                type="button" 
                className="text-white/30 hover:text-white transition-colors p-2"
              >
                <Mic size={18} />
              </button>
              
              <button 
                type="submit" 
                disabled={!query}
                className={`
                  p-2 rounded-full transition-all duration-500
                  ${query 
                    ? 'bg-brand-accent text-white shadow-[0_0_20px_-5px_rgba(111,59,245,0.5)] hover:scale-105' 
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
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
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePillClick(item.label)}
                className="
                  flex items-center gap-2 px-4 py-2
                  rounded-full bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm
                  text-white/40 hover:text-brand-accent transition-all duration-300
                "
              >
                <item.icon size={14} className="opacity-70" />
                <span className="text-[11px] font-medium uppercase tracking-wider">{item.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
