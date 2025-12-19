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
    // Gemini needs 'queries' array, OpenAI/Claude need 'query' string
    const tools = getToolsForModel(modelId);
    console.log('[Agent] Tools registered:', Object.keys(tools));

    const result = streamText({
        // Use the official OpenRouter provider
        model: openrouter(modelId),

        system: SYSTEM_PROMPT,
        messages,
        tools,

        // AI SDK v5: Use stopWhen instead of maxSteps for multi-step loops
        stopWhen: stepCountIs(5),

        // Development logging
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

        // Error logging
        onError: (error) => {
            console.error('[Agent Error]', error);
        },
    });

    return result;
}
