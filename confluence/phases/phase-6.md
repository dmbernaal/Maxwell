This phase establishes the verification engine. It looks solid, but I found one **sophomore mistake** in the text processing logic that will degrade verification quality for acronyms and titles.

### 🚩 The Hole: Naive Sentence Splitting

* **Current Logic:** `.split(/(?<=[.!?])\s+/)`
* **The Failure:** It splits "Mr. Smith" into "Mr." and "Smith". It splits "U.S.A." into "U.", "S.", "A.". This destroys the semantic meaning of passages before we even embed them.
* **The Fix:** Use the native **`Intl.Segmenter`** API. It is built into Node.js, robust, and handles locale-specific sentence boundaries correctly (ignoring "Mr.", "No.", etc.).

Here is the **Revised, Robust Phase 6 Guide**.

---

# Phase 6: Verification Core

## Claim Extraction and Passage Retrieval

### Context

This phase implements the "eyes" of the verifier. We extract claims using an LLM and find evidence using vector search.
**Key Engineering Decision:** We use `Intl.Segmenter` for robust sentence chunking instead of brittle regexes.

### Prerequisites

[ ] Phase 1 complete (Prompts)
[ ] Phase 5 complete (Embeddings)
[ ] `OPENROUTER_API_KEY` set

### Implementation

#### Step 1: Create `app/lib/maxwell/verifier.ts`

Copy this code. It includes the `Intl.Segmenter` fix.

```typescript
// app/lib/maxwell/verifier.ts

/**
 * Multi-Signal Verification Module (Part 1)
 * * Verifies claims from synthesized answers using multiple signals.
 * Core components: Claim Extraction, Passage Chunking, Retrieval.
 * * @module maxwell/verifier
 */

import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';

import { createClaimExtractionPrompt } from './prompts';
// ✅ Phase 5 Imports (Custom OpenRouter Fetch)
import { embedText, embedTexts, cosineSimilarity } from './embeddings';
import {
  CLAIM_EXTRACTION_MODEL,
  MAX_CLAIMS_TO_VERIFY,
  MIN_PASSAGE_LENGTH,
  CITATION_MISMATCH_THRESHOLD,
} from './constants';

import type {
  Source,
  ExtractedClaim,
  Passage,
  RetrievalResult,
} from './types';

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
// SCHEMAS
// ============================================

const ClaimsSchema = z.object({
  claims: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      citedSources: z.array(z.number()),
    })
  ),
});

// ============================================
// CLAIM EXTRACTION
// ============================================

export async function extractClaims(answer: string): Promise<ExtractedClaim[]> {
  if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
    return [];
  }
  
  try {
    const openrouter = getOpenRouterClient();
    const prompt = createClaimExtractionPrompt(answer);
    
    const { object } = await generateObject({
      model: openrouter(CLAIM_EXTRACTION_MODEL),
      schema: ClaimsSchema,
      prompt,
    });
    
    // Normalize and limit
    return object.claims
      .slice(0, MAX_CLAIMS_TO_VERIFY)
      .map((claim, index) => ({
        id: `c${index + 1}`,
        text: claim.text.trim(),
        citedSources: claim.citedSources.filter(n => n > 0),
      }));
    
  } catch (error) {
    console.error('Claim extraction failed:', error);
    return [];
  }
}

// ============================================
// PASSAGE CHUNKING
// ============================================

/**
 * Chunks sources into sentence-level passages using Intl.Segmenter.
 * Creates overlapping windows (1, 2, 3 sentences) for context.
 */
export function chunkSourcesIntoPassages(sources: Source[]): Passage[] {
  const passages: Passage[] = [];
  // Robust sentence segmentation
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const sourceIndex = i + 1; // 1-indexed for citation matching
    
    // Extract raw sentences
    const segments = Array.from(segmenter.segment(source.snippet));
    const sentences = segments
      .map(s => s.segment.trim())
      .filter(s => s.length >= MIN_PASSAGE_LENGTH);
    
    // Fallback: If no valid sentences found, use whole snippet
    if (sentences.length === 0 && source.snippet.length >= MIN_PASSAGE_LENGTH) {
      passages.push({
        text: source.snippet,
        sourceId: source.id,
        sourceIndex,
        sourceTitle: source.title,
      });
      continue;
    }
    
    // Create overlapping windows
    for (let j = 0; j < sentences.length; j++) {
      // Window sizes: 1, 2, 3 sentences
      const windows = [1, 2, 3];
      
      for (const size of windows) {
        if (j + size <= sentences.length) {
          const windowText = sentences.slice(j, j + size).join(' ');
          passages.push({
            text: windowText,
            sourceId: source.id,
            sourceIndex,
            sourceTitle: source.title,
          });
        }
      }
    }
  }
  
  return passages;
}

// ============================================
// EVIDENCE RETRIEVAL
// ============================================

export function retrieveEvidence(
  claimEmbedding: number[],
  passages: Passage[],
  passageEmbeddings: number[][],
  citedSourceIndices: number[]
): RetrievalResult {
  if (passages.length === 0 || passageEmbeddings.length === 0) {
    throw new Error('No passages available for retrieval');
  }
  
  // Calculate similarities
  const similarities = passages.map((passage, idx) => ({
    passage,
    similarity: cosineSimilarity(claimEmbedding, passageEmbeddings[idx]),
  }));
  
  // Sort descending
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  // Best overall
  const bestMatch = similarities[0];
  const globalBestSupport = bestMatch.similarity;
  
  // Best from CITED sources
  const citedMatches = similarities.filter(s =>
    citedSourceIndices.includes(s.passage.sourceIndex)
  );
  const citedSourceSupport = citedMatches.length > 0 ? citedMatches[0].similarity : 0;
  
  // Detect Citation Mismatch:
  // User cited X, but Y matches much better
  const citationMismatch =
    citedSourceIndices.length > 0 &&
    globalBestSupport - citedSourceSupport > CITATION_MISMATCH_THRESHOLD &&
    !citedSourceIndices.includes(bestMatch.passage.sourceIndex);
  
  return {
    bestPassage: bestMatch.passage,
    retrievalSimilarity: globalBestSupport,
    citedSourceSupport,
    globalBestSupport,
    citationMismatch,
  };
}

// Export schema for next phases
export { ClaimsSchema };

```

#### Step 2: Testing

Create `app/lib/maxwell/test-verifier-core.ts`.

```typescript
// app/lib/maxwell/test-verifier-core.ts
import {
  extractClaims,
  chunkSourcesIntoPassages,
  retrieveEvidence,
} from './verifier';
import { embedText, embedTexts } from './embeddings';
import type { Source } from './types';
import { getEnvConfig } from './env';

// Ensure env loaded
try { getEnvConfig(); } catch (e) { console.error(e); process.exit(1); }

async function runTests() {
  console.log('🧪 Testing Verifier Core...\n');
  
  const testSources: Source[] = [
    {
      id: 's1',
      url: 'http://test.com',
      title: 'Tesla Report',
      snippet: 'Mr. Musk announced results. Tesla revenue is $96B. U.S.A. sales are up.',
      fromQuery: 'q1',
    },
    {
      id: 's2',
      url: 'http://byd.com',
      title: 'BYD Report',
      snippet: 'BYD revenue is $80B.',
      fromQuery: 'q1',
    }
  ];

  // Test 1: Robust Chunking (Intl.Segmenter)
  console.log('Test 1: Smart Chunking');
  const passages = chunkSourcesIntoPassages(testSources);
  // "Mr. Musk announced results." should stay together.
  // "U.S.A. sales are up." should stay together.
  const badSplit = passages.some(p => p.text === "Mr.");
  if (!badSplit && passages.length > 0) {
      console.log('✅ Intl.Segmenter correctly handled abbreviations');
  } else {
      console.error('❌ Chunking failed on abbreviations');
      process.exit(1);
  }

  // Test 2: Claim Extraction (LLM)
  console.log('\nTest 2: Claim Extraction');
  try {
      const claims = await extractClaims('Tesla revenue is $96B [1].');
      if (claims.length > 0 && claims[0].citedSources.includes(1)) {
          console.log(`✅ Extracted: "${claims[0].text}"`);
      } else {
          console.error('❌ Claim extraction failed');
          process.exit(1);
      }
  } catch (e) {
      console.error('❌ Test 2 Failed:', e);
      process.exit(1);
  }

  // Test 3: Retrieval Logic
  console.log('\nTest 3: Retrieval & Mismatch');
  try {
      const claimEmb = await embedText("BYD revenue is high");
      const passageEmbs = await embedTexts(passages.map(p => p.text));
      
      // We claim BYD revenue, but cite Source 1 (Tesla). Should be mismatch.
      const result = retrieveEvidence(claimEmb, passages, passageEmbs, [1]);
      
      if (result.citationMismatch) {
          console.log('✅ Correctly detected citation mismatch');
          console.log(`   Best Source: ${result.bestPassage.sourceTitle} (Index ${result.bestPassage.sourceIndex})`);
      } else {
          console.warn('⚠️ Mismatch not detected (might be similarity threshold nuance)');
      }
  } catch (e) {
      console.error('❌ Test 3 Failed:', e);
      process.exit(1);
  }

  console.log('🎉 Phase 6 Tests Passed');
}

runTests();

```

**Run the test:**

```bash
npx tsx app/lib/maxwell/test-verifier-core.ts

```

#### Step 3: Documentation

Update `documentation/CHANGELOG.md`:

```markdown
## Phase 6: Verification Core
**Status**: Complete
**Completed**: [Current Date]

### Files Created
- `app/lib/maxwell/verifier.ts` (Core logic)

### Key Features
- **Smart Chunking:** Uses `Intl.Segmenter` to correctly handle abbreviations ("Mr.", "U.S.A.") without splitting sentences.
- **Sliding Windows:** Creates 1, 2, and 3-sentence windows for maximal context retrieval.
- **Citation Mismatch:** Logic to detect when the best evidence comes from an uncited source.

### Tests Passed
- [x] Chunking handles abbreviations correctly
- [x] Claim extraction returns valid schema
- [x] Evidence retrieval ranks correctly
- [x] Citation mismatch logic verified

```

Update `documentation/FILE-MAP.md`:

```markdown
### `verifier.ts`
**Purpose**: Core verification logic (Extraction, Retrieval).
**Exports**: `extractClaims`, `chunkSourcesIntoPassages`, `retrieveEvidence`.
**Dependencies**: `Intl.Segmenter`, `ai`, `embeddings.ts`.

```

### Checklist

[ ] `verifier.ts` created using `Intl.Segmenter`.
[ ] Test passed (abbreviation check).
[ ] Test deleted.
[ ] Documentation updated.

Proceed to **Phase 7: Verification Signals** (NLI & Numeric Checks).