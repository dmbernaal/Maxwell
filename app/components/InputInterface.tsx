'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, ArrowRight, Search, Zap, Globe, FileText, Plus, Paperclip, X } from 'lucide-react';
import { AgentState, SearchMode, Attachment, ATTACHMENT_LIMITS } from '../types';
import { convertToBase64, validateAttachment, generateAttachmentId } from '../lib/file-utils';
import ModeDropdown from './ModeDropdown';
import type { UnifiedMarket } from '@/app/lib/markets/types';
import { TRENDING_SEARCHES } from '../lib/market-data';
import MarketAutocomplete from './MarketAutocomplete';

interface InputInterfaceProps {
  state: AgentState;
  hasMessages: boolean;
  onQuery: (query: string, attachments?: Attachment[]) => void;
  mode?: SearchMode;
  onModeChange?: (mode: SearchMode) => void;
  disabled?: boolean;
  hasMaxwellResults?: boolean;
  onViewResults?: () => void;
  onFocusChange?: (isFocused: boolean) => void;
  isMarketSearch?: boolean;
  onMarketSelect?: (market: UnifiedMarket) => void;
}

function SpotlightPill({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative group rounded-sm p-[1px] bg-white/[0.03] overflow-hidden"
    >
      <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#0a0a0a] border border-transparent group-hover:border-white/10 transition-all">
        <Icon size={12} className="opacity-50 group-hover:opacity-100 transition-opacity text-white" />
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50 group-hover:text-white/90 transition-colors">{label}</span>
      </div>
    </motion.button>
  );
}

export default function InputInterface({
  state,
  hasMessages,
  onQuery,
  mode = 'normal',
  onModeChange,
  disabled = false,
  hasMaxwellResults = false,
  onViewResults,
  onFocusChange,
  isMarketSearch = false,
  onMarketSelect
}: InputInterfaceProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const [marketResults, setMarketResults] = useState<UnifiedMarket[]>([]);
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);

  useEffect(() => {
    if (!isMarketSearch) return;

    if (!query) {
      setMarketResults([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/markets?q=${encodeURIComponent(query)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setMarketResults(data.markets || []);
        }
      } catch (e) {
        console.error("Failed to fetch market suggestions", e);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);

  }, [query, isMarketSearch]);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMaxwellMode = mode === 'maxwell';

  React.useEffect(() => {
    if (!query && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isMarketSearch) {
      if (marketResults.length > 0 && onMarketSelect) {
        onMarketSelect(marketResults[0]);
      }
      return;
    }

    if (query.trim()) {
      onQuery(query, attachments.length > 0 ? attachments : undefined);
      setQuery('');
      setAttachments([]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = ATTACHMENT_LIMITS.MAX_FILES - attachments.length;
    const filesToProcess = files.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const error = validateAttachment(file);
      if (error) {
        console.warn('[Attachment]', error);
        continue;
      }

      try {
        const base64 = await convertToBase64(file);
        const attachment: Attachment = {
          id: generateAttachmentId(),
          file,
          previewUrl: URL.createObjectURL(file),
          base64,
          mediaType: file.type as Attachment['mediaType'],
        };
        setAttachments(prev => [...prev, attachment]);
      } catch (err) {
        console.error('[Attachment] Failed to process:', err);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const toRemove = prev.find(a => a.id === id);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.previewUrl);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const handlePillClick = (text: string) => {
    setQuery(text);
  };

  return (
    <div className="w-full max-w-2xl mx-auto z-10 flex flex-col gap-4">
      
      <motion.div
        className="relative w-full"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.form
          onSubmit={handleSubmit}
          className="relative group w-full"
        >
            <div
              className={`
                relative flex flex-col w-full rounded-md
                bg-[#0a0a0a]
                transition-all duration-300 ease-out
                overflow-hidden
                border
                ${isFocused
                  ? 'border-white/20'
                  : 'border-white/10'
                }
              `}
            >
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

            {attachments.length > 0 && (
              <div className="px-3 pt-3 pb-2 flex items-center gap-2 border-b border-white/5 bg-white/[0.02]">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="relative group w-10 h-10 rounded-md overflow-hidden border border-white/10 bg-white/5"
                  >
                    <img
                      src={attachment.previewUrl}
                      alt="Attachment preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ))}
                {attachments.length < ATTACHMENT_LIMITS.MAX_FILES && !isMaxwellMode && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-md border border-dashed border-white/20 flex items-center justify-center text-white/30 hover:text-white/60 hover:border-white/40 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
            )}

            <div className="p-3 flex items-start gap-3">
              <div className="mt-2.5 pl-1">
                 <Search size={16} className={`transition-colors ${isFocused ? 'text-white/80' : 'text-white/30'}`} />
              </div>
              
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                  if (isMarketSearch) setShowMarketDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (query.trim()) {
                      handleSubmit(e);
                    }
                  }
                  if (e.key === 'Escape') {
                    setShowMarketDropdown(false);
                  }
                }}
                onFocus={() => {
                  setIsFocused(true);
                  onFocusChange?.(true);
                  if (isMarketSearch) setShowMarketDropdown(true);
                }}
                onBlur={() => {
                  setIsFocused(false);
                  onFocusChange?.(false);
                  setTimeout(() => setShowMarketDropdown(false), 200);
                }}
                placeholder={isMarketSearch ? "Search markets (e.g. Fed Rates, Election)..." : "Ask anything..."}
                rows={1}
                className="flex-1 bg-transparent text-[15px] font-mono text-white placeholder-white/20 focus:outline-none py-2 resize-none max-h-[200px] overflow-y-auto leading-relaxed"
              />

              <div className="flex items-center gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {!isMarketSearch && !isMaxwellMode && (
                   <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachments.length >= ATTACHMENT_LIMITS.MAX_FILES}
                    className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
                  >
                    <Paperclip size={16} />
                   </button>
                )}

                {onModeChange && !isMarketSearch && (
                  <div className="scale-90 origin-right">
                    <ModeDropdown
                        mode={mode}
                        onModeChange={onModeChange}
                        disabled={disabled}
                        hasMaxwellResults={hasMaxwellResults}
                        onViewResults={onViewResults}
                      />
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={!query}
                  className={`
                    p-1.5 rounded-md transition-all duration-300
                    ${query
                      ? 'bg-white text-black shadow-[0_0_15px_-3px_rgba(255,255,255,0.3)] hover:scale-105'
                      : 'bg-white/5 text-white/10 cursor-not-allowed'
                    }
                  `}
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.form>

        <div className="absolute top-full left-0 w-full pt-4">
          {isMarketSearch ? (
            <MarketAutocomplete
              query={query}
              results={marketResults}
              trendingQueries={TRENDING_SEARCHES}
              onSelectMarket={(m) => onMarketSelect?.(m)}
              onSelectQuery={(q) => {
                setQuery(q);
                if (textareaRef.current) textareaRef.current.focus();
              }}
              isVisible={showMarketDropdown}
            />
          ) : (
            <AnimatePresence>
              {state === 'relaxed' && !query && (
                <motion.div
                  className="flex flex-nowrap justify-center gap-2 px-4 overflow-x-auto no-scrollbar w-full"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
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
          )}
        </div>
      </motion.div>
    </div>

  );
}
