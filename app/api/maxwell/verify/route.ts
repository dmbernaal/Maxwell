/**
 * Maxwell Verify API Route
 *
 * Phase 4: Claim verification with SSE streaming.
 * Receives pre-computed passage embeddings from /search to avoid the 45s bottleneck.
 *
 * POST /api/maxwell/verify
 */

import { NextRequest } from 'next/server';
import { verifyClaimsWithPrecomputedEvidence } from '../../../lib/maxwell/verifier';
import { decodeEmbeddings } from '../../../lib/maxwell/api-types';
import type { VerifyRequest } from '../../../lib/maxwell/api-types';
import type { PreparedEvidence } from '../../../lib/maxwell/verifier';
import { MAX_CLAIMS_TO_VERIFY, DEFAULT_VERIFICATION_CONCURRENCY } from '../../../lib/maxwell/constants';

// Extended timeout for verification
export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
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
            preparedEvidence,
            maxClaimsToVerify = MAX_CLAIMS_TO_VERIFY,
            verificationConcurrency = DEFAULT_VERIFICATION_CONCURRENCY,
        } = body;

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

        if (!preparedEvidence) {
            return new Response(
                JSON.stringify({ error: 'preparedEvidence required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('[Maxwell Verify] Starting verification');

        // 3. Decode pre-computed embeddings
        const embeddings = decodeEmbeddings(
            preparedEvidence.embeddingsBase64,
            preparedEvidence.embeddingsDimensions.rows,
            preparedEvidence.embeddingsDimensions.cols
        );

        const decodedEvidence: PreparedEvidence = {
            passages: preparedEvidence.passages,
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

