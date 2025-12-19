# Maxwell Documentation

> **Purpose:** LLM-friendly documentation for AI coding assistants to quickly understand and navigate this codebase.

This folder contains structured documentation designed to help AI agents (Cursor, Claude, Copilot, etc.) work effectively with this project.

## Quick Start for LLMs

1. Read `ARCHITECTURE.md` first — understand the system design
2. Read `FILE-MAP.md` — know where everything is
3. Read `CONVENTIONS.md` — follow the coding patterns
4. Check `PARAMETERS.md` — what's configurable

## Files

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | System design, data flow, key decisions |
| `FILE-MAP.md` | Directory structure with file purposes |
| `CONVENTIONS.md` | Coding patterns, naming, style rules |
| `PARAMETERS.md` | All configurable values (env vars, constants) |
| `TYPES.md` | TypeScript interfaces and type definitions |
| `API.md` | API endpoints, request/response formats |
| `PROMPTS.md` | System prompts and prompt engineering notes |

## Rules for LLMs Working on This Project

1. **Read documentation BEFORE editing** — Don't guess, check the docs
2. **Follow existing patterns** — Look at similar files before creating new ones
3. **Update docs when changing architecture** — Keep docs in sync
4. **Use TypeScript strictly** — No `any` unless documented and justified
5. **Test builds before committing** — Run `npm run build`
