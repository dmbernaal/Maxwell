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

## Phase 1: Query Decomposition (Smart Planning)

**File:** `app/lib/maxwell/decomposer.ts`

**Purpose:** Break a complex user query into focused, independently-searchable sub-queries with **specific search configurations**.

### How It Works

1. User asks: *"Why is Bitcoin down today?"*
2. LLM generates a **Search Plan** (JSON):

```json
{
  "reasoning": "Breaking news event requiring recent market data and analysis.",
  "subQueries": [
    {
      "id": "q1",
      "query": "bitcoin price drop reason today",
      "topic": "news",
      "depth": "advanced",
      "days": 1,
      "purpose": "Identify the primary catalyst for the drop"
    },
    {
      "id": "q2",
      "query": "crypto market sentiment index",
      "topic": "general",
      "depth": "basic",
      "days": 1,
      "purpose": "Check technical indicators"
    }
  ]
}
```

### The "Smart" Parameters

| Parameter | Values | Purpose |
|-----------|--------|---------|
| `topic` | `'news'`, `'general'` | Directs Tavily to news index or general web index |
| `depth` | `'basic'`, `'advanced'` | Controls search depth and cost (Advanced = 2 credits) |
| `days` | `1`, `3`, `7`, `30`, `null` | Filters results by recency (e.g., "last 24h") |
| `domains` | `['github.com']`, etc. | Restricts search to specific high-value domains |

### Tunable Parameters

| Constant | Location | Default | Purpose |
|----------|----------|---------|---------|
| `DECOMPOSITION_MODEL` | `constants.ts` | `google/gemini-3-flash-preview` | Fast structured output |
| `MIN_SUB_QUERIES` | `constants.ts` | `3` | Minimum queries generated |
| `MAX_SUB_QUERIES` | `constants.ts` | `5` | Maximum queries generated |

---

## Phase 2: Parallel Search (Context-Aware)

**File:** `app/lib/maxwell/searcher.ts`

**Purpose:** Execute all sub-queries in parallel using their **specific configurations**.

### How It Works

```
q1 (News, 1d) ──┐
q2 (Gen, Basic) ─┼──▶ [Promise.all] ──▶ Tavily API x N ──▶ Dedupe by URL ──▶ Sources
q3 (Adv, Deep) ──┘
```

1.  **Context Mapping:**
    *   `days: 1` → `time_range: 'day'`
    *   `depth: 'advanced'` → `include_raw_content: true` (for deep reading)
2.  **Parallel Execution:** All configured searches run simultaneously.
3.  **Fail-Safe Retry:**
    *   If a `basic` search returns **0 results**, Maxwell automatically retries it with `advanced` depth.
    *   *Why?* Sometimes "basic" indexes miss niche topics. Advanced digs deeper.

### The Math

```
Maximum raw sources: SUB_QUERIES × RESULTS_PER_QUERY = 5 × 5 = 25
Typical unique sources after dedup: 12-20
```

### Tunable Parameters

| Constant | Location | Default | Purpose |
|----------|----------|---------|---------|
| `RESULTS_PER_QUERY` | `constants.ts` | `5` | Sources per sub-query |
| `SEARCH_DEPTH` | `constants.ts` | *Dynamic* | Default fallback if not specified |

### Surgical Vision (Fact-Lookup Detection)

**Problem:** Short snippets (~200 chars) often miss specific data points like dates, versions, and prices.

**Solution:** Maxwell detects **fact-lookup queries** and automatically fetches **full raw content** instead of snippets.

**Detection Patterns:**
```typescript
const isFactLookup = 
    subQuery.depth === 'advanced' || 
    /^(who|what|when|where|which|version|release|date|price|cost)/i.test(subQuery.query) ||
    subQuery.purpose.toLowerCase().includes('specific');
```

**Behavior:**
- If `isFactLookup = true` → Request `include_raw_content: true` from Tavily
- Prefer `raw_content` over `content` when building `MaxwellSource.snippet`

### System of Record Targeting

**Problem:** Third-party aggregators often have outdated or incorrect data.

**Solution:** The decomposition prompt now instructs the LLM to target **primary authority sources**.

**Examples:**
- Release dates/versions → `["github.com", "official docs domain"]`
- Financial data → `["sec.gov", "investor.*"]`
- Company announcements → Company's official domain

---

## Phase 3: Synthesis (Streaming)

**File:** `app/lib/maxwell/synthesizer.ts`

**Purpose:** Generate a comprehensive answer with inline `[n]` citations.

### How It Works

1. Sources formatted with full snippets (no truncation)
2. Prompt enforces citation rules: `EVERY factual claim MUST cite its source`
3. Response streams chunk-by-chunk for real-time UI
4. Post-processing extracts which sources were cited

### Intelligence Officer Persona

The synthesis prompt enforces a professional, dense tone with strict markdown formatting:

| Rule | Description |
|------|-------------|
| **TONE** | Objective, journalistic, dense. Just the facts. |
| **FORBIDDEN** | "I", "me", "Here is", "I found" |
| **STRUCTURE** | Use Markdown headers (##) to organize by theme |
| **CONFLICTS** | Explicitly state when sources disagree |
| **FORMAT** | No conversational filler. Start directly with the answer. |
| **LISTS** | Must be inline: "1. **Title** - Description" on ONE line |
| **TABLES** | Use GFM pipe syntax (| col | col |), never tab-aligned text |
| **SEPARATORS** | Use horizontal rules (---) between major sections |

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

### Adaptive Compute Architecture

Maxwell uses **Adaptive Compute** to dynamically adjust its execution parameters based on query complexity. Instead of manual mode selection, Maxwell analyzes each query and chooses the optimal configuration automatically.

**File:** `app/lib/maxwell/configFactory.ts`

**How It Works:**

1. During decomposition, the LLM assesses query complexity (`simple`, `standard`, `deep_research`)
2. The `createExecutionConfig()` function generates an `ExecutionConfig` based on complexity
3. All downstream functions use this config for dynamic parameter tuning

**Complexity Levels:**

| Level | Example Queries | Behavior |
|-------|-----------------|----------|
| `simple` | "What's the weather?", "AAPL stock price" | Fast model, fewer results, parallel verification |
| `standard` | "Explain quantum computing", "Compare iPhone vs Android" | Balanced model and depth |
| `deep_research` | "Comprehensive analysis of AI regulation", "Medical research on X" | Premium model, maximum sources, thorough verification |

**Dynamic Parameters:**

| Parameter | Simple | Standard | Deep Research |
|-----------|--------|----------|---------------|
| `synthesisModel` | gemini-3-flash | claude-sonnet-4.5 | claude-sonnet-4.5 |
| `resultsPerQuery` | 4 | 5 | 8 |
| `maxClaimsToVerify` | 5 | 30 | 100 |
| `verificationConcurrency` | 8 | 6 | 8 |

**UI Integration:**

A `PlanningCard` component displays the chosen configuration in the Maxwell Canvas, showing:
- Mode label (Speed Mode / Standard / Deep Research)
- Complexity reasoning
- Technical parameters (Model, Depth, Verification settings)

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
| `MAX_CLAIMS_TO_VERIFY` | `30` | Cap for performance (default; adaptive: 5/30/100) |
| `CLAIM_EXTRACTION_MODEL` | `google/gemini-3-flash-preview` | Fast, simple task |

---

### Step 4.2: Passage Chunking (Optimized)

**What:** Break source snippets into sentence-level passages for fine-grained retrieval.

**Why?** Source snippets are often 200-500 characters. A claim may match only one sentence.

```typescript
// Uses Intl.Segmenter for robust sentence detection
// Handles: "Mr. Smith", "U.S.A.", "Inc." correctly
const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
```

**Optimizations (NEW):**

| Setting | Before | After | Impact |
|---------|--------|-------|--------|
| **Window Sizes** | [1, 2, 3] | **[1, 3]** | 33% fewer passages |
| **Source Cap** | None | **25,000 chars** | Prevents infinite scroll explosion |

**Rationale:**
- Window 1: Atomic precision
- Window 3: Context recall
- Window 2: Redundant (dropped)

**Tunable:**

| Constant | Default | Purpose |
|----------|---------|---------||
| `MIN_PASSAGE_LENGTH` | `20` | Filter noise |
| `MAX_SOURCE_LENGTH` | `25000` | Cap oversized sources |

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
|----------|---------|---------||
| `EMBEDDING_MODEL` | `google/gemini-embedding-001` | Primary (top MTEB, reliable) |
| `EMBEDDING_MODEL_FALLBACK` | `qwen/qwen3-embedding-8b` | Fallback if primary fails |
| `BATCH_SIZE` | `50` | Texts per HTTP request |
| `CONCURRENCY` | `20` | Parallel requests via p-limit |
| `CITATION_MISMATCH_THRESHOLD` | `0.12` | Similarity gap to flag |
| `LOW_RETRIEVAL_THRESHOLD` | `0.45` | "Weak evidence" cutoff |

**Saturated Pipeline (NEW):**

The embedding system uses a "saturated pipeline" architecture for maximum throughput:

1. **Deduplication**: Embed each unique text ONCE (can save 20-50%)
2. **Batch Size 50**: 5x fewer HTTP requests than size 10
3. **Concurrency 20**: p-limit keeps 20 connections saturated
4. **Fallback**: Auto-switches to secondary model per batch on failure

```
[Maxwell] Embedding 5500 texts → 2800 unique (49% dedup)
[Maxwell] Processing 56 batches with concurrency 20
```

---

### Step 4.4: NLI Entailment Check (Temporal-Aware)

**What:** Natural Language Inference - does evidence support, contradict, or not address the claim?

**NEW: Temporal Superiority Rule**

The NLI model now considers **evidence dates** when determining verdicts. Older evidence cannot contradict claims about current status.

```
Claim:    "X is currently CEO" (2024)
Evidence: "Y was appointed CEO" (2022)
Old Verdict: CONTRADICTED ❌
New Verdict: NEUTRAL (outdated evidence) ✓
```

```
Claim:    "Tesla's revenue grew 18% in Q3"
Evidence: "Tesla reported 15% year-over-year revenue growth" (same date)
Verdict:  CONTRADICTED (18% ≠ 15%)
```

**Verdicts:**

| Verdict | Meaning | Base Confidence |
|---------|---------|-----------------|
| `SUPPORTED` | **Recent** evidence explicitly confirms the claim | `1.0` |
| `NEUTRAL` | Evidence is outdated, irrelevant, or ambiguous | `0.55` |
| `CONTRADICTED` | **Recent** evidence proves the claim FALSE | `0.15` |

**Strict Rules in Prompt:**
1. **TEMPORAL SUPERIORITY:** Old evidence cannot contradict current claims
2. Numbers must match: `"$96.8 billion"` = `"$96.8B"` ✓
3. Direction must match: `"grew"` vs `"declined"` = CONTRADICTED
4. Entities must match: Claim about Tesla, evidence about BYD = NEUTRAL
5. Specificity matters: Old broad claims can't contradict new specific ones

**Tunable:**

| Constant | Default | Purpose |
|----------|---------|---------|
| `NLI_MODEL` | `google/gemini-3-flash-preview` | Entailment model |
| `ENTAILMENT_SUPPORTED_CONFIDENCE` | `1.0` | Base for SUPPORTED |
| `ENTAILMENT_NEUTRAL_CONFIDENCE` | `0.55` | Base for NEUTRAL |
| `ENTAILMENT_CONTRADICTED_CONFIDENCE` | `0.15` | Base for CONTRADICTED |

---

### Step 4.5: Numeric Consistency Check (Range-Aware)

**What:** Extract numbers from claim and evidence, verify they match.

**NEW: Range Logic**

The numeric checker now supports **range overlaps**, **containment**, and **reverse containment** to reduce false negatives.

**Scenarios Supported:**

| Scenario | Claim | Evidence | Result |
|----------|-------|----------|--------|
| **Exact Match** | "$96.8B" | "$96.8 billion" | ✓ Match |
| **Range Overlap** | "$400-$800" | "$400-$600" | ✓ Match (min bounds match) |
| **Containment** | "$87,500" | "$87,000-$88,000" | ✓ Match (claim inside range) |
| **Reverse Containment** | "$400-$800" | "$500" | ✓ Match (evidence inside claim range) |

**Number Patterns Detected:**
- Currency: `$96.8 billion`, `€50M`, `¥1.2T`
- Percentages: `18.5%`, `grew 12 percent`
- Large numbers: `192 lasers`, `1,000,000 units`
- Years: `2024`, `1969` (excluded from consistency checks)

**Normalization Examples:**

```
"$96.8 billion" → 96,800,000,000
"96.8B"         → 96,800,000,000  ✓ Match!

"grew 18%"      → 18
"grew 15%"      → 15  ✗ Mismatch!
```

**Tolerance:**
- Percentages: ±0.5 absolute (strict matching)
- Other numbers: ±5% relative (strict), ±10% for range matching

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

**Adaptive Compute Impact:**

| Complexity Level | Concurrency | Why |
|------------------|-------------|-----|
| `simple` | 6 | Maximum speed for quick lookups |
| `standard` | 4 | Balanced |
| `deep_research` | 3 | Thorough, less API pressure |

**Tunable:**

| Constant | Location | Default |
|----------|----------|---------|
| `verificationConcurrency` | `configFactory.ts` | From complexity level |

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

### The Reasoning Bridge (NEW)

**Problem:** Previously, claims marked "UNCERTAIN" or "NEUTRAL" were discarded, leading to information loss even when the claim was likely true.

**Solution:** The Reconstructor now uses **hedging language** for uncertain claims instead of discarding them.

**Rules:**
- If a claim is `UNCERTAIN` or `NEUTRAL` (but NOT `CONTRADICTED`):
  - Do NOT discard if central to the answer
  - Use hedging language to indicate "likely true but unverified"
- Only discard explicitly `CONTRADICTED` claims

**Examples:**

| Bad (Information Loss) | Good (Reasoning Bridge) |
|------------------------|-------------------------|
| "The release date is unknown." | "Current documentation indicates version 16.1.0 is the active release, though the precise calendar date was not explicitly retrieved." |
| "Pricing is unverified." | "While specific pricing is unverified, reports suggest a range of..." |

**Streaming:**
The reconstructed answer streams into the chat UI immediately after the verification card, effectively replacing the draft as the "Final Word".

### Intelligence Officer Persona (NEW)

The Adjudicator enforces a dense, authoritative tone:

| Rule | Description |
|------|-------------|
| **Voice** | High-level Intelligence Analyst briefing a decision-maker |
| **Forbidden** | "I", "me", "my", "I have found", "I verified" |
| **Forbidden** | Filler: "Here is the answer", "Hope this helps", "In conclusion" |
| **Style** | Dense, information-heavy sentences. Prioritize density over politeness. |
| **Structure** | Lead immediately with the answer. Use bullet points for evidence. |
| **Uncertainty** | Be precise: "Data regarding X is insufficient" not "I couldn't find X" |

**Tunable Parameters:**

| Constant | Location | Default | Purpose |
|----------|----------|---------|---------|
| `ADJUDICATOR_MODEL` | `constants.ts` | `google/gemini-3-flash-preview` | Fast, authoritative output |

---

## Optimization: Pre-Embedding in Search Phase

> **Architecture:** Multi-endpoint (Vercel production)

**The Problem:** In a serverless environment, embedding 3000+ passages during verification causes timeouts.

**The Solution:** Move embedding to the `/search` endpoint:

```typescript
// In /api/maxwell/search/route.ts
export async function POST(request: NextRequest) {
  const { subQueries, config } = await request.json();
  
  // 1. Run parallel searches
  const searchOutput = await parallelSearch(subQueries, config.resultsPerQuery);
  
  // 2. PRE-EMBED all passages HERE (the key optimization!)
  const preparedEvidence = await prepareEvidence(searchOutput.sources);
  
  // 3. Return both sources AND embeddings
  return Response.json({
    sources: searchOutput.sources,
    preparedEvidence, // { passages: [...], embeddings: [...] }
  });
}
```

**Why This Works:**
- Search phase has plenty of time budget (~2s for search, ~3s for embedding = ~5s total)
- Verify phase receives pre-computed embeddings and only embeds claims (~5-30 texts)
- Each phase stays well under the 60-second timeout

**Embedding Encoding:** Float32Array embeddings are base64-encoded for JSON transport:
```typescript
// Encode (in search endpoint)
const base64 = Buffer.from(new Float32Array(embedding).buffer).toString('base64');

// Decode (in verify endpoint)  
const buffer = Buffer.from(base64, 'base64');
const embedding = new Float32Array(buffer.buffer);
```

---

### Local Development: Background Promise Pattern

**File:** `app/lib/maxwell/index.ts` (orchestrator)

For local development (no timeout constraints), the original pattern is preserved:

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

## API Architecture: Multi-Endpoint Pipeline

> **Status:** Production-ready (Vercel-optimized)  
> **Key Innovation:** Each phase has its own serverless endpoint with independent timeout budgets

**Problem Solved:** Vercel serverless functions have a 60-second timeout limit. The original monolithic `/api/maxwell` route would timeout during embedding-heavy queries (3000+ texts).

**Solution:** Split the pipeline into 5 independent API endpoints, each under 60 seconds:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                      MULTI-ENDPOINT ARCHITECTURE                                │
│                                                                                 │
│   Client Orchestrator (useMaxwell hook)                                         │
│         │                                                                       │
│         ├──▶ POST /api/maxwell/decompose  (30s max)                            │
│         │         └── Returns: subQueries, config, complexity                   │
│         │                                                                       │
│         ├──▶ POST /api/maxwell/search     (60s max) ⬅ PRE-EMBEDS PASSAGES     │
│         │         └── Returns: sources, preparedEvidence (passages + embeddings)│
│         │                                                                       │
│         ├──▶ POST /api/maxwell/synthesize (30s max) [SSE Stream]               │
│         │         └── Streams: synthesis-chunk events → synthesis-complete      │
│         │                                                                       │
│         ├──▶ POST /api/maxwell/verify     (60s max) [SSE Stream]               │
│         │         └── Streams: claim verification events (uses pre-embeddings!) │
│         │                                                                       │
│         └──▶ POST /api/maxwell/adjudicate (30s max) [SSE Stream]               │
│                   └── Streams: final verdict chunks                             │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

| Approach | Total Time Budget | Problem |
|----------|-------------------|---------|
| Monolithic | 60s (single function) | Embedding 3000+ texts takes ~45s alone |
| Multi-endpoint | 5 × 60s = 300s total | Each phase fits within its budget ✓ |

### The Key Optimization: Pre-Embedding in Search Phase

The **`/search` endpoint** now performs passage chunking AND embedding before returning:

```typescript
// In /api/maxwell/search/route.ts
const searchOutput = await parallelSearch(subQueries, config.resultsPerQuery);
const preparedEvidence = await prepareEvidence(searchOutput.sources); // ⬅ Pre-embed!

return { sources, preparedEvidence }; // Embeddings included in response
```

The **`/verify` endpoint** receives pre-computed embeddings and only needs to:
1. Embed claims (5-30 texts, not 3000+)
2. Run NLI checks
3. Aggregate signals

**Result:** Verification phase drops from ~45s to ~8s.

---

### Endpoint Reference

#### POST `/api/maxwell/decompose`

**Purpose:** Query decomposition and complexity assessment

**Timeout:** 30 seconds

**Request:**
```json
{ "query": "What's the current state of nuclear fusion?" }
```

**Response:**
```json
{
  "subQueries": [...],
  "config": { "synthesisModel": "...", "resultsPerQuery": 5, ... },
  "complexity": "standard",
  "complexityReasoning": "...",
  "durationMs": 2100
}
```

---

#### POST `/api/maxwell/search`

**Purpose:** Parallel search + passage embedding (the heavy lifting)

**Timeout:** 60 seconds

**Request:**
```json
{
  "subQueries": [...],
  "config": { "resultsPerQuery": 5, ... }
}
```

**Response:**
```json
{
  "sources": [...],
  "searchMetadata": [...],
  "preparedEvidence": {
    "passages": [...],
    "embeddings": [...] // Base64-encoded Float32Arrays
  },
  "durationMs": 2500
}
```

---

#### POST `/api/maxwell/synthesize`

**Purpose:** Generate answer with citations (SSE streaming)

**Timeout:** 30 seconds

**Request:**
```json
{
  "query": "...",
  "sources": [...],
  "config": { "synthesisModel": "..." }
}
```

**Response:** Server-Sent Events
```
data: {"type":"synthesis-chunk","content":"The "}
data: {"type":"synthesis-chunk","content":"reactor "}
data: {"type":"synthesis-complete","answer":"...","sourcesUsed":["s1","s2"],"durationMs":4800}
data: [DONE]
```

---

#### POST `/api/maxwell/verify`

**Purpose:** Multi-signal claim verification (SSE streaming)

**Timeout:** 60 seconds

**Request:**
```json
{
  "answer": "...",
  "sources": [...],
  "preparedEvidence": { "passages": [...], "embeddings": [...] },
  "config": { "maxClaimsToVerify": 30, "verificationConcurrency": 6 }
}
```

**Response:** Server-Sent Events
```
data: {"type":"verification-start","claimsCount":5}
data: {"type":"claim-verified","claim":{...},"current":1,"total":5}
data: {"type":"verification-complete","verification":{...},"durationMs":7800}
data: [DONE]
```

---

#### POST `/api/maxwell/adjudicate`

**Purpose:** Final verdict synthesis (SSE streaming)

**Timeout:** 30 seconds

**Request:**
```json
{
  "query": "...",
  "answer": "...",
  "verification": { "claims": [...], "summary": {...} }
}
```

**Response:** Server-Sent Events
```
data: {"type":"adjudication-chunk","content":"Based on "}
data: {"type":"adjudication-complete","durationMs":4400}
data: [DONE]
```

---

### Legacy Endpoint (Local Development)

**File:** `app/api/maxwell/route.ts`

The original monolithic endpoint is preserved for local development where timeout limits don't apply.

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

### Multi-Endpoint Orchestration

The `useMaxwell` hook now acts as a **client-side orchestrator**, calling each endpoint sequentially and managing state handoff between them:

```typescript
// Simplified orchestration flow
async function runMaxwellPipeline(query: string) {
  // 1. Decompose
  const { subQueries, config } = await fetch('/api/maxwell/decompose', { query });
  
  // 2. Search (returns pre-computed embeddings!)
  const { sources, preparedEvidence } = await fetch('/api/maxwell/search', { subQueries, config });
  
  // 3. Synthesize (SSE stream)
  const answer = await streamSSE('/api/maxwell/synthesize', { query, sources, config });
  
  // 4. Verify (SSE stream, uses preparedEvidence)
  const verification = await streamSSE('/api/maxwell/verify', { 
    answer, sources, preparedEvidence, config 
  });
  
  // 5. Adjudicate (SSE stream)
  await streamSSE('/api/maxwell/adjudicate', { query, answer, verification });
}
```

### State Exposed

```typescript
interface MaxwellUIState {
    phase: ExecutionPhase;        // 'idle' | 'decomposition' | ... | 'complete'
    subQueries: SubQuery[];       // From /decompose
    sources: MaxwellSource[];     // From /search
    preparedEvidence: PreparedEvidence | null; // Pre-computed embeddings (internal)
    verification: VerificationOutput | null;   // From /verify
    verificationProgress: { current, total, status } | null;
    phaseDurations: { decomposition?, search?, synthesis?, verification?, adjudication?, total? };
    error: string | null;
}
```

### State Handoff

The hook maintains intermediate state between API calls:

| Phase Complete | Data Stored | Passed To Next Phase |
|---------------|-------------|---------------------|
| Decompose | `subQueries`, `config` | Search |
| Search | `sources`, `preparedEvidence` | Synthesize, Verify |
| Synthesize | `answer`, `sourcesUsed` | Verify, Adjudicate |
| Verify | `verification` | Adjudicate |

**Key:** `preparedEvidence` contains base64-encoded embeddings that are decoded and passed directly to the verify endpoint, eliminating the need to re-embed 3000+ passages.

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
| `MAX_CLAIMS_TO_VERIFY` | `constants.ts` | `30` | Fallback verification cap (adaptive: 5/30/100 by complexity) |
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

## Claim Heatmap (Attention Map Visualization)

**File:** `app/components/maxwell/ClaimHeatmap.tsx`  
**Utility:** `app/lib/maxwell/claimMatcher.ts`

**Purpose:** Visualize verification confidence as an "attention map" overlay on the synthesized text, similar to transformer attention visualizations.

### How It Works

1. **Sentence Segmentation:** The synthesized text is split into sentences using `Intl.Segmenter`
2. **Claim Matching:** Each sentence is matched to verified claims using Jaccard similarity (keyword overlap)
3. **Confidence Overlay:** Matched sentences get background colors based on their verification confidence:
   - **Green:** High confidence (≥0.72), SUPPORTED
   - **Yellow:** Medium confidence (0.42-0.72), NEUTRAL
   - **Red:** Low confidence (<0.42), CONTRADICTED

### User Experience

- **Toggle Button:** "Show Heatmap" button appears after verification completes
- **Hover Tooltips:** Hovering over highlighted text reveals:
  - The matched claim text
  - Confidence percentage
  - Entailment verdict
  - Evidence snippet from the source
  - Match quality score

### Matching Algorithm

```typescript
// Jaccard-like similarity with claim coverage weighting
const score = (claimCoverage * 0.7) + (jaccardSimilarity * 0.3);

// Match threshold: 40% minimum similarity
const MATCH_THRESHOLD = 0.4;
```

### Statistics Bar

The heatmap shows coverage statistics:
- Total sentences vs matched sentences
- Coverage percentage
- Average confidence

---

## File Map

```
app/lib/maxwell/
├── index.ts          # Orchestrator - runs the 5-phase pipeline (local dev)
├── types.ts          # All TypeScript interfaces
├── api-types.ts      # Request/Response types for multi-endpoint architecture (NEW)
├── constants.ts      # All tunable parameters
├── configFactory.ts  # Adaptive Compute - generates ExecutionConfig from complexity
├── prompts.ts        # LLM prompts with helpers (NLI, Decomposition, Synthesis)
├── decomposer.ts     # Phase 1: Query → Sub-queries + Complexity Assessment
├── searcher.ts       # Phase 2: Sub-queries → Sources (with Surgical Vision)
├── synthesizer.ts    # Phase 3: Sources → Answer (streaming)
├── verifier.ts       # Phase 4: Answer → Verified claims (Temporal + Range-Aware)
├── adjudicator.ts    # Phase 5: Verified claims → Reconstructed answer
├── embeddings.ts     # Vector embedding utilities
├── claimMatcher.ts   # Maps verified claims to text sentences for heatmap
└── env.ts            # Environment variable access

app/api/maxwell/
├── route.ts              # Legacy monolithic SSE endpoint (local dev fallback)
├── decompose/
│   └── route.ts          # Phase 1: Query decomposition endpoint (30s)
├── search/
│   └── route.ts          # Phase 2: Search + pre-embedding endpoint (60s)
├── synthesize/
│   └── route.ts          # Phase 3: SSE streaming synthesis (30s)
├── verify/
│   └── route.ts          # Phase 4: SSE streaming verification (60s)
└── adjudicate/
    └── route.ts          # Phase 5: SSE streaming adjudication (30s)

app/hooks/
└── use-maxwell.ts    # React hook - orchestrates multi-endpoint calls

app/components/maxwell/
├── MaxwellCanvas.tsx     # Right panel container
├── PlanningCard.tsx      # Adaptive Compute visualization
├── PhaseProgress.tsx     # Phase indicator
├── SubQueryList.tsx      # Shows decomposition
├── SourcesPanel.tsx      # Shows sources
├── VerificationPanel.tsx # Shows verified claims
├── ClaimHeatmap.tsx      # Confidence heatmap overlay
└── index.ts              # Exports
```

