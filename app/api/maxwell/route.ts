/**
 * Maxwell API Route (LEGACY - Single Endpoint)
 *
 * ⚠️ DEPRECATED: This monolithic endpoint is kept for backwards compatibility
 * and local development where Vercel's 60s timeout doesn't apply.
 *
 * For production on Vercel, use the multi-endpoint architecture:
 * - POST /api/maxwell/decompose
 * - POST /api/maxwell/search
 * - POST /api/maxwell/synthesize
 * - POST /api/maxwell/verify
 * - POST /api/maxwell/adjudicate
 *
 * The multi-endpoint approach avoids the 60s serverless timeout by splitting
 * the pipeline into discrete phases, each with its own timeout budget.
 *
 * Streaming endpoint using Server-Sent Events (SSE).
 * POST /api/maxwell - Run Maxwell pipeline (legacy)
 * GET /api/maxwell - Health check
 */

import { NextRequest } from 'next/server';
import { runMaxwell } from '../../lib/maxwell';
import { MAX_QUERY_LENGTH } from '../../lib/maxwell/constants';

// Vercel serverless function timeout (matching /api/chat)
export const maxDuration = 60;

// Force Node.js runtime for Intl.Segmenter and other Node APIs
export const runtime = 'nodejs';

/**
 * POST /api/maxwell
 * Runs the Maxwell verified search pipeline and streams events via SSE.
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Safe Body Parsing
        let body;
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

        console.log('[Maxwell API] Query received:', trimmedQuery.slice(0, 50) + '...');

        // 3. SSE Stream Setup (same pattern as /api/chat)
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                let isClosed = false;

                const safeEnqueue = (data: string) => {
                    if (!isClosed) {
                        try {
                            controller.enqueue(encoder.encode(data));
                        } catch {
                            // Controller was closed externally (client disconnect, etc.)
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
                    for await (const event of runMaxwell(trimmedQuery)) {
                        // SSE Format: "data: <json>\n\n"
                        const data = `data: ${JSON.stringify(event)}\n\n`;
                        safeEnqueue(data);

                        // Stop if stream was closed
                        if (isClosed) break;
                    }

                    // Close stream with sentinel
                    safeEnqueue('data: [DONE]\n\n');
                    safeClose();
                } catch (error) {
                    console.error('[Maxwell API] Stream error:', error);
                    const errorEvent = { type: 'error', message: 'Stream interrupted' };
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
                'X-Accel-Buffering': 'no', // Critical for Nginx/Vercel buffering
            },
        });
    } catch (error) {
        console.error('[Maxwell API] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

/**
 * GET /api/maxwell
 * Health check endpoint.
 */
export async function GET() {
    return new Response(
        JSON.stringify({ status: 'maxwell-online', timestamp: new Date().toISOString() }),
        { headers: { 'Content-Type': 'application/json' } }
    );
}
