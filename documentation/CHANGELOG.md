# Maxwell Development Changelog

This file tracks the completion of each implementation phase.

---

## Phase 0: Foundation
**Status**: ✅ Complete  
**Completed**: December 19, 2024

### Files Created
- `app/lib/maxwell/types.ts` - All TypeScript interfaces (~320 lines)
- `app/lib/maxwell/env.ts` - Environment validation with fail-fast pattern
- `app/lib/maxwell/constants.ts` - Configuration constants and thresholds
- `tests/test-foundation.ts` - Foundation test script

### Directories Created
- `app/lib/maxwell/` - Core Maxwell business logic
- `app/api/maxwell/` - API endpoints (empty, for Phase 9)
- `app/components/maxwell/` - UI components (empty, for Phase 11)
- `tests/` - Test files

### Types Defined
- Decomposition: `SubQuery`, `DecompositionOutput`
- Search: `MaxwellSource`, `SearchMetadata`, `SearchOutput`
- Synthesis: `SynthesisOutput`
- Verification: `ExtractedClaim`, `Passage`, `NumericCheck`, `VerifiedClaim`, `VerificationOutput`, `VerificationSummary`
- Orchestrator: `PhaseStatus`, `MaxwellPhases`, `MaxwellResponse`
- Events: `PhaseStartEvent`, `PhaseCompleteEvent`, `SearchProgressEvent`, `SynthesisChunkEvent`, `VerificationProgressEvent`, `CompleteEvent`, `ErrorEvent`, `MaxwellEvent`
- Frontend: `ExecutionPhase`, `PhaseDurations`, `MaxwellState`

### Constants Defined
- Models: `DECOMPOSITION_MODEL`, `SYNTHESIS_MODEL`, `CLAIM_EXTRACTION_MODEL`, `NLI_MODEL`, `EMBEDDING_MODEL`
- Thresholds: `HIGH_CONFIDENCE_THRESHOLD` (0.72), `MEDIUM_CONFIDENCE_THRESHOLD` (0.42)
- Limits: `MAX_SUB_QUERIES` (5), `RESULTS_PER_QUERY` (5), `MAX_CLAIMS_TO_VERIFY` (12)

### Tests Passed
- [x] `npm run build` - TypeScript compiles without errors
- [x] `npx tsx --env-file=.env tests/test-foundation.ts` - All checks pass

### Notes
- Using OpenRouter for embeddings (`qwen/qwen3-embedding-8b`) instead of OpenAI
- No `OPENAI_API_KEY` required - all API calls go through OpenRouter
- Named Maxwell source type `MaxwellSource` to avoid conflict with existing `Source` type

---

## Phase 1: Prompts
**Status**: ✅ Complete  
**Completed**: December 19, 2024

### Files Created
- `app/lib/maxwell/prompts.ts` - All LLM prompts and helper functions

### Prompts Defined
| Prompt | Purpose | Used In |
|--------|---------|---------|
| `DECOMPOSITION_PROMPT` | Break query into 3-5 sub-queries | Phase 2 |
| `SYNTHESIS_PROMPT` | Generate answer with [n] citations | Phase 4 |
| `CLAIM_EXTRACTION_PROMPT` | Extract verifiable factual claims | Phase 6 |
| `NLI_PROMPT` | Determine SUPPORTED/CONTRADICTED/NEUTRAL | Phase 7 |

### Helper Functions
- `fillPromptTemplate()` - Replace `{key}` placeholders
- `formatSourcesForPrompt()` - Format sources (NO truncation)
- `createDecompositionPrompt()` - Fill with query + current date
- `createSynthesisPrompt()` - Fill with sources + query + date
- `createClaimExtractionPrompt()` - Fill with answer text
- `createNLIPrompt()` - Fill with claim + evidence

### Key Features
- **Date Injection**: Decomposition and Synthesis prompts receive `currentDate` for temporal queries
- **No Truncation**: `formatSourcesForPrompt` passes full source text to preserve quality
- **Strict JSON Output**: Every prompt enforces structured output schemas

### Tests Passed
- [x] Date injection verified (current year in prompts)
- [x] No truncation verified (2000+ char snippets preserved)
- [x] Template filling verified for all prompt types
- [x] Empty sources handling verified

---

## Phase 2: Decomposition
**Status**: ✅ Complete  
**Completed**: December 19, 2024

### Files Created
- `app/lib/maxwell/decomposer.ts` - Query decomposition with structured output

### Functions Implemented
| Function | Purpose |
|----------|---------|
| `decomposeQuery(query)` | Breaks complex query into 3-5 focused sub-queries |
| `validateDecompositionOutput(output)` | Validates output structure and IDs |

### Key Features
- **Structured Output**: Uses `generateObject` with Zod schema for guaranteed valid JSON
- **Date Awareness**: Uses `createDecompositionPrompt()` to inject current date
- **ID Normalization**: Ensures sub-queries are always `q1`, `q2`, `q3`...
- **Validation**: Runtime checks for output integrity

### Tests Passed
- [x] Basic query decomposition ("Compare Tesla and BYD revenue growth")
- [x] Temporal query decomposition (found "December 19 2025" in queries)
- [x] Empty query error handling
- [x] Whitespace-only query error handling


