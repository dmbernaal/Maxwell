Understood. Since you are operating in December 2025, I defer to your knowledge of the model landscape (Gemini 3.0 and Claude 4.5).

Here is the **Revised Phase 0 Guide**. It strictly retains **ALL** the detailed types, constants, and documentation files from your original plan, but integrates the necessary engineering fix for **Dev Tooling** (`tsx`) and **Fail-Fast Environment Validation**.

---

# Phase 0: Foundation

## Establishing Types, Environment, and File Structure

### Context

This phase creates the foundational structure for Maxwell. Everything else builds on this.
We are creating the strict TypeScript contracts, the environment validation that prevents silent failures, and the complete folder hierarchy.

### Prerequisites

[ ] Node.js 18+ installed
[ ] Next.js project initialized
[ ] **API Keys Ready**:
- `OPENROUTER_API_KEY` (for Gemini 3 / Claude 4.5)
- `OPENAI_API_KEY` (for Embeddings)
- `TAVILY_API_KEY` (for Search)

### Implementation

#### Step 1: Install Dependencies

We are adding `tsx` and `@types/node` to ensure we can run our TypeScript test scripts directly without a build step—critical for the rapid testing required in a take-home.

```bash
# Runtime dependencies
npm install ai @openrouter/ai-sdk-provider @ai-sdk/openai @tavily/core zod lucide-react react-markdown

# Dev dependencies (Required for testing scripts)
npm install -D tsx @types/node typescript

```

#### Step 2: Create Folder Structure

Run these commands to establish the clean architecture:

```bash
mkdir -p app/lib/maxwell
mkdir -p app/api/maxwell
mkdir -p app/hooks
mkdir -p app/components/maxwell
mkdir -p documentation

```

#### Step 3: Create `app/lib/maxwell/types.ts`

This contains the **complete** type definitions from your original plan.

```typescript
// app/lib/maxwell/types.ts

/**
 * Maxwell Type Definitions
 * * This file contains all TypeScript interfaces for the Maxwell search agent.
 * All other files should import types from here to maintain consistency.
 * * @module maxwell/types
 */

// ============================================
// PHASE 1: DECOMPOSITION TYPES
// ============================================

/**
 * A sub-query generated from the original user query.
 * Each sub-query is designed to be searched independently.
 */
export interface SubQuery {
  /** Unique identifier (e.g., "q1", "q2") */
  id: string;
  /** The actual search query optimized for web search */
  query: string;
  /** Explanation of why this sub-query is needed */
  purpose: string;
}

/**
 * Output from the decomposition phase.
 */
export interface DecompositionOutput {
  /** The original user query */
  originalQuery: string;
  /** Array of sub-queries to execute */
  subQueries: SubQuery[];
  /** Explanation of the decomposition strategy */
  reasoning: string;
  /** Time taken for decomposition in milliseconds */
  durationMs: number;
}

// ============================================
// PHASE 2: SEARCH TYPES
// ============================================

/**
 * A source retrieved from web search.
 * Sources are deduplicated by URL across all sub-queries.
 */
export interface Source {
  /** Unique identifier (e.g., "s1", "s2") - 1-indexed for citations */
  id: string;
  /** Full URL of the source */
  url: string;
  /** Title of the page/article */
  title: string;
  /** Text snippet/content from the source */
  snippet: string;
  /** Which sub-query found this source (e.g., "q1") */
  fromQuery: string;
}

/**
 * Metadata about a single search execution.
 */
export interface SearchMetadata {
  /** Sub-query ID this search was for */
  queryId: string;
  /** The search query that was executed */
  query: string;
  /** Number of sources found */
  sourcesFound: number;
  /** Status of the search */
  status: 'complete' | 'failed' | 'no_results';
}

/**
 * Output from the parallel search phase.
 */
export interface SearchOutput {
  /** All deduplicated sources */
  sources: Source[];
  /** Metadata for each sub-query search */
  searchMetadata: SearchMetadata[];
  /** Time taken for all searches in milliseconds */
  durationMs: number;
}

// ============================================
// PHASE 3: SYNTHESIS TYPES
// ============================================

/**
 * Output from the synthesis phase.
 */
export interface SynthesisOutput {
  /** The generated answer with [n] citations */
  answer: string;
  /** IDs of sources that were cited */
  sourcesUsed: string[];
  /** Time taken for synthesis in milliseconds */
  durationMs: number;
}

// ============================================
// PHASE 4: VERIFICATION TYPES
// ============================================

/**
 * Entailment verdict from NLI check.
 * - SUPPORTED: Evidence directly supports the claim
 * - CONTRADICTED: Evidence contradicts the claim
 * - NEUTRAL: Evidence doesn't address the claim
 */
export type EntailmentVerdict = 'SUPPORTED' | 'CONTRADICTED' | 'NEUTRAL';

/**
 * A claim extracted from the synthesized answer.
 */
export interface ExtractedClaim {
  /** Unique identifier (e.g., "c1", "c2") */
  id: string;
  /** The factual claim text */
  text: string;
  /** Source numbers cited in the original answer (e.g., [1, 3]) */
  citedSources: number[];
}

/**
 * A passage chunked from a source for fine-grained retrieval.
 */
export interface Passage {
  /** The passage text (1-3 sentences) */
  text: string;
  /** ID of the source this passage came from */
  sourceId: string;
  /** 1-indexed source number for citation matching */
  sourceIndex: number;
  /** Title of the source */
  sourceTitle: string;
}

/**
 * Result of numeric consistency check.
 */
export interface NumericCheck {
  /** Numbers extracted from the claim */
  claimNumbers: string[];
  /** Numbers extracted from the evidence */
  evidenceNumbers: string[];
  /** Whether the numbers match */
  match: boolean;
}

/**
 * A fully verified claim with all signals.
 */
export interface VerifiedClaim {
  /** Unique identifier */
  id: string;
  /** The claim text */
  text: string;
  
  // Confidence
  /** Aggregated confidence score (0.0 to 1.0) */
  confidence: number;
  /** Confidence level category */
  confidenceLevel: 'high' | 'medium' | 'low';
  
  // Entailment signal
  /** NLI verdict */
  entailment: EntailmentVerdict;
  /** Explanation from NLI model */
  entailmentReasoning: string;
  
  // Evidence
  /** Best matching source passage */
  bestMatchingSource: {
    sourceId: string;
    sourceTitle: string;
    similarity: number;
    passage: string;
    isCitedSource: boolean;
  };
  
  // Citation correctness
  /** True if best evidence comes from uncited source */
  citationMismatch: boolean;
  /** Best similarity from cited sources */
  citedSourceSupport: number;
  /** Best similarity from all sources */
  globalBestSupport: number;
  
  // Numeric consistency
  /** Numeric check result, null if no numbers in claim */
  numericCheck: NumericCheck | null;
  
  // Issues
  /** List of issues found during verification */
  issues: string[];
}

/**
 * Summary of verification results.
 */
export interface VerificationSummary {
  /** Claims with SUPPORTED entailment */
  supported: number;
  /** Claims with NEUTRAL entailment */
  uncertain: number;
  /** Claims with CONTRADICTED entailment */
  contradicted: number;
  /** Claims with citation mismatch */
  citationMismatches: number;
  /** Claims with numeric mismatch */
  numericMismatches: number;
}

/**
 * Output from the verification phase.
 */
export interface VerificationOutput {
  /** All verified claims */
  claims: VerifiedClaim[];
  /** Overall confidence percentage (0-100) */
  overallConfidence: number;
  /** Summary counts */
  summary: VerificationSummary;
  /** Time taken for verification in milliseconds */
  durationMs: number;
}

// ============================================
// ORCHESTRATOR TYPES
// ============================================

/**
 * Status of phase execution.
 */
export interface PhaseStatus {
  status: 'pending' | 'in_progress' | 'complete' | 'error';
  durationMs?: number;
  error?: string;
}

/**
 * Complete phase tracking for the orchestrator.
 */
export interface MaxwellPhases {
  decomposition: PhaseStatus & {
    subQueries?: SubQuery[];
  };
  search: PhaseStatus & {
    totalSources?: number;
    searchMetadata?: SearchMetadata[];
  };
  synthesis: PhaseStatus;
  verification: PhaseStatus & {
    claimsExtracted?: number;
    claimsVerified?: number;
  };
}

/**
 * Complete response from Maxwell.
 */
export interface MaxwellResponse {
  /** The synthesized answer */
  answer: string;
  /** All sources used */
  sources: Source[];
  /** Verification results */
  verification: VerificationOutput;
  /** Phase execution details */
  phases: MaxwellPhases;
  /** Total execution time in milliseconds */
  totalDurationMs: number;
}

// ============================================
// STREAMING EVENT TYPES
// ============================================

/**
 * Event emitted when a phase starts.
 */
export interface PhaseStartEvent {
  type: 'phase-start';
  phase: 'decomposition' | 'search' | 'synthesis' | 'verification';
}

/**
 * Event emitted when a phase completes.
 */
export interface PhaseCompleteEvent {
  type: 'phase-complete';
  phase: 'decomposition' | 'search' | 'synthesis' | 'verification';
  data: unknown;
}

/**
 * Event emitted during search phase for each completed sub-query.
 */
export interface SearchProgressEvent {
  type: 'search-progress';
  data: SearchMetadata;
}

/**
 * Event emitted during synthesis for streamed content.
 */
export interface SynthesisChunkEvent {
  type: 'synthesis-chunk';
  content: string;
}

/**
 * Event emitted during verification for progress updates.
 */
export interface VerificationProgressEvent {
  type: 'verification-progress';
  data: {
    current: number;
    total: number;
    status: string;
  };
}

/**
 * Event emitted when all phases complete successfully.
 */
export interface CompleteEvent {
  type: 'complete';
  data: MaxwellResponse;
}

/**
 * Event emitted when an error occurs.
 */
export interface ErrorEvent {
  type: 'error';
  message: string;
}

/**
 * Union type of all possible Maxwell events.
 */
export type MaxwellEvent =
  | PhaseStartEvent
  | PhaseCompleteEvent
  | SearchProgressEvent
  | SynthesisChunkEvent
  | VerificationProgressEvent
  | CompleteEvent
  | ErrorEvent;

// ============================================
// FRONTEND STATE TYPES
// ============================================

/**
 * Current phase of execution for UI.
 */
export type ExecutionPhase =
  | 'idle'
  | 'decomposition'
  | 'search'
  | 'synthesis'
  | 'verification'
  | 'complete'
  | 'error';

/**
 * Phase duration tracking for UI.
 */
export interface PhaseDurations {
  decomposition?: number;
  search?: number;
  synthesis?: number;
  verification?: number;
  total?: number;
}

/**
 * Complete frontend state for Maxwell.
 */
export interface MaxwellState {
  phase: ExecutionPhase;
  subQueries: SubQuery[];
  searchMetadata: SearchMetadata[];
  sources: Source[];
  answer: string;
  verification: VerificationOutput | null;
  error: string | null;
  phaseDurations: PhaseDurations;
}

```

#### Step 4: Create `app/lib/maxwell/env.ts`

**OPTIMIZED:** This now uses the Fail-Fast pattern (Throw Error instead of Console Log) as discussed, but retains your original structure.

```typescript
// app/lib/maxwell/env.ts

/**
 * Environment Configuration
 * * Validates and exports environment variables.
 * Fails fast if required variables are missing.
 * * @module maxwell/env
 */

/**
 * Environment configuration interface.
 */
export interface EnvConfig {
  OPENROUTER_API_KEY: string;
  OPENAI_API_KEY: string;
  TAVILY_API_KEY: string;
}

/**
 * Validates that a required environment variable exists.
 * @throws Error if the variable is missing (CRITICAL for production/testing)
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `❌ FATAL ERROR: Missing required environment variable: ${name}.\n` +
      `Please add it to your .env.local file.`
    );
  }
  return value;
}

/**
 * Get validated environment configuration.
 * Call this once at startup to fail fast on missing config.
 */
export function getEnvConfig(): EnvConfig {
  // Only validate on server side
  if (typeof window !== 'undefined') {
    throw new Error('getEnvConfig should only be called on the server');
  }

  return {
    OPENROUTER_API_KEY: requireEnv('OPENROUTER_API_KEY'),
    OPENAI_API_KEY: requireEnv('OPENAI_API_KEY'),
    TAVILY_API_KEY: requireEnv('TAVILY_API_KEY'),
  };
}

/**
 * Validates environment on module load (server-side only).
 * This ensures we fail fast if config is missing.
 */
export function validateEnv(): void {
  if (typeof window !== 'undefined') {
    return;
  }
  
  // This will throw if any key is missing, stopping the process
  getEnvConfig(); 
}

```

#### Step 5: Create `app/lib/maxwell/constants.ts`

**RETAINED:** We are using your specific models (`google/gemini-3-flash-preview` and `anthropic/claude-sonnet-4.5`) and all your detailed constants.

```typescript
// app/lib/maxwell/constants.ts

/**
 * Maxwell Constants
 * * All configuration values, thresholds, and magic numbers.
 * Centralizing these makes tuning and testing easier.
 * * @module maxwell/constants
 */

// ============================================
// MODEL CONFIGURATION
// ============================================

/** Model for query decomposition (fast, good at structured output) */
export const DECOMPOSITION_MODEL = 'google/gemini-3-flash-preview';

/** Model for answer synthesis (strong reasoning) */
export const SYNTHESIS_MODEL = 'anthropic/claude-sonnet-4.5';

/** Model for claim extraction (fast, simple task) */
export const CLAIM_EXTRACTION_MODEL = 'google/gemini-3-flash-preview';

/** Model for NLI entailment checking (fast, works with strict prompts) */
export const NLI_MODEL = 'google/gemini-3-flash-preview';

/** Model for embeddings (OpenAI direct, not OpenRouter) */
export const EMBEDDING_MODEL = 'text-embedding-3-small';

// ============================================
// DECOMPOSITION CONFIGURATION
// ============================================

/** Minimum number of sub-queries to generate */
export const MIN_SUB_QUERIES = 3;

/** Maximum number of sub-queries to generate */
export const MAX_SUB_QUERIES = 5;

// ============================================
// SEARCH CONFIGURATION
// ============================================

/** Number of results per sub-query from Tavily */
export const RESULTS_PER_QUERY = 5;

/** Tavily search depth ('basic' or 'advanced') */
export const SEARCH_DEPTH = 'basic' as const;

// ============================================
// SYNTHESIS CONFIGURATION
// ============================================

/** Maximum tokens for synthesis response */
export const SYNTHESIS_MAX_TOKENS = 1500;

// ============================================
// VERIFICATION CONFIGURATION
// ============================================

/** Maximum claims to verify (for performance) */
export const MAX_CLAIMS_TO_VERIFY = 12;

// Confidence thresholds
/** Threshold for high confidence (>= this value) */
export const HIGH_CONFIDENCE_THRESHOLD = 0.72;

/** Threshold for medium confidence (>= this value, < HIGH) */
export const MEDIUM_CONFIDENCE_THRESHOLD = 0.42;

// Base confidence by entailment
/** Base confidence for SUPPORTED entailment */
export const ENTAILMENT_SUPPORTED_CONFIDENCE = 1.0;

/** Base confidence for NEUTRAL entailment */
export const ENTAILMENT_NEUTRAL_CONFIDENCE = 0.55;

/** Base confidence for CONTRADICTED entailment */
export const ENTAILMENT_CONTRADICTED_CONFIDENCE = 0.15;

// Signal multipliers
/** Confidence multiplier for low retrieval similarity */
export const LOW_RETRIEVAL_MULTIPLIER = 0.7;

/** Retrieval similarity threshold considered "low" */
export const LOW_RETRIEVAL_THRESHOLD = 0.45;

/** Confidence multiplier for citation mismatch */
export const CITATION_MISMATCH_MULTIPLIER = 0.85;

/** Similarity difference threshold to flag citation mismatch */
export const CITATION_MISMATCH_THRESHOLD = 0.12;

/** Confidence multiplier for numeric mismatch */
export const NUMERIC_MISMATCH_MULTIPLIER = 0.4;

// ============================================
// PASSAGE CONFIGURATION
// ============================================

/** Minimum passage length to include (characters) */
export const MIN_PASSAGE_LENGTH = 20;

// ============================================
// API CONFIGURATION
// ============================================

/** Maximum query length (characters) */
export const MAX_QUERY_LENGTH = 1000;

/** API route timeout (seconds) */
export const API_TIMEOUT_SECONDS = 60;

```

#### Step 6: Create Documentation Files (Required)

**Create `documentation/CHANGELOG.md`:**

```markdown
# Maxwell Development Changelog

This file tracks the completion of each implementation phase.

---

## Phase 0: Foundation
**Status**: In Progress
**Started**: [Current Date]

### Files Created
- `app/lib/maxwell/types.ts` - All TypeScript interfaces
- `app/lib/maxwell/env.ts` - Environment validation
- `app/lib/maxwell/constants.ts` - Configuration constants
- `documentation/CHANGELOG.md` - This file
- `documentation/FILE-MAP.md` - File descriptions
- `documentation/TYPES.md` - Type documentation

### Notes
- Foundation phase establishes the structure all other phases build on
- Types are comprehensive and cover all phases
- Constants centralize all magic numbers for easy tuning

```

**Create `documentation/FILE-MAP.md`:**

```markdown
# Maxwell File Map

This document describes every file in the Maxwell implementation.

---

## Directory Structure
app/
├── api/maxwell/          # API endpoints
├── lib/maxwell/          # Core business logic
├── hooks/                # React hooks
├── components/maxwell/   # UI components
└── types.ts              # Shared types (if needed)
documentation/            # Project documentation

---

## Core Library (`app/lib/maxwell/`)

### `types.ts`
**Purpose**: All TypeScript interfaces and type definitions.
**Exports**: 
- Phase types: `SubQuery`, `Source`, `VerifiedClaim`, etc.
- Event types: `MaxwellEvent`, `PhaseStartEvent`, etc.
- State types: `MaxwellState`, `ExecutionPhase`, etc.

### `env.ts`
**Purpose**: Environment variable validation.
**Exports**:
- `getEnvConfig()` - Returns validated env config
- `validateEnv()` - Validates env on startup

### `constants.ts`
**Purpose**: All configuration values and thresholds.
**Exports**: Model names, thresholds, limits

```

**Create `documentation/TYPES.md`:**

```markdown
# Maxwell Type Documentation

Detailed documentation of all TypeScript types used in Maxwell.

---

## Core Data Types

### SubQuery
Represents a search query generated from decomposition.
```typescript
interface SubQuery {
  id: string;        // "q1", "q2", etc.
  query: string;     // Search-optimized query
  purpose: string;   // Why this query helps
}

```

### VerifiedClaim

A claim that has been through multi-signal verification.

```typescript
interface VerifiedClaim {
  id: string;
  text: string;
  confidence: number;          // 0.0 - 1.0
  confidenceLevel: 'high' | 'medium' | 'low';
  entailment: EntailmentVerdict;
  entailmentReasoning: string;
  bestMatchingSource: { ... };
  citationMismatch: boolean;
  numericCheck: NumericCheck | null;
  issues: string[];
}

```

See `app/lib/maxwell/types.ts` for full definitions.

```

#### Step 7: Testing (Crucial Step)

Create a temporary test file `test-foundation.ts`. **Note:** We use `tsx` (which we installed in Step 1) to run this, so we don't need to configure `tsconfig.json` paths just for this check.

```typescript
// test-foundation.ts
import { getEnvConfig } from './app/lib/maxwell/env';
import { DECOMPOSITION_MODEL, HIGH_CONFIDENCE_THRESHOLD } from './app/lib/maxwell/constants';
import type { VerifiedClaim } from './app/lib/maxwell/types';

async function runTest() {
  console.log('🧪 Testing Foundation...');

  // 1. Check Types Import
  const testClaim: VerifiedClaim = {
    id: 'c1',
    text: 'Test',
    confidence: 0.9,
    confidenceLevel: 'high',
    entailment: 'SUPPORTED',
    entailmentReasoning: 'Verified',
    bestMatchingSource: {
        sourceId: 's1',
        sourceTitle: 'Test',
        sourceIndex: 1,
        passage: 'Test',
        similarity: 0.9,
        isCitedSource: true
    },
    citationMismatch: false,
    citedSourceSupport: 0.9,
    globalBestSupport: 0.9,
    numericCheck: null,
    issues: []
  };
  console.log('✅ Types Compiled and Validated');

  // 2. Check Constants
  console.log(`✅ Using Decomposition Model: ${DECOMPOSITION_MODEL}`);
  console.log(`✅ High Confidence Threshold: ${HIGH_CONFIDENCE_THRESHOLD}`);

  // 3. Check Env
  try {
    const env = getEnvConfig();
    console.log('✅ Environment Variables Present');
  } catch (e: any) {
    console.error('❌ Environment Check Failed (Expected if .env not set yet):');
    console.error(e.message);
    process.exit(1);
  }
}

runTest();

```

**Run the test:**

```bash
npx tsx test-foundation.ts

```

### Checklist

[ ] Dependencies installed (including `tsx`)
[ ] Folder structure created
[ ] `types.ts`, `env.ts`, `constants.ts` created
[ ] `documentation/` files created
[ ] `test-foundation.ts` passes (no errors)
[ ] `test-foundation.ts` deleted after success

Once the test passes, proceed to **Phase 1**.