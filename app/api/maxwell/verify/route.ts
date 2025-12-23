/**
 * Maxwell Verify API Route
 *
 * Phase 4: Claim verification with SSE streaming.
 * 
 * ARCHITECTURE:
 * - Fetches pre-computed embeddings from Vercel Blob (stored by /search)
 * - No 4.5MB payload limit issue - data is fetched server-side
 * - Full verification with ALL passages for maximum quality
 *
 * POST /api/maxwell/verify
 */

import { NextRequest } from 'next/server';
import { verifyClaimsWithPrecomputedEvidence } from '../../../lib/maxwell/verifier';
import { fetchEvidenceFromBlob, deleteEvidenceFromBlob } from '../../../lib/maxwell/blob-storage';
import type { VerifyRequest } from '../../../lib/maxwell/api-types';
import type { PreparedEvidence } from '../../../lib/maxwell/verifier';
import { MAX_CLAIMS_TO_VERIFY, DEFAULT_VERIFICATION_CONCURRENCY } from '../../../lib/maxwell/constants';

// Extended timeout for verification
export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    let blobUrl: string | null = null;

    try {
        // 1. Parse request body
        let body: VerifyRequest;
        try {
            body = await request.json();
        } catch {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON body' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const {
            answer,
            sources,
            evidenceBlobUrl,
            maxClaimsToVerify = MAX_CLAIMS_TO_VERIFY,
            verificationConcurrency = DEFAULT_VERIFICATION_CONCURRENCY,
        } = body;

        blobUrl = evidenceBlobUrl;

        // 2. Validation
        if (!answer || typeof answer !== 'string') {
            return new Response(
                JSON.stringify({ error: 'answer required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!sources || !Array.isArray(sources)) {
            return new Response(
                JSON.stringify({ error: 'sources required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!evidenceBlobUrl) {
            return new Response(
                JSON.stringify({ error: 'evidenceBlobUrl required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('[Maxwell Verify] Starting verification');
        console.log('[Maxwell Verify] Fetching evidence from Blob:', evidenceBlobUrl);

        // 3. Fetch pre-computed evidence from Vercel Blob
        const { passages, embeddings } = await fetchEvidenceFromBlob(evidenceBlobUrl);

        const decodedEvidence: PreparedEvidence = {
            passages,
            embeddings,
        };

        console.log('[Maxwell Verify] Using pre-computed embeddings:', {
            passages: decodedEvidence.passages.length,
            embeddings: embeddings.length,
        });

        // 4. Setup SSE stream
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                let isClosed = false;

                const safeEnqueue = (data: string) => {
                    if (!isClosed) {
                        try {
                            controller.enqueue(encoder.encode(data));
                        } catch {
                            isClosed = true;
                        }
                    }
                };

                const safeClose = () => {
                    if (!isClosed) {
                        isClosed = true;
                        controller.close();
                    }
                };

                try {
                    // Stream verification with progress updates
                    for await (const event of verifyClaimsWithPrecomputedEvidence(
                        answer,
                        sources,
                        decodedEvidence,
                        maxClaimsToVerify,
                        verificationConcurrency
                    )) {
                        if (isClosed) break;

                        if (event.type === 'progress') {
                            const sseEvent = { type: 'verification-progress', data: event.data };
                            safeEnqueue(`data: ${JSON.stringify(sseEvent)}\n\n`);
                        } else if (event.type === 'result') {
                            const sseEvent = { type: 'verification-complete', data: event.data };
                            safeEnqueue(`data: ${JSON.stringify(sseEvent)}\n\n`);

                            console.log('[Maxwell Verify] Complete:', {
                                claims: event.data.claims.length,
                                overallConfidence: event.data.overallConfidence,
                                durationMs: event.data.durationMs,
                            });
                        }
                    }

                    safeEnqueue('data: [DONE]\n\n');
                    safeClose();

                    // 5. Clean up blob after successful verification
                    // Do this after stream closes to not block the response
                    if (blobUrl) {
                        deleteEvidenceFromBlob(blobUrl).catch(() => {
                            // Ignore cleanup errors
                        });
                    }
                } catch (error) {
                    console.error('[Maxwell Verify] Stream error:', error);
                    const errorEvent = { type: 'error', message: 'Verification failed' };
                    safeEnqueue(`data: ${JSON.stringify(errorEvent)}\n\n`);
                    safeClose();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            },
        });
    } catch (error) {
        console.error('[Maxwell Verify] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
