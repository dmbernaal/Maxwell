# Maxwell: Verified Search Agent

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![AI SDK](https://img.shields.io/badge/AI_SDK-5.0-green)](https://sdk.vercel.ai/docs)

> **Submission for Tenex Engineering Take-Home**

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
| **Adaptive Compute** | Analyzes query complexity before acting. Simple queries get Gemini Flash + 6x concurrency (low latency). Deep research gets Claude Sonnet + 3x concurrency + raw content fetching (high precision). |
| **Temporal Verification** | NLI enforces "Recency Superiority" — old evidence cannot contradict current status (e.g., software versions, CEOs). |
| **Reasoning Bridge** | Instead of deleting unverified data, the Adjudicator uses hedging language ("Reports suggest...") to preserve utility while maintaining honesty. |
| **Saturated Pipeline** | p-limit controls 20 parallel embedding requests with deduplication, achieving 5x fewer HTTP calls than naive batching. |
| **Glass Box UI** | Visualizes the "thinking" process, exposing confidence scores for every claim. |

---

## 📁 Project Structure

```
app/
├── api/
│   ├── chat/route.ts          # Standard chat endpoint
│   └── maxwell/route.ts       # Maxwell SSE streaming endpoint
├── components/
│   ├── maxwell/               # Maxwell Canvas UI components
│   └── InputInterface.tsx     # Main input with mode toggle
└── lib/
    └── maxwell/
        ├── index.ts           # 5-phase orchestrator
        ├── configFactory.ts   # Adaptive compute configuration
        ├── decomposer.ts      # Phase 1: Query → Sub-queries
        ├── searcher.ts        # Phase 2: Surgical search
        ├── synthesizer.ts     # Phase 3: Draft synthesis
        ├── verifier.ts        # Phase 4: Multi-signal verification
        ├── adjudicator.ts     # Phase 5: Reconstruction
        ├── embeddings.ts      # Saturated pipeline embeddings
        └── prompts.ts         # All LLM prompts
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Orchestration** | Vercel AI SDK 5.0 + Custom Async Generators |
| **Search** | Tavily API (Context-Aware w/ Raw Content) |
| **Models** | Google Gemini 3 Flash (Speed) / Claude Sonnet 4.5 (Reasoning) |
| **Embeddings** | Google Gemini Embedding 001 (Primary) / Qwen 3 (Fallback) |
| **Performance** | p-limit for network throttling & parallel batching |

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

Maxwell includes unit tests for core verification logic.

```bash
npm test
```

Tests cover:
- **Numeric Consistency**: Range overlaps, containment, exact matches
- **Adaptive Compute**: Resource allocation by complexity level

---

## 📦 Deployment

Optimized for Vercel:

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel Dashboard
4. Deploy

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
