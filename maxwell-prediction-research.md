# Maxwell Prediction Market Intelligence Pipeline — Architecture Document

> Generated from codebase analysis of `maxwell-v2` on 2026-02-06

---

## Table of Contents

1. [Pipeline Overview](#1-pipeline-overview)
2. [Search Layer (Tavily)](#2-search-layer-tavily)
3. [Every LLM Call](#3-every-llm-call)
4. [Verification & Adjudication](#4-verification--adjudication)
5. [Output Formatting (Presenter)](#5-output-formatting-presenter)
6. [Type Definitions](#6-type-definitions)
7. [Architectural Optimizations](#7-architectural-optimizations)

---

## 1. Pipeline Overview

### Flow: "Generate Analysis" → `MaxwellIntelligence`

```
User clicks "Generate Analysis"
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: DECOMPOSITION                                     │
│  POST /api/maxwell/decompose                                │
│  LLM breaks query into 3-7 focused sub-queries              │
│  Determines complexity: simple | standard | deep_research    │
│  Timeout: 30s                                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: SEARCH + PRE-EMBEDDING                            │
│  POST /api/maxwell/search                                   │
│  Parallel Tavily searches for each sub-query                │
│  Deduplicates sources by URL                                │
│  Pre-embeds all passages → stores in Vercel Blob            │
│  Timeout: 60s                                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: SYNTHESIS (streaming SSE)                         │
│  POST /api/maxwell/synthesize                               │
│  LLM generates comprehensive answer with [n] citations      │
│  Events: synthesis-chunk, synthesis-complete                 │
│  Timeout: 60s                                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: VERIFICATION (streaming SSE)                      │
│  POST /api/maxwell/verify                                   │
│  Extract claims → retrieve evidence → NLI check each        │
│  Fetches pre-computed embeddings from Blob                  │
│  Events: verification-progress, verification-complete        │
│  Also runs: Resolution Risk Analysis (parallel)             │
│  Timeout: 60s                                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 5: ADJUDICATION (streaming SSE)                      │
│  POST /api/maxwell/adjudicate                               │
│  Reconstructs answer using ONLY verified facts              │
│  Integrates corrections for disputed claims                 │
│  Events: adjudication-chunk, adjudication-complete           │
│  Timeout: 60s                                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 6: PRESENTER (conditional — only with marketContext) │
│  POST /api/maxwell/present                                  │
│  Transforms all outputs → structured MaxwellIntelligence    │
│  Standard POST (no streaming)                               │
│  Timeout: 60s                                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
              MaxwellIntelligence JSON
              rendered in 3-panel UI
```

### Entry Point: `app/hooks/use-maxwell.ts`

The hook orchestrates all 6 phases sequentially. Each phase calls a separate API endpoint. The hook tracks:
- `executionPhase`: Current phase name
- `phases`: Status of each phase (pending → in_progress → complete/error)
- `synthesis` / `verification` / `adjudication`: Accumulated streaming text
- `intelligence`: Final `MaxwellIntelligence` object (from presenter)
- `sources`: Deduplicated source list

### Streaming Architecture

All streaming endpoints use the **TransformStream pattern**:

```typescript
const { readable, writable } = new TransformStream();
const writer = writable.getWriter();

(async () => {
  // Background processing
  await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  await writer.write(encoder.encode('data: [DONE]\n\n'));
  await writer.close();
})();

return new Response(readable, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  },
});
```

---

## 2. Search Layer (Tavily)

### Query Construction

**File**: `app/lib/maxwell/decomposer.ts`

The decomposer LLM generates 3-7 sub-queries, each with:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | "q1", "q2", etc. |
| `query` | string | Search string (< 400 chars) |
| `topic` | 'general' \| 'news' | News for current events |
| `depth` | 'basic' \| 'advanced' | Advanced for complex analysis |
| `days` | number \| null | Time range (1, 3, 7, 30) |
| `domains` | string[] \| null | Domain targeting |
| `purpose` | string | Why this query is needed |

**Prediction Market Decomposition** adds categories:
- `resolution` — Resolution clarity analysis
- `catalyst` — Recent news (24-72h)
- `factor_for` — Supporting factors for outcomes
- `factor_against` — Opposing factors
- `contrarian` — Signals that could prove consensus wrong
- `cross_platform` — Price comparison across platforms

### Tavily API Parameters

**File**: `app/lib/maxwell/searcher.ts`

```typescript
{
  api_key: TAVILY_API_KEY,
  query: subQuery.query,
  max_results: resultsPerQuery,       // 4-8 based on complexity
  search_depth: subQuery.depth,       // 'basic' or 'advanced'
  topic: subQuery.topic,              // 'general' or 'news'
  time_range: mappedTimeRange,        // 'day' | 'week' | 'month' | 'year' | undefined
  include_domains: subQuery.domains,
  include_answer: false,              // We generate our own synthesis
  include_raw_content: raw,           // true for fact lookups
}
```

### Result Processing & Deduplication

1. **Map** Tavily results → `MaxwellSource` objects
2. **Deduplicate** by normalized URL (lowercase, strip trailing slash)
3. **Reassign** sequential IDs (s1, s2, s3...)
4. **Fail-safe**: If basic search returns 0 results, retry with `advanced` depth
5. **Hard fail**: If ALL searches fail, throw error (prevents hallucinations)

### Source Structure

```typescript
interface MaxwellSource {
  id: string;              // "s1", "s2", etc.
  url: string;
  title: string;
  snippet: string;         // Raw content (up to 15k chars)
  fromQuery: string;       // Which sub-query found it
  date?: string;           // Published date
}
```

---

## 3. Every LLM Call

### Call 1: Query Decomposition

| Property | Value |
|----------|-------|
| **File** | `app/lib/maxwell/decomposer.ts` → `decomposeQuery()` |
| **Model** | `google/gemini-3-flash-preview` |
| **Temperature** | 0.3 |
| **System Prompt** | None (user prompt only) |

**User Prompt** (`DECOMPOSITION_PROMPT`):
```
You are a Master Search Strategist. Your goal is to break a complex user query
into atomic, optimized search configurations.

CONTEXT:
- Current Date: {currentDate}
- User Query: {query}

STRATEGY RULES:
1. Query Length: Every 'query' string MUST be under 400 characters.
2. Topic Selection: 'news' for current events, 'general' for historical.
3. Time Sensitivity: Set 'days' to 1-3 for recent queries.
4. Depth Control: 'advanced' for complex analysis, 'basic' for facts.
5. Domain Targeting: Target primary authority sources.
6. System of Record Targeting: For specific data, target PRIMARY source.
```

**Prediction Market Variant** (`PREDICTION_MARKET_DECOMPOSITION_PROMPT`):
- Specialized for trading intelligence
- Analyzes top N outcomes by market price
- Generates up to 12 sub-queries with categories

**Output Schema** (`DecompositionSchema`):
```typescript
z.object({
  reasoning: z.string(),
  complexity: z.enum(['simple', 'standard', 'deep_research']),
  complexityReasoning: z.string(),
  subQueries: z.array(z.object({
    id: z.string(),
    query: z.string(),
    purpose: z.string(),
    topic: z.enum(['general', 'news']),
    depth: z.enum(['basic', 'advanced']),
    days: z.number().nullable(),
    domains: z.array(z.string()).nullable(),
  })).min(3).max(7),
})
```

**Downstream**: Configures search parameters and execution budget.

---

### Call 2: Answer Synthesis

| Property | Value |
|----------|-------|
| **File** | `app/lib/maxwell/synthesizer.ts` → `synthesize()` |
| **Model** | Dynamic: Simple → `gemini-3-flash-preview`, Standard/Deep → `claude-sonnet-4.5` |
| **Temperature** | Model default |
| **Streaming** | Yes |

**User Prompt** (`SYNTHESIS_PROMPT`):
```
You are a research synthesizer. Given a question and search results, produce a
comprehensive, well-structured answer.

CRITICAL RULES:
1. TONE: Objective, journalistic, dense. No "I", "me".
2. STRUCTURE: Use Markdown headers (##) to organize by theme.
3. CITATIONS: EVERY factual claim MUST cite its source using [n] notation.
4. UNCERTAINTY: Explicitly state conflicts.
5. COMPREHENSIVENESS: Thorough report, not summary.
6. FORMAT: No conversational filler. Start directly with answer.
```

**Prediction Market Variant** (`PREDICTION_MARKET_SYNTHESIS_PROMPT`):
- Structured output format with sections: MARKET CONTEXT, RESOLUTION ANALYSIS, FACTORS FOR/AGAINST, KEY UNCERTAINTY, NEXT CATALYST, SOURCE CONFLICTS, MULTI-OUTCOME COMPARISON
- Each outcome gets: Factors For, Factors Against, Assessment (UNDERPRICED/OVERPRICED/FAIR), Confidence, One-liner
- Rules: Never say "you should bet", never say "I am X% confident"

**Output**: Streaming text chunks (no structured schema).

**Downstream**: Fed to claim extraction and adjudication.

---

### Call 3: Claim Extraction

| Property | Value |
|----------|-------|
| **File** | `app/lib/maxwell/verifier.ts` → `extractClaims()` |
| **Model** | `google/gemini-3-flash-preview` |
| **Temperature** | Default |

**User Prompt** (`CLAIM_EXTRACTION_PROMPT`):
```
You are a fact extractor. Given a text, extract all factual claims that can be
verified against sources.

RULES:
1. Extract ONLY factual claims (not opinions, analysis, speculation)
2. Each claim should be a single, atomic statement
3. INCLUDE claims with specific numbers, dates, names, percentages, events
4. Track which source numbers [n] are cited for each claim
5. Keep claims self-contained (include necessary context)

DO NOT EXTRACT:
- Subjective statements ("X is better than Y")
- Transitional phrases ("In conclusion...")
- Future predictions unless specific cited projection
- Vague statements ("The company is growing")
```

**Output Schema** (`ClaimsSchema`):
```typescript
z.object({
  claims: z.array(z.object({
    id: z.string(),
    text: z.string(),
    citedSources: z.array(z.number()),
  })),
})
```

**Downstream**: Each claim is verified individually.

---

### Call 4: NLI Entailment Check (per claim)

| Property | Value |
|----------|-------|
| **File** | `app/lib/maxwell/verifier.ts` → `checkEntailment()` |
| **Model** | `google/gemini-3-flash-preview` |
| **Temperature** | Default |

**User Prompt** (`NLI_PROMPT`):
```
You are a strict fact-checker performing Natural Language Inference (NLI).

TASK: Determine if the EVIDENCE supports, contradicts, or does not address the CLAIM.

CLAIM: "{claim}"
EVIDENCE: "{evidence}"
METADATA: Evidence Date: {sourceDate} | Current Date: {currentDate}

RULES:
1. TEMPORAL SUPERIORITY (CRITICAL):
   - If evidence is significantly older than the claim, it CANNOT contradict.
2. NUMBERS MUST MATCH:
   - "$96.8 billion" + "$96.8B" → SUPPORTED
   - "grew 18%" + "grew 15%" → CONTRADICTED
3. DIRECTION MUST MATCH:
   - "grew" + "declined" → CONTRADICTED
4. ENTITIES MUST MATCH:
   - "Tesla" + "BYD" → NEUTRAL
5. SPECIFICITY MATTERS:
   - "confirmed" + "plans to" → NEUTRAL

VERDICTS:
- SUPPORTED: Recent evidence explicitly confirms the claim.
- CONTRADICTED: Recent, authoritative evidence proves the claim FALSE.
- NEUTRAL: Evidence is outdated, irrelevant, or ambiguous.
```

**Output Schema** (`EntailmentSchema`):
```typescript
z.object({
  verdict: z.enum(['SUPPORTED', 'CONTRADICTED', 'NEUTRAL']),
  reasoning: z.string(),
})
```

**Downstream**: Fed into signal aggregation for each claim.

---

### Call 5: Adjudication

| Property | Value |
|----------|-------|
| **File** | `app/lib/maxwell/adjudicator.ts` → `adjudicateAnswer()` |
| **Model** | `google/gemini-3-flash-preview` (standard) or `google/gemini-3-pro-preview` (deep research) |
| **Temperature** | 0.1 |
| **Streaming** | Yes |

**System Prompt** (`RECONSTRUCTOR_SYSTEM_PROMPT`):
```
You are the Final Authority in a high-stakes intelligence pipeline.
Your job is to answer the User's Question using ONLY verified evidence.

STRICT INSTRUCTIONS:
1. IGNORE THE DRAFT: Do not refer to "the draft", "the text", or "the previous section."
2. SYNTHESIZE VERIFIED FACTS: Construct a direct answer using *only* the Verified Facts.
3. INTEGRATE CORRECTIONS: If a Disputed Fact is relevant, state the *Corrected* version.
4. HANDLE GAPS: If verified facts are insufficient, admit *specifically* what is unknown.
5. HANDLING UNCERTAINTY (THE REASONING BRIDGE):
   - If a claim is "UNCERTAIN" or "NEUTRAL" (but NOT "CONTRADICTED"):
     - Do NOT discard it if it seems central.
     - KEEP it but use "hedging language" to indicate it is likely true but unverified.
   - Only discard claims that are explicitly CONTRADICTED.
6. CONCLUSION: End with a "Final Verdict" or "Outlook" based purely on verified signals.

TONE: High-level Intelligence Analyst briefing a decision-maker.
FORBIDDEN: "I", "me", "my", filler phrases.
STYLE: Dense, information-heavy. Prioritize density over politeness.
```

**User Prompt**:
```
USER QUERY: "{query}"
DRAFT ANSWER: "{draftAnswer}"

=== VERIFIED FACTS (USE THESE AS TRUTH) ===
{verifiedFacts}

=== DISPUTED FACTS (CORRECT THESE) ===
{disputedFacts}

=== UNVERIFIED/MISSING (ACKNOWLEDGE GAPS IF RELEVANT) ===
{unverifiedFacts}
```

**Output**: Streaming text chunks.

**Downstream**: Fed to presenter along with all other phase outputs.

---

### Call 6: Resolution Risk Analysis

| Property | Value |
|----------|-------|
| **File** | `app/lib/maxwell/verifier.ts` → `analyzeResolutionRisk()` |
| **Model** | `google/gemini-3-flash-preview` |
| **Temperature** | Default |

**User Prompt** (`RESOLUTION_RISK_PROMPT`):
```
Analyze the RESOLUTION CRITERIA of a prediction market and assess dispute risk.

MARKET INFORMATION:
- Platform: {platform}
- Title: {title}
- Resolution Rules: {rules}
- Resolution Source: {resolutionSource}
- Deadline: {deadline}

RISK FACTORS TO ANALYZE:
1. AMBIGUOUS LANGUAGE — "significant", "material", "substantial"
2. RESOLUTION SOURCE RELIABILITY — Official sources = LOW, social media = HIGH
3. EDGE CASES — Cancellation, ties, source unavailability
4. PLATFORM-SPECIFIC RISKS — UMA oracle disputes, centralized resolution
5. TEMPORAL RISKS — Long horizons, future announcements

CALIBRATION:
- LOW (0-30): Clear rules, official sources, well-defined outcomes
- MEDIUM (31-60): Some ambiguity but manageable
- HIGH (61-100): Vague criteria, unreliable sources, high dispute likelihood
```

**Output Schema** (`ResolutionRiskAnalysisSchema`):
```typescript
z.object({
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  riskScore: z.number().min(0).max(100),
  factors: z.array(z.object({
    type: z.enum(['ambiguous_language', 'source_reliability', 'edge_case', 'platform_risk', 'temporal_risk']),
    description: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  })),
  ambiguousTerms: z.array(z.string()),
  recommendation: z.string(),
  historicalComparison: z.string().nullable(),
})
```

**Downstream**: Included in final `MaxwellIntelligence`.

---

### Call 7: Presenter Transformation

| Property | Value |
|----------|-------|
| **File** | `app/lib/maxwell/presenter.ts` → `present()` |
| **Model** | `google/gemini-3-flash-preview` |
| **Temperature** | Default |
| **Conditional** | Only runs when `marketContext` is provided |

**System Prompt** (`PRESENTER_SYSTEM_PROMPT`):
```
You are the Presentation Layer for a prediction market intelligence platform.
Transform research outputs into STRUCTURED JSON that a UI can render.

CRITICAL PRINCIPLES:
1. INTELLIGENCE, NOT ADVICE — "UNDERPRICED" not "BET YES"
2. STRUCTURED, NOT PROSE — Headlines are ONE sentence. No paragraphs.
3. PROBABILITY ESTIMATION — Provide a RANGE (low/mid/high), not a point estimate
4. COMPARATIVE ANALYSIS — Rank ALL analyzed outcomes
5. VERDICTS — UNDERPRICED | OVERPRICED | FAIR | UNCERTAIN
6. CONFIDENCE — HIGH | MEDIUM | LOW
```

**User Prompt** (`PRESENTER_USER_PROMPT`):
Receives ALL previous phase outputs:
- Market context JSON
- Synthesis text
- Verification JSON (claims, confidence scores)
- Resolution risk JSON
- Adjudication text
- Sources JSON
- Pipeline duration

**Output Schema** (`PresenterOutputSchema`):
```typescript
z.object({
  market: z.object({
    question: z.string(),
    type: z.enum(['binary', 'multi-option', 'matchup']),
    deadline: z.string(),
    deadlineDate: z.string(),
    resolutionCriteria: z.string(),
  }),
  assessment: z.object({
    primaryOutcome: z.string(),
    marketPrice: z.number(),
    maxwellRange: z.object({ low: z.number(), mid: z.number(), high: z.number() }),
    verdict: z.enum(['UNDERPRICED', 'OVERPRICED', 'FAIR', 'UNCERTAIN']),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    headline: z.string(),
  }),
  thesis: z.object({
    factorsFor: z.array(ThesisFactorSchema),
    factorsAgainst: z.array(ThesisFactorSchema),
    keyUncertainty: z.string(),
    nextCatalyst: z.object({ event: z.string(), date: z.string().optional(), impact: z.string() }),
    sourceConflicts: z.array(z.string()).optional(),
  }),
  outcomes: z.array(OutcomeSchema).optional(),
  arbitrage: ArbitrageSchema.optional(),
  verification: VerificationSchema,
})
```

**Downstream**: This IS the final `MaxwellIntelligence` output rendered in the UI.

---

## 4. Verification & Adjudication

### Verification Pipeline (Phase 4)

```
Synthesis Answer
       │
       ▼
┌─────────────────────┐
│  1. CLAIM EXTRACTION │  LLM extracts atomic factual claims
│     (LLM Call 3)     │  Returns: ExtractedClaim[] with citedSources[]
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  2. EVIDENCE RETRIEVAL              │
│  For each claim:                    │
│  a. Embed claim text                │
│  b. Cosine similarity vs passages   │
│  c. Find best match (global + cited)│
│  d. Track citation mismatches       │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  3. NLI ENTAILMENT CHECK            │  LLM compares claim vs best passage
│     (LLM Call 4, per claim)         │  Returns: SUPPORTED | CONTRADICTED | NEUTRAL
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  4. NUMERIC CONSISTENCY CHECK       │
│  Extract numbers from claim/evidence│
│  Normalize (B/M/K, currencies, %)   │
│  Check: exact match, range overlap, │
│  containment, reverse containment   │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  5. SIGNAL AGGREGATION              │
│  Base confidence from entailment:   │
│    SUPPORTED → 1.0                  │
│    NEUTRAL → 0.55                   │
│    CONTRADICTED → 0.15              │
│  Penalties:                         │
│    Low retrieval similarity: ×0.7   │
│    Citation mismatch: ×0.85         │
│    Numeric mismatch: ×0.4           │
│  → Final confidence + level         │
└─────────────────────────────────────┘
```

### Evidence Preparation (Pre-computed in Phase 2)

1. **Chunking**: Sources → sentence-level passages using `Intl.Segmenter`
2. **Windowing**: Overlapping windows of 1 and 3 sentences
3. **Embedding**: Batch processed (50 texts/request, 20 concurrent)
4. **Deduplication**: ~20-30% unique texts
5. **Storage**: Vercel Blob (production) or in-memory Map (dev)

### Embedding Models

| Priority | Model | Use |
|----------|-------|-----|
| Primary | `google/gemini-embedding-001` | All embeddings |
| Fallback | `qwen/qwen3-embedding-8b` | If Gemini fails |

### Temporal Superiority Rule

Old evidence **cannot** contradict current claims:
- Claim: "X is CEO" (2025)
- Evidence: "Y is CEO" (2022)
- Verdict: **NEUTRAL** (not CONTRADICTED)

### Reasoning Bridge Pattern

UNVERIFIED claims (NEUTRAL) are **kept** with hedging language:
> "Current documentation indicates version 16.1.0 is the active release, though the precise calendar date was not explicitly retrieved."

Only **CONTRADICTED** claims are removed.

### Adjudication (Phase 5)

Input categories:
- **Verified Facts**: SUPPORTED or high confidence → used as truth
- **Disputed Facts**: CONTRADICTED with corrections → corrected version used
- **Unverified Facts**: NEUTRAL with low confidence → kept with hedging

Output: Reconstructed answer based purely on verified evidence.

---

## 5. Output Formatting (Presenter)

### When It Runs

The presenter (Phase 6) **only runs when `marketContext` is provided** — i.e., when the user is analyzing a specific prediction market, not asking a general question.

### Verification Score Calculation

```typescript
verificationScore = Math.round(
  (supported / (supported + contradicted + uncertain)) * 100
)

// Level mapping:
// ≥70 → VERIFIED
// ≥40 → PARTIAL
// <40 → LOW_CONFIDENCE
```

### MaxwellIntelligence Structure

```
MaxwellIntelligence
├── market
│   ├── question
│   ├── type (binary | multi-option | matchup)
│   ├── deadline ("23 days")
│   ├── deadlineDate (ISO)
│   └── resolutionCriteria
├── resolutionRisk
│   ├── level (LOW | MEDIUM | HIGH)
│   ├── score (0-100)
│   └── factors[]
├── assessment
│   ├── primaryOutcome
│   ├── marketPrice (0.XX)
│   ├── maxwellRange { low, mid, high }
│   ├── verdict (UNDERPRICED | OVERPRICED | FAIR | UNCERTAIN)
│   ├── confidence (HIGH | MEDIUM | LOW)
│   └── headline
├── thesis
│   ├── factorsFor[] (3-5 items)
│   ├── factorsAgainst[] (3-5 items)
│   ├── keyUncertainty
│   ├── nextCatalyst { event, date?, impact }
│   └── sourceConflicts[]
├── outcomes[] (multi-option only)
│   └── { name, marketPrice, maxwellRange, view, confidence, oneLiner, rank }
├── arbitrage?
│   └── { detected, description?, spread? }
├── verification
│   ├── score (0-100)
│   ├── level (VERIFIED | PARTIAL | LOW_CONFIDENCE)
│   ├── sourcesAnalyzed
│   ├── claimsVerified / claimsDisputed
│   └── topSources[]
├── raw
│   ├── synthesis (full text)
│   ├── adjudication (full text)
│   ├── allSources[]
│   └── allClaims[]
├── generatedAt (ISO)
├── pipelineDurationMs
└── modelUsed
```

### Streaming Events

| Event Type | Payload | Phase |
|-----------|---------|-------|
| `phase-start` | `{ phase }` | All |
| `phase-complete` | `{ phase, data }` | All |
| `synthesis-chunk` | `{ content }` | 3 |
| `synthesis-complete` | `{ answer, sourcesUsed[], durationMs }` | 3 |
| `verification-progress` | `{ current, total, status }` | 4 |
| `verification-complete` | `{ claims[], overallConfidence, summary }` | 4 |
| `adjudication-chunk` | `{ content }` | 5 |
| `adjudication-complete` | `{ text, durationMs }` | 5 |
| `planning-complete` | `{ config }` | 1 |
| `error` | `{ message }` | Any |
| `complete` | `{ data: MaxwellResponse }` | Final |

---

## 6. Type Definitions

### Core Types

```typescript
// Execution complexity
type Complexity = 'simple' | 'standard' | 'deep_research';

// Execution config (adaptive compute)
interface ExecutionConfig {
  complexity: Complexity;
  reasoning: string;
  maxSubQueries: number;        // 2 | 4 | 7
  resultsPerQuery: number;      // 4 | 5 | 8
  verificationConcurrency: number;
  maxClaimsToVerify: number;    // 5 | 30 | 100
  synthesisModel: string;
  adjudicatorModel: string;
}

// Sub-query from decomposition
interface SubQuery {
  id: string;
  query: string;
  purpose: string;
  topic: 'general' | 'news';
  depth: 'basic' | 'advanced';
  days?: number;
  domains?: string[];
  category?: 'resolution' | 'catalyst' | 'factor_for' | 'factor_against' | 'contrarian' | 'cross_platform';
  targetOutcome?: string;
}

// Source from search
interface MaxwellSource {
  id: string;
  url: string;
  title: string;
  snippet: string;
  fromQuery: string;
  date?: string;
}

// Extracted claim
interface ExtractedClaim {
  id: string;
  text: string;
  citedSources: number[];
}

// Passage (chunked from source)
interface Passage {
  text: string;
  sourceId: string;
  sourceIndex: number;
  sourceTitle: string;
  sourceDate?: string;
}

// Verified claim
interface VerifiedClaim {
  id: string;
  text: string;
  confidence: number;           // 0.0 to 1.0
  confidenceLevel: 'high' | 'medium' | 'low';
  entailment: 'SUPPORTED' | 'CONTRADICTED' | 'NEUTRAL';
  entailmentReasoning: string;
  bestMatchingSource: {
    sourceId: string;
    sourceTitle: string;
    sourceIndex: number;
    passage: string;
    similarity: number;
    isCitedSource: boolean;
  };
  citationMismatch: boolean;
  citedSourceSupport: number;
  globalBestSupport: number;
  numericCheck: NumericCheck | null;
  issues: string[];
}

// Verification output
interface VerificationOutput {
  claims: VerifiedClaim[];
  overallConfidence: number;
  summary: {
    supported: number;
    uncertain: number;
    contradicted: number;
    citationMismatches: number;
    numericMismatches: number;
  };
  durationMs: number;
}

// Resolution risk
interface ResolutionRisk {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;
  factors: string[];
  historicalDisputes?: string;
}

// Intelligence types
type IntelligenceVerdict = 'UNDERPRICED' | 'OVERPRICED' | 'FAIR' | 'UNCERTAIN';
type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
type IntelligenceVerificationLevel = 'VERIFIED' | 'PARTIAL' | 'LOW_CONFIDENCE';
type IntelligenceMarketType = 'binary' | 'multi-option' | 'matchup';

interface ThesisFactor {
  point: string;
  evidence: string;
  sourceIndex: number;
  confidence: ConfidenceLevel;
}

interface OutcomeAnalysis {
  name: string;
  marketPrice: number;
  maxwellRange: { low: number; mid: number; high: number };
  view: IntelligenceVerdict;
  confidence: ConfidenceLevel;
  oneLiner: string;
  rank: number;
}

// Phase tracking
type ExecutionPhase = 'idle' | 'decomposition' | 'search' | 'synthesis' | 'verification' | 'adjudication' | 'presenter' | 'complete' | 'error';

interface PhaseStatus {
  status: 'pending' | 'in_progress' | 'complete' | 'error';
  durationMs?: number;
  error?: string;
}

// Market context
interface MarketContext {
  id: string;
  platform: 'polymarket' | 'kalshi';
  title: string;
  type: IntelligenceMarketType;
  outcomes: { name: string; price: number; priceChange24h?: number; volume?: number }[];
  rules: string;
  resolutionSource?: string;
  endDate: Date;
  volume: number;
  volume24h: number;
  liquidity?: number;
  crossPlatformOdds?: CrossPlatformOdds;
}
```

---

## 7. Architectural Optimizations

### Adaptive Compute

| Complexity | Sub-queries | Results/query | Claims verified | Synthesis model | Adjudicator model |
|-----------|-------------|---------------|-----------------|-----------------|-------------------|
| **Simple** | 2 | 4 | 5 | `gemini-3-flash-preview` | `gemini-3-flash-preview` |
| **Standard** | 4 | 5 | 30 | `claude-sonnet-4.5` | `gemini-3-flash-preview` |
| **Deep Research** | 7 | 8 | 100 | `claude-sonnet-4.5` | `gemini-3-pro-preview` |

### Pre-Embedding Optimization

**Problem**: Verification took ~45s because it had to chunk + embed ~3000 passages.

**Solution**: Move embedding to Phase 2 (Search):
1. Pre-embed passages during search phase
2. Store in Vercel Blob (avoids 4.5MB payload limit)
3. Verification just fetches pre-computed embeddings + embeds ~5-30 claims

**Result**: Verification reduced from ~45s to ~8s.

### Blob Storage Strategy

| Environment | Storage | URL Format |
|------------|---------|------------|
| **Production** | Vercel Blob Storage | HTTPS URL |
| **Development** | In-memory Map cache | `maxwell-local://{cacheId}` |

### Embedding Pipeline

- **Batch size**: 50 texts per request
- **Concurrency**: 20 parallel requests
- **Deduplication**: ~20-30% unique texts
- **Primary model**: `google/gemini-embedding-001`
- **Fallback model**: `qwen/qwen3-embedding-8b`
