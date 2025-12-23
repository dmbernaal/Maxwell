/**
 * Maxwell Adjudicate API Route
 *
 * Phase 5: Final verdict with SSE streaming.
 * Reconstructs the answer based on verified claims.
 *
 * POST /api/maxwell/adjudicate
 */

import { NextRequest } from 'next/server';
import { adjudicateAnswer } from '../../../lib/maxwell/adjudicator';
import type { AdjudicateRequest } from '../../../lib/maxwell/api-types';

// Timeout for adjudication
export const maxDuration = 30;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        // 1. Parse request body
        let body: AdjudicateRequest;
        try {
            body = await request.json();
        } catch {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON body' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { query, answer, verification } = body;

        // 2. Validation
        if (!query || typeof query !== 'string') {
            return new Response(
                JSON.stringify({ error: 'query required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!answer || typeof answer !== 'string') {
            return new Response(
                JSON.stringify({ error: 'answer required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!verification) {
            return new Response(
                JSON.stringify({ error: 'verification required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('[Maxwell Adjudicate] Starting adjudication');

        // 3. Setup SSE stream
        const encoder = new TextEncoder();
        const startTime = Date.now();

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
                    let adjudicationText = '';

                    // Get adjudication stream
                    const adjudicationResult = await adjudicateAnswer(query, answer, verification);

                    if (adjudicationResult) {
                        // Stream each chunk
                        for await (const chunk of adjudicationResult.textStream) {
                            if (isClosed) break;

                            adjudicationText += chunk;
                            const sseEvent = { type: 'adjudication-chunk', content: chunk };
                            safeEnqueue(`data: ${JSON.stringify(sseEvent)}\n\n`);
                        }
                    }

                    // Send complete event
                    const completeEvent = {
                        type: 'adjudication-complete',
                        text: adjudicationText,
                        durationMs: Date.now() - startTime,
                    };
                    safeEnqueue(`data: ${JSON.stringify(completeEvent)}\n\n`);
                    safeEnqueue('data: [DONE]\n\n');
                    safeClose();

                    console.log('[Maxwell Adjudicate] Complete:', {
                        textLength: adjudicationText.length,
                        durationMs: Date.now() - startTime,
                    });
                } catch (error) {
                    console.error('[Maxwell Adjudicate] Stream error:', error);
                    const errorEvent = { type: 'error', message: 'Adjudication failed' };
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
        console.error('[Maxwell Adjudicate] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

