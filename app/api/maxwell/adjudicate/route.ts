/**
 * Maxwell Adjudicate API Route
 *
 * Phase 5: Final verdict with SSE streaming.
 * Reconstructs the answer based on verified claims.
 *
 * IMPORTANT: Uses TransformStream pattern for reliable serverless termination.
 *
 * POST /api/maxwell/adjudicate
 */

import { NextRequest } from 'next/server';
import { adjudicateAnswer } from '../../../lib/maxwell/adjudicator';
import type { AdjudicateRequest } from '../../../lib/maxwell/api-types';

// Extended timeout for adjudication
export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    const startTime = Date.now();

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

        // 3. Create response stream using TransformStream
        // This pattern ensures clean termination on Vercel
        const encoder = new TextEncoder();
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        // Process stream in background
        (async () => {
            try {
                let adjudicationText = '';

                // Get adjudication stream
                const adjudicationResult = await adjudicateAnswer(query, answer, verification);

                if (adjudicationResult) {
                    // Stream each chunk
                    for await (const chunk of adjudicationResult.textStream) {
                        adjudicationText += chunk;
                        const event = { type: 'adjudication-chunk', content: chunk };
                        await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
                    }
                }

                // Send complete event
                const durationMs = Date.now() - startTime;
                const completeEvent = {
                    type: 'adjudication-complete',
                    text: adjudicationText,
                    durationMs,
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`));
                await writer.write(encoder.encode('data: [DONE]\n\n'));

                console.log('[Maxwell Adjudicate] Complete:', {
                    textLength: adjudicationText.length,
                    durationMs,
                });
            } catch (error) {
                console.error('[Maxwell Adjudicate] Stream error:', error);
                const errorEvent = { type: 'error', message: 'Adjudication failed' };
                await writer.write(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
            } finally {
                // Ensure clean termination
                try {
                    await writer.close();
                } catch {
                    // Already closed
                }
            }
        })();

        // 4. Return stream response immediately
        return new Response(readable, {
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
