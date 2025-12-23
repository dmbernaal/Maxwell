# Maxwell: Verified Search Agent

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![AI SDK](https://img.shields.io/badge/AI_SDK-5.0-green)](https://sdk.vercel.ai/docs)

Maxwell is an adaptive, self-correcting search engine designed to solve the **Hallucination Problem** in Enterprise AI. Unlike standard RAG systems that simply summarize search results, Maxwell audits its own answers using a multi-signal verification pipeline.

---

## 🧠 The Architecture: "The Trust Layer"

Maxwell introduces a 5-phase pipeline that treats LLM generation as an **"Untrusted Draft"** until verified.

```mermaid
graph LR
    A[User Query] --> B(Phase 1: Adaptive Plan);
    B --> C(Phase 2: Surgical Search);
    C --> D(Phase 3: Synthesize);
    D --> E(Phase 4: Temporal Verify);
    E --> F(Phase 5: Reconstruct);
    F --> G[Verified Answer];
```

### Key Innovations

| Feature | Description |
|---------|-------------|
| **Multi-Endpoint Architecture** | Pipeline split into 5 serverless functions for Vercel. Each phase under 60s timeout. |
| **Vercel Blob for Large Payloads** | Embeddings (~12MB) stored in Blob Storage, passed as URL. Bypasses 4.5MB payload limit. |
| **Pre-Embedding Optimization** | Embeddings computed during search, not verification. Reduces verify from ~45s to ~8s. |
| **Adaptive Compute** | Analyzes query complexity. Simple → Gemini Flash (fast). Complex → Claude Sonnet (precise). |
| **Temporal Verification** | NLI enforces "Recency Superiority" — old evidence cannot contradict current status. |
| **Reasoning Bridge** | Uses hedging language for unverified data instead of deleting it. |
| **Glass Box UI** | Visualizes the "thinking" process with per-claim confidence scores. |

---

## 📁 Project Structure

```
app/
├── api/
│   ├── chat/route.ts              # Standard chat endpoint
│   └── maxwell/                   # Maxwell Multi-Endpoint API
│       ├── route.ts               # Legacy monolithic (local dev)
│       ├── decompose/route.ts     # Phase 1: Query decomposition
│       ├── search/route.ts        # Phase 2: Search + pre-embedding
│       ├── synthesize/route.ts    # Phase 3: SSE synthesis
│       ├── verify/route.ts        # Phase 4: SSE verification
│       └── adjudicate/route.ts    # Phase 5: SSE adjudication
├── components/
│   ├── maxwell/                   # Maxwell Canvas UI components
│   └── InputInterface.tsx         # Main input with mode toggle
├── hooks/
│   └── use-maxwell.ts             # Client orchestrator for multi-endpoint
└── lib/
    └── maxwell/
        ├── index.ts               # 5-phase orchestrator (local dev)
        ├── api-types.ts           # Multi-endpoint request/response types
        ├── configFactory.ts       # Adaptive compute configuration
        ├── decomposer.ts          # Phase 1: Query → Sub-queries
        ├── searcher.ts            # Phase 2: Surgical search
        ├── synthesizer.ts         # Phase 3: Draft synthesis
        ├── verifier.ts            # Phase 4: Multi-signal verification
        ├── adjudicator.ts         # Phase 5: Reconstruction
        ├── embeddings.ts          # Saturated pipeline embeddings
        ├── blob-storage.ts        # Vercel Blob utilities
        └── prompts.ts             # All LLM prompts
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Architecture** | Multi-endpoint serverless (5 functions) |
| **Orchestration** | Client-side hook + Vercel AI SDK 5.0 |
| **Search** | Tavily API (Context-Aware w/ Raw Content) |
| **Models** | Google Gemini 3 Flash (Speed) / Claude Sonnet 4.5 (Reasoning) |
| **Embeddings** | Google Gemini Embedding 001 (Primary) / Qwen 3 (Fallback) |
| **Large Payloads** | Vercel Blob Storage (bypasses 4.5MB limit) |
| **Streaming** | Server-Sent Events (SSE) for real-time UI |
| **State** | Zustand + IndexedDB (idb-keyval) |

---

## 🚀 Getting Started

### Prerequisites

API keys required:
- **OpenRouter** (access to Gemini/Claude)
- **Tavily** (search API)

### Installation

```bash
# Clone the repository
git clone https://github.com/dmbernaal/maxwell.git
cd maxwell

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add OPENROUTER_API_KEY and TAVILY_API_KEY

# Run development server
npm run dev
```

---

## 🧪 Testing

Maxwell includes comprehensive tests organized by type:

### Quick Start

```bash
# Run all unit tests (no API keys required)
npm run test:unit

# Run with coverage report
npm run test:coverage
```

### Test Structure

```
__tests__/
├── unit/                              # No external dependencies (176 tests)
│   ├── blob-storage.test.ts           # Embedding encoding/decoding
│   ├── embeddings-math.test.ts        # Cosine similarity, top matches
│   ├── verifier-signals.test.ts       # Numeric extraction, normalization
│   ├── config-factory.test.ts         # Adaptive compute configuration
│   ├── constants.test.ts              # Threshold & model validation
│   ├── decomposer-validation.test.ts  # Query decomposition validation
│   ├── passage-chunking.test.ts       # Sentence segmentation
│   ├── evidence-retrieval.test.ts     # Best-match finding logic
│   ├── api-types.test.ts              # API contract validation
│   └── error-handling.test.ts         # Edge cases & defensive coding
└── integration/                       # Requires API keys
    └── api-endpoints.test.ts          # Full pipeline E2E
```

### Test Commands

| Command | Description | API Keys? |
|---------|-------------|-----------|
| `npm run test:unit` | Unit tests only | ❌ No |
| `npm run test:integration` | Integration tests | ✅ Yes |
| `npm test` | All tests | ✅ Yes |
| `npm run test:coverage` | Unit tests with coverage | ❌ No |

### What's Tested

**Unit Tests (176 tests across 10 files):**
- **Blob Storage**: Base64 encoding/decoding, round-trip precision for embeddings
- **Embeddings Math**: Cosine similarity, orthogonal/opposite vectors, top-N matching
- **Verifier Signals**: Number extraction, normalization (billions/millions/%), confidence aggregation
- **Config Factory**: Adaptive compute for all complexity levels (simple/standard/deep_research)
- **Constants**: Model IDs, thresholds, multipliers, entailment scores validation
- **Decomposer Validation**: Sub-query validation, duplicate ID detection, bounds checking
- **Passage Chunking**: Sentence segmentation, window sizes, edge cases
- **Evidence Retrieval**: Best-match finding, citation mismatch detection
- **API Types**: Request/response contract validation, Blob URL formats
- **Error Handling**: Malformed inputs, edge cases, defensive coding patterns

**Integration Tests** (requires `OPENROUTER_API_KEY` + `TAVILY_API_KEY`):
- Full 5-phase pipeline: Decompose → Search → Synthesize → Verify → Adjudicate
- Real API calls to Tavily and OpenRouter

### Legacy Tests

Original phase-by-phase tests from initial development are preserved in `tests/legacy/` for reference.

---

## 📦 Deployment

Optimized for Vercel with multi-endpoint architecture:

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel Dashboard:
   - `OPENROUTER_API_KEY`
   - `TAVILY_API_KEY`
   - `BLOB_READ_WRITE_TOKEN` (from Vercel Blob Storage)
4. Deploy

> **Blob Storage Setup:** In Vercel Dashboard → Storage → Create Blob Store → Copy token to env vars.

### Why Multi-Endpoint?

The Maxwell pipeline is split into 5 serverless functions to stay within Vercel's 60-second timeout:

| Endpoint | Purpose | Timeout |
|----------|---------|---------|
| `/api/maxwell/decompose` | Query analysis | 30s |
| `/api/maxwell/search` | Search + pre-embed | 60s |
| `/api/maxwell/synthesize` | Answer generation | 30s |
| `/api/maxwell/verify` | Claim verification | 60s |
| `/api/maxwell/adjudicate` | Final verdict | 30s |

The key optimization: **pre-embedding passages during search** so verification only embeds claims (~5-30 texts, not ~3000).

---

## 🤖 AI-Assisted Development Process

This project was built using a structured AI collaboration workflow:

### Architecture Design
- Consulted **Claude Opus 4.5** and **Gemini** to design the 5-phase pipeline architecture
- Iteratively refined the verification strategy through architectural discussions

### Implementation Workflow
1. **Planning Phase**: Before any code is written, the AI constructs an implementation plan (`.md` file) that I must approve
2. **Review & Edit**: I review the plan, make corrections, and provide feedback
3. **Execution**: Only after approval does the AI write code using [Cursor](https://cursor.sh/) or Antigravity
4. **Verification**: 
   - For logic: Run unit tests
   - For UI: Visual inspection via browser + console logs
5. **Iteration**: Back-and-forth refinement with AI assistants

### Model Specialization
| Task Type | Model Used |
|-----------|------------|
| **Logic & Architecture** | Claude Opus 4.5 |
| **Frontend & Design** | Gemini 3.0 |
| **Code Generation** | Cursor Agent / Antigravity |

This approach ensures:
- ✅ Human oversight at every decision point
- ✅ Structured, reviewable implementation plans
- ✅ Clear separation between design and execution
- ✅ Iterative refinement based on testing feedback

---

## 📄 Documentation

Detailed technical documentation is available in `/documentation`:

- [`MAXWELL.md`](./documentation/MAXWELL.md) - Complete architectural overview
- [`MAXWELL_ARCHITECTURE.md`](./documentation/MAXWELL_ARCHITECTURE.md) - Visual pipeline breakdown
- [`PROMPTS.md`](./documentation/PROMPTS.md) - All LLM prompts explained

---

## Author

**Diego I. Medina-Bernal**  
📧 dmbernaal@gmail.com
