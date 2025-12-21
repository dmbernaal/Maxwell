export type AgentState = 'relaxed' | 'thinking' | 'orchestrating' | 'synthesizing' | 'complete';

export interface DebugStep {
  id: string;
  type: 'tool_call' | 'tool_result' | 'thought';
  content: string;
  timestamp: number;
}

/**
 * A source from web search (Tavily)
 */
export interface Source {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  verified?: boolean;
  timestamp: number;
  sources?: Source[];
  debugSteps?: DebugStep[];
  maxwellState?: any; // Storing full Maxwell state for hydration
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  agentState: AgentState;
}
