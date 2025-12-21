# Maxwell: Verified Search Agent Pipeline

> **Status:** Production-ready  
> **Killer Feature:** Multi-signal verification with evidence-backed confidence scores

## Overview

Maxwell is a **verified search agent** that differentiates from standard Perplexity-style search by **verifying every claim** in the synthesized answer against source evidence. Unlike competitors that simply retrieve and synthesize, Maxwell provides auditable confidence scores and flags issues like citation mismatches, numeric inconsistencies, and contradictions.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                  MAXWELL PIPELINE                                         │
│                                                                                           │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌────────────┐   ┌───────────┐ │
│   │     PHASE 1  │   │    PHASE 2   │   │    PHASE 3   │   │  PHASE 4   │   │  PHASE 5  │ │
│   │              │   │              │   │              │   │            │   │           │ │
│   │ DECOMPOSE    │──▶│   SEARCH     │──▶│  SYNTHESIZE  │──▶│  VERIFY    │──▶│ RECONSTRUCT │ │
│   │              │   │              │   │              │   │            │   │           │ │
│   │ Break query  │   │ Parallel     │   │ Generate     │   │ NLI +      │   │ Final     │ │
│   │ into 3-5     │   │ Tavily       │   │ answer with  │   │ Embeddings │   │ Answer    │ │
│   │ sub-queries  │   │ calls        │   │ citations    │   │ + Numerics │   │ Synthesis │ │
│   └──────────────┘   └──────────────┘   └──────────────┘   └────────────┘   └───────────┘ │
│                                                                                           │
│   🚀 OPTIMIZATION: Evidence prep runs in BACKGROUND during Phase 3                       │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## The Core Value Proposition

**What makes Maxwell different?**

| Standard RAG | Maxwell |
|--------------|---------|
| Retrieves → Synthesizes → Done | Retrieves → Synthesizes → **Verifies** → **Reconstructs** |
| "Trust me, this is accurate" | "Here is the verified answer, stripped of hallucinations" |
| Citations ≈ decoration | Citations validated against evidence |
| No numeric checking | Detects `"grew 18%"` vs source saying `"grew 15%"` |

---

## Phase 1: Query Decomposition

**File:** `app/lib/maxwell/decomposer.ts`

**Purpose:** Break a complex user query into focused, independently-searchable sub-queries.

### How It Works

1. User asks: *"What's the current state of nuclear fusion research?"*
2. LLM generates 3-5 sub-queries:
   - `q1`: "nuclear fusion breakthrough 2024 2025"
   - `q2`: "ITER fusion reactor progress timeline"  
   - `q3`: "private fusion companies funding Commonwealth Helion"
   - `q4`: "fusion energy commercialization predictions scientists"

### The Math

```
Input:  1 complex query
Output: [3, 5] focused sub-queries (capped by schema)
```

### Tunable Parameters

| Constant | Location | Default | Purpose |
|----------|----------|---------|---------|
| `DECOMPOSITION_MODEL` | `constants.ts` | `google/gemini-3-flash-preview` | Fast structured output |
| `MIN_SUB_QUERIES` | `constants.ts` | `3` | Minimum queries generated |
| `MAX_SUB_QUERIES` | `constants.ts` | `5` | Maximum queries generated |

### Date Injection

The prompt includes `{currentDate}` so the LLM can convert relative terms ("latest", "today") to specific date ranges for better search results.

---

## Phase 2: Parallel Search

**File:** `app/lib/maxwell/searcher.ts`

**Purpose:** Execute all sub-queries in parallel against Tavily, deduplicate results.

### How It Works

```
q1 ──┐
q2 ──┼──▶ [Promise.all] ──▶ Tavily API x N ──▶ Dedupe by URL ──▶ Sources s1, s2, ..., sN
q3 ──┤
q4 ──┘
```

1. All sub-queries fire simultaneously (`Promise.all`)
2. Each query returns up to `RESULTS_PER_QUERY` sources
3. Sources are deduplicated by normalized URL
4. Sources reassigned sequential IDs: `s1`, `s2`, `s3`, ...

### The Math

```
Maximum raw sources: SUB_QUERIES × RESULTS_PER_QUERY = 5 × 5 = 25
Typical unique sources after dedup: 12-20
```

### Fail-Safe

```typescript
if (uniqueSources.length === 0) {
    throw new Error('Search failed: No sources found...');
}
```

**Why?** Continuing to synthesis with 0 sources guarantees hallucinations.

### Tunable Parameters

| Constant | Location | Default | Purpose |
|----------|----------|---------|---------|
| `RESULTS_PER_QUERY` | `constants.ts` | `5` | Sources per sub-query |
| `SEARCH_DEPTH` | `constants.ts` | `'basic'` | Tavily depth (`'advanced'` = 2x credits) |

---

## Phase 3: Synthesis (Streaming)

**File:** `app/lib/maxwell/synthesizer.ts`

**Purpose:** Generate a comprehensive answer with inline `[n]` citations.

### How It Works

1. Sources formatted with full snippets (no truncation)
2. Prompt enforces citation rules: `EVERY factual claim MUST cite its source`
3. Response streams chunk-by-chunk for real-time UI
4. Post-processing extracts which sources were cited

### Citation Format

```markdown
The fusion reactor achieved ignition [1][3] with record-breaking energy gain [2].
```

### Citation Validation

```typescript
// Detects hallucinated citations like [7] when only 5 sources exist
if (num > maxSourceIndex) {
    issues.push(`Invalid citation [${num}] - only ${maxSourceIndex} sources available`);
}
```

### Tunable Parameters

| Constant | Location | Default | Purpose |
|----------|----------|---------|---------|
| `SYNTHESIS_MODEL` | `constants.ts` | From quality preset | Answer generation model |
| `SYNTHESIS_MAX_TOKENS` | `constants.ts` | `1500` | Response length cap |

### Quality Presets (The Dropdown)

The dropdown selection (`Maxwell Fast`, `Medium`, `Slow`) controls this:

| Preset | Synthesis Model | Speed | Quality |
|--------|-----------------|-------|---------|
| **Fast** | `google/gemini-3-flash-preview` | ~3-5s | Good |
| **Medium** | `anthropic/claude-sonnet-4.5` | ~6-8s | Better |
| **Slow** | `anthropic/claude-sonnet-4.5` | ~10s+ | Best |

---

## Phase 4: Verification (The Killer Feature)

**File:** `app/lib/maxwell/verifier.ts`

**Purpose:** Verify every factual claim using multiple independent signals.

### High-Level Flow

```
                    ┌─────────────────────────────────────────────────────────┐
                    │              VERIFICATION PIPELINE                       │
                    │                                                          │
 Answer ──▶ Extract Claims ──▶ For Each Claim:                                │
                    │         ┌──────────────────────────────────────────┐    │
                    │         │  1. Embed claim                          │    │
                    │         │  2. Retrieve best evidence (cosine sim)  │    │
                    │         │  3. NLI entailment check                 │    │
                    │         │  4. Numeric consistency check            │    │
                    │         │  5. Citation mismatch detection          │    │
                    │         │  6. Aggregate → confidence score         │    │
                    │         └──────────────────────────────────────────┘    │
                    │                              │                           │
                    │                              ▼                           │
                    │         VerifiedClaim { confidence, entailment, issues } │
                    └─────────────────────────────────────────────────────────┘
```

---

### Step 4.1: Claim Extraction

**What:** LLM extracts atomic factual claims from the synthesized answer.

```
Input:  "The reactor achieved ignition [1] with 192 lasers [2]..."
Output: [
    { id: "c1", text: "The reactor achieved ignition", citedSources: [1] },
    { id: "c2", text: "The reactor used 192 lasers", citedSources: [2] }
]
```

**Rules:**
- Only factual claims (not opinions)
- Include necessary context for standalone meaning
- Track which `[n]` sources were cited

**Tunable:**

| Constant | Default | Purpose |
|----------|---------|---------|
| `MAX_CLAIMS_TO_VERIFY` | `12` | Cap for performance |
| `CLAIM_EXTRACTION_MODEL` | `google/gemini-3-flash-preview` | Fast, simple task |

---

### Step 4.2: Passage Chunking

**What:** Break source snippets into sentence-level passages for fine-grained retrieval.

**Why?** Source snippets are often 200-500 characters. A claim may match only one sentence. Chunking creates ~20-60 passages from ~15 sources.

```typescript
// Uses Intl.Segmenter for robust sentence detection
// Handles: "Mr. Smith", "U.S.A.", "Inc." correctly
const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
```

**Overlapping Windows:** Creates passages of 1, 2, and 3 sentences for context flexibility.

**Tunable:**

| Constant | Default | Purpose |
|----------|---------|---------|
| `MIN_PASSAGE_LENGTH` | `20` | Filter noise |

---

### Step 4.3: Embedding & Retrieval

**What:** Embed all passages and claims, find best-matching evidence via cosine similarity.

```
Claim Embedding ──▶ Cosine Similarity vs All Passage Embeddings ──▶ Best Match
```

**Key Outputs:**
- `retrievalSimilarity`: Best match score (0.0 - 1.0)
- `citedSourceSupport`: Best match from *cited* sources only
- `globalBestSupport`: Best match from *all* sources
- `citationMismatch`: True if best evidence is from an uncited source

**The Math:**

```typescript
// Cosine similarity
similarity = dotProduct(claimVec, passageVec) / (||claimVec|| × ||passageVec||)
```

**Citation Mismatch Detection:**

```typescript
citationMismatch = 
    citedSourceIndices.length > 0 &&
    globalBestSupport - citedSourceSupport > CITATION_MISMATCH_THRESHOLD &&
    !citedSourceIndices.includes(bestMatch.sourceIndex);
```

*Translation:* "The best evidence is from a source you didn't cite, and the difference is significant."

**Tunable:**

| Constant | Default | Purpose |
|----------|---------|---------|
| `EMBEDDING_MODEL` | `qwen/qwen3-embedding-8b` | Vector embedding model |
| `CITATION_MISMATCH_THRESHOLD` | `0.12` | Similarity gap to flag |
| `LOW_RETRIEVAL_THRESHOLD` | `0.45` | "Weak evidence" cutoff |

---

### Step 4.4: NLI Entailment Check

**What:** Natural Language Inference - does evidence support, contradict, or not address the claim?

```
Claim:    "Tesla's revenue grew 18% in Q3"
Evidence: "Tesla reported 15% year-over-year revenue growth"
Verdict:  CONTRADICTED (18% ≠ 15%)
```

**Verdicts:**

| Verdict | Meaning | Base Confidence |
|---------|---------|-----------------|
| `SUPPORTED` | Evidence directly supports claim | `1.0` |
| `NEUTRAL` | Evidence doesn't address claim | `0.55` |
| `CONTRADICTED` | Evidence contradicts claim | `0.15` |

**Strict Rules in Prompt:**
- Numbers must match: `"$96.8 billion"` = `"$96.8B"` ✓
- Direction must match: `"grew"` vs `"declined"` = CONTRADICTED
- Entities must match: Claim about Tesla, evidence about BYD = NEUTRAL

**Tunable:**

| Constant | Default | Purpose |
|----------|---------|---------|
| `NLI_MODEL` | `google/gemini-3-flash-preview` | Entailment model |
| `ENTAILMENT_SUPPORTED_CONFIDENCE` | `1.0` | Base for SUPPORTED |
| `ENTAILMENT_NEUTRAL_CONFIDENCE` | `0.55` | Base for NEUTRAL |
| `ENTAILMENT_CONTRADICTED_CONFIDENCE` | `0.15` | Base for CONTRADICTED |

---

### Step 4.5: Numeric Consistency Check

**What:** Extract numbers from claim and evidence, verify they match.

**Number Patterns Detected:**
- Currency: `$96.8 billion`, `€50M`, `¥1.2T`
- Percentages: `18.5%`, `grew 12 percent`
- Large numbers: `192 lasers`, `1,000,000 units`
- Years: `2024`, `1969`

**Normalization Examples:**

```
"$96.8 billion" → 96,800,000,000
"96.8B"         → 96,800,000,000  ✓ Match!

"grew 18%"      → 18
"grew 15%"      → 15  ✗ Mismatch!
```

**Tolerance:**
- Percentages: ±0.5 absolute
- Other numbers: ±5% relative

**Tunable:**

| Constant | Default | Purpose |
|----------|---------|---------|
| `NUMERIC_MISMATCH_MULTIPLIER` | `0.4` | Severe penalty |

---

### Step 4.6: Signal Aggregation

**What:** Combine all signals into a final confidence score.

**The Formula:**

```
confidence = BASE_CONFIDENCE[entailment]
           × (retrievalSimilarity < LOW_THRESHOLD ? LOW_RETRIEVAL_MULTIPLIER : 1.0)
           × (citationMismatch ? CITATION_MISMATCH_MULTIPLIER : 1.0)
           × (numericMismatch ? NUMERIC_MISMATCH_MULTIPLIER : 1.0)
```

**Example Calculation:**

```
Claim: "Tesla revenue was $96.8 billion"
Evidence says: "$95.1 billion"

Base (NEUTRAL - not exact match):     0.55
× Low retrieval (0.42 < 0.45):        × 0.7  = 0.385
× No citation mismatch:               × 1.0  = 0.385
× Numeric mismatch (96.8 ≠ 95.1):     × 0.4  = 0.154

Final confidence: 15.4% (LOW)
Issues: ["Evidence is neutral", "Low semantic similarity", "Numeric mismatch"]
```

**Confidence Levels:**

| Level | Threshold | Color in UI |
|-------|-----------|-------------|
| `high` | ≥ 0.72 | Green |
| `medium` | ≥ 0.42 | Yellow |
| `low` | < 0.42 | Red |

**Tunable:**

| Constant | Default | Purpose |
|----------|---------|---------|
| `HIGH_CONFIDENCE_THRESHOLD` | `0.72` | High cutoff |
| `MEDIUM_CONFIDENCE_THRESHOLD` | `0.42` | Medium cutoff |
| `LOW_RETRIEVAL_MULTIPLIER` | `0.7` | Weak evidence penalty |
| `CITATION_MISMATCH_MULTIPLIER` | `0.85` | Wrong citation penalty |
| `NUMERIC_MISMATCH_MULTIPLIER` | `0.4` | Number error penalty |

---

### Verification Concurrency

**What:** Claims are verified in parallel to reduce latency.

```
Claims: [c1, c2, c3, c4, c5, c6, c7, c8]

With CONCURRENCY = 4:
  Batch 1: c1, c2, c3, c4 (parallel)
  Batch 2: c5, c6, c7, c8 (parallel)
```

**Quality Preset Impact:**

| Preset | Concurrency | Why |
|--------|-------------|-----|
| Fast | 8 | Maximum speed |
| Medium | 6 | Balanced |
| Slow | 4 | Thorough, less API pressure |

**Tunable:**

| Constant | Location | Default |
|----------|----------|---------|
| `DEFAULT_VERIFICATION_CONCURRENCY` | `constants.ts` | From preset |

---

## Phase 5: The Reconstructor (Final Answer)

**File:** `app/lib/maxwell/adjudicator.ts`

**Purpose:** Provide a final, authoritative answer by **reconstructing** the truth from verified claims, ignoring any hallucinations in the draft.

### How It Works

The Reconstructor acts as the "Final Authority". It discards the original draft and synthesizes a new answer using ONLY the verified evidence.

**Logic:**
1.  **Filter Claims:**
    *   **Verified Facts (Green):** Claims with `SUPPORTED` entailment or High Confidence (>0.7).
    *   **Disputed Facts (Red):** Claims with `CONTRADICTED` entailment.
    *   **Unverified:** Claims with `NEUTRAL` entailment or Low Confidence.
2.  **Synthesize:**
    *   The LLM is instructed to **IGNORE** the original draft.
    *   It constructs a direct answer using the **Verified Facts**.
    *   It explicitly corrects any **Disputed Facts** using the evidence (e.g., "Contrary to some reports of X, verified data confirms Y").
3.  **Output:**
    *   A clean, authoritative answer that represents the "Verified Truth".

**Streaming:**
The reconstructed answer streams into the chat UI immediately after the verification card, effectively replacing the draft as the "Final Word".

**Tunable Parameters:**

| Constant | Location | Default | Purpose |
|----------|----------|---------|---------|
| `ADJUDICATOR_MODEL` | `constants.ts` | `google/gemini-3-flash-preview` | Fast, authoritative output |

---

## Background Optimization: Evidence Prep

**File:** `app/lib/maxwell/index.ts` (orchestrator)

**The Problem:** Embedding passages is slow (~2-3s). Waiting until after synthesis wastes time.

**The Solution:**

```typescript
// Start evidence prep in BACKGROUND during synthesis
const evidencePromise = prepareEvidence(sources);  // Don't await yet!

// ... synthesis happens ...

// Now await - should be ready!
const evidence = await evidencePromise;
await verifyClaims(answer, sources, onProgress, evidence);
```

**Time Saved:** ~2-4 seconds per query.

---

## Event Streaming

**File:** `app/lib/maxwell/index.ts`

**Pattern:** AsyncGenerator yields events for real-time UI updates.

```typescript
export async function* runMaxwell(query: string): AsyncGenerator<MaxwellEvent> {
    yield { type: 'phase-start', phase: 'decomposition' };
    // ... work ...
    yield { type: 'phase-complete', phase: 'decomposition', data: {...} };
    
    yield { type: 'phase-start', phase: 'search' };
    // ...
    
    yield { type: 'synthesis-chunk', content: '...' };  // Streaming text
    
    yield { type: 'verification-progress', data: { current: 3, total: 8, status: '...' } };
    
    yield { type: 'complete', data: fullResponse };
}
```

**Event Types:**

| Event | When | Payload |
|-------|------|---------|
| `phase-start` | Phase begins | `{ phase }` |
| `phase-complete` | Phase ends | `{ phase, data }` |
| `synthesis-chunk` | Text streams | `{ content }` |
| `verification-progress` | Claim verified | `{ current, total, status }` |
| `adjudication-chunk` | Verdict streams | `{ content }` |
| `complete` | All done | Full response |
| `error` | Failure | Error message |

---

## Glass Box Observability

Maxwell is designed to be a "Glass Box" AI, providing deep visibility into its reasoning process.

### 1. Interactive Citations (Raw Evidence Peeking)
*   **Feature:** Hovering over any citation `[1]` in the chat reveals the **raw evidence snippet** used by the agent.
*   **Goal:** Allows users to verify claims *as they read* without leaving the chat context.

### 2. Search Provenance
*   **Feature:** The UI groups sources by the specific **sub-query** that found them.
*   **Goal:** Shows exactly *how* information was discovered.

### 3. Latency Waterfall
*   **Feature:** A visual breakdown of time spent in each phase (Decomposition, Search, Synthesis, Verification, Adjudication).
*   **Goal:** Transparency into performance and "thinking" time.

### 4. Live Event Stream
*   **Feature:** A terminal-like log showing raw system events (`phase-start`, `verification-progress`, etc.) in real-time.
*   **Goal:** "Matrix mode" visibility for power users.


---

## API Route

**File:** `app/api/maxwell/route.ts`

**Endpoint:** `POST /api/maxwell`

**Request:**
```json
{ "query": "What's the current state of nuclear fusion?" }
```

**Response:** Server-Sent Events (SSE)
```
data: {"type":"phase-start","phase":"decomposition"}

data: {"type":"phase-complete","phase":"decomposition","data":{...}}

data: {"type":"synthesis-chunk","content":"The "}
data: {"type":"synthesis-chunk","content":"reactor "}

data: {"type":"complete","data":{...}}
data: [DONE]
```

---

## Frontend Integration

**Hook:** `app/hooks/use-maxwell.ts`

**State Exposed:**

```typescript
interface MaxwellUIState {
    phase: ExecutionPhase;        // 'idle' | 'decomposition' | ... | 'complete'
    subQueries: SubQuery[];       // From phase 1
    sources: MaxwellSource[];     // From phase 2
    verification: VerificationOutput | null;  // From phase 4
    verificationProgress: { current, total, status } | null;
    phaseDurations: { decomposition?, search?, synthesis?, verification?, total? };
    error: string | null;
}
```

**Store Integration:** Maxwell uses the *shared* Zustand store for message persistence but manages Maxwell-specific state locally.

---

## Complete Tunable Parameters Reference

### Quality Presets

| Constant | File | Default | Purpose |
|----------|------|---------|---------|
| `DEFAULT_QUALITY_PRESET` | `constants.ts` | `'fast'` | Default dropdown selection |

### Models

| Constant | File | Default | Purpose |
|----------|------|---------|---------|
| `DECOMPOSITION_MODEL` | `constants.ts` | `google/gemini-3-flash-preview` | Query breakdown |
| `SYNTHESIS_MODEL` | `constants.ts` | From preset | Answer generation |
| `CLAIM_EXTRACTION_MODEL` | `constants.ts` | `google/gemini-3-flash-preview` | Extract claims |
| `NLI_MODEL` | `constants.ts` | `google/gemini-3-flash-preview` | Entailment check |
| `EMBEDDING_MODEL` | `constants.ts` | `qwen/qwen3-embedding-8b` | Vector embeddings |

### Pipeline Limits

| Constant | File | Default | Purpose |
|----------|------|---------|---------|
| `MIN_SUB_QUERIES` | `constants.ts` | `3` | Minimum decomposition |
| `MAX_SUB_QUERIES` | `constants.ts` | `5` | Maximum decomposition |
| `RESULTS_PER_QUERY` | `constants.ts` | `5` | Sources per search |
| `SEARCH_DEPTH` | `constants.ts` | `'basic'` | Tavily depth |
| `MAX_CLAIMS_TO_VERIFY` | `constants.ts` | `12` | Verification cap |
| `SYNTHESIS_MAX_TOKENS` | `constants.ts` | `1500` | Answer length |

### Confidence Scoring

| Constant | File | Default | Purpose |
|----------|------|---------|---------|
| `HIGH_CONFIDENCE_THRESHOLD` | `constants.ts` | `0.72` | Green zone |
| `MEDIUM_CONFIDENCE_THRESHOLD` | `constants.ts` | `0.42` | Yellow zone |
| `ENTAILMENT_SUPPORTED_CONFIDENCE` | `constants.ts` | `1.0` | Base for SUPPORTED |
| `ENTAILMENT_NEUTRAL_CONFIDENCE` | `constants.ts` | `0.55` | Base for NEUTRAL |
| `ENTAILMENT_CONTRADICTED_CONFIDENCE` | `constants.ts` | `0.15` | Base for CONTRADICTED |
| `LOW_RETRIEVAL_MULTIPLIER` | `constants.ts` | `0.7` | Weak evidence penalty |
| `LOW_RETRIEVAL_THRESHOLD` | `constants.ts` | `0.45` | "Weak" cutoff |
| `CITATION_MISMATCH_MULTIPLIER` | `constants.ts` | `0.85` | Wrong source penalty |
| `CITATION_MISMATCH_THRESHOLD` | `constants.ts` | `0.12` | Gap to flag |
| `NUMERIC_MISMATCH_MULTIPLIER` | `constants.ts` | `0.4` | Number error penalty |

### Technical Limits

| Constant | File | Default | Purpose |
|----------|------|---------|---------|
| `MAX_QUERY_LENGTH` | `constants.ts` | `1000` | Input validation |
| `API_TIMEOUT_SECONDS` | `constants.ts` | `60` | Vercel timeout |
| `MIN_PASSAGE_LENGTH` | `constants.ts` | `20` | Filter short passages |

---

## Extension Ideas

### Future Quality Preset Controls

Presets could be extended to control:
- Number of sub-queries per query
- Sources per search
- Search depth (basic vs advanced)
- Max claims to verify
- Verification concurrency
- Synthesis token limits

### Potential New Signals

- **Temporal consistency:** Is claim still true? (date extraction)
- **Source authority:** Weight credible sources higher
- **Cross-claim consistency:** Do claims contradict each other?
- **Explicit uncertainty:** Detect hedging language ("may", "reportedly")

---

## File Map

```
app/lib/maxwell/
├── index.ts          # Orchestrator - runs the 4-phase pipeline
├── types.ts          # All TypeScript interfaces
├── constants.ts      # All tunable parameters
├── prompts.ts        # LLM prompts with helpers
├── decomposer.ts     # Phase 1: Query → Sub-queries
├── searcher.ts       # Phase 2: Sub-queries → Sources
├── synthesizer.ts    # Phase 3: Sources → Answer (streaming)
├── verifier.ts       # Phase 4: Answer → Verified claims
├── embeddings.ts     # Vector embedding utilities
└── env.ts            # Environment variable access

app/api/maxwell/
└── route.ts          # SSE streaming endpoint

app/hooks/
└── use-maxwell.ts    # React hook for UI state

app/components/maxwell/
├── MaxwellCanvas.tsx     # Right panel container
├── PhaseProgress.tsx     # Phase indicator
├── SubQueryList.tsx      # Shows decomposition
├── SourcesPanel.tsx      # Shows sources
├── VerificationPanel.tsx # Shows verified claims
└── index.ts              # Exports
```
