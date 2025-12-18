export type AgentState = 'relaxed' | 'thinking' | 'orchestrating' | 'synthesizing' | 'complete';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  verified?: boolean;
}

