# Maxwell Type Definitions

> TypeScript interfaces and types used across the codebase.

## Core Types

### From `app/types/index.ts`

```typescript
/**
 * Agent visual states for the animated sphere
 */
export type AgentState = 
    | 'relaxed'       // Idle, slow animation
    | 'thinking'      // Processing, medium animation
    | 'orchestrating' // Calling tools, active animation
    | 'synthesizing'  // Generating response, fast animation
    | 'complete';     // Done, settling animation

/**
 * A source returned from web search
 */
export interface Source {
    title: string;
    url: string;
    content: string;
    score?: number;  // Relevance score from Tavily
}

/**
 * A citation reference in the response
 */
export interface Citation {
    index: number;   // [1], [2], etc.
    source: Source;
}
```

---

## Model Types

### From `app/lib/models.ts`

```typescript
/**
 * Configuration for an available model
 */
export interface ModelConfig {
    /** OpenRouter model ID (exact string required) */
    id: string;
    
    /** Display name for UI */
    name: string;
    
    /** Maximum context window in tokens */
    contextWindow: number;
    
    /** Short description for model selector */
    description: string;
    
    /** Pricing/capability tier */
    tier: 'default' | 'standard' | 'premium';
    
    /** Provider family for tool schema selection */
    provider: 'google' | 'anthropic' | 'openai';
    
    /** Whether tools work with this model */
    toolsSupported: boolean;
}
```

---

## Tool Types

### From `app/lib/tools.ts`

```typescript
/**
 * Result from Tavily API
 */
interface TavilyResult {
    title: string;
    url: string;
    content: string;
    score?: number;
}

/**
 * Normalized search result
 */
interface SearchResult {
    title: string;
    url: string;
    content: string;
    score?: number;
}

/**
 * Response from search tool
 */
interface SearchResponse {
    answer?: string;      // Pre-summarized answer from Tavily
    results: SearchResult[];
    error?: string;
}
```

---

## AI SDK Types (from `ai` package)

### Commonly Used

```typescript
import type { 
    CoreMessage,           // Message in LLM format
    StreamTextResult,      // Result from streamText()
    Tool,                  // Tool definition type
} from 'ai';

/**
 * CoreMessage structure
 */
interface CoreMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | ContentPart[];
}
```

---

## API Types

### Request/Response for `/api/chat`

```typescript
/**
 * Request body for POST /api/chat
 */
interface ChatRequest {
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    model?: string;  // Optional, defaults to DEFAULT_MODEL
}

/**
 * Response is a text stream (SSE)
 * Content-Type: text/plain; charset=utf-8
 */
```

---

## Component Props

### InputInterface

```typescript
interface InputInterfaceProps {
    onSubmit: (message: string) => void;
    isLoading?: boolean;
    placeholder?: string;
}
```

### ResponseDisplay

```typescript
interface ResponseDisplayProps {
    content: string;
    sources?: Source[];
    isStreaming?: boolean;
}
```

### AgentSphere

```typescript
interface AgentSphereProps {
    state: AgentState;
    isActive?: boolean;
}
```

---

## Zustand Store Types

### From `app/store.ts`

```typescript
interface AppState {
    // Messages
    messages: Message[];
    addMessage: (message: Message) => void;
    clearMessages: () => void;
    
    // Agent state
    agentState: AgentState;
    setAgentState: (state: AgentState) => void;
    
    // Model selection
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    
    // Loading state
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
    timestamp: Date;
}
```

---

## Type Guards

Useful type guards for runtime checking:

```typescript
function isSource(obj: unknown): obj is Source {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'title' in obj &&
        'url' in obj
    );
}

function isAgentState(value: string): value is AgentState {
    return ['relaxed', 'thinking', 'orchestrating', 'synthesizing', 'complete'].includes(value);
}
```
