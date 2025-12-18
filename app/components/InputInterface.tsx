'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from 'framer-motion';
import { Mic, ArrowRight, Search, Zap, Globe, FileText, Plus, ChevronDown, Paperclip, ScanEye } from 'lucide-react';
import { AgentState } from '../types';

interface InputInterfaceProps {
  state: AgentState;
  onQuery: (query: string) => void;
}

function SpotlightPill({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      className="relative group rounded-full p-[1px] bg-white/5 overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              60px circle at ${mouseX}px ${mouseY}px,
              rgba(255, 255, 255, 0.05),
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18151d] backdrop-blur-md border border-transparent">
        <Icon size={12} className="opacity-70 group-hover:opacity-100 transition-opacity text-white" />
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">{label}</span>
      </div>
    </motion.button>
  );
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
      setQuery('');
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
      <div className="relative w-full">
        <motion.form
          onSubmit={handleSubmit}
          onMouseMove={handleMouseMove}
          className="relative group w-full p-[2px] rounded-[24px] bg-white/5 overflow-hidden"
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
                  300px circle at ${mouseX}px ${mouseY}px,
                  rgba(255, 255, 255, 0.03),
                  transparent 80%
                )
              `,
            }}
          />

          {/* Inner Container: Obsidian Surface */}
          <div
            className={`
              relative flex flex-col w-full rounded-[23px]
              bg-[#18151d] backdrop-blur-xl
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18151d] hover:bg-[#231f29] border border-white/5 transition-all text-xs font-medium text-white/60"
                >
                  <Plus size={14} />
                  <span>Focus</span>
                </button>

                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18151d] hover:bg-[#231f29] border border-white/5 transition-all text-xs font-medium text-white/60"
                >
                  <Paperclip size={14} />
                  <span>Attach</span>
                </button>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18151d] border border-white/5 text-[11px] font-mono uppercase tracking-wider text-white/40 cursor-pointer hover:bg-[#231f29] transition-colors">
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
                      ? 'bg-white text-black shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:scale-105'
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

        {/* Quick Actions - Pills (Absolute positioned to prevent layout shift) */}
        <div className="absolute top-full left-0 w-full pt-6">
          <AnimatePresence>
            {state === 'relaxed' && !query && (
              <motion.div
                className="flex flex-nowrap justify-center gap-2 px-4 overflow-x-auto no-scrollbar w-full"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {[
                  { icon: Search, label: 'Deep Research' },
                  { icon: Zap, label: 'Brainstorm' },
                  { icon: Globe, label: 'Market Analysis' },
                  { icon: FileText, label: 'Summarize' },
                ].map((item, idx) => (
                  <SpotlightPill
                    key={idx}
                    icon={item.icon}
                    label={item.label}
                    onClick={() => handlePillClick(item.label)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

