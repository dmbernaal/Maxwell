# Maxwell File Map

> Quick reference for LLMs to locate files by purpose.

## Directory Structure

```
maxwell-v2/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts          # POST /api/chat - streaming endpoint
│   │   └── maxwell/              # Maxwell API (Phase 9)
│   │       └── route.ts          # SSE streaming endpoint
│   ├── components/               # React components
│   │   ├── AgentSphere.tsx       # 3D animated sphere (R3F)
│   │   ├── ChatHistory.tsx       # Session sidebar
│   │   ├── InputInterface.tsx    # Chat input UI
│   │   ├── ResponseDisplay.tsx   # Agent message + sources panel
│   │   ├── SmallGhostLogo.tsx    # Animated ghost logo
│   │   ├── UserMessage.tsx       # User message bubble
│   │   └── maxwell/              # Maxwell UI components (Phase 11)
│   ├── hooks/
│   │   ├── use-chat-api.ts       # Streaming API hook with source parsing
│   │   └── use-maxwell.ts        # Maxwell hook (Phase 10)
│   ├── lib/                      # Core business logic
│   │   ├── agent.ts              # LLM orchestration (streamAgentWithSources)
│   │   ├── env.ts                # Environment variable validation
│   │   ├── models.ts             # Model registry + metadata
│   │   ├── prompts.ts            # System prompts
│   │   ├── tools.ts              # Tool definitions (Tavily search)
│   │   └── maxwell/              # Maxwell verified search agent
│   │       ├── types.ts          # All Maxwell TypeScript interfaces
│   │       ├── env.ts            # Maxwell environment validation
│   │       ├── constants.ts      # Configuration, thresholds, models
│   │       ├── prompts.ts        # LLM prompts (Phase 1)
│   │       ├── decomposer.ts     # Query decomposition (Phase 2)
│   │       ├── searcher.ts       # Parallel search (Phase 3)
│   │       ├── synthesizer.ts    # Answer synthesis (Phase 4)
│   │       ├── embeddings.ts     # Embedding utilities (Phase 5)
│   │       ├── verifier.ts       # Multi-signal verification (Phase 6-8)
│   │       └── index.ts          # Main orchestrator (Phase 9)
│   ├── types.ts                  # Shared TypeScript types
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page (main UI)
│   └── store.ts                  # Zustand state store
├── tests/                        # Test files
│   └── test-foundation.ts        # Phase 0 foundation test
├── documentation/                # LLM-friendly docs (you are here)
│   ├── README.md                 # Index + rules for LLMs
│   ├── ARCHITECTURE.md           # System design, data flow
│   ├── FILE-MAP.md               # This file
│   ├── CHANGELOG.md              # Phase completion log
│   ├── CONVENTIONS.md            # Coding patterns, style rules
│   ├── PARAMETERS.md             # Configurable values
│   ├── TYPES.md                  # TypeScript interfaces
│   ├── API.md                    # API endpoint reference
│   └── PROMPTS.md                # System prompts guide
├── confluence/                   # External API documentation
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

### Maxwell Verified Search (`app/lib/maxwell/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `types.ts` | All Maxwell interfaces | `SubQuery`, `MaxwellSource`, `VerifiedClaim`, `MaxwellState`, etc. |
| `env.ts` | Environment validation | `getMaxwellEnvConfig()`, `validateMaxwellEnv()` |
| `constants.ts` | Config values | `DECOMPOSITION_MODEL`, `EMBEDDING_MODEL`, thresholds |
| `prompts.ts` | LLM prompts | `DECOMPOSITION_PROMPT`, `SYNTHESIS_PROMPT`, `createDecompositionPrompt()`, etc. |
| `decomposer.ts` | Query → sub-queries | `decomposeQuery()`, `validateDecompositionOutput()` |
| `searcher.ts` | Parallel search | `parallelSearch()`, `getSearchStats()`, `validateSearchOutput()` |
| `synthesizer.ts` | Answer synthesis | `synthesize()`, `synthesizeComplete()`, `countCitations()` |
| `embeddings.ts` | Embedding utilities | `embedText()`, `embedTexts()`, `cosineSimilarity()`, `findTopMatches()` |
| `verifier.ts` | Multi-signal verification | `verifyClaims()`, `extractClaims()`, `chunkSourcesIntoPassages()`, `checkEntailment()`, `aggregateSignals()` |
| `index.ts` | Main orchestrator | `runMaxwell()`, `runMaxwellComplete()`, re-exports |

### Hooks (`app/hooks/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `use-chat-api.ts` | Base product streaming | `useChatApi()` |
| `use-maxwell.ts` | Maxwell SSE streaming | `useMaxwell()`, `usePhaseInfo()` |

### Components (`app/components/`)

| File | Purpose |
|------|---------|
| `AgentSphere.tsx` | Animated 3D sphere using React Three Fiber |
| `ChatHistory.tsx` | Sidebar with session list |
| `InputInterface.tsx` | Chat input with mode selector |
| `ModeDropdown.tsx` | Search mode selector (Normal/Maxwell) |
| `ResponseDisplay.tsx` | Agent messages with markdown + sources panel |
| `UserMessage.tsx` | User message bubble |

### Maxwell Components (`app/components/maxwell/`)

| File | Purpose |
|------|---------|
| `MaxwellCanvas.tsx` | Right panel container for Maxwell data |
| `PhaseProgress.tsx` | Pipeline phase indicators |
| `SubQueryList.tsx` | Sub-query list with search status |
| `SourcesPanel.tsx` | Collapsible sources list |
| `VerificationPanel.tsx` | Claims with verdicts and evidence |
| `index.ts` | Barrel exports |

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
| Maxwell mode switching | `app/components/ModeDropdown.tsx` |
| Maxwell canvas layout | `app/components/maxwell/MaxwellCanvas.tsx` |
| Maxwell phase display | `app/components/maxwell/PhaseProgress.tsx` |
| Maxwell verification UI | `app/components/maxwell/VerificationPanel.tsx` |
| Maxwell prompts | `app/lib/maxwell/prompts.ts` |
| Maxwell orchestration | `app/lib/maxwell/orchestrator.ts` |

---

## Import Patterns

```typescript
// From components
import ResponseDisplay from '@/app/components/ResponseDisplay';
import InputInterface from '@/app/components/InputInterface';
import ModeDropdown from '@/app/components/ModeDropdown';

// From Maxwell components
import { MaxwellCanvas, PhaseProgress, VerificationPanel } from '@/app/components/maxwell';

// From lib
import { runAgent, streamAgentWithSources } from '@/app/lib/agent';
import { SYSTEM_PROMPT } from '@/app/lib/prompts';
import { searchTool, getToolsForModel } from '@/app/lib/tools';
import { AVAILABLE_MODELS, DEFAULT_MODEL } from '@/app/lib/models';
import { env } from '@/app/lib/env';

// From Maxwell lib
import { runMaxwellPipeline } from '@/app/lib/maxwell/orchestrator';
import type { MaxwellSource, VerificationOutput } from '@/app/lib/maxwell/types';

// From hooks
import { useChatApi } from '@/app/hooks/use-chat-api';
import { useMaxwell } from '@/app/hooks/use-maxwell';

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

