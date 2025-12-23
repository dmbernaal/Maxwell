# Maxwell: Adaptive Verified Search Architecture

> **Core Feature:** Multi-signal verification pipeline with "Glass Box" reasoning and Adaptive Compute.  
> **Deployment:** Multi-endpoint architecture optimized for Vercel serverless (60s timeout per function)

## The 5-Phase Pipeline

Maxwell differentiates from standard RAG by utilizing an adaptive, self-correcting pipeline that audits its own answers before showing them to the user.

```mermaid
graph LR
    A[User Query] --> B(Phase 1: Adaptive Plan);
    B --> C(Phase 2: Surgical Search);
    C --> D(Phase 3: Synthesize);
    D --> E(Phase 4: Temporal Verify);
    E --> F(Phase 5: Reconstruct);
    F --> G[Verified Answer];
```

## Multi-Endpoint Architecture (Production)

For Vercel deployment, the pipeline is split into 5 independent serverless functions:

```
┌──────────────────────────────────────────────────────────────────┐
│                CLIENT-SIDE ORCHESTRATION                          │
│                                                                   │
│  useMaxwell hook                                                  │
│       │                                                           │
│       ├──▶ /api/maxwell/decompose   → subQueries, config         │
│       ├──▶ /api/maxwell/search      → sources, evidenceBlobUrl   │
│       ├──▶ /api/maxwell/synthesize  → answer (SSE stream)        │
│       ├──▶ /api/maxwell/verify      → verification (SSE stream)  │
│       └──▶ /api/maxwell/adjudicate  → verdict (SSE stream)       │
│                                                                   │
│  Key: Embeddings stored in Vercel Blob, passed as URL!            │
└──────────────────────────────────────────────────────────────────┘
```

**Why Multi-Endpoint?** Embedding 3000+ passages takes ~45s. A single 60s function times out. By splitting:
- `/search` embeds passages, stores in **Vercel Blob** (~5s)
- `/verify` fetches from Blob, only embeds claims (~8s)
- Each endpoint completes well under 60s ✓

**Why Blob Storage?** Embeddings can reach ~12MB (988 passages × 3072 dims × 4 bytes). Vercel has a 4.5MB payload limit. Blob storage bypasses this — `/search` stores, `/verify` fetches server-to-server.

---

## Phase 1: Adaptive Planning (The Brain)

**File:** `app/lib/maxwell/decomposer.ts` + `app/lib/maxwell/configFactory.ts`

**Goal:** Analyze query complexity before acting.

**Adaptive Compute Levels:**

| Complexity | Model | Search Depth | Concurrency |
|------------|-------|--------------|-------------|
| `simple` | Gemini Flash | 4 results/q | 6x parallel |
| `standard` | Claude Sonnet | 5 results/q | 4x parallel |
| `deep_research` | Claude Sonnet | 8 results/q | 3x parallel |

**Output:** An `ExecutionConfig` JSON that configures the downstream budget.

---

## Phase 2: Surgical Search (The Eyes)

**File:** `app/lib/maxwell/searcher.ts`

**Features:**

* **Context-Aware:** Dynamically adjusts `topic` (News vs General) and `depth`.
* **Surgical Vision:** Automatically triggers `include_raw_content` (Full Text) for specific fact-lookup queries to prevent "Snippet Blindness."
  * Detects patterns: `who`, `what`, `when`, `version`, `date`, `price`, `cost`
* **System of Record:** Targets authoritative domains (GitHub, SEC, Gov) for technical queries.

---

## Phase 3: Synthesis (The Draft)

**File:** `app/lib/maxwell/synthesizer.ts`

**Goal:** Generate a comprehensive candidate answer with inline `[n]` citations.

**Constraint:** This is treated as an **Untrusted Draft** and is never shown as the final truth without verification.

---

## Phase 4: Verification (The Auditor)

**File:** `app/lib/maxwell/verifier.ts`

**Technique:** Claims are extracted and checked against vector embeddings + NLI.

**Key Features:**

### Temporal Awareness
The NLI model enforces **Recency Superiority**. Old evidence cannot contradict claims about current status.

```
Claim:    "X is currently CEO" (2024)
Evidence: "Y was appointed CEO" (2022)
Verdict:  NEUTRAL (outdated), not CONTRADICTED ✓
```

### Range-Aware Numeric Checking
Supports range overlaps and containment:

| Scenario | Claim | Evidence | Result |
|----------|-------|----------|--------|
| Range Overlap | "$400-$800" | "$400-$600" | ✓ Match |
| Containment | "$87,500" | "$87k-$88k" | ✓ Match |

### Multi-Signal Aggregation
```
confidence = BASE[entailment] 
           × retrievalPenalty 
           × citationMismatchPenalty 
           × numericMismatchPenalty
```

---

## Phase 5: Reconstruction (The Judge)

**File:** `app/lib/maxwell/adjudicator.ts`

**Goal:** Rewrite the answer using ONLY verified facts.

**Key Features:**

### The Reasoning Bridge
Uses hedging language for "Likely True but Unverified" claims rather than discarding them:

* **Bad:** "The release date is unknown."
* **Good:** "Current documentation indicates version 16.1.0 is the active release, though the precise calendar date was not explicitly retrieved."

**Outcome:** A final answer stripped of hallucinations but preserving useful uncertain information.

---

## Glass Box UI

The Maxwell Canvas provides full transparency into the pipeline:

1. **Planning Card:** Shows complexity assessment and execution config
2. **Sub-Query List:** Displays decomposition strategy
3. **Phase Progress:** Real-time phase tracking with durations
4. **Verification Panel:** Claim-by-claim confidence scores

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| **Orchestration** | Client-side hook + 5 serverless endpoints |
| **Search** | Tavily API (Context-Aware, Raw Content) |
| **LLMs** | OpenRouter (Gemini Flash, Claude Sonnet) |
| **Embeddings** | Google Gemini Embedding 001 (Primary) / Qwen-3-8B (Fallback) |
| **Large Payloads** | Vercel Blob Storage (bypasses 4.5MB limit) |
| **Frontend** | Next.js 16 + Framer Motion |
| **State** | Zustand + IndexedDB (idb-keyval) |
| **Streaming** | Server-Sent Events (SSE) |

---

## File Map

```
app/lib/maxwell/
├── index.ts          # Orchestrator - runs 5-phase pipeline (local dev)
├── api-types.ts      # Request/Response types for multi-endpoint API
├── configFactory.ts  # Adaptive Compute - ExecutionConfig from complexity
├── decomposer.ts     # Phase 1: Query → Sub-queries + Complexity
├── searcher.ts       # Phase 2: Sub-queries → Sources (Surgical Vision)
├── synthesizer.ts    # Phase 3: Sources → Draft Answer
├── verifier.ts       # Phase 4: Draft → Verified claims (Temporal + Range)
├── adjudicator.ts    # Phase 5: Verified → Reconstructed answer
├── prompts.ts        # All LLM prompts
├── embeddings.ts     # Vector utilities (saturated pipeline)
├── blob-storage.ts   # Vercel Blob utilities (large payload transfer)
└── types.ts          # TypeScript interfaces

app/api/maxwell/
├── route.ts              # Legacy monolithic endpoint (local dev)
├── decompose/route.ts    # Phase 1 endpoint (30s max)
├── search/route.ts       # Phase 2 endpoint + pre-embedding (60s max)
├── synthesize/route.ts   # Phase 3 SSE stream (30s max)
├── verify/route.ts       # Phase 4 SSE stream (60s max)
└── adjudicate/route.ts   # Phase 5 SSE stream (30s max)

app/hooks/
└── use-maxwell.ts        # Client orchestrator for multi-endpoint flow

app/components/maxwell/
├── MaxwellCanvas.tsx     # Main container
├── PlanningCard.tsx      # Adaptive Compute display
├── PhaseProgress.tsx     # Phase indicator
├── SubQueryList.tsx      # Decomposition view
├── SourcesPanel.tsx      # Sources view
├── VerificationPanel.tsx # Claims view
└── ClaimHeatmap.tsx      # Confidence overlay
```
