'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { SmallGhostLogo } from './components/SmallGhostLogo';
import InputInterface from './components/InputInterface';
import ResponseDisplay from './components/ResponseDisplay';
import UserMessage from './components/UserMessage';
import ChatHistory from './components/ChatHistory';
import { MaxwellCanvas } from './components/maxwell';
import MarketGrid from './components/MarketGrid';
import MarketExplorer from './components/MarketExplorer';
import { UnifiedMarket } from './lib/markets/types';
// import { MOCK_MARKETS } from './lib/market-data';
import { useChatStore } from './store';
import { useChatApi } from './hooks/use-chat-api';
import { useMaxwell } from './hooks/use-maxwell';
import type { SearchMode } from './types';

const blurVariants = {
  relaxed: { opacity: 0 },
  active: { opacity: 1 }
};

const spacerVariants = {
  relaxed: { height: '30vh' },
  active: { height: '150px' }
};

// Module-level variable to track intro state across SPA navigations
// This persists while the app is running but resets on full page refresh
let hasIntroRunThisSession = false;

export default function Home() {
  const router = useRouter();
  const {
    getActiveSession,
    createSession,
    hasHydrated,
    activeSessionId,
    setSessionMode
  } = useChatStore();

  // Search mode state - initialize from active session if available
  const activeSession = getActiveSession();
  const [searchMode, setSearchMode] = useState<SearchMode>(activeSession?.mode || 'normal');

  // Sync local search mode when active session changes
  useEffect(() => {
    if (activeSession?.mode) {
      setSearchMode(activeSession.mode);
    }
  }, [activeSession?.mode, activeSessionId]);

  // Handle mode change - update local state AND store
  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    if (activeSessionId) {
      setSessionMode(mode, activeSessionId);
    }
  };

  // Use the chat API hook (base product)
  const { sendMessage, isStreaming } = useChatApi();

  // Use the Maxwell hook (killer feature)
  const maxwell = useMaxwell();

  // Track if canvas should be visible (separate from having results)
  const [isCanvasVisible, setIsCanvasVisible] = useState(false);

  // Track input focus for Ghost reaction
  const [isInputFocused, setIsInputFocused] = useState(false);

  const [viewMode, setViewMode] = useState<'landing' | 'explore'>('landing');
  const [currentLayout, setCurrentLayout] = useState<'relaxed' | 'active' | 'explore'>('relaxed');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track which messages are "history" (already rendered) vs "new" (just added)
  const historyIds = useRef(new Set<string>());
  const renderedSessionId = useRef(activeSessionId);

  // Market Data State
  const [marketResults, setMarketResults] = useState<UnifiedMarket[]>([]);
  
  // Fetch real markets
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await fetch('/api/markets?limit=12');
        if (res.ok) {
          const data = await res.json();
          setMarketResults(data.markets || []);
        }
      } catch (e) {
        console.error("Failed to fetch markets", e);
      }
    };
    fetchMarkets();
  }, []);

  // Intro State
  const [introState, setIntroState] = useState<'start' | 'ghost' | 'done'>('start');
  const [forceGhostGlow, setForceGhostGlow] = useState(false);

  // Manually trigger hydration for async IndexedDB storage
  // This is required because skipHydration: true prevents auto-hydration
  // MUST be called before any useEffects that depend on store data
  useEffect(() => {
    useChatStore.persist.rehydrate();
  }, []);

  // Initialize session if needed (after hydration completes)
  useEffect(() => {
    if (hasHydrated && !activeSessionId) {
      createSession();
    }
  }, [hasHydrated, activeSessionId, createSession]);

  const messages = activeSession?.messages || [];
  const agentState = activeSession?.agentState || 'relaxed';

  // Determine if we should show the intro (only if no messages and no active session context)
  // Logic:
  // 1. Should run if global "hasIntroRunThisSession" is false
  // 2. AND we are in an empty chat (messages.length === 0)
  // This means refreshing the page (clears variable) will replay it.
  // But switching sessions (preserves variable) will NOT replay it.
  const shouldRunIntro = !hasIntroRunThisSession && messages.length === 0;

  // Skip intro if we have messages or have seen it already
  useEffect(() => {
    if ((messages.length > 0 || hasIntroRunThisSession) && introState === 'start') {
      setIntroState('done');
    }
  }, [messages.length, introState]);

  // Handle intro completion
  const handleIntroComplete = () => {
    setIntroState('done');
    hasIntroRunThisSession = true; // Mark as run for this browser session
  };

  // Update history tracking when session changes
  // CRITICAL: Also reset Maxwell state for clean slate
  const prevSessionId = useRef(activeSessionId);

  useEffect(() => {
    if (prevSessionId.current !== activeSessionId) {
      // Session changed! Reset everything for clean slate
      prevSessionId.current = activeSessionId;

      // Mark all current messages as history
      historyIds.current = new Set(messages.map(m => m.id));
      renderedSessionId.current = activeSessionId;

      // Reset Maxwell state for new chat
      maxwell.reset();
      setIsCanvasVisible(false);
    }
  }, [activeSessionId, messages, maxwell]);

  // ============================================
  // POSITION-BASED AUTOSCROLL (Robust Solution)
  // ============================================

  // We use a ref so the MutationObserver can read the latest value without re-binding
  const isAutoScrollEnabled = useRef(true);

  // The Scroll Handler - purely checks: "Is the user currently at the bottom?"
  const handleChatScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;

    // Tolerance of 50px allows for minor calculation differences or padding
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom <= 50;

    // If we are at the bottom, enable lock. If we aren't, disable it.
    isAutoScrollEnabled.current = isAtBottom;
  }, []);

  // Instant Scroll Function - no RAF delay to prevent jitter during streaming
  const forceScrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      // Use 'instant' behavior to prevent "fighting" the stream
      el.scrollTo({ top: el.scrollHeight, behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  // MutationObserver for Content Changes - fires whenever text streams in or elements are added
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const observer = new MutationObserver(() => {
      if (isAutoScrollEnabled.current) {
        forceScrollToBottom();
      }
    });

    observer.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [forceScrollToBottom]);

  // Reset on New Session / Agent Start - always snap back to bottom
  useEffect(() => {
    if (agentState === 'thinking' || agentState === 'orchestrating') {
      isAutoScrollEnabled.current = true;
      forceScrollToBottom();
    }
  }, [agentState, forceScrollToBottom]);

  // Update layout based on state
  useEffect(() => {
    if (viewMode === 'explore') {
      setCurrentLayout('explore');
    } else if (agentState !== 'relaxed' || messages.length > 0) {
      setCurrentLayout('active');
      setViewMode('landing'); // Reset explore mode if chat activates
    } else {
      setCurrentLayout('relaxed');
    }
  }, [agentState, messages.length, viewMode]);

  // Handle query submission - routes to correct API based on mode
  const handleQuery = (q: string, attachments?: import('./types').Attachment[]) => {
    if (!activeSessionId) return;

    if (searchMode === 'normal') {
      // Base product - use chat API (supports attachments)
      if (isStreaming) return;
      sendMessage(q, attachments);
    } else {
      // Maxwell mode - use Maxwell API (attachments not supported)
      if (maxwell.isLoading) return;
      maxwell.search(q);
    }
  };

  // Check if Maxwell has results (for View Results button)
  const hasMaxwellResults = maxwell.phase === 'complete' || maxwell.sources.length > 0;

  // Check if Maxwell canvas should be visible
  // Show when: Maxwell mode + (actively processing OR (has results AND canvas visible))
  const isMaxwellActive = searchMode !== 'normal' && (
    (maxwell.phase !== 'idle' && maxwell.phase !== 'complete') ||
    (hasMaxwellResults && isCanvasVisible)
  );

  // Handle closing maxwell canvas (just hide, don't reset)
  const handleCloseCanvas = () => {
    setIsCanvasVisible(false);
  };

  // Handle viewing results (re-open canvas)
  const handleViewResults = () => {
    setIsCanvasVisible(true);
  };

  // Auto-show canvas when maxwell starts processing
  useEffect(() => {
    if (maxwell.phase !== 'idle' && maxwell.phase !== 'complete') {
      setIsCanvasVisible(true);
    }
  }, [maxwell.phase]);

  // Listen for custom event to open canvas from history
  useEffect(() => {
    const handleOpenCanvas = (e: CustomEvent) => {
      const state = e.detail;
      if (state) {
        // Hydrate Maxwell state from history
        maxwell.hydrate(state);
        setIsCanvasVisible(true);
      }
    };

    window.addEventListener('openMaxwellCanvas', handleOpenCanvas as EventListener);
    return () => {
      window.removeEventListener('openMaxwellCanvas', handleOpenCanvas as EventListener);
    };
  }, [maxwell]);

  // Prevent hydration mismatch
  if (!hasHydrated) return null;

  return (
    <main className="relative min-h-screen w-full bg-[var(--bg-primary)] overflow-hidden selection:bg-brand-accent/30 font-sans">
      
      <ChatHistory />

      {/* GLOBAL EFFECTS - Pure Obsidian Void */}

      {/* LAYOUT TRANSITIONS */}
      <AnimatePresence mode="wait">
        {currentLayout === 'relaxed' ? (
          <motion.div
            key="relaxed-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="fixed inset-0 flex flex-col items-center justify-center z-30 pointer-events-none"
          >
            <div className="pointer-events-auto flex flex-col items-center w-full max-w-3xl px-4">
              {/* Ghost Centered */}
              {/* Initially hidden, fades in after text intro */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                animate={introState === 'start' ? { opacity: 0 } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }} // Faster duration for snappy feel
                className="w-[136px] h-[170px] mb-8"
              >
                <SmallGhostLogo isActive={isInputFocused || forceGhostGlow} />
              </motion.div>

              {/* Input Centered */}
              <motion.div
                initial={{ opacity: 1 }} // Always present structurally
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: 20, filter: 'blur(5px)' }}
                transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }} // Faster fade in
                className="w-full"
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
                  // Market Search Mode (Landing Only)
                  isMarketSearch={true}
                  onMarketSelect={(market) => router.push(`/markets/${market.id}`)}
                  // Intro Props
                  shouldRunIntro={shouldRunIntro}
                  onGhostAppear={() => {
                    setIntroState('ghost');
                    setForceGhostGlow(true);
                    setTimeout(() => setForceGhostGlow(false), 1500);
                  }}
                  onIntroComplete={handleIntroComplete}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                className="w-full mt-16 flex flex-col items-center gap-8"
              >
                <MarketGrid 
                  markets={marketResults.length > 0 ? marketResults : []} 
                  onSelectMarket={(market) => router.push(`/markets/${market.id}`)}
                />
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode('explore')}
                  className="px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-sm text-zinc-400 hover:text-white transition-colors backdrop-blur-sm"
                >
                  Explore All Markets
                </motion.button>
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
             <div className="shrink-0 w-full bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-white/5 z-40">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col items-center gap-4">
                  <div className="w-[32px] h-[40px]">
                    <SmallGhostLogo isActive={isInputFocused} />
                  </div>
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
            {/* Ghost - Smart Fixed Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{
                opacity: 1,
                y: 0,
                width: isMaxwellActive ? '55%' : '100%'
              }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="fixed top-0 left-0 z-30 flex justify-center pointer-events-none"
            >
              <div className="w-full max-w-4xl px-4 md:px-6 pt-8">
                <div className="w-full max-w-3xl mx-auto">
                  <div className="w-[42px] h-[52px]">
                    <SmallGhostLogo isActive={isInputFocused} />
                  </div>
                </div>
              </div>
            </motion.div>


            {/* Input Bottom */}
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

      {/* MAXWELL CANVAS - Right Panel */}
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



      {/* CONTENT LAYER */}
      <motion.div
        className="relative z-10 h-screen flex flex-col"
        animate={{ width: isMaxwellActive ? '55%' : '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 40 }}
      >

        {/* Scrollable Chat Area */}
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
          {/* Spacer */}
          <motion.div
            variants={spacerVariants}
            initial="relaxed"
            animate={currentLayout}
            transition={{ duration: 0.5 }}
            className="shrink-0 w-full"
          />

          {/* Message List */}
          <div className="w-full max-w-4xl px-4 md:px-6 pb-40 flex flex-col gap-6">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={activeSessionId} // Re-mounts the list container on session switch
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex flex-col gap-6 w-full"
              >
                {messages.map((msg, index) => {
                  // Check if this message is part of the "history" load
                  // If we just switched sessions, we want to treat existing messages as history
                  // New messages added *after* the switch will animate normally
                  const isHistory = historyIds.current.has(msg.id);

                  return (
                    <div key={msg.id} className="w-full">
                      {msg.role === 'user' ? (
                        <UserMessage content={msg.content} attachments={msg.attachments} isHistory={isHistory} />
                      ) : (
                        <ResponseDisplay
                          message={msg}
                          isHistory={isHistory}
                          // Only pass active status if this is the latest message
                          status={index === messages.length - 1 ? agentState : 'complete'}
                        />
                      )}
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {/* Show "Empty" ResponseDisplay if loading but no message yet */}
            {agentState !== 'relaxed' && agentState !== 'complete' && (!messages.length || messages[messages.length - 1].role !== 'agent') && (
              <ResponseDisplay message={null} status={agentState} />
            )}
          </div>
        </div>
      </motion.div>

    </main>
  );
}
