'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check } from 'lucide-react';
import { Message, Source } from '../types';

interface ResponseDisplayProps {
  message: Message | null;
  isHistory?: boolean;
}

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
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
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

export default function ResponseDisplay({ message, isHistory = false }: ResponseDisplayProps) {
  if (!message) return null;

  const sources = message.sources || [];
  const hasRealSources = sources.length > 0;

  // Process content for citations if we have sources
  const processedContent = hasRealSources
    ? processCitations(message.content, sources)
    : message.content;

  return (
    <div className="w-full max-w-3xl mx-auto mt-2 mb-8 relative z-10">

      {/* Answer Header - Brand Aligned */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_10px_rgba(111,59,245,0.5)]" />
        <span className="text-[11px] font-medium text-white/40 uppercase tracking-[0.2em]">Maxwell's Analysis</span>
      </div>

      {/* Main Content - Markdown Rendered */}
      <motion.div
        variants={isHistory ? undefined : container}
        initial={isHistory ? false : "hidden"}
        animate="show"
        className="prose prose-invert prose-lg leading-relaxed text-white/70 mb-8"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className="mb-3 last:mb-0 leading-relaxed text-[17px]">{children}</p>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-accent hover:text-brand-accent/80 hover:underline transition-colors inline-flex items-baseline"
              >
                {children}
              </a>
            ),
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

      {/* Sources Panel - Only show if we have real sources */}
      {hasRealSources && (
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sources.slice(0, 5).map((source, i) => {
              const favicon = getFavicon(source.url);
              let hostname = '';
              try {
                hostname = new URL(source.url).hostname;
              } catch {
                hostname = source.url;
              }

              return (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex flex-col p-3 rounded-xl bg-[#18151d] border border-white/5 hover:bg-[#231f29] hover:border-white/10 transition-all duration-300"
                >
                  {/* Citation badge */}
                  <span className="absolute -top-2 -left-2 w-5 h-5 rounded-md bg-brand-accent/20 text-brand-accent text-[10px] font-medium flex items-center justify-center border border-brand-accent/30">
                    {i + 1}
                  </span>

                  <span className="text-xs text-white/60 font-medium line-clamp-2 group-hover:text-white mb-2 transition-colors">
                    {source.title || 'Untitled'}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-md bg-white/5 flex items-center justify-center border border-white/5 overflow-hidden group-hover:border-white/10 transition-colors">
                      {favicon && (
                        <img
                          src={favicon}
                          alt=""
                          className="w-2.5 h-2.5 opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-white/20 group-hover:text-white/50 transition-colors uppercase tracking-tight truncate">
                      {hostname}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
