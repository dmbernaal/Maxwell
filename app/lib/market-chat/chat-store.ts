'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { MarketChatMessage, CostBreakdown } from './types';
import type { ExtractedFact } from './memory';

interface MarketConversation {
  messages: MarketChatMessage[];
  facts: ExtractedFact[];
  totalCost: CostBreakdown;
  lastAccessed: number;
}

function emptyConversation(): MarketConversation {
  return {
    messages: [],
    facts: [],
    totalCost: { llm: 0, search: 0, extract: 0, classification: 0, total: 0 },
    lastAccessed: Date.now(),
  };
}

interface MarketChatStore {
  conversations: Record<string, MarketConversation>;
  hasHydrated: boolean;

  addMessage: (marketId: string, message: MarketChatMessage) => void;
  updateMessage: (marketId: string, messageId: string, updates: Partial<MarketChatMessage>) => void;
  getConversation: (marketId: string) => MarketConversation;
  addFacts: (marketId: string, facts: ExtractedFact[]) => void;
  addCost: (marketId: string, cost: CostBreakdown) => void;
  clearConversation: (marketId: string) => void;
  setHasHydrated: (state: boolean) => void;
}

const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await idbGet(name);
    return value ? JSON.stringify(value) : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const parsed = JSON.parse(value);
    await idbSet(name, parsed);
  },
  removeItem: async (name: string): Promise<void> => {
    await idbDel(name);
  },
};

const MAX_CONVERSATIONS = 50;

export const useMarketChatStore = create<MarketChatStore>()(
  persist(
    (set, get) => ({
      conversations: {},
      hasHydrated: false,

      addMessage: (marketId, message) => {
        set((state) => {
          const conv = state.conversations[marketId] || emptyConversation();
          return {
            conversations: {
              ...state.conversations,
              [marketId]: {
                ...conv,
                messages: [...conv.messages, message],
                lastAccessed: Date.now(),
              },
            },
          };
        });
      },

      updateMessage: (marketId, messageId, updates) => {
        set((state) => {
          const conv = state.conversations[marketId];
          if (!conv) return state;

          const idx = conv.messages.findIndex(m => m.id === messageId);
          if (idx === -1) return state;

          const updatedMessages = [...conv.messages];
          updatedMessages[idx] = { ...updatedMessages[idx], ...updates };

          return {
            conversations: {
              ...state.conversations,
              [marketId]: { ...conv, messages: updatedMessages, lastAccessed: Date.now() },
            },
          };
        });
      },

      getConversation: (marketId) => {
        return get().conversations[marketId] || emptyConversation();
      },

      addFacts: (marketId, facts) => {
        if (facts.length === 0) return;
        set((state) => {
          const conv = state.conversations[marketId] || emptyConversation();
          const merged = [...conv.facts, ...facts].slice(-20);
          return {
            conversations: {
              ...state.conversations,
              [marketId]: { ...conv, facts: merged, lastAccessed: Date.now() },
            },
          };
        });
      },

      addCost: (marketId, cost) => {
        set((state) => {
          const conv = state.conversations[marketId] || emptyConversation();
          const tc = conv.totalCost;
          return {
            conversations: {
              ...state.conversations,
              [marketId]: {
                ...conv,
                totalCost: {
                  llm: tc.llm + cost.llm,
                  search: tc.search + cost.search,
                  extract: tc.extract + cost.extract,
                  classification: tc.classification + cost.classification,
                  total: tc.total + cost.total,
                },
                lastAccessed: Date.now(),
              },
            },
          };
        });
      },

      clearConversation: (marketId) => {
        set((state) => {
          const { [marketId]: _, ...rest } = state.conversations;
          return { conversations: rest };
        });
      },

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'market-chat-storage',
      storage: createJSONStorage(() => idbStorage),
      skipHydration: true,
      version: 1,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);

        if (state) {
          const convs = state.conversations;
          const keys = Object.keys(convs);
          if (keys.length > MAX_CONVERSATIONS) {
            const sorted = keys.sort((a, b) => convs[a].lastAccessed - convs[b].lastAccessed);
            const toRemove = sorted.slice(0, keys.length - MAX_CONVERSATIONS);
            for (const key of toRemove) {
              delete convs[key];
            }
          }
        }
      },
    }
  )
);
