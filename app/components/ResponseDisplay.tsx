'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { Message, Source, AgentState, DebugStep } from '../types';
import { AdjudicationPanel } from './maxwell/AdjudicationPanel'; // Added AdjudicationPanel import

// ... (rest of imports)

// ... (inside ResponseDisplay component)

interface ResponseDisplayProps {
  message: Message | null;
  isHistory?: boolean;
  status?: AgentState;
}

const DebugStepItem = ({ step, index }: { step: DebugStep, index: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
    className="flex items-center gap-2 text-[10px] font-mono text-white/40 mb-1"
  >
    <span className="w-1 h-1 rounded-full bg-white/20" />
    <span className="truncate">{step.content}</span>
  </motion.div>
);

/**
 * Parse citation references [1], [2] and convert to clickable links
 */
function processCitations(content: string, sources: Source[]): string {
  return content.replace(/\[(\d+)\]/g, (match, num) => {
    const index = parseInt(num, 10) - 1;
    const source = sources[index];
    if (source?.url) {
      // Convert to markdown link with superscript
      return `[^${num}^](${source.url})`;
    }
    return `^${num}^`;
  });
}

/**
 * Get favicon URL for a domain
 */
function getFavicon(url: string): string | null {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
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

const CitationBadge = ({ href, number, source }: { href?: string, number: string, source?: Source }) => {
  const [isHovered, setIsHovered] = useState(false);
  const hostname = source?.url ? new URL(source.url).hostname : '';
  const favicon = source?.url ? getFavicon(source.url) : null;

  return (
    <span
      className="relative inline-block ml-0.5 -mt-1 select-none z-20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ verticalAlign: 'super' }}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`
            inline-flex items-center justify-center min-w-[14px] h-[14px] 
            rounded-full border text-[9px] font-mono no-underline transition-all duration-200
            ${isHovered
            ? 'bg-brand-accent text-white border-brand-accent scale-110 shadow-[0_0_10px_rgba(111,59,245,0.4)]'
            : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10 hover:text-white/70'
          }
        `}
      >
        {number}
      </a>

      <AnimatePresence>
        {isHovered && source && (
          <motion.a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 z-50 no-underline"
          >
            <span className="
                relative flex flex-col gap-2 p-3 
                bg-[#18151d] border border-white/10 rounded-xl 
                shadow-2xl shadow-black/50 backdrop-blur-xl
                overflow-hidden block
            ">
              {/* Spotlight/Glow Effect */}
              <span className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-50 pointer-events-none block" />

              {/* Header: Icon + Domain */}
              <span className="flex items-center gap-2 relative z-10">
                <span className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center border border-white/5 overflow-hidden block">
                  {favicon && (
                    <img
                      src={favicon}
                      alt=""
                      className="w-3 h-3 opacity-70 block"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                </span>
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-tight truncate block">
                  {hostname}
                </span>
              </span>

              {/* Title */}
              <span className="text-xs text-white/90 font-medium leading-snug line-clamp-2 relative z-10 font-sans block mb-2">
                {source.title}
              </span>

              {/* Raw Evidence Snippet */}
              {source.content && (
                <span className="relative pl-2 border-l border-white/10 block mt-2">
                  <span className="text-[10px] text-white/50 leading-relaxed italic font-serif line-clamp-4 block">
                    "{source.content}"
                  </span>
                </span>
              )}
            </span>

            {/* Arrow */}
            <span className="absolute left-1/2 -translate-x-1/2 top-full -mt-1.5 border-4 border-transparent border-t-[#18151d] block" />
            <span className="absolute left-1/2 -translate-x-1/2 top-full -mt-[7px] border-4 border-transparent border-t-white/10 -z-10 block" />
          </motion.a>
        )}
      </AnimatePresence>
    </span>
  );
};

export default function ResponseDisplay({ message, isHistory = false, status = 'relaxed' }: ResponseDisplayProps) {
  // If no message and not active, don't render
  if (!message && status === 'relaxed') return null;

  const sources = message?.sources || [];
  const hasRealSources = sources.length > 0;

  // Is the agent actively processing?
  const isActive = status !== 'relaxed' && status !== 'complete';
  const debugSteps = message?.debugSteps || [];

  // State for collapsing sources
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);

  // Process content for citations if we have sources
  const processedContent = hasRealSources && message
    ? processCitations(message.content, sources)
    : message?.content || '';

  return (
    <div className="w-full max-w-3xl mx-auto mt-2 mb-8 relative z-10">

      {/* Answer Header - Brand Aligned */}
      <div className="flex items-center gap-3 mb-4 select-none">
        {isActive ? (
          /* Active: "Ghost Heartbeat" Effect */
          <div className="relative flex items-center justify-center w-4 h-4">
            <motion.div
              className="absolute inset-0 rounded-full bg-brand-accent/30"
              animate={{ scale: [1, 2], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              className="relative w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_12px_rgba(111,59,245,0.8)]"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        ) : (
          /* Static: Silver/White Dot (Subtle) */
          <div className="w-2 h-2 rounded-full bg-white/20 ml-1" />
        )}

        <span className="text-[11px] font-medium text-white/40 uppercase tracking-[0.2em] animate-in fade-in duration-300">
          {isActive ? `${status.toUpperCase()}...` : "Maxwell's Analysis"}
        </span>
      </div>

      {/* Debug Steps (Under the hood logs) */}
      {debugSteps.length > 0 && isActive && (
        <div className="flex flex-col gap-0.5 mb-6 pl-7 border-l border-white/5 ml-1.5 py-1">
          {debugSteps.map((step, idx) => (
            <DebugStepItem key={step.id || idx} step={step} index={idx} />
          ))}
        </div>
      )}

      {/* Main Content - Markdown Rendered */}
      <motion.div
        variants={container}
        initial={isHistory ? "show" : "hidden"}
        animate="show"
        className="prose prose-invert prose-lg leading-relaxed text-white/70 mb-8 min-h-[20px]"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className="mb-3 last:mb-0 leading-relaxed text-[17px]">{children}</p>
            ),
            a: ({ href, children }) => {
              const content = String(children);
              const isCitation = /^\^\d+\^$/.test(content);

              if (isCitation) {
                const number = content.replace(/\^/g, '');
                const source = sources.find(s => s.url === href);
                return (
                  <CitationBadge
                    href={href}
                    number={number}
                    source={source}
                  />
                );
              }

              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/90 font-medium underline decoration-white/20 underline-offset-2 hover:text-white hover:decoration-brand-accent transition-all"
                >
                  {children}
                </a>
              );
            },
            strong: ({ children }) => (
              <strong className="font-semibold text-white">{children}</strong>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-3 space-y-1 ml-2">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-3 space-y-1 ml-2">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed">{children}</li>
            ),
            code: ({ className, children }) => {
              const isInline = !className;
              return isInline ? (
                <code className="bg-zinc-700/50 px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              ) : (
                <pre className="bg-zinc-900 p-3 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>{children}</code>
                </pre>
              );
            },
            sup: ({ children }) => (
              <sup className="text-brand-accent text-xs font-medium">{children}</sup>
            ),
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </motion.div>

      {/* Sources Panel - Show if we have sources AND (agent is done typing OR history OR verifying/adjudicating) */}
      {hasRealSources && (!isActive || isHistory || message?.maxwellState?.phase === 'verification' || message?.maxwellState?.phase === 'adjudication') && (
        <motion.div
          initial={isHistory ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isHistory ? 0 : 0.5 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-medium text-white/20 uppercase tracking-[0.3em]">Sources</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[#18151d] text-[9px] font-mono text-white/30 border border-white/5">
              {String(sources.length).padStart(2, '0')}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(isSourcesExpanded ? sources : sources.slice(0, 4)).map((source, i) => {
              const favicon = getFavicon(source.url);
              let hostname = '';
              try {
                hostname = new URL(source.url).hostname.replace(/^www\./, '');
              } catch {
                hostname = source.url;
              }

              return (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200"
                >
                  {/* Top: Metadata */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3.5 h-3.5 rounded-full bg-white/5 flex items-center justify-center border border-white/5 overflow-hidden group-hover:border-white/10 transition-colors shrink-0">
                        {favicon && (
                          <img
                            src={favicon}
                            alt=""
                            className="w-2.5 h-2.5 opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-white/30 group-hover:text-white/50 transition-colors truncate">
                        {hostname}
                      </span>
                    </div>

                    {/* Index Number */}
                    <span className="text-[10px] font-mono text-white/20 group-hover:text-white/40 transition-colors shrink-0 ml-2">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Bottom: Title */}
                  <span className="text-[13px] leading-snug text-white/70 font-medium line-clamp-2 group-hover:text-white/90 transition-colors">
                    {source.title || 'Untitled Source'}
                  </span>
                </a>
              );
            })}
          </div>

          {/* Show More Button */}
          {!isSourcesExpanded && sources.length > 4 && (
            <button
              onClick={() => setIsSourcesExpanded(true)}
              className="w-full py-2 flex items-center justify-center gap-2 text-[11px] font-medium text-white/30 hover:text-white/60 hover:bg-white/5 rounded-lg transition-all border border-transparent hover:border-white/5"
            >
              <span>Show {sources.length - 4} more sources</span>
              <ArrowRight size={12} className="opacity-50" />
            </button>
          )}
        </motion.div>
      )}

      {/* Thinking Trace - Shows active processing state below sources */}
      {isActive && (message?.maxwellState?.phase === 'verification' || message?.maxwellState?.phase === 'adjudication') && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-4 mb-2 pl-1"
        >
          <div className="relative flex items-center justify-center w-3 h-3">
            <span className="absolute inset-0 rounded-full bg-brand-accent/30 animate-ping" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(111,59,245,0.8)]" />
          </div>
          <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest animate-pulse">
            {message.maxwellState.phase === 'verification' ? 'Verifying Claims...' : 'Finalizing Verdict...'}
          </span>
        </motion.div>
      )}

      {/* View Results Card - Show when verification is done (during adjudication or complete) */}
      {message?.maxwellState && (message.maxwellState.phase === 'complete' || message.maxwellState.phase === 'adjudication') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4"
        >
          <button
            onClick={() => {
              // Dispatch custom event to open canvas with this state
              const event = new CustomEvent('openMaxwellCanvas', {
                detail: message.maxwellState
              });
              window.dispatchEvent(event);
            }}
            className="group w-full relative overflow-hidden rounded-xl border border-white/10 bg-[#18151d] p-4 text-left transition-all hover:border-white/20"
          >
            {/* Subtle Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-white/90">Analysis Complete</h4>
                <p className="text-[11px] text-white/50 mt-0.5">Click to view full verification report</p>
              </div>

              {/* Confidence Score Indicator */}
              {message.maxwellState.verification && (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase tracking-wider font-medium text-white/40">Confidence</span>
                    <span className={`text-xs font-bold ${message.maxwellState.verification.overallConfidence >= 80 ? 'text-emerald-400' :
                      message.maxwellState.verification.overallConfidence >= 50 ? 'text-amber-400' :
                        'text-rose-400'
                      }`}>
                      {message.maxwellState.verification.overallConfidence}%
                    </span>
                  </div>

                  <div className="relative flex items-center justify-center w-10 h-10">
                    {/* Background Ring */}
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-white/10"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      {/* Progress Ring */}
                      <path
                        className={`${message.maxwellState.verification.overallConfidence >= 80 ? 'text-emerald-500' :
                          message.maxwellState.verification.overallConfidence >= 50 ? 'text-amber-500' :
                            'text-rose-500'
                          } drop-shadow-[0_0_4px_currentColor]`}
                        strokeDasharray={`${message.maxwellState.verification.overallConfidence}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Inner Icon/Text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`w-1.5 h-1.5 rounded-full ${message.maxwellState.verification.overallConfidence >= 80 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' :
                        message.maxwellState.verification.overallConfidence >= 50 ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' :
                          'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]'
                        }`} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </button>
        </motion.div>
      )
      }

      {/* Adjudication - Rendered as regular text (Phase 5) */}
      {(message?.maxwellState?.adjudication || message?.maxwellState?.phase === 'adjudication') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 pt-6 prose prose-invert prose-lg leading-relaxed text-white/70"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <p className="mb-3 last:mb-0 leading-relaxed text-[17px]">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-white">{children}</strong>
              ),
            }}
          >
            {message.maxwellState.adjudication || ''}
          </ReactMarkdown>
        </motion.div>
      )}
    </div >
  );
}
