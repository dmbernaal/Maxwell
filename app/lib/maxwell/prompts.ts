/**
 * Maxwell LLM Prompts
 *
 * Centralized prompts for Decomposition, Synthesis, Extraction, and NLI.
 * Includes helper functions for template injection and source formatting.
 *
 * @module maxwell/prompts
 */

import type { MaxwellSource } from './types';

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
 * Replaces all instances of {key} with the corresponding value.
 *
 * @param template - The prompt template with {placeholders}
 * @param values - Key-value pairs to substitute
 * @returns The filled prompt string
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
 * Formats sources for inclusion in the synthesis prompt.
 * We include the FULL snippet to ensure no data loss.
 *
 * @param sources - Array of MaxwellSource objects
 * @returns Formatted string with numbered sources
 */
export function formatSourcesForPrompt(sources: MaxwellSource[]): string {
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

/**
 * Creates the full decomposition prompt with current date.
 *
 * @param query - The user's original query
 * @returns Complete prompt ready for LLM
 */
export function createDecompositionPrompt(query: string): string {
  return fillPromptTemplate(DECOMPOSITION_PROMPT, {
    query,
    currentDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  });
}

/**
 * Creates the full synthesis prompt with sources, query, and date.
 *
 * @param sources - Array of search result sources
 * @param query - The user's original query
 * @returns Complete prompt ready for LLM
 */
export function createSynthesisPrompt(sources: MaxwellSource[], query: string): string {
  const formattedSources = formatSourcesForPrompt(sources);
  return fillPromptTemplate(SYNTHESIS_PROMPT, {
    sources: formattedSources,
    query,
    currentDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  });
}

/**
 * Creates the claim extraction prompt.
 *
 * @param answer - The synthesized answer to extract claims from
 * @returns Complete prompt ready for LLM
 */
export function createClaimExtractionPrompt(answer: string): string {
  return fillPromptTemplate(CLAIM_EXTRACTION_PROMPT, { answer });
}

/**
 * Creates the NLI entailment prompt.
 *
 * @param claim - The factual claim to verify
 * @param evidence - The evidence passage to check against
 * @returns Complete prompt ready for LLM
 */
export function createNLIPrompt(claim: string, evidence: string): string {
  return fillPromptTemplate(NLI_PROMPT, { claim, evidence });
}

// ============================================
// ADJUDICATOR PROMPT
// ============================================

export const RECONSTRUCTOR_SYSTEM_PROMPT = `
You are the Final Authority in a high-stakes intelligence pipeline.
Your job is to answer the User's Question using ONLY verified evidence.

**INPUTS:**
1. User Query: The original question asked.
2. Verified Facts: A list of claims that have been proven true by evidence (High Confidence).
3. Disputed Facts: A list of claims that were proven false, with their corrections.
4. Unverified/Missing: Claims that had no evidence.

**STRICT INSTRUCTIONS:**
1. **IGNORE THE DRAFT:** Do not refer to "the draft," "the text," or "the previous section." The user should not know a draft existed.
2. **SYNTHESIZE VERIFIED FACTS:** Construct a direct answer to the User Query using *only* the Verified Facts.
3. **INTEGRATE CORRECTIONS:** If a Disputed Fact is relevant, state the *Corrected* version directly. (e.g., instead of "The draft said X but it is Y", just say "Current data confirms Y").
4. **HANDLE GAPS:** If the verified facts are insufficient to answer the question fully, admit *specifically* what is unknown, but synthesize what *is* known.
5. **CONCLUSION:** End with a "Final Verdict" or "Outlook" based purely on the verified signals.

**TONE:**
Direct, dense, and authoritative. You are not a checker; you are the source of truth.

**EXAMPLE:**
Query: "Will BTC go up?"
Verified: [Whales buying (Yes), Fear Index 20 (Yes), Outflows (Yes)]
Unverified: [Price is $88k]
Disputed: [Dip to $86k (False)]

BAD OUTPUT: "The draft mentioned $88k but it's unverified. However, whale accumulation is true."
GOOD OUTPUT: "Market signals favor an upward trend. Verified data shows record whale accumulation and net exchange outflows, signaling supply shock. While exact price support is volatile, the 'Extreme Fear' index (20) often precedes a reversal."
`;


