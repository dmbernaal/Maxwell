/**
 * Maxwell Decompose API Route
 *
 * Phase 1: Query decomposition and complexity assessment.
 * Breaks down user query into sub-queries with search configurations.
 *
 * POST /api/maxwell/decompose
 */

import { NextRequest } from 'next/server';
import { decomposeQuery } from '../../../lib/maxwell/decomposer';
import { createExecutionConfig } from '../../../lib/maxwell/configFactory';
import { MAX_QUERY_LENGTH } from '../../../lib/maxwell/constants';
import type { DecomposeRequest, DecomposeResponse } from '../../../lib/maxwell/api-types';

// Timeout for decomposition (fast operation)
export const maxDuration = 30;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        // 1. Parse request body
        let body: DecomposeRequest;
        try {
            body = await request.json();
        } catch {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON body' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { query } = body;

        // 2. Validation
        if (!query || typeof query !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Query required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const trimmedQuery = query.trim();
        if (trimmedQuery.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Query cannot be empty' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (trimmedQuery.length > MAX_QUERY_LENGTH) {
            return new Response(
                JSON.stringify({ error: `Query too long (max ${MAX_QUERY_LENGTH} characters)` }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('[Maxwell Decompose] Query received:', trimmedQuery.slice(0, 50) + '...');

        // 3. Run decomposition
        const decomposition = await decomposeQuery(trimmedQuery);

        // 4. Create execution config based on complexity
        const config = createExecutionConfig(
            decomposition.complexity,
            decomposition.complexityReasoning
        );

        // 5. Return response
        const response: DecomposeResponse = {
            ...decomposition,
            config,
        };

        console.log('[Maxwell Decompose] Complete:', {
            subQueries: decomposition.subQueries.length,
            complexity: decomposition.complexity,
            durationMs: decomposition.durationMs,
        });

        return new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('[Maxwell Decompose] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

