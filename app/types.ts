// ============================================
// ATTACHMENT TYPES
// ============================================

/**
 * Supported image media types for attachments
 */
export type AttachmentMediaType = 'image/png' | 'image/jpeg' | 'image/webp';

/**
 * Attachment constraints
 */
export const ATTACHMENT_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILES: 3,
  ALLOWED_TYPES: ['image/png', 'image/jpeg', 'image/webp'] as AttachmentMediaType[],
} as const;

/**
 * An attached file (image) for multimodal messages
 */
export interface Attachment {
  id: string;
  file: File;
  previewUrl: string;  // URL.createObjectURL() for UI display
  base64: string;      // Base64 encoded for API
  mediaType: AttachmentMediaType;
}

// ============================================
// AGENT TYPES
// ============================================

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
  attachments?: MessageAttachment[]; // Images attached to user messages
}

/**
 * Simplified attachment info stored with messages (no File object or base64)
 */
export interface MessageAttachment {
  id: string;
  previewUrl: string;  // URL.createObjectURL() for display
  mediaType: AttachmentMediaType;
}

export type SearchMode = 'normal' | 'maxwell';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  agentState: AgentState;
  mode: SearchMode;
}
