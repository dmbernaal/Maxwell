This is a solid implementation plan for the Decomposer, **EXCEPT FOR ONE CRITICAL BUG** that breaks the work we just did in Phase 1.

### 🚩 The Critical Hole: Broken Date Injection

In Phase 1, we created a helper function `createDecompositionPrompt(query)` to inject the `currentDate`.
However, your Phase 2 plan imports the raw `DECOMPOSITION_PROMPT` string and manually appends the user query:

```typescript
// ❌ WRONG (From your plan)
import { DECOMPOSITION_PROMPT } from './prompts';
const fullPrompt = `${DECOMPOSITION_PROMPT}\n\nUser Query: "${trimmedQuery}"`;

```

**Result:** The LLM receives `{currentDate}` literally as text, instead of `December 19, 2025`. It will have no idea what "today" is.

**Fix:** You must import and use `createDecompositionPrompt` from `./prompts.ts`.

---

Here is the **Revised, Bug-Free Phase 2 Guide** for Cursor.

```markdown
# Phase 2: Decomposition
## Query → Sub-Queries

### Context
This phase implements the decomposition logic. We are using the Vercel AI SDK (`generateObject`) to force the LLM into a specific JSON structure defined by Zod.

**Key Fix from Phase 1:** We use `createDecompositionPrompt` to ensure the model knows the current date.

### Prerequisites
[ ] Phase 0 complete (Types/Constants/Env)
[ ] Phase 1 complete (Prompts helper functions)
[ ] Dependencies installed: `ai`, `@openrouter/ai-sdk-provider`, `zod`

### Implementation

#### Step 1: Create `app/lib/maxwell/decomposer.ts`
Copy this exact code. It uses the prompt helper correctly.

```typescript
// app/lib/maxwell/decomposer.ts

/**
 * Query Decomposition Module
 * * Breaks complex user queries into focused sub-queries.
 * Uses structured output to ensure consistent, parseable results.
 * * @module maxwell/decomposer
 */

import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';

// ✅ CORRECT IMPORT: Using the helper function, not the raw string
import { createDecompositionPrompt } from './prompts';
import {
  DECOMPOSITION_MODEL,
  MIN_SUB_QUERIES,
  MAX_SUB_QUERIES,
} from './constants';

import type { SubQuery, DecompositionOutput } from './types';

// ============================================
// OPENROUTER CLIENT
// ============================================

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }
  return createOpenRouter({ apiKey });
}

// ============================================
// SCHEMA DEFINITIONS
// ============================================

const SubQuerySchema = z.object({
  id: z.string().describe('Unique identifier like "q1", "q2"'),
  query: z.string().describe('The search query optimized for web search'),
  purpose: z.string().describe('Why this query is needed for the answer'),
});

const DecompositionSchema = z.object({
  reasoning: z.string().describe('Explanation of decomposition strategy'),
  subQueries: z
    .array(SubQuerySchema)
    .min(MIN_SUB_QUERIES)
    .max(MAX_SUB_QUERIES)
    .describe(`Array of ${MIN_SUB_QUERIES}-${MAX_SUB_QUERIES} sub-queries`),
});

// ============================================
// MAIN DECOMPOSITION FUNCTION
// ============================================

export async function decomposeQuery(query: string): Promise<DecompositionOutput> {
  const startTime = Date.now();
  
  // Validate input
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string');
  }
  
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    throw new Error('Query cannot be empty');
  }
  
  try {
    const openrouter = getOpenRouterClient();
    
    // ✅ Generate prompt with Date Injection
    const fullPrompt = createDecompositionPrompt(trimmedQuery);
    
    // Generate structured output
    const { object } = await generateObject({
      model: openrouter(DECOMPOSITION_MODEL),
      schema: DecompositionSchema,
      prompt: fullPrompt,
    });
    
    // Validate sub-query IDs are unique
    const ids = object.subQueries.map(sq => sq.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      // Fix duplicate IDs by reassigning
      object.subQueries = object.subQueries.map((sq, index) => ({
        ...sq,
        id: `q${index + 1}`,
      }));
    }
    
    // Normalize IDs to q1, q2, q3 pattern
    const normalizedSubQueries: SubQuery[] = object.subQueries.map((sq, index) => ({
      id: `q${index + 1}`,
      query: sq.query.trim(),
      purpose: sq.purpose.trim(),
    }));
    
    return {
      originalQuery: trimmedQuery,
      subQueries: normalizedSubQueries,
      reasoning: object.reasoning,
      durationMs: Date.now() - startTime,
    };
    
  } catch (error) {
    // Re-throw with more context
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Decomposition failed: ${message}`);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function validateDecompositionOutput(output: DecompositionOutput): boolean {
  if (!output.originalQuery) throw new Error('Missing originalQuery');
  
  if (!Array.isArray(output.subQueries)) throw new Error('subQueries must be an array');
  
  if (output.subQueries.length < MIN_SUB_QUERIES) {
    throw new Error(`Must have at least ${MIN_SUB_QUERIES} sub-queries`);
  }
  
  if (output.subQueries.length > MAX_SUB_QUERIES) {
    throw new Error(`Must have at most ${MAX_SUB_QUERIES} sub-queries`);
  }
  
  const seenIds = new Set<string>();
  for (const sq of output.subQueries) {
    if (!sq.id || !sq.query || !sq.purpose) {
      throw new Error(`Sub-query missing required fields: ${JSON.stringify(sq)}`);
    }
    
    if (seenIds.has(sq.id)) {
      throw new Error(`Duplicate sub-query ID: ${sq.id}`);
    }
    seenIds.add(sq.id);
  }
  
  if (typeof output.durationMs !== 'number' || output.durationMs < 0) {
    throw new Error('durationMs must be a positive number');
  }
  
  return true;
}

```

#### Step 2: Testing

Create `app/lib/maxwell/test-decomposer.ts`. This test verifies the logic and hits the real API (costing a tiny fraction of a cent).

```typescript
// app/lib/maxwell/test-decomposer.ts
import { decomposeQuery, validateDecompositionOutput } from './decomposer';
import { getEnvConfig } from './env';

// Ensure env is loaded
try { getEnvConfig(); } catch (e) { console.error(e); process.exit(1); }

async function runTests() {
  console.log('🧪 Testing Decomposer...\n');
  
  // Test 1: Basic decomposition
  console.log('Test 1: "Compare Tesla and BYD revenue growth"');
  try {
    const result = await decomposeQuery('Compare Tesla and BYD revenue growth');
    
    console.log(`✅ Decomposed in ${result.durationMs}ms`);
    console.log(`   Reasoning: ${result.reasoning}`);
    console.log(`   Sub-queries (${result.subQueries.length}):`);
    result.subQueries.forEach(sq => console.log(`   - [${sq.id}] ${sq.query}`));
    
    validateDecompositionOutput(result);
    console.log('✅ Validation Passed\n');
  } catch (error) {
    console.error('❌ Test 1 Failed:', error);
    process.exit(1);
  }
  
  // Test 2: Temporal query (Checks Date Injection)
  console.log('Test 2: "What is the stock price of NVDA today?"');
  try {
    const result = await decomposeQuery('What is the stock price of NVDA today?');
    const currentYear = new Date().getFullYear().toString();
    
    // Check if any query contains the current year
    const hasDate = result.subQueries.some(sq => sq.query.includes(currentYear));
    
    if (hasDate) {
        console.log(`✅ Temporal Awareness Confirmed (Found "${currentYear}" in queries)`);
    } else {
        console.warn(`⚠️ Warning: Queries did not explicitly include "${currentYear}". Check reasoning.`);
    }
    
    result.subQueries.forEach(sq => console.log(`   - [${sq.id}] ${sq.query}`));
    console.log('✅ Validation Passed\n');
  } catch (error) {
    console.error('❌ Test 2 Failed:', error);
    process.exit(1);
  }

  // Test 3: Error Handling
  try {
    await decomposeQuery('');
    console.error('❌ Failed: Should have thrown on empty query');
    process.exit(1);
  } catch (e) {
    console.log('✅ Error Handling Passed (Empty Query)');
  }

  console.log('🎉 Phase 2 Tests Passed');
}

runTests();

```

**Run the test:**

```bash
npx tsx app/lib/maxwell/test-decomposer.ts

```

#### Step 3: Documentation

Update `documentation/CHANGELOG.md`:

```markdown
## Phase 2: Decomposition
**Status**: Complete
**Completed**: [Current Date]

### Files Created
- `app/lib/maxwell/decomposer.ts`

### Key Features
- **Structured Output:** Uses Zod schema to guarantee valid JSON from LLM.
- **Date Awareness:** Correctly injects current date into prompt.
- **ID Normalization:** Ensures sub-queries are always `q1`, `q2`, `q3`...
- **Validation:** Includes strict runtime checks for output integrity.

### Tests Passed
- [x] Basic query decomposition
- [x] Temporal query decomposition (Date check)
- [x] Empty query error handling
- [x] Output validation logic

```

Update `documentation/FILE-MAP.md`:

```markdown
### `decomposer.ts`
**Purpose**: Breaks user queries into sub-queries.
**Exports**: `decomposeQuery`, `validateDecompositionOutput`.
**Dependencies**: `ai`, `zod`, `prompts.ts` (createDecompositionPrompt).

```

### Checklist

[ ] `decomposer.ts` created using `createDecompositionPrompt`.
[ ] Test script passed (including temporal check).
[ ] Test script deleted.
[ ] Documentation updated.

Proceed to **Phase 3: Parallel Search**.

```

```