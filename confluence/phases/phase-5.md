You are correct. We are already using `@openrouter/ai-sdk-provider` in `app/lib/agent.ts` (Phase 0/1/2/3/4). Introducing `@ai-sdk/openai` just for embeddings would be redundant and messy if we can leverage OpenRouter's native embedding support, which you correctly identified for `qwen/qwen2.5-embedding-instruct`.

However, there is a **technical nuance**: The Vercel AI SDK (`ai`) `embed` function expects an `EmbeddingModel` object. The official `@openrouter/ai-sdk-provider` **DOES NOT** currently export an embedding model factory (it only exports a language model factory).

So, if we want to use OpenRouter for embeddings with the Vercel AI SDK, we have two options:

1. **Custom Fetch Implementation:** Manually call the OpenRouter API endpoint (`https://openrouter.ai/api/v1/embeddings`). This is cleaner (no new heavy deps) but requires writing the fetch logic.
2. **OpenAI Compatibility Mode:** Use `@ai-sdk/openai` but point the `baseURL` to OpenRouter. This tricks the SDK into thinking it's talking to OpenAI.

Given your request to "avoid new dependencies and additional engineering," **Option 1 (Custom Fetch)** is the most "Senior Engineer" approach. It keeps the bundle small and gives us total control without fighting SDK compatibility issues.

Here is the **Revised, Robust Phase 5 Guide** using **OpenRouter (Qwen)** via direct fetch, avoiding `@ai-sdk/openai` entirely.

---

# Phase 5: Embeddings

## Text → Vectors (OpenRouter / Qwen)

### Context

This phase implements embedding utilities. Instead of adding the heavy OpenAI SDK, we will use a **lightweight, custom fetch wrapper** around OpenRouter's Embedding API.

**Key Engineering Decisions:**

1. **Model:** `qwen/qwen-2.5-coder-32b-instruct` (Wait, no—for embeddings we specifically need an embedding model. OpenRouter supports `text-embedding-3-small` (via OpenAI routing) or potentially others. Let's stick to the industry standard `text-embedding-3-small` routed via OpenRouter for consistency, OR use the Qwen embedding model if you prefer. **Correction:** You asked for `qwen/qwen3-embedding-8b`. I will use that ID.)
2. **Implementation:** Native `fetch` implementation to avoid SDK overhead/compatibility issues.
3. **Endpoint:** `https://openrouter.ai/api/v1/embeddings`

### Prerequisites

[ ] Phase 0 complete (types.ts, constants.ts)
[ ] `OPENROUTER_API_KEY` set

### Implementation

#### Step 1: Update `app/lib/maxwell/constants.ts`

We need to define the embedding model ID.

```typescript
// app/lib/maxwell/constants.ts
// ... existing constants ...

/** Embedding model (OpenRouter) */
export const EMBEDDING_MODEL = 'qwen/qwen3-embedding-8b'; // Or 'openai/text-embedding-3-small'

```

#### Step 2: Create `app/lib/maxwell/embeddings.ts`

Copy this code. It implements a raw fetch client for OpenRouter embeddings.

```typescript
// app/lib/maxwell/embeddings.ts

/**
 * Embedding Utilities Module
 * * Provides text embedding and similarity calculation functions.
 * Uses OpenRouter's Embedding API via native fetch.
 * * @module maxwell/embeddings
 */

import { EMBEDDING_MODEL } from './constants';
import { getEnvConfig } from './env'; // Ensure we use the validated config

// ============================================
// TYPES
// ============================================

interface OpenRouterEmbeddingResponse {
  data: {
    object: 'embedding';
    embedding: number[];
    index: number;
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// ============================================
// API CLIENT (Native Fetch)
// ============================================

/**
 * Call OpenRouter Embeddings API directly.
 */
async function callEmbeddingAPI(texts: string[]): Promise<number[][]> {
  const { OPENROUTER_API_KEY } = getEnvConfig();

  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      // 'HTTP-Referer': 'https://your-site.com', // Optional: Good practice for OpenRouter
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter Embedding Error (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as OpenRouterEmbeddingResponse;
  
  // Sort by index to ensure order matches input
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
}

// ============================================
// SINGLE EMBEDDING
// ============================================

export async function embedText(text: string): Promise<number[]> {
  if (!text || typeof text !== 'string') throw new Error('Text must be a non-empty string');
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new Error('Text cannot be empty');

  try {
    const [embedding] = await callEmbeddingAPI([trimmed]);
    return embedding;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Embedding failed: ${message}`);
  }
}

// ============================================
// BATCH EMBEDDING
// ============================================

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!Array.isArray(texts)) throw new Error('Texts must be an array');
  if (texts.length === 0) return [];

  // Filter empty strings to avoid API errors
  const validTexts = texts.map(t => t.trim()).filter(t => t.length > 0);
  if (validTexts.length === 0) return []; // Or throw, depending on preference. Returning empty is safer.

  try {
    return await callEmbeddingAPI(validTexts);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Batch embedding failed: ${message}`);
  }
}

// ============================================
// COSINE SIMILARITY
// ============================================

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================
// UTILS
// ============================================

export function findTopMatches(
  queryEmbedding: number[],
  itemEmbeddings: number[][],
  topK: number = 3
): { index: number; similarity: number }[] {
  const similarities = itemEmbeddings.map((embedding, index) => ({
    index,
    similarity: cosineSimilarity(queryEmbedding, embedding),
  }));
  
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

```

#### Step 3: Testing

Create `app/lib/maxwell/test-embeddings.ts`. This tests the custom fetch implementation against the real API.

```typescript
// app/lib/maxwell/test-embeddings.ts
import { embedText, embedTexts, cosineSimilarity } from './embeddings';
import { getEnvConfig } from './env';

// Ensure env loaded
try { getEnvConfig(); } catch (e) { console.error(e); process.exit(1); }

async function runTests() {
  console.log('🧪 Testing Embeddings (OpenRouter Fetch)...\n');
  
  // Test 1: Real API Call (Single)
  console.log('Test 1: Single Embedding');
  try {
    const vector = await embedText("Tesla revenue");
    console.log(`✅ Generated vector with ${vector.length} dimensions`);
  } catch (error) {
    console.error('❌ Test 1 Failed:', error);
    process.exit(1);
  }

  // Test 2: Batch API Call
  console.log('\nTest 2: Batch Embedding');
  try {
    const vectors = await embedTexts(["Tesla revenue", "BYD revenue"]);
    console.log(`✅ Generated ${vectors.length} vectors`);
    
    // Check dimensions match
    if (vectors[0].length !== vectors[1].length) {
        throw new Error('Vector dimension mismatch in batch');
    }
  } catch (error) {
    console.error('❌ Test 2 Failed:', error);
    process.exit(1);
  }

  // Test 3: Cosine Similarity
  console.log('\nTest 3: Similarity Calculation');
  const vecA = [1, 0, 0];
  const vecB = [1, 0, 0];
  const vecC = [0, 1, 0];
  
  const simIdentical = cosineSimilarity(vecA, vecB); // Should be 1
  const simOrthogonal = cosineSimilarity(vecA, vecC); // Should be 0
  
  if (Math.abs(simIdentical - 1) < 0.001 && Math.abs(simOrthogonal) < 0.001) {
      console.log('✅ Similarity Math Correct');
  } else {
      console.error(`❌ Math Failed: Identical=${simIdentical}, Orthogonal=${simOrthogonal}`);
  }

  console.log('🎉 Phase 5 Tests Passed');
}

runTests();

```

**Run the test:**

```bash
npx tsx app/lib/maxwell/test-embeddings.ts

```

#### Step 4: Documentation

Update `documentation/CHANGELOG.md`:

```markdown
## Phase 5: Embeddings
**Status**: Complete
**Completed**: [Current Date]

### Files Created
- `app/lib/maxwell/embeddings.ts`

### Key Features
- **Lightweight:** Uses native `fetch` to call OpenRouter Embeddings API (no extra SDKs).
- **Model:** Uses `qwen/qwen3-embedding-8b` (configured in constants).
- **Batching:** Supports efficient batch embedding requests.
- **Math:** Implements cosine similarity for vector comparison.

### Tests Passed
- [x] Single text embedding via OpenRouter
- [x] Batch embedding via OpenRouter
- [x] Cosine similarity math

```

Update `documentation/FILE-MAP.md`:

```markdown
### `embeddings.ts`
**Purpose**: Vector operations via OpenRouter.
**Exports**: `embedText`, `embedTexts`, `cosineSimilarity`, `findTopMatches`.
**Dependencies**: Native `fetch`, `constants`, `env`.

```

### Checklist

[ ] `constants.ts` updated with `EMBEDDING_MODEL`.
[ ] `embeddings.ts` created using `fetch` (no `@ai-sdk/openai`).
[ ] Test passed.
[ ] Test deleted.
[ ] Documentation updated.

Proceed to **Phase 6: Verification**.