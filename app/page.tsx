'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Header from './components/Header';
import InputInterface from './components/InputInterface';
import ResponseDisplay from './components/ResponseDisplay';
import UserMessage from './components/UserMessage';
import { MaxwellCanvas } from './components/maxwell';
import MarketGrid from './components/MarketGrid';
import MarketGridSkeleton from './components/MarketGridSkeleton';
import MarketExplorer from './components/MarketExplorer';
import { UnifiedMarket } from './lib/markets/types';
import { useChatStore } from './store';
import { useChatApi } from './hooks/use-chat-api';
import { useMaxwell } from './hooks/use-maxwell';
import type { SearchMode } from './types';

const spacerVariants = {
  relaxed: { height: '30vh' },
  active: { height: '150px' }
};

export default function Home() {
  const router = useRouter();
  const {
    getActiveSession,
    createSession,
    hasHydrated,
    activeSessionId,
    setSessionMode
  } = useChatStore();

  const activeSession = getActiveSession();
  const [searchMode, setSearchMode] = useState<SearchMode>(activeSession?.mode || 'normal');

  useEffect(() => {
    if (activeSession?.mode) {
      setSearchMode(activeSession.mode);
    }
  }, [activeSession?.mode, activeSessionId]);

  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    if (activeSessionId) {
      setSessionMode(mode, activeSessionId);
    }
  };

  const { sendMessage, isStreaming } = useChatApi();
  const maxwell = useMaxwell();
  const [isCanvasVisible, setIsCanvasVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [viewMode, setViewMode] = useState<'landing' | 'explore'>('landing');
  const [currentLayout, setCurrentLayout] = useState<'relaxed' | 'active' | 'explore'>('relaxed');
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyIds = useRef(new Set<string>());
  const renderedSessionId = useRef(activeSessionId);
  const [marketResults, setMarketResults] = useState<UnifiedMarket[]>([]);
  const [isMarketsLoading, setIsMarketsLoading] = useState(true);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setIsMarketsLoading(true);
        const res = await fetch('/api/markets?limit=12');
        if (res.ok) {
          const data = await res.json();
          setMarketResults(data.markets || []);
        }
      } catch (e) {
        console.error("Failed to fetch markets", e);
      } finally {
        // Add a small delay to prevent flickering if api is too fast
        // and to let the skeleton animation play a bit
        setTimeout(() => setIsMarketsLoading(false), 500);
      }
    };
    fetchMarkets();
  }, []);

  useEffect(() => {
    useChatStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (hasHydrated && !activeSessionId) {
      createSession();
    }
  }, [hasHydrated, activeSessionId, createSession]);

  const messages = activeSession?.messages || [];
  const agentState = activeSession?.agentState || 'relaxed';

  const prevSessionId = useRef(activeSessionId);

  useEffect(() => {
    if (prevSessionId.current !== activeSessionId) {
      prevSessionId.current = activeSessionId;
      historyIds.current = new Set(messages.map(m => m.id));
      renderedSessionId.current = activeSessionId;
      maxwell.reset();
      setIsCanvasVisible(false);
    }
  }, [activeSessionId, messages, maxwell]);

  const isAutoScrollEnabled = useRef(true);

  const handleChatScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom <= 50;
    isAutoScrollEnabled.current = isAtBottom;
  }, []);

  const forceScrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      if (isAutoScrollEnabled.current) {
        forceScrollToBottom();
      }
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [forceScrollToBottom]);

  useEffect(() => {
    if (agentState === 'thinking' || agentState === 'orchestrating') {
      isAutoScrollEnabled.current = true;
      forceScrollToBottom();
    }
  }, [agentState, forceScrollToBottom]);

  useEffect(() => {
    if (viewMode === 'explore') {
      setCurrentLayout('explore');
    } else if (agentState !== 'relaxed' || messages.length > 0) {
      setCurrentLayout('active');
      setViewMode('landing');
    } else {
      setCurrentLayout('relaxed');
    }
  }, [agentState, messages.length, viewMode]);

  const handleQuery = (q: string, attachments?: import('./types').Attachment[]) => {
    if (!activeSessionId) return;
    if (searchMode === 'normal') {
      if (isStreaming) return;
      sendMessage(q, attachments);
    } else {
      if (maxwell.isLoading) return;
      maxwell.search(q);
    }
  };

  const hasMaxwellResults = maxwell.phase === 'complete' || maxwell.sources.length > 0;
  const isMaxwellActive = searchMode !== 'normal' && (
    (maxwell.phase !== 'idle' && maxwell.phase !== 'complete') ||
    (hasMaxwellResults && isCanvasVisible)
  );

  const handleViewResults = () => {
    setIsCanvasVisible(true);
  };

  useEffect(() => {
    if (maxwell.phase !== 'idle' && maxwell.phase !== 'complete') {
      setIsCanvasVisible(true);
    }
  }, [maxwell.phase]);

  useEffect(() => {
    const handleOpenCanvas = (e: CustomEvent) => {
      const state = e.detail;
      if (state) {
        maxwell.hydrate(state);
        setIsCanvasVisible(true);
      }
    };
    window.addEventListener('openMaxwellCanvas', handleOpenCanvas as EventListener);
    return () => {
      window.removeEventListener('openMaxwellCanvas', handleOpenCanvas as EventListener);
    };
  }, [maxwell]);

  if (!hasHydrated) return null;

  return (
    <main className="relative min-h-screen w-full bg-[var(--bg-primary)] overflow-hidden selection:bg-brand-accent/30 font-sans">
      
      <Header />

      <AnimatePresence mode="wait">
        {currentLayout === 'relaxed' ? (
          <motion.div
            key="relaxed-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="fixed inset-0 flex flex-col items-center pt-[15vh] z-30 pointer-events-none"
          >
            <div className="pointer-events-auto flex flex-col items-center w-full max-w-4xl px-4">
              
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: 20, filter: 'blur(5px)' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full mb-10"
              >
                <InputInterface
                  state={agentState}
                  hasMessages={messages.length > 0}
                  onQuery={handleQuery}
                  mode={searchMode}
                  onModeChange={handleModeChange}
                  disabled={isStreaming || maxwell.isLoading}
                  hasMaxwellResults={hasMaxwellResults && !isCanvasVisible}
                  onViewResults={handleViewResults}
                  onFocusChange={setIsInputFocused}
                  isMarketSearch={true}
                  onMarketSelect={(market) => router.push(`/markets/${market.id}`)}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-full flex flex-col gap-6"
              >
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-mono uppercase tracking-widest text-white/40">Trending Markets</h2>
                  <button 
                    onClick={() => setViewMode('explore')}
                    className="text-xs font-mono uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                  >
                    View All &rarr;
                  </button>
                </div>

                {isMarketsLoading ? (
                  <MarketGridSkeleton />
                ) : (
                  <MarketGrid 
                    markets={marketResults} 
                    onSelectMarket={(market) => router.push(`/markets/${market.id}`)}
                  />
                )}
              </motion.div>
            </div>
          </motion.div>
        ) : currentLayout === 'explore' ? (
          <motion.div
            key="explore-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-[var(--bg-primary)] flex flex-col"
          >
             <div className="shrink-0 w-full z-40 mt-20">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col items-center gap-4">
                  <div className="w-full max-w-2xl">
                     <InputInterface
                        state={agentState}
                        hasMessages={false}
                        onQuery={handleQuery}
                        mode={searchMode}
                        onModeChange={handleModeChange}
                        disabled={false}
                        hasMaxwellResults={false}
                        onViewResults={() => {}}
                        onFocusChange={setIsInputFocused}
                        isMarketSearch={true}
                      />
                  </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto">
                <MarketExplorer 
                  onBack={() => setViewMode('landing')}
                  onSelectMarket={(market) => router.push(`/markets/${market.id}`)}
                />
             </div>
          </motion.div>
        ) : (
          <motion.div
            key="active-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="fixed bottom-0 left-0 z-30 px-4 pb-6 flex justify-center pointer-events-auto"
              style={{ width: isMaxwellActive ? '55%' : '100%' }}
            >
              <motion.div
                className="w-full max-w-3xl"
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 40 }}
              >
                <InputInterface
                  state={agentState}
                  hasMessages={messages.length > 0}
                  onQuery={handleQuery}
                  mode={searchMode}
                  onModeChange={setSearchMode}
                  disabled={isStreaming || maxwell.isLoading}
                  hasMaxwellResults={hasMaxwellResults && !isCanvasVisible}
                  onViewResults={handleViewResults}
                  onFocusChange={setIsInputFocused}
                  isMarketSearch={false}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMaxwellActive && (
          <MaxwellCanvas
            phase={maxwell.phase}
            subQueries={maxwell.subQueries}
            searchMetadata={maxwell.searchMetadata}
            sources={maxwell.sources}
            verification={maxwell.verification}
            verificationProgress={maxwell.verificationProgress}
            phaseDurations={maxwell.phaseDurations}
            phaseStartTimes={maxwell.phaseStartTimes}
            events={maxwell.events}
            onClose={() => setIsCanvasVisible(false)}
            reasoning={maxwell.reasoning}
            config={maxwell.config}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="relative z-10 h-screen flex flex-col pt-20"
        animate={{ width: isMaxwellActive ? '55%' : '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 40 }}
      >
        <div
          ref={scrollRef}
          onScroll={handleChatScroll}
          className="flex-1 overflow-y-auto w-full flex flex-col items-center no-scrollbar"
          style={{
            overflowAnchor: 'auto',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 200px, black calc(100% - 300px), transparent calc(100% - 100px))',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 200px, black calc(100% - 300px), transparent calc(100% - 100px))'
          }}
        >
          <motion.div
            variants={spacerVariants}
            initial="relaxed"
            animate={currentLayout}
            transition={{ duration: 0.5 }}
            className="shrink-0 w-full"
          />

          <div className="w-full max-w-4xl px-4 md:px-6 pb-40 flex flex-col gap-6">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={activeSessionId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex flex-col gap-6 w-full"
              >
                {messages.map((msg, index) => {
                  const isHistory = historyIds.current.has(msg.id);
                  return (
                    <div key={msg.id} className="w-full">
                      {msg.role === 'user' ? (
                        <UserMessage content={msg.content} attachments={msg.attachments} isHistory={isHistory} />
                      ) : (
                        <ResponseDisplay
                          message={msg}
                          isHistory={isHistory}
                          status={index === messages.length - 1 ? agentState : 'complete'}
                        />
                      )}
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {agentState !== 'relaxed' && agentState !== 'complete' && (!messages.length || messages[messages.length - 1].role !== 'agent') && (
              <ResponseDisplay message={null} status={agentState} />
            )}
          </div>
        </div>
      </motion.div>

    </main>
  );
}
