/**
 * Chat API Route
 * 
 * Handles POST requests from the chat interface
 * Streams responses back to the client
 * Appends sources as JSON at the end for extraction
 */

import { streamAgentWithSources } from '../../lib/agent';

// Vercel serverless function timeout
export const maxDuration = 60;

// Delimiter for sources section (must be unique and unlikely in normal text)
export const SOURCES_DELIMITER = '\n\n---SOURCES_JSON---\n';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log('[API] Request received');

        // Validate request structure
        if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Invalid request: non-empty messages array required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Convert to CoreMessage format
        const messages = body.messages.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
        }));

        // Get model from request (optional)
        const modelId = body.model;
        console.log('[API] Using model:', modelId || 'default');

        // Create streaming response
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Stream from the agent generator
                    for await (const event of streamAgentWithSources(messages, modelId)) {
                        if (event.type === 'text') {
                            controller.enqueue(encoder.encode(event.content));
                        } else if (event.type === 'sources') {
                            // Append sources at the end
                            console.log('[API] Appending sources:', event.sources.length);
                            const sourcesJson = JSON.stringify(event.sources);
                            controller.enqueue(encoder.encode(SOURCES_DELIMITER + sourcesJson));
                        }
                    }

                    controller.close();
                } catch (error) {
                    console.error('[API] Stream error:', error);
                    controller.error(error);
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });

    } catch (error) {
        console.error('[Chat API Error]', error);

        let errorMessage = 'An unexpected error occurred';
        if (error instanceof Error) {
            errorMessage = error.message;
        }

        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
