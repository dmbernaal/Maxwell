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

---

## Phase 3: Parallel Search
**Status**: ✅ Complete  
**Completed**: December 19, 2024

### Files Created
- `app/lib/maxwell/searcher.ts` - Parallel search with deduplication

### Functions Implemented
| Function | Purpose |
|----------|---------|
| `parallelSearch(subQueries, onProgress?)` | Execute all queries in parallel |
| `getSearchStats(metadata)` | Calculate success/failure stats |
| `validateSearchOutput(output)` | Validate output structure |

### Key Features
- **Parallel Execution**: Uses `Promise.all` for minimal latency (~961ms for 2 queries)
- **Deduplication**: Filters duplicate URLs to keep context window clean
- **Fail-Safe**: Throws error if NO sources found (prevents hallucinations in synthesis)
- **Sequential IDs**: Renumbers sources after dedup (`s1`, `s2`, `s3`...)
- **Progress Callbacks**: Optional callback for UI progress updates
- **Partial Failure OK**: One query failing doesn't kill the entire request

### Tests Passed
- [x] Real API search with 10 sources returned
- [x] Progress callbacks fire correctly
- [x] Deduplication verified (no duplicate URLs)
- [x] ID sequencing verified (s1, s2, s3...)
- [x] Empty input throws error
- [x] Stats calculation correct

---

## Phase 4: Synthesis
**Status**: ✅ Complete  
**Completed**: December 19, 2024

### Files Created
- `app/lib/maxwell/synthesizer.ts` - Answer synthesis with streaming

### Functions Implemented
| Function | Purpose |
|----------|---------|
| `synthesize(query, sources)` | Async generator for streaming response |
| `synthesizeComplete(query, sources)` | Non-streaming wrapper |
| `countCitations(text)` | Count `[n]` occurrences |
| `validateSynthesisOutput(output)` | Validate output structure |

### Key Features
- **Streaming**: Async generator yields chunks for real-time UI (103 chunks in test)
- **Citation Extraction**: Regex `/\[(\d+)\]/g` finds all citations, normalized to `s1`, `s2`
- **Hallucination Detection**: Warns if LLM cites `[5]` when only 3 sources exist
- **Date Injection**: Uses `createSynthesisPrompt()` from Phase 1
- **Empty Source Handling**: Graceful "couldn't find sources" message
- **AI SDK v5**: Uses `maxOutputTokens` parameter (not `maxTokens`)

### Tests Passed
- [x] Real streaming (103 chunks, 7020ms, 1333 chars)
- [x] Citations detected (s1, s2 both used)
- [x] Citation counting utility works
- [x] Empty sources handled gracefully
- [x] Output validation works

---

## Phase 5: Embeddings
**Status**: ✅ Complete  
**Completed**: December 19, 2024

### Files Created
- `app/lib/maxwell/embeddings.ts` - Vector embeddings via OpenRouter

### Functions Implemented
| Function | Purpose |
|----------|---------|
| `embedText(text)` | Single text → vector (4096 dimensions) |
| `embedTexts(texts)` | Batch texts → vectors |
| `cosineSimilarity(a, b)` | Compare two vectors (-1 to 1) |
| `findTopMatches(query, items, topK)` | Find best matching items |

### Key Features
- **Native Fetch**: Direct call to OpenRouter API (no additional SDK)
- **Model**: `qwen/qwen3-embedding-8b` (4096 dimensions)
- **Batching**: Efficient batch embedding requests
- **Math**: Proper cosine similarity implementation
- **Top-K**: Utility to find best matching items

### Tests Passed
- [x] Single embedding (4096 dimensions)
- [x] Batch embedding (3 vectors with consistent dimensions)
- [x] Cosine similarity math (identical=1, orthogonal=0, opposite=-1)
- [x] Top matches (correct ranking by similarity)
- [x] Empty input handling

---

## Phase 6: Verification Core
**Status**: ✅ Complete  
**Completed**: December 19, 2024

### Files Created/Modified
- `app/lib/maxwell/verifier.ts` - Core verification logic
- `app/lib/maxwell/types.ts` - Added `RetrievalResult` interface

### Functions Implemented
| Function | Purpose |
|----------|---------|
| `extractClaims(answer)` | Extract factual claims from answer |
| `chunkSourcesIntoPassages(sources)` | Split sources into sentence passages |
| `retrieveEvidence(...)` | Find best matching passage for claim |

### Key Features
- **Intl.Segmenter**: Robust sentence splitting (handles "Mr.", "U.S.A." correctly)
- **Sliding Windows**: Creates 1, 2, 3-sentence passages for context
- **Citation Mismatch Detection**: Flags when best evidence comes from uncited source
- **LLM Claim Extraction**: Uses Gemini Flash for structured claim output

### Tests Passed
- [x] Chunking handles abbreviations correctly (9 passages from 2 sources)
- [x] Claim extraction returns valid schema with citations
- [x] Evidence retrieval finds correct source (0.9825 similarity)
- [x] Citation mismatch correctly detected
- [x] Empty answer handling

---

## Phase 7: Verification Signals
**Status**: ✅ Complete  
**Completed**: December 19, 2024

### Files Modified
- `app/lib/maxwell/verifier.ts` - Added signal functions
- `app/lib/maxwell/types.ts` - Added `AggregatedVerdict` interface

### Functions Added
| Function | Purpose |
|----------|---------|
| `checkEntailment(claim, evidence)` | NLI via LLM |
| `extractNumbers(text)` | Regex-based number extraction |
| `normalizeNumber(numStr)` | Parse "$96.8 billion" → 96.8e9 |
| `checkNumericConsistency(...)` | Compare claim vs evidence numbers |
| `aggregateSignals(...)` | Combine all signals → confidence |

### Key Features
- **NLI Entailment**: LLM judges SUPPORTED/CONTRADICTED/NEUTRAL
- **Numeric Extraction**: Handles B/M/K suffixes, currencies, percentages
- **Signal Fusion**: Confidence = base × retrieval × citation × numeric penalties

### Tests Passed
- [x] NLI correctly identified SUPPORTED
- [x] Number extraction works (6 numbers from test text)
- [x] Normalization handles $96.8B, 18.5%, comma-separated
- [x] Consistent numbers matched, mismatches detected
- [x] Numeric mismatch correctly penalized (1.0 → 0.4)
- [x] CONTRADICTED → 0.15 confidence (low)

---

## Phase 8: Verification Assembly
**Status**: ✅ Complete  
**Completed**: December 19, 2024

### Files Modified
- `app/lib/maxwell/verifier.ts` - Added main orchestrator

### Functions Added
| Function | Purpose |
|----------|---------|
| `verifyClaims(answer, sources, onProgress?)` | Main orchestrator |
| `validateVerificationOutput(output)` | Runtime structure validation |

### Key Features
- **Full Pipeline**: Extraction → Chunking → Embedding → Retrieval → NLI → Aggregation
- **Try/Catch Safety**: Individual claim failures don't crash pipeline
- **Progress Callbacks**: Real-time UI updates during verification
- **Batched Embeddings**: Passages embedded once, reused for all claims

### Tests Passed
- [x] Full pipeline: 2 claims verified in 5327ms
- [x] Both claims SUPPORTED with 100% confidence
- [x] Progress callbacks fired (5 times)
- [x] Output validation works
- [x] Empty answer handling
- [x] No sources handling

---

## Phase 9: Orchestrator + API
**Status**: ✅ Complete  
**Completed**: December 20, 2024

### Files Created
- `app/lib/maxwell/index.ts` - Main orchestrator
- `app/api/maxwell/route.ts` - SSE streaming API

### Functions Added
| Function | Purpose |
|----------|---------|
| `runMaxwell(query)` | Async generator yielding MaxwellEvent |
| `runMaxwellComplete(query)` | Non-streaming Promise wrapper |
| `prepareEvidence(sources)` | Background evidence preparation |
| `POST /api/maxwell` | SSE streaming endpoint |
| `GET /api/maxwell` | Health check |

### Quality Presets
| Preset | Synthesis Model | Verification Concurrency | Use Case |
|--------|-----------------|-------------------------|----------|
| **FAST** (default) | Gemini 3.0 Flash | 8 | Live demos, quick answers |
| MEDIUM | Claude Sonnet 4.5 | 6 | Balanced quality/speed |
| SLOW | Claude Sonnet 4.5 | 4 | Maximum quality |

### Performance Optimizations
1. **Parallel evidence prep during synthesis**: Saves ~3-4 seconds
2. **Dynamic concurrency**: Based on quality preset
3. **Gemini Flash for synthesis**: Much faster streaming

### Tests Passed (FAST preset)
- [x] All 4 phases executed in **20.1s** (was 38s!)
- [x] 18 sources found
- [x] 12 claims verified (9 SUPPORTED, 3 NEUTRAL)
- [x] 53% confidence
- [x] API health check works

### Model Stack
| Step | Model |
|------|-------|
| Decomposition | google/gemini-3-flash-preview |
| Search | Tavily API |
| Synthesis | google/gemini-3-flash-preview (FAST) |
| Claim Extraction | google/gemini-3-flash-preview |
| Embeddings | qwen/qwen3-embedding-8b |
| NLI | google/gemini-3-flash-preview |

---

## Phase 10: Frontend Hook
**Status**: ✅ Complete  
**Completed**: December 20, 2024

### Files Created
- `app/hooks/use-maxwell.ts` - Maxwell hook with SSE streaming

### Features
- **SSE Streaming**: Parses `data: {...}` events from `/api/maxwell`
- **Store Integration**: Uses shared `useChatStore` for message persistence
- **Phase Tracking**: Local state for phases, verification progress
- **Type Mapping**: `MaxwellSource` → `Source` for store compatibility

### Exports
| Export | Purpose |
|--------|---------|
| `useMaxwell()` | Main hook for Maxwell API |
| `usePhaseInfo(phase)` | Utility for phase labels/descriptions |
| `MaxwellUIState` | State type for consumers |
| `VerificationProgress` | Progress type interface |

### Design Decisions
- **Shared Store**: Messages persist to same chat history as base product
- **Local State**: Verification data stays in hook (not persisted)
- **Toggle-Ready**: Hook is mode-agnostic, consumer decides when to use

---

## Phase 11: Frontend Components
**Status**: ✅ Complete  
**Completed**: December 20, 2024

### Files Created
- `app/components/ModeDropdown.tsx` - Mode selector dropdown with portal rendering
- `app/components/maxwell/MaxwellCanvas.tsx` - Right panel container
- `app/components/maxwell/PhaseProgress.tsx` - Pipeline phase indicators
- `app/components/maxwell/SubQueryList.tsx` - Sub-query list with status
- `app/components/maxwell/SourcesPanel.tsx` - Collapsible sources list
- `app/components/maxwell/VerificationPanel.tsx` - Claims with verdicts
- `app/components/maxwell/index.ts` - Barrel exports

### Files Modified
- `app/components/InputInterface.tsx` - Added mode props, integrated ModeDropdown
- `app/page.tsx` - Added split-view layout, Maxwell Canvas integration, session sync

### Features
- **Mode Dropdown**: Normal | Maxwell Fast | Maxwell Medium | Maxwell Slow
- **Split Layout**: Chat (55%) + Canvas (45%) when Maxwell active
- **Smooth Animations**: Framer Motion spring physics (stiffness: 300, damping: 40)
- **Canvas Appears on Think**: Only shows when Maxwell starts processing (not on toggle)
- **Responsive**: Chat and input components shrink gracefully
- **View Results**: Button to re-open canvas after closing
- **Session Sync**: Canvas and Maxwell state reset on session change

### UX Fixes
- **Dropdown Portal**: Uses `createPortal` to render to `document.body`, escaping overflow containers
- **Upward Opening**: Dropdown always opens upward using `bottom` CSS positioning
- **Session Reset**: Maxwell state clears when switching chats (no stale canvas)
- **Canvas Persistence**: Close button hides canvas but preserves results for re-viewing

### Design Tokens (per design-guide.md)
- Background: `#120F14`
- Surface: `#18151d`
- Brand Accent: `#6F3BF5`
- Typography: uppercase tracking-[0.2em] headers

---

## Phase 12: Multi-Endpoint Architecture (Vercel Optimization)
**Status**: ✅ Complete  
**Completed**: December 23, 2024

### Problem Solved
Vercel serverless functions have a 60-second timeout. The original monolithic `/api/maxwell` route would timeout during embedding-heavy queries:
- Embedding 3046 texts took ~45 seconds alone
- Total pipeline exceeded 60 seconds
- Verification phase never completed

### Solution: Multi-Endpoint Pipeline
Split the Maxwell pipeline into 5 independent serverless functions, each with its own timeout budget.

### Files Created
- `app/lib/maxwell/api-types.ts` - Request/Response interfaces + embedding encoding utilities
- `app/api/maxwell/decompose/route.ts` - Phase 1: Query decomposition (30s max)
- `app/api/maxwell/search/route.ts` - Phase 2: Search + pre-embedding (60s max)
- `app/api/maxwell/synthesize/route.ts` - Phase 3: SSE synthesis (30s max)
- `app/api/maxwell/verify/route.ts` - Phase 4: SSE verification (60s max)
- `app/api/maxwell/adjudicate/route.ts` - Phase 5: SSE adjudication (30s max)

### Files Modified
- `app/hooks/use-maxwell.ts` - Refactored to orchestrate 5 endpoint calls
- `app/lib/maxwell/verifier.ts` - Added `verifyClaimsWithPrecomputedEvidence()`
- `app/api/maxwell/route.ts` - Preserved as fallback for local development

### Key Optimization: Pre-Embedding in Search Phase
The critical insight: move embedding from verify to search phase.

**Before:**
```
Search (2s) → Synthesize (5s) → Verify [embed 3046 texts ~45s] → TIMEOUT ❌
```

**After:**
```
Search [embed 61 passages ~3s] → Synthesize (5s) → Verify [embed 5 claims ~1s] → Complete ✅
```

### Architecture

| Endpoint | Purpose | Timeout | Data Flow |
|----------|---------|---------|-----------|
| `/decompose` | Query analysis | 30s | → `subQueries`, `config` |
| `/search` | Search + embed | 60s | → `sources`, `preparedEvidence` |
| `/synthesize` | Answer gen | 30s | → `answer` (SSE) |
| `/verify` | Claim check | 60s | → `verification` (SSE) |
| `/adjudicate` | Final verdict | 30s | → verdict (SSE) |

### Embedding Encoding
Float32Array embeddings are base64-encoded for JSON transport:
```typescript
// Encode (search endpoint)
const base64 = Buffer.from(new Float32Array(embedding).buffer).toString('base64');

// Decode (verify endpoint)
const embedding = new Float32Array(Buffer.from(base64, 'base64').buffer);
```

### Performance Results
Real-world test: "What is the capital of France?"

| Phase | Duration |
|-------|----------|
| Decompose | 2.1s |
| Search (with 61 embeddings) | 1.5s |
| Synthesize | 5.1s |
| Verify (using pre-computed) | 7.9s |
| Adjudicate | 4.6s |
| **Total** | **~21s** ✅ |

Each phase completes well under the 60-second limit.

### Tests Passed
- [x] All 5 endpoints return 200
- [x] Pre-computed embeddings passed from search to verify
- [x] SSE streaming works for synthesize/verify/adjudicate
- [x] Full pipeline completes on Vercel deployment
- [x] UI updates correctly for each phase
- [x] No timeouts on complex queries

### Documentation Updated
- `MAXWELL.md` - Multi-endpoint API section
- `MAXWELL_ARCHITECTURE.md` - Updated file map
- `API.md` - All 6 Maxwell endpoints documented
- `FILE-MAP.md` - New files listed
- `ARCHITECTURE.md` - Maxwell mode architecture
- `README.md` - Project structure updated

---

## Phase 13: Vercel Blob Storage (Large Payload Handling)
**Status**: ✅ Complete  
**Completed**: December 23, 2024

### Problem Solved
Vercel has a **4.5MB request/response body limit**. Embeddings for large queries (~988 passages × 3072 dimensions × 4 bytes = ~12MB) caused 413 Payload Too Large errors when passed between `/search` and `/verify` endpoints.

### Solution: Vercel Blob Storage
Instead of passing embeddings in the response body, store them in Vercel Blob Storage and pass a URL:

```
/search  →  Embeds passages  →  Stores in Blob  →  Returns URL
/verify  →  Fetches from Blob (server-to-server)  →  Deletes after use
```

### Files Created
- `app/lib/maxwell/blob-storage.ts` - Vercel Blob utilities
  - `storeEvidenceInBlob()` - Stores passages + embeddings
  - `fetchEvidenceFromBlob()` - Retrieves from Blob URL
  - `deleteEvidenceFromBlob()` - Cleanup after verification

### Files Modified
- `app/api/maxwell/search/route.ts` - Store embeddings in Blob, return URL
- `app/api/maxwell/verify/route.ts` - Fetch from Blob, delete after use
- `app/hooks/use-maxwell.ts` - Pass Blob URL between phases
- `app/lib/maxwell/api-types.ts` - Updated response types

### Hybrid Mode (Local Development)
Local development doesn't have access to Vercel Blob. Implemented hybrid approach:
- **Production (Vercel):** Uses Vercel Blob Storage (requires `BLOB_READ_WRITE_TOKEN`)
- **Local:** Uses base64 data URLs (no size limits locally, no external deps)

Environment detection:
```typescript
function isVercelEnvironment(): boolean {
    return process.env.VERCEL === '1' || !!process.env.BLOB_READ_WRITE_TOKEN;
}
```

### Log Cleanup
Data URLs are massive in logs. Added sanitization:
```typescript
blobUrl.startsWith('data:') ? '[data URL - local]' : blobUrl
```

### Environment Variables
New required env var for Vercel deployment:
- `BLOB_READ_WRITE_TOKEN` - From Vercel Dashboard → Storage → Blob

### Tests Verified
- [x] Local development works with data URLs
- [x] Logs show `[data URL - local]` instead of massive base64
- [x] Blob cleanup happens after verification (production)

### Documentation Updated
- `MAXWELL.md` - Blob storage section, updated API responses
- `MAXWELL_ARCHITECTURE.md` - Blob in tech stack, updated flow
- `README.md` - Blob storage in key innovations, env vars
