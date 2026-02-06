'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { UnifiedMarket } from '../../lib/markets/types';
import type { MaxwellIntelligence } from '../../lib/maxwell/types';
import type { MarketChatMessage, ScoredSource, ThinkingStep } from '../../lib/market-chat/types';
import { AsciiDecoration } from './primitives/AsciiDecoration';
import { CornerGridDecoration } from './primitives/CornerGridDecoration';
import { useMarketChat } from '../../hooks/use-market-chat';
import { Search, Calculator, Globe, Zap, ExternalLink, Trash2, ArrowUp } from 'lucide-react';

interface MarketChatProps {
  marketId: string;
  market: UnifiedMarket;
  maxwellReport?: MaxwellIntelligence | null;
}

const TOOL_META: Record<string, { icon: typeof Search; label: string }> = {
  search_news: { icon: Search, label: 'SEARCH' },
  calculate: { icon: Calculator, label: 'CALCULATE' },
  get_market_data: { icon: Globe, label: 'MARKET DATA' },
  deep_extract: { icon: Zap, label: 'DEEP EXTRACT' },
};

const STATUS_META: Record<string, string> = {
  thinking: 'Thinking',
  searching: 'Searching',
  calculating: 'Calculating',
  synthesizing: 'Synthesizing',
  planning: 'Planning',
  researching: 'Researching',
  validating: 'Validating',
};


function ThinkingTrace({ 
  currentStatus, 
}: { 
  steps: ThinkingStep[]; 
  currentStatus: string;
  phaseInfo: { current: number; total: number };
}) {
  const label = STATUS_META[currentStatus] || STATUS_META.thinking;

  return (
    <div className="flex items-center gap-2.5 px-1 py-1">
      <div className="size-1.5 rounded-full bg-[#FA5D19] animate-pulse" />
      <span className="text-[12px] text-white/40">
        {label}...
      </span>
    </div>
  );
}

function SourceCard({ source, index }: { source: ScoredSource; index: number }) {
  let hostname = '';
  try {
    hostname = new URL(source.url).hostname.replace(/^www\./, '');
  } catch {
    hostname = source.url;
  }

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] transition-colors cursor-pointer min-w-0"
    >
      <span className="text-[10px] font-mono text-white/20 tabular-nums shrink-0 select-none">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[12px] text-white/60 line-clamp-1 group-hover:text-white/80 transition-colors">
          {source.title || hostname}
        </span>
        <span className="text-[10px] text-white/30 block truncate">
          {hostname}
        </span>
      </div>
      <ExternalLink className="size-3 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </a>
  );
}

function SourcesBlock({ sources }: { sources: ScoredSource[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? sources : sources.slice(0, 4);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-mono text-white/30 select-none">
          {sources.length} source{sources.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {visible.map((s, i) => (
          <SourceCard key={s.id ?? i} source={s} index={i} />
        ))}
      </div>
      {!expanded && sources.length > 4 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors mt-2 cursor-pointer"
        >
          +{sources.length - 4} more
        </button>
      )}
    </div>
  );
}

function MessageMeta({ message }: { message: MarketChatMessage }) {
  if (!message.tier && !message.latencyMs) return null;

  const latency = message.latencyMs ? `${(message.latencyMs / 1000).toFixed(1)}s` : null;
  const tools = message.toolsUsed?.length ? message.toolsUsed : null;

  return (
    <div className="flex items-center gap-1.5 mt-2">
      {latency && (
        <span className="text-[10px] font-mono text-white/20 tabular-nums">{latency}</span>
      )}
      {tools && tools.map(t => {
        const info = TOOL_META[t];
        if (!info) return null;
        return (
          <span key={t} className="flex items-center gap-1 text-[10px] font-mono text-white/20">
            <span className="text-white/10">·</span>
            <span>{info.label.toLowerCase()}</span>
          </span>
        );
      })}
    </div>
  );
}

function AgentMessage({ message }: { message: MarketChatMessage }) {
  const transformCitations = (content: string): string => {
    if (!message.sources || message.sources.length === 0) return content;

    // Match bracket groups containing comma-separated numbers: [1], [1, 5], [1, 2, 3]
    return content.replace(/\[([\d]+(?:\s*,\s*\d+)*)\]/g, (match, inner: string) => {
      const nums = inner.split(',').map(s => s.trim());
      const links = nums.map(numStr => {
        const index = parseInt(numStr, 10) - 1;
        const source = message.sources?.[index];
        if (source) {
          return `[${numStr}](${source.url})`;
        }
        return numStr;
      });
      return links.join(' ');
    });
  };

  const processedContent = transformCitations(message.content);

  return (
    <div className="space-y-0">
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className="text-[14px] text-white/70 leading-relaxed mb-2 last:mb-0 font-sans">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-white/90">{children}</strong>
            ),
            h1: ({ children }) => (
              <h1 className="text-[16px] font-semibold text-white uppercase tracking-tight mt-4 mb-2">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-[14px] font-semibold text-white/90 mt-3 mb-1">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-[12px] font-medium text-white/70 uppercase tracking-wide mt-2 mb-1">{children}</h3>
            ),
            ul: ({ children }) => (
              <ul className="list-none space-y-1 mb-2 ml-0">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside space-y-1 mb-2 ml-0 text-[14px] text-white/70">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-[14px] text-white/70 leading-relaxed pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-white/30">{children}</li>
            ),
            code: ({ className, children }) => {
              const isInline = !className;
              return isInline ? (
                <code className="bg-white/5 border border-white/10 px-1 py-0.5 text-[12px] font-mono text-[#FA5D19]">
                  {children}
                </code>
              ) : (
                <pre className="bg-[#111111] border border-[#2A2A2A] p-3 overflow-x-auto text-[12px] font-mono my-2">
                  <code>{children}</code>
                </pre>
              );
            },
            a: ({ href, children }) => {
              const childText = typeof children === 'string' ? children : 
                Array.isArray(children) ? children.map(c => typeof c === 'string' ? c : '').join('') : '';
              const isCitation = /^\d+$/.test(childText.trim());
              
              if (isCitation) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={href}
                    className="inline-flex items-center justify-center size-[18px] text-[10px] font-mono font-medium text-[#FA5D19] bg-[#FA5D19]/10 rounded-sm no-underline hover:bg-[#FA5D19]/20 transition-colors align-super -mt-1 mx-[1px] cursor-pointer"
                  >
                    {childText.trim()}
                  </a>
                );
              }

              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FA5D19] hover:text-[#FA5D19]/80 underline underline-offset-2 decoration-[#FA5D19]/30 transition-colors"
                >
                  {children}
                </a>
              );
            },
            table: ({ children }) => (
              <div className="overflow-x-auto my-2 border border-[#2A2A2A]">
                <table className="min-w-full text-[12px] font-mono">{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="border-b border-[#2A2A2A]">{children}</thead>
            ),
            tbody: ({ children }) => (
              <tbody className="divide-y divide-[#2A2A2A]">{children}</tbody>
            ),
            th: ({ children }) => (
              <th className="px-3 py-1.5 text-left text-[10px] font-medium text-white/40 uppercase tracking-wider">{children}</th>
            ),
            td: ({ children }) => (
              <td className="px-3 py-1.5 text-white/60">{children}</td>
            ),
            hr: () => <hr className="my-3 border-[#2A2A2A]" />,
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>

      {message.sources && message.sources.length > 0 && (
        <SourcesBlock sources={message.sources} />
      )}

      <MessageMeta message={message} />
    </div>
  );
}

function UserMessage({ message }: { message: MarketChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-[#1A1A1A] border border-[#2A2A2A] rounded-sm px-4 py-3">
        <p className="text-[14px] text-white/90 font-sans leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

function EmptyState({ onSend }: { onSend: (content: string) => void }) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const text = 'Ask about this market...';
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) {
        setTyped(text.substring(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full relative">
      <AsciiDecoration />
      <div className="text-center space-y-3 relative z-10">
        <div className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-white/20 select-none">
          Market Intelligence
        </div>
        <p className="text-white/30 text-[12px] font-mono min-h-[1.5em]">
          {typed}<span className="inline-block w-1.5 h-3 bg-white/20 ml-0.5 animate-pulse" />
        </p>
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap px-4">
          {['Is this a good bet?', 'Recent news?', 'Calculate EV'].map((hint) => (
            <button
              key={hint}
              onClick={() => onSend(hint)}
              className="text-[10px] font-mono text-white/20 px-2 py-1 border border-[#2A2A2A] rounded-sm hover:border-[#FA5D19]/50 hover:text-[#FA5D19] transition-colors cursor-pointer"
            >
              {hint}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatInput({
  onSend,
  isLoading,
}: {
  onSend: (content: string) => void;
  isLoading: boolean;
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, isLoading, onSend]);

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-sm flex items-end px-3 py-2 gap-2 transition-all focus-within:border-[#3A3A3A]">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={isLoading ? 'Processing...' : 'Ask anything...'}
        disabled={isLoading}
        rows={1}
        className="flex-1 bg-transparent text-[14px] text-white placeholder-white/30 focus:outline-none py-0.5 resize-none max-h-[120px] overflow-y-auto leading-5 disabled:opacity-50"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || isLoading}
        aria-label="Send message"
        className={`size-7 rounded-sm flex items-center justify-center shrink-0 transition-all ${
          value.trim() && !isLoading
            ? 'bg-[#FA5D19] text-black hover:opacity-90'
            : 'bg-[#2A2A2A] text-white/30 cursor-not-allowed'
        }`}
      >
        <ArrowUp className="size-4" />
      </button>
    </div>
  );
}

export function MarketChat({ marketId, market, maxwellReport }: MarketChatProps) {
  const {
    messages,
    status,
    currentTool,
    thinkingSteps,
    phaseInfo,
    sendMessage,
    isLoading,
    clearChat,
  } = useMarketChat(marketId, market, maxwellReport);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinkingSteps, isLoading]);

  return (
    <div className="flex flex-col h-full bg-[#111111] relative overflow-hidden">
      <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />

      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar relative">
        {messages.length === 0 && !isLoading ? (
          <EmptyState onSend={sendMessage} />
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((msg) => {
              if (msg.role === 'user') {
                return <UserMessage key={msg.id} message={msg} />;
              }

              if (!msg.content && msg.id === messages[messages.length - 1]?.id && isLoading) {
                return null;
              }

              return <AgentMessage key={msg.id} message={msg} />;
            })}

            {isLoading && status !== 'idle' && (
              <div className="space-y-3">
                <ThinkingTrace steps={thinkingSteps} currentStatus={status} phaseInfo={phaseInfo} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-3 pb-3 pt-2 bg-[#111111]">
        {messages.length > 0 && (
          <div className="flex justify-end mb-1.5">
            <button
              onClick={clearChat}
              aria-label="Clear chat"
              className="flex items-center gap-1 text-[10px] font-mono text-white/20 hover:text-[#f87171] transition-colors px-1"
            >
              <Trash2 className="size-2.5" />
              <span>Clear</span>
            </button>
          </div>
        )}
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>

      <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
    </div>
  );
}
