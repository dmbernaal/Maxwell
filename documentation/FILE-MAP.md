# Maxwell File Map

> Quick reference for LLMs to locate files by purpose.

## Directory Structure

```
maxwell-v2/
├── app/                          # Next.js App Router
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # POST /api/chat endpoint
│   ├── components/               # React components
│   │   ├── AgentSphere.tsx       # 3D animated sphere (R3F)
│   │   ├── InputInterface.tsx    # Chat input UI
│   │   ├── ResponseDisplay.tsx   # Message display
│   │   └── UserMessage.tsx       # User message bubble
│   ├── lib/                      # Core business logic
│   │   ├── agent.ts              # LLM orchestration (runAgent)
│   │   ├── env.ts                # Environment variable validation
│   │   ├── models.ts             # Model registry + metadata
│   │   ├── prompts.ts            # System prompts
│   │   └── tools.ts              # Tool definitions (search)
│   ├── types/
│   │   └── index.ts              # Shared TypeScript types
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── store.ts                  # Zustand state store
├── documentation/                # LLM-friendly docs (you are here)
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── FILE-MAP.md
│   ├── CONVENTIONS.md
│   ├── PARAMETERS.md
│   ├── TYPES.md
│   └── API.md
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
| `app/api/chat/route.ts` | Chat endpoint | `POST` function |

### Core Logic (`app/lib/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `agent.ts` | LLM orchestration | `runAgent()` |
| `env.ts` | Env var validation | `env.openRouterApiKey()`, `env.tavilyApiKey()` |
| `models.ts` | Model registry | `AVAILABLE_MODELS`, `DEFAULT_MODEL`, `getToolsForModel()` |
| `prompts.ts` | System prompts | `SYSTEM_PROMPT` |
| `tools.ts` | Tool definitions | `searchTool`, `searchToolGemini`, `getToolsForModel()` |

### Components (`app/components/`)

| File | Purpose |
|------|---------|
| `AgentSphere.tsx` | Animated 3D sphere using React Three Fiber |
| `InputInterface.tsx` | Chat input with send button |
| `ResponseDisplay.tsx` | Renders assistant messages |
| `UserMessage.tsx` | Renders user messages |

### Types (`app/types/`)

| File | Purpose |
|------|---------|
| `index.ts` | Shared type definitions |

### State

| File | Purpose |
|------|---------|
| `app/store.ts` | Zustand store for UI state |

---

## What to Edit For...

| Task | File(s) to Edit |
|------|-----------------|
| Change system prompt | `app/lib/prompts.ts` |
| Add new model | `app/lib/models.ts` |
| Modify search behavior | `app/lib/tools.ts` |
| Change agent loop steps | `app/lib/agent.ts` (stopWhen) |
| Add new API endpoint | `app/api/[route]/route.ts` |
| Add new component | `app/components/[Name].tsx` |
| Add shared types | `app/types/index.ts` |
| Change styling | `app/globals.css` or component |

---

## Import Patterns

```typescript
// From components
import { SomeComponent } from '@/app/components/SomeComponent';

// From lib
import { runAgent } from '@/app/lib/agent';
import { SYSTEM_PROMPT } from '@/app/lib/prompts';
import { searchTool, getToolsForModel } from '@/app/lib/tools';
import { AVAILABLE_MODELS, DEFAULT_MODEL } from '@/app/lib/models';
import { env } from '@/app/lib/env';

// From types
import type { AgentState, Source, Citation } from '@/app/types';
```
