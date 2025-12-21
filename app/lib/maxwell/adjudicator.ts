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
import { createAdjudicatorPrompt } from './prompts';
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
 * @yields Chunks of the adjudication text
 */
export async function* adjudicateAnswer(
    query: string,
    draft: string,
    verification: VerificationOutput
): AsyncGenerator<string> {
    try {
        const openrouter = getOpenRouterClient();
        const prompt = createAdjudicatorPrompt(query, draft, verification);

        const { textStream } = streamText({
            model: openrouter(ADJUDICATOR_MODEL),
            prompt,
            temperature: 0.3, // Low temperature for authoritative tone
        });

        for await (const chunk of textStream) {
            yield chunk;
        }
    } catch (error) {
        console.error('[Maxwell Adjudicator] Adjudication failed:', error);
        // Fail gracefully - yield nothing or a generic error message? 
        // For now, we'll just log it and yield nothing so the UI doesn't break.
    }
}
