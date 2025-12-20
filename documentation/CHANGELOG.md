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

