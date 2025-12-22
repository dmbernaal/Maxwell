# MAXWELL: Master Implementation Guide
## The North Star Document for Cursor Agent

---

# 🎯 READ THIS FIRST - EVERY PHASE

This document is your constant reference. Before starting ANY phase:
1. Re-read Section 1 (Vision) to stay aligned
2. Check Section 2 (Architecture) to understand where your work fits
3. Follow Section 3 (Rules) strictly
4. Update documentation per Section 4 after completing each phase

---

# Section 1: The Vision

## 1.1 What is Maxwell?

Maxwell is an **entropy-aware verified search agent**. It answers complex questions by:

1. **Decomposing** queries into focused sub-queries
2. **Searching** multiple sources in parallel
3. **Synthesizing** a coherent answer with citations
4. **Verifying** every factual claim using multi-signal verification

## 1.2 Why Does This Matter?

Current search agents (Perplexity, SearchGPT) have a fatal flaw: **they trust LLM synthesis blindly**. Users can't tell which parts of an answer are grounded in sources versus hallucinated.

Maxwell solves this with **external verification**:
- Extract factual claims from the answer
- Find evidence passages using embeddings
- Check entailment using NLI (Natural Language Inference)
- Validate numeric consistency
- Check citation correctness

## 1.3 The Killer Feature

**Multi-signal verification** that catches:

| Signal | What It Catches |
|--------|-----------------|
| Embeddings (Retrieval) | Topic drift, irrelevant claims |
| NLI Entailment | Contradictions, negation ("grew" vs "fell") |
| Numeric Check | Wrong numbers, misquoted statistics |
| Citation Check | Claim cites wrong source |

## 1.4 Why Multi-Signal?

Embeddings alone FAIL:
```
Claim: "Tesla revenue GREW by 10%"
Source: "Tesla revenue FELL by 10%"
Embedding similarity: 0.88 (HIGH!)
```

Embeddings measure **semantic relatedness**, not **factual entailment**. That's why we combine multiple signals.

## 1.5 Interview Narrative

When presenting Maxwell:

> "I built a verified search agent. Current tools trust LLM synthesis blindly—users can't tell what's grounded versus hallucinated.
>
> I implemented multi-signal verification: embeddings for evidence retrieval, NLI for entailment checking, numeric extraction for statistics, and citation correctness checking.
>
> Users see confidence scores per claim with explanations. It's not 'trust me'—it's 'here's the evidence.'"

---

# Section 2: Architecture

## 2.1 System Flow

```
USER QUERY
    │
    ▼
┌─────────────────────────────────┐
│  PHASE 1: DECOMPOSITION         │
│  Break query into sub-queries   │
│  Model: gemini-3-flash-preview  │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  PHASE 2: PARALLEL SEARCH       │
│  Execute all searches (Tavily)  │
│  Deduplicate by URL             │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  PHASE 3: SYNTHESIS             │
│  Generate answer with citations │
│  Model: claude-sonnet-4.5       │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  PHASE 4: VERIFICATION          │
│  ├── Extract claims             │
│  ├── Retrieve evidence (embed)  │
│  ├── Check entailment (NLI)     │
│  ├── Check numerics             │
│  └── Check citations            │
│  Model: gemini-3-flash-preview  │
│  Embeddings: text-embedding-3   │
└─────────────────────────────────┘
    │
    ▼
VERIFIED RESPONSE
```

## 2.2 File Structure

```
app/
├── api/
│   └── maxwell/
│       └── route.ts              # SSE streaming endpoint
│
├── lib/
│   └── maxwell/
│       ├── index.ts              # Main orchestrator
│       ├── types.ts              # All TypeScript interfaces
│       ├── prompts.ts            # All LLM prompts
│       ├── decomposer.ts         # Query decomposition
│       ├── searcher.ts           # Parallel search
│       ├── synthesizer.ts        # Answer synthesis
│       ├── verifier.ts           # Multi-signal verification
│       └── embeddings.ts         # Embedding utilities
│
├── hooks/
│   └── use-maxwell.ts            # React hook for API
│
├── components/
│   └── maxwell/
│       ├── maxwell-chat.tsx      # Main container
│       ├── progress-display.tsx  # Phase progress
│       ├── sources-panel.tsx     # Sources list
│       ├── verification-panel.tsx # Claim verification
│       └── claim-card.tsx        # Individual claim
│
└── types.ts                      # Shared types

documentation/
├── ARCHITECTURE.md               # System design
├── FILE-MAP.md                   # File descriptions
├── TYPES.md                      # Type documentation
├── API.md                        # Endpoint documentation
├── VERIFICATION.md               # Verification system docs
└── CHANGELOG.md                  # Phase completion log
```

## 2.3 Models Used

| Purpose | Model | Provider |
|---------|-------|----------|
| Decomposition | `google/gemini-3-flash-preview` | OpenRouter |
| Synthesis | `anthropic/claude-sonnet-4.5` | OpenRouter |
| Claim Extraction | `google/gemini-3-flash-preview` | OpenRouter |
| NLI Entailment | `google/gemini-3-flash-preview` | OpenRouter |
| Embeddings | `text-embedding-3-small` | OpenAI Direct |

## 2.4 Key Data Types

```typescript
// Core types you'll work with:

interface SubQuery {
  id: string;        // "q1", "q2"
  query: string;     // Search query
  purpose: string;   // Why needed
}

interface Source {
  id: string;        // "s1", "s2"
  url: string;
  title: string;
  snippet: string;
  fromQuery: string; // Which sub-query found this
}

interface VerifiedClaim {
  id: string;
  text: string;
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  entailment: 'SUPPORTED' | 'CONTRADICTED' | 'NEUTRAL';
  entailmentReasoning: string;
  bestMatchingSource: { ... };
  citationMismatch: boolean;
  numericCheck: { ... } | null;
  issues: string[];
}
```

---

# Section 3: Rules (MUST FOLLOW)

## 3.1 Code Quality Rules

```
✅ ALWAYS DO:
- Use TypeScript strict mode
- Add explicit return types to all functions
- Add JSDoc comments to all exported functions
- Use meaningful variable names (not `x`, `data`, `result`)
- Handle errors with try/catch
- Use async/await (never raw promises with .then)
- Destructure parameters where appropriate
- Use const by default, let only when reassigning
- Add blank lines between logical sections

❌ NEVER DO:
- Use `any` type (use `unknown` if truly needed)
- Use magic numbers (define constants)
- Ignore TypeScript errors with @ts-ignore
- Leave console.log in production code (use console.error for errors only)
- Create functions longer than 50 lines (split them)
- Nest more than 3 levels deep (refactor)
- Mix concerns in one function (single responsibility)
```

## 3.2 File Rules

```
✅ ALWAYS DO:
- One concern per file
- Export types from types.ts, import elsewhere
- Keep files under 300 lines (split if larger)
- Group imports: external, internal, types
- Add file-level JSDoc comment explaining purpose

❌ NEVER DO:
- Duplicate type definitions across files
- Create circular imports
- Mix UI and business logic
- Put multiple components in one file
```

## 3.3 Testing Rules

After implementing each phase:

1. **Compile Check**: Run `npm run build` - must pass with no errors
2. **Type Check**: Run `npx tsc --noEmit` - must pass
3. **Unit Test**: Test the specific function created in the phase
4. **Integration Test**: If phase connects to previous phases, test the connection

## 3.4 Prompt Rules

When writing LLM prompts:

```
✅ ALWAYS DO:
- Be explicit about output format (JSON schema)
- Include examples in prompts
- Specify what NOT to do
- Use uppercase for key instructions
- Keep prompts focused on one task

❌ NEVER DO:
- Write vague instructions
- Assume the model knows context
- Mix multiple tasks in one prompt
- Forget to handle edge cases in prompt
```

---

# Section 4: Documentation Requirements

## 4.1 After EVERY Phase

You MUST update documentation after completing each phase:

### Update `documentation/CHANGELOG.md`:

```markdown
## Phase [N]: [Name]
**Completed**: [Date/Time]
**Files Created/Modified**:
- `path/to/file.ts` - [description]

**Functions Implemented**:
- `functionName()` - [what it does]

**Tests Passed**:
- [x] TypeScript compiles
- [x] Function returns expected output
- [x] [other tests]

**Notes**:
- [Any issues encountered]
- [Decisions made]
```

### Update `documentation/FILE-MAP.md`:

Add any new files with descriptions.

### Update `documentation/TYPES.md`:

Add any new types with explanations.

### Update `documentation/API.md` (if API changes):

Document any new endpoints or changes.

## 4.2 Documentation Format

Use this structure for all documentation:

```markdown
# [Title]

## Overview
[1-2 sentence description]

## [Section]
[Content]

## Usage Example
```typescript
// Example code
```

## Related
- [Link to related doc]
```

---

# Section 5: Phase Overview

## 5.1 All Phases

| Phase | Name | Purpose | Key Deliverables |
|-------|------|---------|------------------|
| 0 | Foundation | Setup types, env, structure | `types.ts`, `env.ts`, folders |
| 1 | Prompts | All LLM prompts | `prompts.ts` |
| 2 | Decomposition | Query → sub-queries | `decomposer.ts` |
| 3 | Parallel Search | Sub-queries → sources | `searcher.ts` |
| 4 | Synthesis | Sources → answer | `synthesizer.ts` |
| 5 | Embeddings | Text → vectors | `embeddings.ts` |
| 6 | Verification Core | Claims, passages, retrieval | `verifier.ts` (partial) |
| 7 | Verification Signals | NLI, numeric, citation | `verifier.ts` (complete) |
| 8 | Verification Assembly | Full `verifyClaims()` | `verifier.ts` (final) |
| 9 | Orchestrator + API | Wire backend, create endpoint | `index.ts`, `route.ts` |
| 10 | Frontend Hook | SSE parsing, state | `use-maxwell.ts` |
| 11 | Frontend Components | UI components | `components/maxwell/*` |
| 12 | Integration | Wire everything, polish | Final testing |

## 5.2 Phase Dependencies

```
Phase 0 ─┬─► Phase 1 ─┬─► Phase 2 ─────────────────┐
         │            │                            │
         │            ├─► Phase 4 ─────────────────┤
         │            │                            │
         │            └─► Phase 6 ─► Phase 7 ─► Phase 8
         │                                         │
         ├─► Phase 3 ─────────────────────────────┤
         │                                         │
         └─► Phase 5 ─────────────────────────────┘
                                                   │
                                           Phase 9 (Backend Complete)
                                                   │
                                           Phase 10 (Hook)
                                                   │
                                           Phase 11 (Components)
                                                   │
                                           Phase 12 (Integration)
```

## 5.3 How to Use Phase Documents

Each phase document contains:

1. **Context**: What this phase does and why
2. **Prerequisites**: What must be done first
3. **Implementation**: Exact code to write
4. **Testing**: How to verify it works
5. **Checklist**: Confirm before moving on

**Workflow per phase:**
```
1. Read the phase document completely
2. Create/modify files as specified
3. Run the tests specified
4. Update documentation per Section 4
5. Commit with message: "feat(maxwell): complete phase N - [name]"
6. Move to next phase
```

---

# Section 6: Environment Setup

## 6.1 Required Environment Variables

```bash
# .env.local

# OpenRouter for LLM calls
OPENROUTER_API_KEY=sk-or-v1-...

# OpenAI for embeddings (NOT OpenRouter)
OPENAI_API_KEY=sk-...

# Tavily for search
TAVILY_API_KEY=tvly-...
```

## 6.2 Required Packages

```bash
npm install ai @openrouter/ai-sdk-provider @ai-sdk/openai @tavily/core zod lucide-react react-markdown
```

## 6.3 TypeScript Config

Ensure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

---

# Section 7: Success Criteria

## 7.1 Per-Phase Success

Each phase is complete when:
- [ ] All specified files created
- [ ] TypeScript compiles without errors
- [ ] Tests pass as specified
- [ ] Documentation updated
- [ ] Code follows all rules in Section 3

## 7.2 Final Success (Phase 12)

Maxwell is complete when:
- [ ] User can enter a complex query
- [ ] System shows decomposition progress
- [ ] System shows search progress
- [ ] Answer streams with citations
- [ ] Verification panel shows:
  - Entailment verdicts (SUPPORTED/NEUTRAL/CONTRADICTED)
  - Evidence passages
  - Citation mismatch warnings
  - Numeric match/mismatch
  - Confidence scores
- [ ] All phases complete in under 20 seconds
- [ ] No TypeScript errors
- [ ] Documentation is complete

---

# Section 8: Quick Reference

## 8.1 Confidence Thresholds

```typescript
// In verifier.ts
const HIGH_CONFIDENCE = 0.72;
const MEDIUM_CONFIDENCE = 0.42;
```

## 8.2 Entailment Impact on Confidence

```typescript
// Base confidence by entailment
SUPPORTED: 1.0
NEUTRAL: 0.55
CONTRADICTED: 0.15
```

## 8.3 Signal Multipliers

```typescript
// Applied to base confidence
lowRetrievalSimilarity: × 0.7   // similarity < 0.45
citationMismatch: × 0.85
numericMismatch: × 0.4
```

## 8.4 Import Patterns

```typescript
// External packages
import { generateObject, streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

// Internal - types
import type { Source, VerifiedClaim } from './types';

// Internal - functions
import { embedText, cosineSimilarity } from './embeddings';
```

---

# REMEMBER

1. **Vision**: We're building a verified search agent that shows users what's grounded vs. uncertain
2. **Quality**: Every line of code should be production-ready
3. **Testing**: Don't move on until the current phase works
4. **Documentation**: Update docs after every phase
5. **Focus**: Do exactly what the phase document says, nothing more

---

**Now proceed to Phase 0: Foundation**