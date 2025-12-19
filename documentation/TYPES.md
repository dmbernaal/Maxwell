# Maxwell Type Definitions

> Complete TypeScript type reference.

## Core Types (`app/types.ts`)

### AgentState

Visual state of the assistant for UI animations.

```typescript
export type AgentState = 
    | 'relaxed'       // Initial/idle state
    | 'thinking'      // Processing user input
    | 'orchestrating' // Executing tools
    | 'synthesizing'  // Generating response
    | 'complete';     // Response finished
```

### Source

A search result from Tavily.

```typescript
export interface Source {
    title: string;      // Page title
    url: string;        // Full URL
    content: string;    // Text snippet
    score?: number;     // Relevance 0-1
}
```

### Message

A single chat message.

```typescript
export interface Message {
    id: string;                   // UUID
    role: 'user' | 'agent';       // Who sent it
    content: string;              // Message text
    verified?: boolean;           // Deprecated
    timestamp: number;            // Unix ms
    sources?: Source[];           // From search (agent only)
}
```

### ChatSession

A conversation thread.

```typescript
export interface ChatSession {
    id: string;                   // UUID
    title: string;                // Display title
    createdAt: number;            // Unix ms
    updatedAt: number;            // Unix ms
    messages: Message[];          // Ordered by time
    agentState: AgentState;       // Current state
}
```

---

## Store Types (`app/store.ts`)

### ChatStore

Zustand store interface.

```typescript
interface ChatStore {
    // State
    sessions: Record<string, ChatSession>;
    activeSessionId: string | null;
    hasHydrated: boolean;

    // Actions
    createSession: () => string;
    switchSession: (sessionId: string) => void;
    deleteSession: (sessionId: string) => void;
    addMessage: (
        content: string, 
        role: 'user' | 'agent', 
        verified?: boolean, 
        sessionId?: string, 
        sources?: Source[]
    ) => string;  // Returns message ID
    updateMessage: (
        messageId: string, 
        content: string, 
        sources?: Source[], 
        sessionId?: string
    ) => void;
    setAgentState: (state: AgentState, sessionId?: string) => void;
    setHasHydrated: (state: boolean) => void;

    // Computed Helpers
    getActiveSession: () => ChatSession | undefined;
}
```

---

## Model Types (`app/lib/models.ts`)

### ModelConfig

Configuration for an LLM model.

```typescript
interface ModelConfig {
    id: string;              // e.g., "google/gemini-3-flash-preview"
    name: string;            // Display name
    provider: string;        // e.g., "google"
    contextWindow?: number;  // Max tokens
    enabled: boolean;        // Available for use
    toolsSupported: boolean; // Can use tools
}
```

### AVAILABLE_MODELS

```typescript
export const AVAILABLE_MODELS: ModelConfig[] = [
    {
        id: 'google/gemini-3-flash-preview',
        name: 'Gemini 3 Flash',
        provider: 'google',
        enabled: true,
        toolsSupported: true,
    },
    // ... more models
];
```

---

## Tool Types (`app/lib/tools.ts`)

### SearchResponse

Return type from search tools.

```typescript
interface SearchResponse {
    answer?: string;          // Tavily's generated answer
    results: SearchResult[];  // Source array
    error?: string;           // If search failed
}
```

### SearchResult

Individual search result (same as Source).

```typescript
interface SearchResult {
    title: string;
    url: string;
    content: string;
    score?: number;
}
```

---

## Hook Types (`app/hooks/use-chat-api.ts`)

### UseChatApiOptions

```typescript
interface UseChatApiOptions {
    model?: string;  // Initial model ID
}
```

### UseChatApiReturn

```typescript
interface UseChatApiReturn {
    sendMessage: (content: string) => Promise<void>;
    isStreaming: boolean;
    error: string | null;
    currentModel: string;
    setModel: (model: string) => void;
}
```

---

## Agent Types (`app/lib/agent.ts`)

### StreamEvent (yielded by generator)

```typescript
type StreamEvent = 
    | { type: 'text'; content: string }
    | { type: 'sources'; sources: Source[] };
```

---

## API Request/Response

### ChatRequest

```typescript
interface ChatRequest {
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    model?: string;
}
```

### ChatResponse

Text stream with optional sources JSON appended.

```
[text content]

---SOURCES_JSON---
[{...}, {...}]
```

---

## Component Props

### ResponseDisplayProps

```typescript
interface ResponseDisplayProps {
    message: Message | null;
    isHistory?: boolean;  // Skip animations
}
```

### InputInterfaceProps

```typescript
interface InputInterfaceProps {
    onQuery: (query: string) => void;
    isRelaxed?: boolean;
}
```

### ChatHistoryProps

```typescript
interface ChatHistoryProps {
    sessions: ChatSession[];
    activeSessionId: string | null;
    onSessionSelect: (id: string) => void;
    onSessionDelete: (id: string) => void;
    onNewSession: () => void;
}
```

---

## Maxwell Verified Search Types (`app/lib/maxwell/types.ts`)

> Types for the multi-signal verification search agent.

### SubQuery

A decomposed search query.

```typescript
interface SubQuery {
    id: string;       // "q1", "q2"
    query: string;    // Search query text
    purpose: string;  // Why this query is needed
}
```

### MaxwellSource

A search result source (distinct from chat `Source`).

```typescript
interface MaxwellSource {
    id: string;        // "s1", "s2" (1-indexed)
    url: string;       // Full URL
    title: string;     // Page title
    snippet: string;   // Text content
    fromQuery: string; // Which sub-query found this
}
```

### VerifiedClaim

A claim that has been through multi-signal verification.

```typescript
interface VerifiedClaim {
    id: string;
    text: string;
    confidence: number;          // 0.0 - 1.0
    confidenceLevel: 'high' | 'medium' | 'low';
    entailment: 'SUPPORTED' | 'CONTRADICTED' | 'NEUTRAL';
    entailmentReasoning: string;
    bestMatchingSource: {
        sourceId: string;
        sourceTitle: string;
        sourceIndex: number;
        passage: string;
        similarity: number;
        isCitedSource: boolean;
    };
    citationMismatch: boolean;
    numericCheck: NumericCheck | null;
    issues: string[];
}
```

### MaxwellState

Frontend state for the Maxwell UI.

```typescript
interface MaxwellState {
    phase: ExecutionPhase;          // 'idle' | 'decomposition' | ...
    subQueries: SubQuery[];
    searchMetadata: SearchMetadata[];
    sources: MaxwellSource[];
    answer: string;
    verification: VerificationOutput | null;
    error: string | null;
    phaseDurations: PhaseDurations;
}
```

### MaxwellEvent

Union type for SSE streaming events.

```typescript
type MaxwellEvent =
    | PhaseStartEvent
    | PhaseCompleteEvent
    | SearchProgressEvent
    | SynthesisChunkEvent
    | VerificationProgressEvent
    | CompleteEvent
    | ErrorEvent;
```

See `app/lib/maxwell/types.ts` for complete definitions.

