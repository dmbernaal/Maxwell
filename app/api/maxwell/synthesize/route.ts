/**
 * Maxwell Synthesize API Route
 *
 * Phase 3: Answer synthesis with SSE streaming.
 * Generates a comprehensive answer with inline citations.
 *
 * POST /api/maxwell/synthesize
 */

import { NextRequest } from 'next/server';
import { synthesize } from '../../../lib/maxwell/synthesizer';
import type { SynthesizeRequest } from '../../../lib/maxwell/api-types';

// Timeout for synthesis
export const maxDuration = 30;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        // 1. Parse request body
        let body: SynthesizeRequest;
        try {
            body = await request.json();
        } catch {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON body' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { query, sources, synthesisModel } = body;

        // 2. Validation
        if (!query || typeof query !== 'string') {
            return new Response(
                JSON.stringify({ error: 'query required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!sources || !Array.isArray(sources)) {
            return new Response(
                JSON.stringify({ error: 'sources required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!synthesisModel) {
            return new Response(
                JSON.stringify({ error: 'synthesisModel required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('[Maxwell Synthesize] Starting synthesis with', sources.length, 'sources');

        // 3. Setup SSE stream
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
                    let answer = '';
                    let sourcesUsed: string[] = [];
                    let durationMs = 0;

                    // Stream synthesis events
                    for await (const event of synthesize(query, sources, synthesisModel)) {
                        if (isClosed) break;

                        if (event.type === 'chunk') {
                            // Stream each chunk to client
                            const sseEvent = { type: 'synthesis-chunk', content: event.content };
                            safeEnqueue(`data: ${JSON.stringify(sseEvent)}\n\n`);
                        } else if (event.type === 'complete') {
                            answer = event.answer;
                            sourcesUsed = event.sourcesUsed;
                            durationMs = event.durationMs;
                        }
                    }

                    // Send complete event with final data
                    const completeEvent = {
                        type: 'synthesis-complete',
                        answer,
                        sourcesUsed,
                        durationMs,
                    };
                    safeEnqueue(`data: ${JSON.stringify(completeEvent)}\n\n`);
                    safeEnqueue('data: [DONE]\n\n');
                    safeClose();

                    console.log('[Maxwell Synthesize] Complete:', {
                        answerLength: answer.length,
                        sourcesUsed: sourcesUsed.length,
                        durationMs,
                    });
                } catch (error) {
                    console.error('[Maxwell Synthesize] Stream error:', error);
                    const errorEvent = { type: 'error', message: 'Synthesis failed' };
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
        console.error('[Maxwell Synthesize] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

