export type AgentState = 'relaxed' | 'thinking' | 'orchestrating' | 'synthesizing' | 'complete';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  verified?: boolean;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  agentState: AgentState;
}

