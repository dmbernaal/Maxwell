/**
 * Maxwell Search API Route
 *
 * Phase 2: Parallel search with passage pre-embedding.
 * The key optimization: embed passages here to avoid the 45s bottleneck in verification.
 *
 * ARCHITECTURE:
 * - Pre-embeds ALL passages (no truncation for quality)
 * - Stores embeddings in Vercel Blob Storage (avoids 4.5MB payload limit)
 * - Returns blob URL for /verify to fetch
 *
 * POST /api/maxwell/search
 */

import { NextRequest } from 'next/server';
import { parallelSearch } from '../../../lib/maxwell/searcher';
import { prepareEvidence } from '../../../lib/maxwell/verifier';
import { storeEvidenceInBlob } from '../../../lib/maxwell/blob-storage';
import type { SearchRequest, SearchResponse } from '../../../lib/maxwell/api-types';

// Extended timeout for search + embedding (the heavy operation)
export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        // 1. Parse request body
        let body: SearchRequest;
        try {
            body = await request.json();
        } catch {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON body' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { subQueries, config } = body;

        // 2. Validation
        if (!subQueries || !Array.isArray(subQueries) || subQueries.length === 0) {
            return new Response(
                JSON.stringify({ error: 'subQueries required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!config) {
            return new Response(
                JSON.stringify({ error: 'config required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('[Maxwell Search] Starting search for', subQueries.length, 'sub-queries');

        const startTime = Date.now();

        // 3. Run parallel searches
        const searchOutput = await parallelSearch(
            subQueries,
            config.resultsPerQuery
        );

        console.log('[Maxwell Search] Found', searchOutput.sources.length, 'sources');

        // 4. PRE-EMBED ALL PASSAGES (THE KEY OPTIMIZATION)
        // This moves the expensive embedding operation from /verify to /search
        // We embed ALL passages - no truncation for maximum verification quality
        console.log('[Maxwell Search] Pre-embedding passages...');
        const evidence = await prepareEvidence(searchOutput.sources);

        console.log('[Maxwell Search] Embedded', evidence.passages.length, 'passages');

        // 5. STORE IN VERCEL BLOB (SOLVES 4.5MB PAYLOAD LIMIT)
        // Instead of sending embeddings in response body, store in Blob
        // This allows us to keep ALL passages without hitting payload limits
        console.log('[Maxwell Search] Storing evidence in Blob...');
        const blobResult = await storeEvidenceInBlob(
            evidence.passages,
            evidence.embeddings
        );

        // 6. Build response (small payload - just URL reference)
        const response: SearchResponse = {
            sources: searchOutput.sources,
            searchMetadata: searchOutput.searchMetadata,
            evidenceBlobUrl: blobResult.blobUrl,
            evidenceStats: {
                passageCount: blobResult.passageCount,
                embeddingCount: blobResult.embeddingCount,
            },
            durationMs: Date.now() - startTime,
        };

        console.log('[Maxwell Search] Complete:', {
            sources: searchOutput.sources.length,
            passages: evidence.passages.length,
            blobUrl: blobResult.blobUrl.startsWith('data:') ? '[data URL - local]' : blobResult.blobUrl,
            durationMs: response.durationMs,
        });

        return new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('[Maxwell Search] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
