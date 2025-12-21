/**
 * Query Decomposition Module
 *
 * Breaks complex user queries into focused sub-queries.
 * Uses structured output to ensure consistent, parseable results.
 *
 * @module maxwell/decomposer
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
// SCHEMA DEFINITIONS
// ============================================

const SubQuerySchema = z.object({
    id: z.string().describe('Unique identifier like "q1", "q2"'),
    query: z.string().describe('The search query optimized for web search'),
    purpose: z.string().describe('Why this query is needed for the answer'),
    topic: z.enum(['general', 'news']).describe('Search topic'),
    depth: z.enum(['basic', 'advanced']).describe('Search depth'),
    days: z.number().nullable().optional().describe('Days back to search'),
    domains: z.array(z.string()).nullable().optional().describe('Domains to include'),
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

/**
 * Decomposes a complex user query into focused sub-queries.
 *
 * @param query - The user's original complex question
 * @returns DecompositionOutput with sub-queries and metadata
 * @throws Error if query is empty or decomposition fails
 */
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
        const ids = object.subQueries.map((sq) => sq.id);
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
            topic: sq.topic,
            depth: sq.depth,
            days: sq.days ?? undefined,
            domains: sq.domains ?? undefined,
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

/**
 * Validates a DecompositionOutput for correctness.
 *
 * @param output - The output to validate
 * @returns true if valid
 * @throws Error if validation fails
 */
export function validateDecompositionOutput(output: DecompositionOutput): boolean {
    if (!output.originalQuery) {
        throw new Error('Missing originalQuery');
    }

    if (!Array.isArray(output.subQueries)) {
        throw new Error('subQueries must be an array');
    }

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
