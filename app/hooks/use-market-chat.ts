'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { UnifiedMarket } from '../lib/markets/types';
import type { MaxwellIntelligence } from '../lib/maxwell/types';
import type { MarketChatMessage, ChatStatus, ScoredSource, CostBreakdown, ChatTier, ThinkingStep } from '../lib/market-chat/types';
import { checkFastPath } from '../lib/market-chat/fast-path';
import { useMarketChatStore } from '../lib/market-chat/chat-store';

interface UseMarketChatReturn {
  messages: MarketChatMessage[];
  status: ChatStatus;
  currentTool: string | null;
  thinkingSteps: ThinkingStep[];
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  totalCost: CostBreakdown;
  clearChat: () => void;
}

export function useMarketChat(
  marketId: string,
  market: UnifiedMarket,
  maxwellReport?: MaxwellIntelligence | null
): UseMarketChatReturn {
  const store = useMarketChatStore();
  const conversation = store.getConversation(marketId);

  const [status, setStatus] = useState<ChatStatus>('idle');
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!store.hasHydrated) {
      useMarketChatStore.persist.rehydrate();
    }
  }, [store.hasHydrated]);

  const sendMessage = useCallback(async (content: string) => {
    const fastResult = checkFastPath(content, market, maxwellReport);
    if (fastResult.matched) {
      const userMsg: MarketChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      const agentMsg: MarketChatMessage = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: fastResult.response,
        timestamp: Date.now(),
        tier: 'fast',
        latencyMs: 0,
        cost: { llm: 0, search: 0, extract: 0, classification: 0, total: 0 },
      };
      store.addMessage(marketId, userMsg);
      store.addMessage(marketId, agentMsg);
      return;
    }

    const userMsg: MarketChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    store.addMessage(marketId, userMsg);
    setIsLoading(true);
    setStatus('thinking');
    setThinkingSteps([{ id: crypto.randomUUID(), status: 'thinking', timestamp: Date.now() }]);

    const agentMsgId = crypto.randomUUID();
    const placeholderMsg: MarketChatMessage = {
      id: agentMsgId,
      role: 'agent',
      content: '',
      timestamp: Date.now(),
    };
    store.addMessage(marketId, placeholderMsg);

    let fullContent = '';
    const toolsUsedSet = new Set<string>();

    try {
      abortRef.current = new AbortController();

      const currentConv = store.getConversation(marketId);
      const historyForServer = currentConv.messages
        .filter(m => m.id !== agentMsgId)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/market-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId,
          messages: historyForServer,
          maxwellReport: maxwellReport ?? null,
          conversationFacts: currentConv.facts,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;

          try {
            const event = JSON.parse(line.slice(6));

            switch (event.type) {
              case 'status':
                setStatus(event.status as ChatStatus);
                if (event.tool) {
                  setCurrentTool(event.tool);
                  toolsUsedSet.add(event.tool);
                }
                setThinkingSteps(prev => [
                  ...prev,
                  { id: crypto.randomUUID(), status: event.status, tool: event.tool, timestamp: Date.now() },
                ]);
                break;
              case 'chunk':
                fullContent += event.content;
                store.updateMessage(marketId, agentMsgId, { content: fullContent });
                break;
              case 'sources':
                store.updateMessage(marketId, agentMsgId, { sources: event.sources as ScoredSource[] });
                break;
              case 'complete': {
                const cost = event.cost as CostBreakdown;
                store.updateMessage(marketId, agentMsgId, {
                  tier: event.tier as ChatTier,
                  cost,
                  latencyMs: event.latencyMs as number,
                  toolsUsed: Array.from(toolsUsedSet),
                });
                store.addCost(marketId, cost);
                break;
              }
              case 'facts':
                if (Array.isArray(event.facts)) {
                  store.addFacts(marketId, event.facts);
                }
                break;
              case 'error':
                store.updateMessage(marketId, agentMsgId, {
                  content: `Something went wrong: ${event.message}`,
                });
                break;
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        store.updateMessage(marketId, agentMsgId, {
          content: 'Sorry, something went wrong. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
      setStatus('idle');
      setCurrentTool(null);
      setThinkingSteps([]);
    }
  }, [marketId, market, maxwellReport, store]);

  const clearChat = useCallback(() => {
    store.clearConversation(marketId);
  }, [marketId, store]);

  return {
    messages: conversation.messages,
    status,
    currentTool,
    thinkingSteps,
    sendMessage,
    isLoading,
    totalCost: conversation.totalCost,
    clearChat,
  };
}
