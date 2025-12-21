/**
 * Adjudication Module
 *
 * Phase 5: The Adjudicator.
 * Consumes the draft answer and verification report to generate a final verdict.
 *
 * @module maxwell/adjudicator
 */

import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { RECONSTRUCTOR_SYSTEM_PROMPT } from './prompts';
import { ADJUDICATOR_MODEL } from './constants';
import type { VerificationOutput } from './types';

/**
 * Creates an OpenRouter client instance.
 */
function getOpenRouterClient() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }
    return createOpenRouter({ apiKey });
}

/**
 * Adjudicates the final answer based on verification results.
 * Streams the verdict token-by-token.
 *
 * @param query - Original user query
 * @param draft - The synthesized draft answer
 * @param verification - The full verification report
 * @returns A stream of adjudication text
 */
export async function adjudicateAnswer(
    query: string,
    draftAnswer: string,
    verification: VerificationOutput
) {
    try {
        const openrouter = getOpenRouterClient();

        // 1. Filter Claims for Reconstruction
        const verifiedFacts = verification.claims
            .filter(c => c.entailment === 'SUPPORTED' || c.confidence > 0.7)
            .map(c => `- ${c.text} (CONFIRMED by: ${c.bestMatchingSource?.passage || 'Verified Source'})`)
            .join('\n');

        const disputedFacts = verification.claims
            .filter(c => c.entailment === 'CONTRADICTED')
            .map(c => `- FALSE: ${c.text} \n  CORRECTION: ${c.bestMatchingSource?.passage || 'Contradicting Evidence'}`)
            .join('\n');

        const unverifiedFacts = verification.claims
            .filter(c => c.entailment === 'NEUTRAL' && c.confidence <= 0.7)
            .map(c => `- UNVERIFIED: ${c.text}`)
            .join('\n');

        // 2. Construct the Prompt Payload
        const prompt = `
USER QUERY: "${query}"
DRAFT ANSWER: "${draftAnswer}"
            
=== VERIFIED FACTS (USE THESE AS TRUTH) ===
${verifiedFacts || '(No fully verified facts found)'}

=== DISPUTED FACTS (CORRECT THESE) ===
${disputedFacts || '(No contradictions found)'}

=== UNVERIFIED/MISSING (ACKNOWLEDGE GAPS IF RELEVANT) ===
${unverifiedFacts || '(No unverified claims)'}
`;

        // 3. Call LLM
        const result = await streamText({
            model: openrouter(ADJUDICATOR_MODEL),
            messages: [
                { role: 'system', content: RECONSTRUCTOR_SYSTEM_PROMPT },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1, // Strict adherence to facts
        });

        return result;
    } catch (error) {
        console.error('[Maxwell Adjudicator] Adjudication failed:', error);
        // Fail gracefully - yield nothing or a generic error message? 
        // For now, we'll just log it and yield nothing so the UI doesn't break.
    }
}
