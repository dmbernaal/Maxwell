# Maxwell Architecture

> **Last Updated:** December 19, 2024  
> **Status:** Production-ready with search + citations

## Overview

Maxwell is a **search-augmented AI assistant** (similar to Perplexity) that:
1. Takes user questions
2. Searches the web for real-time information via Tavily
3. Returns answers with clickable citations `[1]`, `[2]`
4. Shows sources panel below responses

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MAXWELL SYSTEM                               │
│                                                                       │
│  ┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐  │
│  │   Frontend   │     │   API Route     │     │  OpenRouter API  │  │
│  │              │────▶│  /api/chat      │────▶│  (model routing) │  │
│  │  useChatApi  │     │                 │     │                  │  │
│  │  hook        │     │ streamAgent     │     │  ┌────┐ ┌─────┐  │  │
│  │              │◀────│ WithSources()   │◀────│  │Gem│ │Claude│  │  │
│  └──────────────┘     └────────┬────────┘     └──┴────┴─┴─────┴──┘  │
│                                │                                     │
│                                ▼                                     │
│                        ┌─────────────┐                              │
│                        │ Tavily API  │                              │
│                        │ (web search)│                              │
│                        └─────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. API Route (`/app/api/chat/route.ts`)

**Purpose:** Streaming HTTP endpoint for chat

**Key Feature:** Appends sources JSON at end of stream

```typescript
// Delimiter for sources (parsed by frontend)
const SOURCES_DELIMITER = '\n\n---SOURCES_JSON---\n';

// Uses generator for streaming
for await (const event of streamAgentWithSources(messages, modelId)) {
    if (event.type === 'text') {
        controller.enqueue(encoder.encode(event.content));
    } else if (event.type === 'sources') {
        controller.enqueue(encoder.encode(SOURCES_DELIMITER + JSON.stringify(event.sources)));
    }
}
```

---

### 2. Agent (`/app/lib/agent.ts`)

**Purpose:** Orchestrates LLM and tools

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `runAgent()` | Basic streaming (legacy) |
| `streamAgentWithSources()` | Generator that yields text + sources |

**Why Generator Pattern:**
The `fullStream` from AI SDK v5 provides all events (text-delta, tool-result) in order. We consume it to collect sources during streaming.

```typescript
export async function* streamAgentWithSources(messages, modelId) {
    const result = streamText({ ... });
    
    for await (const event of result.fullStream) {
        if (event.type === 'text-delta') {
            yield { type: 'text', content: event.text };
        } else if (event.type === 'tool-result') {
            // AI SDK v5 uses 'output' property
            const searchResults = event.output?.results;
            if (searchResults) {
                collectedSources.push(...searchResults);
            }
        }
    }
    
    yield { type: 'sources', sources: collectedSources };
}
```

---

### 3. Tools (`/app/lib/tools.ts`)

**Purpose:** Define executable functions the LLM can call

**Search Tool:**
- Calls Tavily API with query
- Returns `{ answer, results: [...sources...] }`

**Model-Specific Schemas:**
| Model Provider | Input Schema |
|---------------|--------------|
| Google (Gemini) | `{ queries: string[] }` |
| Anthropic/OpenAI | `{ query, topic?, depth?, days? }` |

---

### 4. Frontend Hook (`/app/hooks/use-chat-api.ts`)

**Purpose:** Client-side streaming + source extraction

**Key Features:**
1. Streams response via `ReadableStream`
2. Parses `---SOURCES_JSON---` delimiter
3. Updates Zustand store with content + sources
4. Manages agent state transitions

```typescript
// Parse sources from stream
const { content, sources } = parseSourcesFromText(accumulatedText);
updateMessage(agentMessageId, content, sources, sessionId);
```

---

### 5. Store (`/app/store.ts`)

**Purpose:** Zustand state with persistence

**Key Actions:**
| Action | Purpose |
|--------|---------|
| `addMessage()` | Add message, returns ID |
| `updateMessage()` | Update content + sources during streaming |
| `setAgentState()` | Transition visual states |

**Message Type:**
```typescript
interface Message {
    id: string;
    role: 'user' | 'agent';
    content: string;
    sources?: Source[];  // From search results
    timestamp: number;
}
```

---

### 6. ResponseDisplay (`/app/components/ResponseDisplay.tsx`)

**Purpose:** Renders agent messages with citations + sources

**Features:**
- ReactMarkdown for formatting
- Citation parsing: `[1]` → clickable superscript
- Dynamic sources panel with favicons

---

## Data Flow

### Request Flow
```
1. User types message in InputInterface
2. handleQuery() calls useChatApi.sendMessage()
3. Hook adds user message to store
4. Hook sets agentState: 'thinking'
5. POST /api/chat with { messages, model }
6. API calls streamAgentWithSources()
7. Generator yields text chunks
8. If search tool called:
   - Tavily API returns results
   - Sources collected from tool-result event
9. Generator yields sources at end
10. API appends sources JSON to stream
11. Hook parses delimiter, extracts sources
12. Hook calls updateMessage(id, content, sources)
13. ResponseDisplay renders with sources panel
```

### Source Extraction Flow
```
streamText() → fullStream events:
  ├─ text-delta → yield to client
  ├─ tool-result → extract sources from event.output.results
  └─ finish → yield collected sources

API Route:
  ├─ Stream text chunks
  └─ Append: ---SOURCES_JSON---[{title, url, ...}]

Frontend Hook:
  ├─ Accumulate text
  ├─ On complete: split by delimiter
  └─ Parse JSON, call updateMessage(id, content, sources)
```

---

## Key Technical Decisions

### Why Custom Streaming Instead of useChat?

| useChat (AI SDK) | useChatApi (Custom) |
|-----------------|---------------------|
| Manages own state | Uses existing Zustand store |
| Single conversation | Multi-session with persistence |
| Limited source control | Full control over source extraction |

### Why Delimiter for Sources?

AI SDK v5's `toTextStreamResponse()` only streams text. Tool results aren't included. Options:

1. ~~`toDataStreamResponse()`~~ - Not available in v5
2. **Consume fullStream, append JSON** ✓

The delimiter approach:
- Simple to implement
- Works with text streaming
- Frontend can parse reliably

### Why `event.output` not `event.result`?

AI SDK v5 changed the property name for tool execution results. The `tool-result` event has:
```typescript
{
    type: 'tool-result',
    toolName: 'search',
    output: { results: [...sources...] }  // ← Not 'result'
}
```

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENROUTER_API_KEY` | Yes | Model API access |
| `TAVILY_API_KEY` | Yes | Web search API |

---

## Extension Points

### Adding a New Tool
1. Define tool in `tools.ts` with `inputSchema`
2. Return structured data in `execute()`
3. Update `streamAgentWithSources` to extract results

### Adding a New Model
1. Add to `AVAILABLE_MODELS` in `models.ts`
2. Test tool calling works
3. Add to `getToolsForModel()` if schema differs
