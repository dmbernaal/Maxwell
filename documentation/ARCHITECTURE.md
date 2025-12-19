# Maxwell Architecture

> **Last Updated:** December 19, 2025  
> **Status:** Production-ready backend, frontend in progress

## Overview

Maxwell is a **search-augmented AI assistant** (similar to Perplexity) that:
1. Takes user questions
2. Searches the web for real-time information
3. Returns answers with citations

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MAXWELL SYSTEM                               │
│                                                                       │
│  ┌──────────┐     ┌─────────────┐     ┌──────────────────────────┐  │
│  │  Next.js │     │   AI SDK    │     │     OpenRouter API       │  │
│  │  Frontend│────▶│  (ai pkg)   │────▶│  (model routing)         │  │
│  │          │     │             │     │                          │  │
│  │  useChat │     │ streamText  │     │  ┌─────┐ ┌──────┐ ┌───┐ │  │
│  │  hook    │     │ stopWhen    │     │  │Gemini│ │Claude│ │...│ │  │
│  └──────────┘     │ tools       │     │  └─────┘ └──────┘ └───┘ │  │
│                   └──────┬──────┘     └──────────────────────────┘  │
│                          │                                           │
│                          ▼                                           │
│                   ┌─────────────┐                                    │
│                   │ Tavily API  │                                    │
│                   │ (web search)│                                    │
│                   └─────────────┘                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. API Layer (`/app/api/chat/route.ts`)

**Purpose:** HTTP endpoint for chat requests

**Flow:**
```
POST /api/chat
  → Parse messages + model from request body
  → Call runAgent() with messages
  → Return streaming response via toTextStreamResponse()
```

**Key Points:**
- Uses `export const maxDuration = 60` for Vercel timeout
- Returns SSE (Server-Sent Events) stream

---

### 2. Agent (`/app/lib/agent.ts`)

**Purpose:** Orchestrates LLM and tools

**Key Function:** `runAgent(messages, modelId)`

**AI SDK v5 Configuration:**
```typescript
streamText({
    model: openrouter(modelId),     // OpenRouter provider
    system: SYSTEM_PROMPT,          // From prompts.ts
    messages,                       // User conversation
    tools,                          // From tools.ts (search)
    stopWhen: stepCountIs(5),       // Multi-step loop control
})
```

**Why `stopWhen` not `maxSteps`:**
AI SDK v5 changed the API. `maxSteps` is deprecated in favor of `stopWhen: stepCountIs(n)`.

---

### 3. Tools (`/app/lib/tools.ts`)

**Purpose:** Define executable functions the LLM can call

**Current Tools:**
| Tool | Description | Provider |
|------|-------------|----------|
| `searchTool` | Web search via Tavily | OpenAI, Anthropic |
| `searchToolGemini` | Web search (array input) | Google |

**Why Two Versions:**
Gemini sends `{ queries: ["..."] }`, others send `{ query: "..." }`. Different schema requirements.

**AI SDK v5 Tool Signature:**
```typescript
tool({
    description: 'What this tool does',
    inputSchema: z.object({ ... }),  // NOT 'parameters'
    execute: async ({ ... }) => { ... }
})
```

---

### 4. Models (`/app/lib/models.ts`)

**Purpose:** Model registry with metadata

**Available Models:**
| Model ID | Provider | Status |
|----------|----------|--------|
| `google/gemini-3-flash-preview` | Google | ✅ Default |
| `google/gemini-3-pro-preview` | Google | ✅ |
| `anthropic/claude-haiku-4.5` | Anthropic | ✅ |
| `anthropic/claude-sonnet-4.5` | Anthropic | ✅ |

**Disabled Models (provider bugs):**
- OpenAI GPT-5.x: Tool schema serialization fails
- Claude Opus 4.5: Sends empty tool inputs

---

### 5. Prompts (`/app/lib/prompts.ts`)

**Purpose:** System prompts that guide LLM behavior

**Current Prompt:** Instructs LLM to:
- Search for real-time information
- Cite sources using `[1]`, `[2]` format
- Be concise but thorough

---

## Data Flow

### Request Flow
```
1. User sends message via frontend
2. POST /api/chat receives { messages, model }
3. runAgent() calls streamText()
4. LLM receives system prompt + messages + tool definitions
5. LLM decides: respond OR call tool
   └─ If tool: Execute search → return results → LLM continues
6. Stream response back to frontend
```

### Multi-Step Example
```
Step 1: User asks "What's Bitcoin's price?"
Step 2: LLM calls search({ query: "bitcoin price usd" })
Step 3: Tavily returns 5 results
Step 4: LLM generates answer with citations [1][2][3]
Step 5: Stream complete (finishReason: 'stop')
```

---

## Key Decisions & Rationale

### Why OpenRouter + AI SDK?

| Component | Role |
|-----------|------|
| AI SDK | Streaming, tools, agent loops (framework) |
| OpenRouter | Model routing, single API key (provider) |

**They're complementary, not redundant.** AI SDK needs a provider; OpenRouter is that provider.

### Why Tavily for Search?

- Purpose-built for LLM consumption
- Returns clean, structured results
- Includes `answer` field (pre-summarized)
- Better than scraping or Google API

### Why Model-Specific Tool Schemas?

Different LLMs send tool inputs differently:
- **Gemini:** `{ queries: ["..."] }` (array)
- **Claude/OpenAI:** `{ query: "..." }` (string)

We detect provider and select appropriate schema.

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
2. Add to tools registry
3. Update `getToolsForModel()` if model-specific

### Adding a New Model
1. Add to `AVAILABLE_MODELS` in `models.ts`
2. Set `toolsSupported: true/false`
3. Test with curl before enabling

### Changing Behavior
- Edit `SYSTEM_PROMPT` in `prompts.ts`
- Adjust `stopWhen(stepCountIs(n))` for more/fewer steps
- Modify Tavily params (`max_results`, `search_depth`)
