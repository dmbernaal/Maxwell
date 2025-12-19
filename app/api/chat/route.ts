/**
 * Chat API Route
 * 
 * Handles POST requests from the chat interface
 * Streams responses back to the client using AI SDK format
 */

import { runAgent } from '../../lib/agent';

// Vercel serverless function timeout
export const maxDuration = 60;

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

        // Run the agent and get streaming result
        const result = await runAgent(messages, modelId);

        // Return streaming response
        return result.toTextStreamResponse();

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
