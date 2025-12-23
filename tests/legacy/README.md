# Legacy Phase Tests

> **Status:** Archived (Initial Build Phase)  
> **Note:** These tests were created during the initial development phases (Phases 0-9) before the multi-endpoint architecture was implemented.

## What Are These?

These are **manual integration tests** that were used to validate each phase of Maxwell's development:

| Test File | Phase | Purpose |
|-----------|-------|---------|
| `test-foundation.ts` | Phase 0 | Types, constants, environment validation |
| `test-prompts.ts` | Phase 1 | LLM prompt compilation |
| `test-decomposer.ts` | Phase 2 | Query decomposition |
| `test-searcher.ts` | Phase 3 | Tavily search integration |
| `test-synthesizer.ts` | Phase 4 | Answer synthesis |
| `test-embeddings.ts` | Phase 5 | Embedding generation |
| `test-verifier.ts` | Phase 6 | Basic verification |
| `test-verifier-signals.ts` | Phase 7 | NLI, numeric checks, aggregation |
| `test-verifier-full.ts` | Phase 8 | Full verification pipeline |
| `test-orchestrator.ts` | Phase 9 | E2E orchestrator (monolithic) |

## Why Are They Here?

These tests are preserved for:
1. **Historical reference** - Shows the development progression
2. **Individual component testing** - Still useful for debugging specific phases
3. **API validation** - Confirms external APIs (Tavily, OpenRouter) are working

## How to Run (If Needed)

```bash
# Individual test
npx tsx --env-file=.env tests/legacy/test-decomposer.ts

# Requires API keys in .env:
# - OPENROUTER_API_KEY
# - TAVILY_API_KEY
```

## Current Tests

For the current architecture, use Jest tests in `__tests__/`:

```bash
npm test                    # Run all Jest tests
npm test -- --testPathPattern=unit    # Unit tests only (no API)
npm test -- --testPathPattern=integration  # Integration tests (needs API)
```

