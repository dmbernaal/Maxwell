/**
 * Answer Synthesis Module
 *
 * Generates coherent answers from sources with inline citations.
 * Supports streaming for real-time UI updates.
 *
 * @module maxwell/synthesizer
 */

import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// Phase 1 Import
import { createSynthesisPrompt } from './prompts';
// Phase 0 Constants
import { SYNTHESIS_MODEL, SYNTHESIS_MAX_TOKENS } from './constants';
import type { MaxwellSource, SynthesisOutput } from './types';

// ============================================
// OPENROUTER CLIENT
// ============================================

/**
 * Creates an OpenRouter client instance.
 * @throws Error if OPENROUTER_API_KEY is not set
 */
function getOpenRouterClient() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }
    return createOpenRouter({ apiKey });
}

// ============================================
// TYPES
// ============================================

/**
 * Events yielded by the synthesis generator.
 */
export type SynthesisEvent =
    | { type: 'chunk'; content: string }
    | { type: 'complete'; answer: string; sourcesUsed: string[]; durationMs: number };

// ============================================
// CITATION LOGIC
// ============================================

/**
 * Extracts citation numbers from text.
 * Handles [1], [2] and ensures they are within valid range.
 *
 * @param text - The synthesized answer
 * @param maxSourceIndex - Maximum valid source index (e.g., 5 if 5 sources)
 * @returns Array of source IDs used (e.g., ["s1", "s3"])
 */
function extractCitations(text: string, maxSourceIndex: number): string[] {
    // Regex matches [1], [2], etc.
    // We rely on the prompt to enforce [1][2] format for multiples, not [1, 2]
    const citationPattern = /\[(\d+)\]/g;
    const citations = new Set<string>();

    let match;
    while ((match = citationPattern.exec(text)) !== null) {
        const num = parseInt(match[1], 10);
        // Only include valid citation numbers (1 to N)
        if (num >= 1 && num <= maxSourceIndex) {
            citations.add(`s${num}`); // Normalize to ID format "s1"
        }
    }

    // Sort numerically: s1, s2, s10 (not s1, s10, s2)
    return Array.from(citations).sort((a, b) => {
        const numA = parseInt(a.slice(1), 10);
        const numB = parseInt(b.slice(1), 10);
        return numA - numB;
    });
}

/**
 * Checks for hallucinated citations (e.g. [5] when only 3 sources exist).
 *
 * @param answer - The synthesized answer
 * @param maxSourceIndex - Maximum valid source index
 * @returns Object with answer and any validation issues
 */
function validateCitations(
    answer: string,
    maxSourceIndex: number
): { answer: string; issues: string[] } {
    const issues: string[] = [];
    const citationPattern = /\[(\d+)\]/g;

    let match;
    while ((match = citationPattern.exec(answer)) !== null) {
        const num = parseInt(match[1], 10);
        if (num > maxSourceIndex) {
            issues.push(`Invalid citation [${num}] - only ${maxSourceIndex} sources available`);
        }
    }

    if (issues.length > 0) {
        console.warn('[Maxwell Synthesis] Validation Warning:', issues);
    }

    return { answer, issues };
}

// ============================================
// SYNTHESIS GENERATOR
// ============================================

/**
 * Synthesizes an answer from sources using streaming.
 *
 * @param originalQuery - The user's original question
 * @param sources - Array of sources from search phase
 * @yields SynthesisEvent - Either 'chunk' or 'complete'
 * @throws Error if synthesis fails
 */
export async function* synthesize(
    originalQuery: string,
    sources: MaxwellSource[]
): AsyncGenerator<SynthesisEvent> {
    const startTime = Date.now();

    // 1. Validation
    if (!originalQuery) throw new Error('Query cannot be empty');
    if (!Array.isArray(sources)) throw new Error('Sources must be an array');

    // 2. Handle Empty Sources (Fast Exit)
    if (sources.length === 0) {
        const msg = `I couldn't find any relevant sources for "${originalQuery}".`;
        yield { type: 'chunk', content: msg };
        yield {
            type: 'complete',
            answer: msg,
            sourcesUsed: [],
            durationMs: Date.now() - startTime,
        };
        return;
    }

    try {
        const openrouter = getOpenRouterClient();

        // 3. Prepare Prompt (Date Injection happens inside createSynthesisPrompt)
        const prompt = createSynthesisPrompt(sources, originalQuery);

        // 4. Start Stream
        const { textStream } = streamText({
            model: openrouter(SYNTHESIS_MODEL),
            prompt,
            maxOutputTokens: SYNTHESIS_MAX_TOKENS,
        });

        let fullAnswer = '';

        for await (const chunk of textStream) {
            fullAnswer += chunk;
            yield { type: 'chunk', content: chunk };
        }

        // 5. Post-Processing
        validateCitations(fullAnswer, sources.length);
        const sourcesUsed = extractCitations(fullAnswer, sources.length);

        yield {
            type: 'complete',
            answer: fullAnswer,
            sourcesUsed,
            durationMs: Date.now() - startTime,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Synthesis failed: ${message}`);
    }
}

// ============================================
// NON-STREAMING WRAPPER
// ============================================

/**
 * Synthesizes an answer from sources (non-streaming).
 * Consumes the generator and returns the final result.
 *
 * @param originalQuery - The user's original question
 * @param sources - Array of sources from search phase
 * @returns SynthesisOutput with answer, sources used, and duration
 */
export async function synthesizeComplete(
    originalQuery: string,
    sources: MaxwellSource[]
): Promise<SynthesisOutput> {
    let finalResult: SynthesisOutput | null = null;

    for await (const event of synthesize(originalQuery, sources)) {
        if (event.type === 'complete') {
            finalResult = {
                answer: event.answer,
                sourcesUsed: event.sourcesUsed,
                durationMs: event.durationMs,
            };
        }
    }

    if (!finalResult) throw new Error('Synthesis stream ended without completion event');
    return finalResult;
}

// ============================================
// UTILITIES
// ============================================

/**
 * Counts the number of citations in text.
 *
 * @param text - Text to count citations in
 * @returns Number of [n] occurrences
 */
export function countCitations(text: string): number {
    const matches = text.match(/\[\d+\]/g);
    return matches ? matches.length : 0;
}

/**
 * Validates a SynthesisOutput structure.
 *
 * @param output - The output to validate
 * @returns true if valid
 * @throws Error if validation fails
 */
export function validateSynthesisOutput(output: SynthesisOutput): boolean {
    if (typeof output.answer !== 'string') throw new Error('answer must be string');
    if (!Array.isArray(output.sourcesUsed)) throw new Error('sourcesUsed must be array');

    // Ensure IDs look like "s1", "s2"
    output.sourcesUsed.forEach((id) => {
        if (!/^s\d+$/.test(id)) throw new Error(`Invalid Source ID: ${id}`);
    });

    return true;
}
