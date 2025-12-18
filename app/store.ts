import { create } from 'zustand';
import { AgentState, Message } from './types';

interface ChatStore {
  messages: Message[];
  agentState: AgentState;
  
  // Actions
  addMessage: (message: Message) => void;
  setAgentState: (state: AgentState) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  agentState: 'relaxed',

  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),

  setAgentState: (agentState) => set({ agentState }),

  resetChat: () => set({ messages: [], agentState: 'relaxed' }),
}));

