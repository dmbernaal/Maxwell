/**
 * Maxwell Synthesize API Route
 *
 * Phase 3: Answer synthesis with SSE streaming.
 * Generates a comprehensive answer with inline citations.
 *
 * IMPORTANT: Uses TransformStream pattern for reliable serverless termination.
 *
 * POST /api/maxwell/synthesize
 */

import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createSynthesisPrompt } from '../../../lib/maxwell/prompts';
import { SYNTHESIS_MAX_TOKENS } from '../../../lib/maxwell/constants';
import type { SynthesizeRequest } from '../../../lib/maxwell/api-types';
import type { MaxwellSource } from '../../../lib/maxwell/types';

// Extended timeout for synthesis
export const maxDuration = 60;
export const runtime = 'nodejs';

/**
 * Creates OpenRouter client instance.
 */
function getOpenRouterClient() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }
    return createOpenRouter({ apiKey });
}

/**
 * Extracts citation IDs from synthesized text.
 */
function extractCitations(text: string, maxSourceIndex: number): string[] {
    const citationPattern = /\[(\d+)\]/g;
    const citations = new Set<string>();

    let match;
    while ((match = citationPattern.exec(text)) !== null) {
        const num = parseInt(match[1], 10);
        if (num >= 1 && num <= maxSourceIndex) {
            citations.add(`s${num}`);
        }
    }

    return Array.from(citations).sort((a, b) => {
        const numA = parseInt(a.slice(1), 10);
        const numB = parseInt(b.slice(1), 10);
        return numA - numB;
    });
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

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

        const openrouter = getOpenRouterClient();
        const prompt = createSynthesisPrompt(sources as MaxwellSource[], query);

        // 3. Create AI stream with explicit abort controller
        const abortController = new AbortController();

        const result = streamText({
            model: openrouter(synthesisModel),
            prompt,
            maxOutputTokens: SYNTHESIS_MAX_TOKENS,
            abortSignal: abortController.signal,
        });

        // 4. Create response stream using TransformStream
        // This pattern ensures clean termination on Vercel
        const encoder = new TextEncoder();
        let fullAnswer = '';

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        // Process stream in background
        (async () => {
            try {
                // Stream text chunks
                for await (const chunk of result.textStream) {
                    fullAnswer += chunk;
                    const event = { type: 'synthesis-chunk', content: chunk };
                    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
                }

                // Extract citations and send complete event
                const sourcesUsed = extractCitations(fullAnswer, sources.length);
                const durationMs = Date.now() - startTime;

                const completeEvent = {
                    type: 'synthesis-complete',
                    answer: fullAnswer,
                    sourcesUsed,
                    durationMs,
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`));
                await writer.write(encoder.encode('data: [DONE]\n\n'));

                console.log('[Maxwell Synthesize] Complete:', {
                    answerLength: fullAnswer.length,
                    sourcesUsed: sourcesUsed.length,
                    durationMs,
                });
            } catch (error) {
                console.error('[Maxwell Synthesize] Stream error:', error);
                const errorEvent = { type: 'error', message: 'Synthesis failed' };
                await writer.write(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
            } finally {
                // Ensure clean termination
                try {
                    await writer.close();
                } catch {
                    // Already closed
                }
                // Abort any pending AI operations
                abortController.abort();
            }
        })();

        // 5. Return stream response immediately
        return new Response(readable, {
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
