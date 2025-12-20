# Maxwell Documentation

> LLM-friendly documentation for the Maxwell Search Agent.

## Quick Start

1. Read `ARCHITECTURE.md` for system overview
2. Check `FILE-MAP.md` to locate files
3. See `API.md` for endpoint details
4. Review `TYPES.md` for interfaces

## File Index

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | System design, component relationships, data flow |
| `FILE-MAP.md` | Directory structure, file purposes, import patterns |
| `CONVENTIONS.md` | Coding patterns, naming rules, style guide |
| `PARAMETERS.md` | Configurable values, environment variables |
| `TYPES.md` | TypeScript interfaces and types |
| `API.md` | HTTP endpoint reference with examples |
| `PROMPTS.md` | System prompts and agent instructions |

## Rules for AI Assistants

### DO

✅ Read `FILE-MAP.md` first to locate relevant files  
✅ Check `TYPES.md` before creating new types  
✅ Follow patterns in `CONVENTIONS.md`  
✅ Use existing utilities from `app/lib/`  
✅ Keep documentation updated when making changes  

### DON'T

❌ Create duplicate types - check `app/types.ts` first  
❌ Add new dependencies without clear justification  
❌ Modify the sources pipeline without understanding the flow  
❌ Ignore TypeScript errors - fix them  

## Current System Status

| Component | Status |
|-----------|--------|
| Chat API (`/api/chat`) | ✅ Working |
| Search Tool (Tavily) | ✅ Working |
| Source Extraction | ✅ Working |
| Citation Rendering | ✅ Working |
| Model Switching | ✅ Working |
| Multi-Session Chat | ✅ Working |

## Maxwell Verified Search (Feature)

| Phase | Component | Status |
|-------|-----------|--------|
| 0 | Foundation (types, env, constants) | ✅ Complete |
| 1 | Prompts (LLM instructions) | ✅ Complete |
| 2 | Decomposition (query → sub-queries) | ✅ Complete |
| 3 | Parallel Search | ✅ Complete |
| 4 | Synthesis | ✅ Complete |
| 5 | Embeddings | ✅ Complete |
| 6-8 | Verification | ✅ Complete |
| 9 | Orchestrator + API | ✅ Complete |
| 10-12 | Frontend | 🔲 Pending |

## Key Technical Details

### Source Flow

```
Tavily API → tools.ts → agent.ts (fullStream) → route.ts (delimiter) → use-chat-api.ts (parse) → store → ResponseDisplay
```

### Sources Delimiter

Text and sources are separated by:
```
---SOURCES_JSON---
```

Frontend parses this to extract `Source[]` array.

### Model-Specific Tools

Gemini uses `{ queries: string[] }` schema.  
Others use `{ query: string }` schema.  
See `getToolsForModel()` in `tools.ts`.

## Getting Started for New Features

1. **Read the architecture** - Understand the flow
2. **Find the right file** - Use FILE-MAP.md
3. **Check types** - Use existing or extend properly
4. **Follow conventions** - Keep code consistent
5. **Test the pipeline** - Sources flow through many files
6. **Update docs** - Keep this folder current
