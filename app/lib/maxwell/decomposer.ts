/**
 * Query Decomposition Module
 *
 * Breaks complex user queries into focused sub-queries.
 * Uses structured output to ensure consistent, parseable results.
 *
 * @module maxwell/decomposer
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// ✅ CORRECT IMPORT: Using the helper function, not the raw string
import { DECOMPOSITION_PROMPT } from './prompts';
import {
    DECOMPOSITION_MODEL,
    MIN_SUB_QUERIES,
    MAX_SUB_QUERIES,
} from './constants';

import type { SubQuery, DecompositionOutput } from './types';
import type { ComplexityLevel } from './configFactory';

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
    query: z.string().describe('The search query optimized for Tavily'),
    purpose: z.string().describe('Why this query is needed'),
    topic: z.enum(['general', 'news']).describe('Search topic'),
    depth: z.enum(['basic', 'advanced']).describe('Search depth'),
    days: z.number().nullable().describe('Days back to search (null for all time)'),
    domains: z.array(z.string()).nullable().describe('Specific domains to search'),
});

const DecompositionSchema = z.object({
    reasoning: z.string().describe('Explanation of strategy'),
    complexity: z.enum(['simple', 'standard', 'deep_research']).describe('Complexity level'),
    complexityReasoning: z.string().describe('Reasoning for complexity choice'),
    subQueries: z.array(SubQuerySchema).min(1).max(7),
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
export async function decomposeQuery(
    query: string,
    modelId: string = DECOMPOSITION_MODEL
): Promise<DecompositionOutput> {
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
        const fullPrompt = DECOMPOSITION_PROMPT
            .replace('{currentDate}', new Date().toISOString())
            .replace('{query}', trimmedQuery); // Use trimmedQuery

        // Generate structured output
        const { object } = await generateObject({
            model: openrouter(modelId),
            schema: DecompositionSchema,
            prompt: fullPrompt,
            temperature: 0.3, // Low temp for structured output
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
            complexity: object.complexity as ComplexityLevel,
            complexityReasoning: object.complexityReasoning,
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
