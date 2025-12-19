# Maxwell File Map

> Quick reference for LLMs to locate files by purpose.

## Directory Structure

```
maxwell-v2/
├── app/                          # Next.js App Router
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # POST /api/chat - streaming endpoint
│   ├── components/               # React components
│   │   ├── AgentSphere.tsx       # 3D animated sphere (R3F)
│   │   ├── ChatHistory.tsx       # Session sidebar
│   │   ├── InputInterface.tsx    # Chat input UI
│   │   ├── ResponseDisplay.tsx   # Agent message + sources panel
│   │   ├── SmallGhostLogo.tsx    # Animated ghost logo
│   │   └── UserMessage.tsx       # User message bubble
│   ├── hooks/
│   │   └── use-chat-api.ts       # Streaming API hook with source parsing
│   ├── lib/                      # Core business logic
│   │   ├── agent.ts              # LLM orchestration (streamAgentWithSources)
│   │   ├── env.ts                # Environment variable validation
│   │   ├── models.ts             # Model registry + metadata
│   │   ├── prompts.ts            # System prompts
│   │   └── tools.ts              # Tool definitions (Tavily search)
│   ├── types.ts                  # Shared TypeScript types
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page (main UI)
│   └── store.ts                  # Zustand state store
├── documentation/                # LLM-friendly docs (you are here)
│   ├── README.md                 # Index + rules for LLMs
│   ├── ARCHITECTURE.md           # System design, data flow
│   ├── FILE-MAP.md               # This file
│   ├── CONVENTIONS.md            # Coding patterns, style rules
│   ├── PARAMETERS.md             # Configurable values
│   ├── TYPES.md                  # TypeScript interfaces
│   ├── API.md                    # API endpoint reference
│   └── PROMPTS.md                # System prompts guide
├── confluence/                   # External API documentation
│   ├── tavily.md                 # Tavily API reference
│   └── design-guide.md           # UI design guide
├── public/                       # Static assets
├── .env.local                    # Environment variables (not committed)
├── env.sample                    # Example env file
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## File Purposes

### API Layer

| File | Purpose | Key Exports |
|------|---------|-------------|
| `app/api/chat/route.ts` | Streaming chat endpoint | `POST`, `SOURCES_DELIMITER` |

### Core Logic (`app/lib/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `agent.ts` | LLM orchestration | `runAgent()`, `streamAgentWithSources()` |
| `env.ts` | Env var validation | `env.openRouterApiKey()`, `env.tavilyApiKey()` |
| `models.ts` | Model registry | `AVAILABLE_MODELS`, `DEFAULT_MODEL`, `getToolsForModel()` |
| `prompts.ts` | System prompts | `SYSTEM_PROMPT` |
| `tools.ts` | Tool definitions | `searchTool`, `searchToolGemini`, `getToolsForModel()` |

### Hooks (`app/hooks/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `use-chat-api.ts` | Streaming + source parsing | `useChatApi()` |

### Components (`app/components/`)

| File | Purpose |
|------|---------|
| `AgentSphere.tsx` | Animated 3D sphere using React Three Fiber |
| `ChatHistory.tsx` | Sidebar with session list |
| `InputInterface.tsx` | Chat input with send button |
| `ResponseDisplay.tsx` | Agent messages with markdown + sources panel |
| `UserMessage.tsx` | User message bubble |

### State

| File | Purpose | Key Exports |
|------|---------|-------------|
| `app/store.ts` | Zustand store | `useChatStore` |
| `app/types.ts` | Shared types | `AgentState`, `Message`, `Source`, `ChatSession` |

---

## What to Edit For...

| Task | File(s) to Edit |
|------|-----------------|
| Change system prompt | `app/lib/prompts.ts` |
| Add new model | `app/lib/models.ts` |
| Modify search behavior | `app/lib/tools.ts` |
| Change agent loop steps | `app/lib/agent.ts` (stopWhen) |
| Source extraction logic | `app/lib/agent.ts` (streamAgentWithSources) |
| Source parsing on client | `app/hooks/use-chat-api.ts` |
| Sources panel UI | `app/components/ResponseDisplay.tsx` |
| Citation rendering | `app/components/ResponseDisplay.tsx` |
| Add new API endpoint | `app/api/[route]/route.ts` |
| Add shared types | `app/types.ts` |
| Change styling | `app/globals.css` or component |

---

## Import Patterns

```typescript
// From components
import ResponseDisplay from '@/app/components/ResponseDisplay';
import InputInterface from '@/app/components/InputInterface';

// From lib
import { runAgent, streamAgentWithSources } from '@/app/lib/agent';
import { SYSTEM_PROMPT } from '@/app/lib/prompts';
import { searchTool, getToolsForModel } from '@/app/lib/tools';
import { AVAILABLE_MODELS, DEFAULT_MODEL } from '@/app/lib/models';
import { env } from '@/app/lib/env';

// From hooks
import { useChatApi } from '@/app/hooks/use-chat-api';

// From store
import { useChatStore } from '@/app/store';

// From types
import type { AgentState, Source, Message, ChatSession } from '@/app/types';
```

---

## Critical Files for Source/Citation Feature

The **source extraction pipeline** spans these files:

1. `app/lib/tools.ts` - Returns `{ results: Source[] }` from Tavily
2. `app/lib/agent.ts` - Extracts from `event.output.results` in fullStream
3. `app/api/chat/route.ts` - Appends `---SOURCES_JSON---` + JSON
4. `app/hooks/use-chat-api.ts` - Parses delimiter, calls `updateMessage(id, content, sources)`
5. `app/store.ts` - Stores sources in message
6. `app/components/ResponseDisplay.tsx` - Renders sources panel + citations
