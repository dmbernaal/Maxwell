You are absolutely right. In a high-stakes engineering assessment, **arbitrary data loss is worse than token overflow.** If a source is highly relevant but long, truncating it blindly at 1000 characters is a "lazy" optimization that degrades retrieval quality. We will trust the LLM's context window (which is huge for modern models like Gemini and Claude) and remove that limit.

Here is the **FINAL, BRUTAL, UNFILTERED Phase 1 Guide**. It includes every single line of code, the Date Injection fix (critical for correctness), and removes the truncation logic as requested.

---

# Phase 1: Prompts

## All LLM Prompts for Maxwell

### Context

This phase centralizes the "brain" of Maxwell. We are creating the system instructions that drive Decomposition, Synthesis, and Verification.

**Key Engineering Decisions:**

1. **Date Injection:** We inject `currentDate` into prompts so the model knows "today" vs "last year."
2. **No Arbitrary Truncation:** We pass full source snippets to the LLM to maximize retrieval quality, relying on the large context windows of modern models (Gemini 2.0 / Claude 3.5).
3. **Strict Output Schemas:** Every prompt enforces JSON or strict Markdown to prevent parsing errors.

### Prerequisites

[ ] Phase 0 complete (Types and Constants exist)
[ ] `app/lib/maxwell/types.ts` is present

### Implementation

#### Step 1: Create `app/lib/maxwell/prompts.ts`

Copy this file exactly.

```typescript
// app/lib/maxwell/prompts.ts

/**
 * Maxwell LLM Prompts
 * * Centralized prompts for Decomposition, Synthesis, Extraction, and NLI.
 * Includes helper functions for template injection and source formatting.
 * * @module maxwell/prompts
 */

import type { Source } from './types';

// ============================================
// DECOMPOSITION PROMPT
// ============================================

export const DECOMPOSITION_PROMPT = `You are a search query decomposition specialist. Given a complex question, break it into focused sub-queries that can be independently searched.

CONTEXT:
- Current Date: {currentDate}
- User Query: {query}

RULES:
1. Generate 3-5 sub-queries (no more, no less)
2. Each sub-query should be optimized for web search (concise, keyword-focused)
3. Sub-queries should cover different aspects of the original question
4. Include queries for specific data points, context, and analysis angles
5. Do NOT include meta-queries like "what is X" for common terms
6. If the query implies a time ("latest", "today"), use the Current Date to make queries specific (e.g., "Tesla stock price Dec 2025")

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "reasoning": "Brief explanation of your decomposition strategy",
  "subQueries": [
    {
      "id": "q1",
      "query": "the actual search query",
      "purpose": "why this query is needed for the answer"
    }
  ]
}

EXAMPLES:

User: "What's the current state of nuclear fusion research?"
Output: {
  "reasoning": "Breaking into recent breakthroughs, major projects, commercial players, and timeline predictions",
  "subQueries": [
    {"id": "q1", "query": "nuclear fusion breakthrough 2024 2025", "purpose": "Recent developments and milestones"},
    {"id": "q2", "query": "ITER fusion reactor progress timeline", "purpose": "Major international project status"},
    {"id": "q3", "query": "private fusion companies funding Commonwealth Helion", "purpose": "Commercial sector developments"},
    {"id": "q4", "query": "fusion energy commercialization predictions scientists", "purpose": "Expert timeline projections"}
  ]
}

Now decompose the User Query provided in CONTEXT.`;

// ============================================
// SYNTHESIS PROMPT
// ============================================

export const SYNTHESIS_PROMPT = `You are a research synthesizer. Given a question and search results from multiple queries, produce a comprehensive, well-structured answer.

CONTEXT:
- Current Date: {currentDate}
- User Question: {query}

CRITICAL RULES:
1. EVERY factual claim MUST cite its source using [n] notation (e.g., [1], [2])
2. Use the source numbers provided (they correspond to the sources list below)
3. If information conflicts between sources, acknowledge both perspectives
4. If important information is missing, explicitly state what's not covered
5. Do NOT make claims that aren't supported by the provided sources
6. Structure your response with clear sections using markdown headers (##)
7. Be comprehensive but concise—aim for 200-400 words
8. ONLY cite sources that exist in the provided list. Do not hallucinate [5] if only 4 sources exist.

CITATION FORMAT:
- Use [1], [2], etc. inline IMMEDIATELY after the claim
- Multiple sources for one claim: [1][3]
- Do NOT use footnote style—citations go inline

SOURCES PROVIDED:
{sources}

Generate your synthesized answer based strictly on the above sources.`;

/**
 * Formats sources for inclusion in the synthesis prompt.
 * We include the FULL snippet to ensure no data loss.
 */
export function formatSourcesForPrompt(sources: Source[]): string {
  if (sources.length === 0) {
    return 'No sources available.';
  }
  
  return sources
    .map((source, index) => {
      const num = index + 1;
      // We do NOT truncate. Quality > Tokens.
      // We just clean up excessive whitespace.
      const cleanSnippet = source.snippet.replace(/\s+/g, ' ').trim();
      return `[${num}] ${source.title}
URL: ${source.url}
Content: ${cleanSnippet}
`;
    })
    .join('\n');
}

// ============================================
// CLAIM EXTRACTION PROMPT
// ============================================

export const CLAIM_EXTRACTION_PROMPT = `You are a fact extractor. Given a text, extract all factual claims that can be verified against sources.

RULES:
1. Extract ONLY factual claims (not opinions, analysis, or speculation)
2. Each claim should be a single, atomic statement
3. INCLUDE claims with specific numbers, dates, names, percentages, or events
4. Track which source numbers [n] are cited for each claim in the original text
5. Keep claims self-contained (include necessary context so the claim makes sense in isolation)

DO NOT EXTRACT:
- Subjective statements ("X is better than Y")
- Transitional phrases ("In conclusion...", "Overall...")
- Future predictions ("Analysts expect...") unless it's a specific cited projection
- Vague statements ("The company is growing")

OUTPUT FORMAT:
Return a JSON object:
{
  "claims": [
    {
      "id": "c1",
      "text": "The exact factual claim as a complete sentence",
      "citedSources": [1, 3]
    }
  ]
}

TEXT TO ANALYZE:
{answer}

Extract the factual claims:`;

// ============================================
// NLI ENTAILMENT PROMPT
// ============================================

export const NLI_PROMPT = `You are a strict fact-checker performing Natural Language Inference (NLI).

TASK: Determine if the EVIDENCE supports, contradicts, or does not address the CLAIM.

CLAIM: "{claim}"

EVIDENCE: "{evidence}"

DEFINITIONS:
- SUPPORTED: The evidence DIRECTLY states or strongly implies the claim is true.
- CONTRADICTED: The evidence DIRECTLY states or strongly implies the claim is false.
- NEUTRAL: The evidence does not address this specific claim, is too ambiguous, OR talks about a different entity/time.

BE STRICT - Apply these rules:

1. NUMBERS MUST MATCH:
   - Claim: "$96.8 billion" + Evidence: "$96.8B" → SUPPORTED
   - Claim: "grew 18%" + Evidence: "grew 15%" → CONTRADICTED

2. DIRECTION MUST MATCH:
   - Claim: "grew" + Evidence: "declined" → CONTRADICTED

3. ENTITIES MUST MATCH:
   - Claim: "Tesla" + Evidence: "BYD" → NEUTRAL (irrelevant evidence)

4. SPECIFICITY MATTERS:
   - Claim: "confirmed" + Evidence: "plans to" → NEUTRAL
   - Claim: "released today" + Evidence: "coming soon" → NEUTRAL

RESPONSE FORMAT:
{
  "verdict": "SUPPORTED" | "CONTRADICTED" | "NEUTRAL",
  "reasoning": "Brief explanation of why you chose this verdict"
}

Now evaluate:`;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fills placeholders in a prompt template.
 */
export function fillPromptTemplate(
  template: string,
  values: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    // Replace all instances of {key}
    result = result.split(`{${key}}`).join(value);
  }
  return result;
}

/**
 * Creates the full decomposition prompt with current date.
 */
export function createDecompositionPrompt(query: string): string {
  return fillPromptTemplate(DECOMPOSITION_PROMPT, {
    query,
    currentDate: new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  });
}

/**
 * Creates the full synthesis prompt with sources, query, and date.
 */
export function createSynthesisPrompt(sources: Source[], query: string): string {
  const formattedSources = formatSourcesForPrompt(sources);
  return fillPromptTemplate(SYNTHESIS_PROMPT, {
    sources: formattedSources,
    query,
    currentDate: new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  });
}

export function createClaimExtractionPrompt(answer: string): string {
  return fillPromptTemplate(CLAIM_EXTRACTION_PROMPT, { answer });
}

export function createNLIPrompt(claim: string, evidence: string): string {
  return fillPromptTemplate(NLI_PROMPT, { claim, evidence });
}

```

#### Step 2: Verification (Testing)

Create a test file `app/lib/maxwell/test-prompts.ts` to verify the prompt logic, ensuring date injection works and formatting is correct.

```typescript
// app/lib/maxwell/test-prompts.ts
import {
  formatSourcesForPrompt,
  createSynthesisPrompt,
  createDecompositionPrompt,
  createNLIPrompt
} from './prompts';

import type { Source } from './types';

console.log('🧪 Testing Prompts...');

// Test 1: Date Injection
const decompPrompt = createDecompositionPrompt('test query');
const currentYear = new Date().getFullYear().toString();
if (!decompPrompt.includes(currentYear)) {
    console.error(`❌ Failed: Decomposition prompt missing current year (${currentYear})`);
    process.exit(1);
}
console.log('✅ Date Injection Working (Decomposition)');

// Test 2: Source Formatting (No Truncation Check)
const longSnippet = 'A'.repeat(2000); // Simulate massive snippet
const sources: Source[] = [
    { id: 's1', url: 'http://test.com', title: 'Test', snippet: longSnippet, fromQuery: 'q1' }
];
const formatted = formatSourcesForPrompt(sources);

if (formatted.length < 2000) {
    console.error('❌ Failed: Source was truncated! We explicitly requested NO truncation.');
    process.exit(1);
}
console.log('✅ No Truncation Working (Full content preserved)');

// Test 3: Synthesis Prompt Construction
const synthPrompt = createSynthesisPrompt(sources, 'query');
if (!synthPrompt.includes(currentYear)) {
     console.error('❌ Failed: Synthesis prompt missing date');
     process.exit(1);
}
if (!synthPrompt.includes('[1] Test')) {
    console.error('❌ Failed: Source listing missing');
    process.exit(1);
}
console.log('✅ Synthesis Prompt Working');

// Test 4: NLI Prompt
const nli = createNLIPrompt('Claim', 'Evidence');
if (!nli.includes('CLAIM: "Claim"') || !nli.includes('EVIDENCE: "Evidence"')) {
    console.error('❌ Failed: NLI template filling');
    process.exit(1);
}
console.log('✅ NLI Prompt Working');

console.log('🎉 Phase 1 Tests Passed');

```

#### Step 3: Run the Test

Execute this command in your terminal:

```bash
npx tsx app/lib/maxwell/test-prompts.ts

```

#### Step 4: Documentation

Update `documentation/CHANGELOG.md` exactly as follows:

```markdown
## Phase 1: Prompts
**Status**: Complete
**Completed**: [Current Date]

### Files Created
- `app/lib/maxwell/prompts.ts`

### Key Features
- **Date Awareness:** Decomposition and Synthesis prompts now receive `currentDate` to handle temporal queries ("today", "latest").
- **No Truncation:** `formatSourcesForPrompt` passes full source text to the LLM to prevent data loss.
- **Strict NLI:** Entailment prompt enforces number/direction matching.

### Tests Passed
- [x] Date injection verified
- [x] Non-truncation verified (2000+ char snippets preserved)
- [x] Template filling verified

```

### Checklist for Completion

[ ] `prompts.ts` created with **ALL** prompts and helper functions.
[ ] `formatSourcesForPrompt` **does not** use `.slice()`.
[ ] Test script `test-prompts.ts` created and **passed**.
[ ] Test script deleted after success.
[ ] Documentation updated.

Proceed to **Phase 2: Decomposition**.