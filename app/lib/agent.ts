/**
 * Search Agent
 * 
 * Orchestrates the LLM with search tools using Vercel AI SDK v5
 * Uses the official @openrouter/ai-sdk-provider for proper tool execution
 */

import { streamText, type CoreMessage, stepCountIs } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from './env';
import { getToolsForModel } from './tools';
import { SYSTEM_PROMPT } from './prompts';
import { DEFAULT_MODEL } from './models';

// Source type for collected search results
export interface Source {
    title: string;
    url: string;
    content: string;
    score?: number;
}

// Create OpenRouter provider instance (official package)
const openrouter = createOpenRouter({
    apiKey: env.openRouterApiKey(),
});

/**
 * Runs the search agent with streaming response
 * 
 * @param messages - Chat messages from the client
 * @param modelId - Optional model ID to use (defaults to configured default)
 * @returns StreamTextResult for streaming to client
 */
export async function runAgent(messages: CoreMessage[], modelId: string = DEFAULT_MODEL) {
    console.log('[Agent] Starting with model:', modelId);

    // Get model-specific tools
    const tools = getToolsForModel(modelId);
    console.log('[Agent] Tools registered:', Object.keys(tools));

    const result = streamText({
        model: openrouter(modelId),
        system: SYSTEM_PROMPT,
        messages,
        tools,
        stopWhen: stepCountIs(5),

        onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
            console.log('[Agent Step]', {
                hasText: Boolean(text?.length),
                textLength: text?.length ?? 0,
                toolCallCount: toolCalls?.length ?? 0,
                toolResultCount: toolResults?.length ?? 0,
                finishReason,
            });
            if (toolCalls && toolCalls.length > 0) {
                console.log('[Agent] Tool calls:', toolCalls.map(tc => tc.toolName));
            }
        },

        onError: (error) => {
            console.error('[Agent Error]', error);
        },
    });

    return result;
}

/**
 * Runs the search agent and returns a generator that yields text + collected sources
 * 
 * Uses fullStream to get both text-delta and tool-result events in order
 * 
 * @param messages - Chat messages from the client
 * @param modelId - Optional model ID to use (defaults to configured default)
 */
export async function* streamAgentWithSources(messages: CoreMessage[], modelId: string = DEFAULT_MODEL): AsyncGenerator<{ type: 'text'; content: string } | { type: 'sources'; sources: Source[] }> {
    console.log('[Agent] Starting with sources streaming, model:', modelId);

    const tools = getToolsForModel(modelId);
    console.log('[Agent] Tools registered:', Object.keys(tools));

    const result = streamText({
        model: openrouter(modelId),
        system: SYSTEM_PROMPT,
        messages,
        tools,
        stopWhen: stepCountIs(5),
    });

    const collectedSources: Source[] = [];

    // Consume fullStream to get all events
    for await (const event of result.fullStream) {
        if (event.type === 'text-delta') {
            yield { type: 'text', content: event.text };
        } else if (event.type === 'tool-result') {
            // Extract sources from tool result (AI SDK v5 uses 'output' property)
            const toolResult = event as unknown as { output: { results?: Source[]; error?: string } };
            const searchResults = toolResult?.output?.results;
            if (searchResults && Array.isArray(searchResults)) {
                console.log('[Agent] Collected sources:', searchResults.length);
                collectedSources.push(...searchResults);
            }
        }
    }

    // Yield sources at the end
    if (collectedSources.length > 0) {
        console.log('[Agent] Yielding collected sources:', collectedSources.length);
        yield { type: 'sources', sources: collectedSources };
    }
}
