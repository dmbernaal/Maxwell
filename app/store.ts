import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { AgentState, Message, ChatSession } from './types';

interface ChatStore {
  // State
  sessions: Record<string, ChatSession>;
  activeSessionId: string | null;
  hasHydrated: boolean;

  // Actions
  createSession: () => string;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  addMessage: (content: string, role: 'user' | 'agent', verified?: boolean, sessionId?: string) => void;
  setAgentState: (state: AgentState, sessionId?: string) => void;
  setHasHydrated: (state: boolean) => void;

  // Computed Helpers
  getActiveSession: () => ChatSession | undefined;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: {},
      activeSessionId: null,
      hasHydrated: false,

      createSession: () => {
        const id = uuidv4();
        const newSession: ChatSession = {
          id,
          title: 'New Conversation',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          agentState: 'relaxed'
        };

        set((state) => ({
          sessions: { ...state.sessions, [id]: newSession },
          activeSessionId: id
        }));

        return id;
      },

      switchSession: (sessionId) => {
        set({ activeSessionId: sessionId });
      },

      deleteSession: (sessionId) => {
        set((state) => {
          const newSessions = { ...state.sessions };
          delete newSessions[sessionId];

          // If deleting active session, switch to another or null
          const newActiveId = state.activeSessionId === sessionId
            ? Object.keys(newSessions)[0] || null
            : state.activeSessionId;

          return {
            sessions: newSessions,
            activeSessionId: newActiveId
          };
        });
      },

      addMessage: (content, role, verified = false, sessionId) => {
        set((state) => {
          // Use provided sessionId or fallback to activeSessionId
          const targetId = sessionId || state.activeSessionId;

          if (!targetId || !state.sessions[targetId]) return state;

          const session = state.sessions[targetId];
          const newMessage: Message = {
            id: uuidv4(),
            role,
            content,
            verified,
            timestamp: Date.now()
          };

          // Auto-generate title from first user message if it's "New Conversation"
          let title = session.title;
          if (role === 'user' && session.messages.length === 0) {
            title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
          }

          return {
            sessions: {
              ...state.sessions,
              [targetId]: {
                ...session,
                messages: [...session.messages, newMessage],
                updatedAt: Date.now(),
                title
              }
            }
          };
        });
      },

      setAgentState: (agentState, sessionId) => {
        set((state) => {
          const targetId = sessionId || state.activeSessionId;
          if (!targetId || !state.sessions[targetId]) return state;

          return {
            sessions: {
              ...state.sessions,
              [targetId]: {
                ...state.sessions[targetId],
                agentState
              }
            }
          };
        });
      },

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      getActiveSession: () => {
        const state = get();
        return state.activeSessionId ? state.sessions[state.activeSessionId] : undefined;
      }
    }),
    {
      name: 'maxwell-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
