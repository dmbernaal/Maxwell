This looks excellent, but there is a **Dependencies Hole** left over from Phase 6.

### 🚩 The Hole: Missing Schema & Imports

In Phase 6, we created `verifier.ts` with `ClaimsSchema`, but we **did not** define `EntailmentSchema`, nor did we import the necessary NLI constants or types.

* **The Result:** If you paste the Phase 7 code (which uses `EntailmentSchema` and `NLI_MODEL`) into `verifier.ts`, TypeScript will crash immediately because those variables are undefined.
* **The Fix:** We must explicitly **update the imports** and **add the schema definition** before adding the new functions.

Here is the **Revised, Robust Phase 7 Guide**.

---

# Phase 7: Verification Signals

## NLI Entailment and Numeric Consistency

### Context

This phase implements the "brain" of the verifier. We add two critical signals:

1. **NLI (Natural Language Inference):** Uses an LLM to judge if evidence logically supports the claim.
2. **Numeric Consistency:** Uses deterministic parsing to ensure numbers (revenue, dates, percentages) match exactly, catching subtle hallucinations.

### Prerequisites

[ ] Phase 6 complete (`verifier.ts` exists)
[ ] `OPENROUTER_API_KEY` configured

### Implementation

#### Step 1: Update `app/lib/maxwell/verifier.ts`

We need to **add imports** and **define the schema** before adding the logic.

**A. Update Imports (Top of file)**
Replace the imports section with this expanded list:

```typescript
import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';

// ✅ Added createNLIPrompt
import { createClaimExtractionPrompt, createNLIPrompt } from './prompts';
import { embedText, embedTexts, cosineSimilarity } from './embeddings';

// ✅ Added NLI and Signal Constants
import {
  CLAIM_EXTRACTION_MODEL,
  NLI_MODEL,
  MAX_CLAIMS_TO_VERIFY,
  MIN_PASSAGE_LENGTH,
  CITATION_MISMATCH_THRESHOLD,
  HIGH_CONFIDENCE_THRESHOLD,
  MEDIUM_CONFIDENCE_THRESHOLD,
  ENTAILMENT_SUPPORTED_CONFIDENCE,
  ENTAILMENT_NEUTRAL_CONFIDENCE,
  ENTAILMENT_CONTRADICTED_CONFIDENCE,
  LOW_RETRIEVAL_MULTIPLIER,
  LOW_RETRIEVAL_THRESHOLD,
  CITATION_MISMATCH_MULTIPLIER,
  NUMERIC_MISMATCH_MULTIPLIER,
} from './constants';

import type {
  Source,
  ExtractedClaim,
  Passage,
  RetrievalResult,
  // ✅ Added new types
  EntailmentVerdict,
  NumericCheck,
  AggregatedVerdict,
} from './types';

```

**B. Add Entailment Schema (After `ClaimsSchema`)**
Add this Zod schema definition after `ClaimsSchema`:

```typescript
const EntailmentSchema = z.object({
  verdict: z.enum(['SUPPORTED', 'CONTRADICTED', 'NEUTRAL']),
  reasoning: z.string(),
});

```

**C. Add Logic Functions (Append to end of file)**
Add these functions to the bottom of `verifier.ts`.

```typescript
// ============================================
// NLI ENTAILMENT CHECK
// ============================================

export async function checkEntailment(
  claim: string,
  evidence: string
): Promise<{ verdict: EntailmentVerdict; reasoning: string }> {
  if (!claim || !evidence) {
    return { verdict: 'NEUTRAL', reasoning: 'Missing claim or evidence' };
  }
  
  try {
    const openrouter = getOpenRouterClient();
    const prompt = createNLIPrompt(claim, evidence);
    
    const { object } = await generateObject({
      model: openrouter(NLI_MODEL),
      schema: EntailmentSchema,
      prompt,
    });
    
    return {
      verdict: object.verdict,
      reasoning: object.reasoning,
    };
    
  } catch (error) {
    console.error('NLI check failed:', error);
    return { verdict: 'NEUTRAL', reasoning: 'NLI check failed' };
  }
}

// ============================================
// NUMERIC EXTRACTION
// ============================================

const NUMBER_PATTERNS = [
  /[$¥€£][\d,.]+\s*[BMKbmk](?:illion|illion)?/gi, // Currency + suffix
  /[\d,.]+%/g,                                     // Percentages
  /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g,             // Comma separated
  /\b\d+\.\d+\b/g,                                 // Decimals
  /\b\d+\s*(?:billion|million|thousand|trillion)/gi, // Number + unit
  /\b(19|20)\d{2}\b/g,                             // Years (caught to filter later)
  /\b\d{4,}\b/g,                                   // Large integers
];

export function extractNumbers(text: string): string[] {
  if (!text) return [];
  const numbers = new Set<string>();
  
  for (const pattern of NUMBER_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => numbers.add(m.toLowerCase().trim()));
    }
  }
  
  return Array.from(numbers);
}

export function normalizeNumber(numStr: string): number | null {
  if (!numStr) return null;
  
  // Clean string
  let cleaned = numStr.replace(/[$¥€£,]/g, '').toLowerCase().trim();
  
  // Percentages
  if (cleaned.endsWith('%')) {
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val; // Keep as 18.8 for 18.8%
  }
  
  // Suffixes
  let multiplier = 1;
  if (cleaned.match(/t(rillion)?$/)) multiplier = 1e12;
  else if (cleaned.match(/b(illion)?$/)) multiplier = 1e9;
  else if (cleaned.match(/m(illion)?$/)) multiplier = 1e6;
  else if (cleaned.match(/k(ousand)?$/)) multiplier = 1e3;
  
  // Remove words to parse
  cleaned = cleaned.replace(/[a-z%]/g, '').trim();
  
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val * multiplier;
}

function numbersMatch(a: string, b: string): boolean {
  const valA = normalizeNumber(a);
  const valB = normalizeNumber(b);
  
  if (valA === null || valB === null) return false;
  
  // Percentages need exactish match (0.5 tolerance)
  if (a.includes('%') || b.includes('%')) {
    return Math.abs(valA - valB) < 0.5;
  }
  
  // Standard tolerance (5%)
  if (valA === 0) return valB === 0;
  const ratio = valA / valB;
  return ratio > 0.95 && ratio < 1.05;
}

export function checkNumericConsistency(
  claimNumbers: string[],
  evidenceNumbers: string[]
): NumericCheck {
  if (claimNumbers.length === 0) {
    return { claimNumbers, evidenceNumbers, match: true };
  }
  
  let allMatch = true;
  
  for (const claimNum of claimNumbers) {
    // Ignore Years in consistency check (Context, not stats)
    if (/^(19|20)\d{2}$/.test(claimNum)) continue;
    
    // Check if this number exists in evidence
    const found = evidenceNumbers.some(evNum => numbersMatch(claimNum, evNum));
    if (!found) {
      allMatch = false;
      break;
    }
  }
  
  return { claimNumbers, evidenceNumbers, match: allMatch };
}

// ============================================
// AGGREGATION
// ============================================

export function aggregateSignals(
  entailment: EntailmentVerdict,
  retrievalSimilarity: number,
  citationMismatch: boolean,
  numericCheck: NumericCheck | null
): AggregatedVerdict {
  const issues: string[] = [];
  let confidence: number;
  
  // 1. Base Confidence from NLI
  switch (entailment) {
    case 'SUPPORTED':
      confidence = ENTAILMENT_SUPPORTED_CONFIDENCE;
      break;
    case 'CONTRADICTED':
      confidence = ENTAILMENT_CONTRADICTED_CONFIDENCE;
      issues.push('Evidence contradicts claim');
      break;
    case 'NEUTRAL':
      confidence = ENTAILMENT_NEUTRAL_CONFIDENCE;
      issues.push('Evidence is neutral/irrelevant');
      break;
  }
  
  // 2. Retrieval Penalty
  if (retrievalSimilarity < LOW_RETRIEVAL_THRESHOLD) {
    confidence *= LOW_RETRIEVAL_MULTIPLIER;
    issues.push('Low semantic similarity');
  }
  
  // 3. Citation Penalty
  if (citationMismatch) {
    confidence *= CITATION_MISMATCH_MULTIPLIER;
    issues.push('Better evidence found in uncited source');
  }
  
  // 4. Numeric Penalty (Severe)
  if (numericCheck && !numericCheck.match) {
    confidence *= NUMERIC_MISMATCH_MULTIPLIER;
    issues.push(`Numeric mismatch: [${numericCheck.claimNumbers}] vs [${numericCheck.evidenceNumbers}]`);
  }
  
  // Level
  let confidenceLevel: 'high' | 'medium' | 'low';
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) confidenceLevel = 'high';
  else if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) confidenceLevel = 'medium';
  else confidenceLevel = 'low';
  
  return { confidence, confidenceLevel, issues };
}

// Export schema
export { EntailmentSchema };

```

#### Step 2: Testing

Create `app/lib/maxwell/test-verifier-signals.ts`.

```typescript
// app/lib/maxwell/test-verifier-signals.ts
import {
  checkEntailment,
  extractNumbers,
  normalizeNumber,
  checkNumericConsistency,
  aggregateSignals,
} from './verifier';
import { getEnvConfig } from './env';

try { getEnvConfig(); } catch (e) { console.error(e); process.exit(1); }

async function runTests() {
  console.log('🧪 Testing Verification Signals...\n');

  // Test 1: NLI Check
  console.log('Test 1: NLI Check');
  const nliRes = await checkEntailment('Tesla grew 10%', 'Tesla reported 10% growth');
  if (nliRes.verdict === 'SUPPORTED') {
      console.log('✅ NLI correctly identified support');
  } else {
      console.error(`❌ NLI Failed: Got ${nliRes.verdict}`);
      process.exit(1);
  }

  // Test 2: Number Normalization
  console.log('\nTest 2: Number Logic');
  const num1 = normalizeNumber('$96.8 billion');
  const num2 = normalizeNumber('96.8B');
  if (num1 === 96.8e9 && num2 === 96.8e9) {
      console.log('✅ Normalization works ($96.8 billion == 96.8B)');
  } else {
      console.error(`❌ Normalization failed: ${num1} vs ${num2}`);
      process.exit(1);
  }

  // Test 3: Consistency Check
  console.log('\nTest 3: Consistency');
  const cons = checkNumericConsistency(['$100'], ['$100', '2024']);
  if (cons.match) {
      console.log('✅ Consistent numbers matched');
  } else {
      console.error('❌ Failed to match consistent numbers');
      process.exit(1);
  }

  // Test 4: Aggregation
  console.log('\nTest 4: Aggregation');
  // Supported + Numeric Mismatch = Should be Low/Medium confidence
  const agg = aggregateSignals('SUPPORTED', 0.9, false, { 
      claimNumbers: ['100'], 
      evidenceNumbers: ['50'], 
      match: false 
  });
  
  console.log(`Score: ${agg.confidence}`);
  if (agg.confidence < 0.5) {
      console.log('✅ Numeric mismatch correctly penalized score');
  } else {
      console.error('❌ Aggregation logic failed to penalize mismatch');
      process.exit(1);
  }

  console.log('🎉 Phase 7 Tests Passed');
}

runTests();

```

**Run the test:**

```bash
npx tsx app/lib/maxwell/test-verifier-signals.ts

```

#### Step 3: Documentation

Update `documentation/CHANGELOG.md`:

```markdown
## Phase 7: Verification Signals
**Status**: Complete
**Completed**: [Current Date]

### Files Modified
- `app/lib/maxwell/verifier.ts`

### Functions Added
- `checkEntailment` (NLI)
- `extractNumbers`, `normalizeNumber`, `checkNumericConsistency`
- `aggregateSignals`

### Key Features
- **Deterministic Numeric Check:** Catches hallucinated numbers that embeddings miss.
- **Signal Fusion:** Multiplies confidence scores based on Entailment, Retrieval Quality, and Numeric Accuracy.

### Tests Passed
- [x] NLI returns valid verdicts
- [x] Number normalization handles B/M/K suffixes correctly
- [x] Aggregation logic correctly penalizes mismatches

```

### Checklist

[ ] Imports updated in `verifier.ts`.
[ ] `EntailmentSchema` defined.
[ ] New functions added.
[ ] Test passed.
[ ] Test deleted.
[ ] Documentation updated.

Proceed to **Phase 8: Verification Assembly**.