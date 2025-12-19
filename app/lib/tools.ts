import { tool } from 'ai';
import { z } from 'zod';
import { env } from './env';

// Type definitions
interface TavilyResult {
    title: string;
    url: string;
    content: string;
    score?: number;
}

interface SearchResult {
    title: string;
    url: string;
    content: string;
    score?: number;
}

interface SearchResponse {
    answer?: string;
    results: SearchResult[];
    error?: string;
}

/**
 * Execute a search using Tavily API
 * Shared implementation used by all tool variants
 */
async function executeSearch(searchQuery: string): Promise<SearchResponse> {
    console.log('[Search] Executing search for:', searchQuery);

    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: env.tavilyApiKey(),
                query: searchQuery,
                max_results: 5,
                search_depth: 'basic',
                include_answer: true,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Search] API error:', response.status, errorText);
            return { error: `Search API error: ${response.status}`, results: [] };
        }

        const data = await response.json();
        console.log('[Search] Got results:', data.results?.length ?? 0);

        return {
            answer: data.answer,
            results: (data.results ?? []).map((r: TavilyResult) => ({
                title: r.title,
                url: r.url,
                content: r.content,
                score: r.score,
            })),
        };
    } catch (error) {
        console.error('[Search] Error:', error);
        return { error: String(error), results: [] };
    }
}

/**
 * Search tool for OpenAI and Anthropic models
 * Uses 'query' parameter (required string)
 */
export const searchTool = tool({
    description: 'Search the web for current information, news, prices, weather, and facts that require real-time data',
    // AI SDK v5 uses 'inputSchema' for tool parameters
    inputSchema: z.object({
        query: z.string().describe('The search query to execute'),
    }),
    execute: async ({ query }): Promise<SearchResponse> => {
        console.log('[Search] Raw query:', query, typeof query);

        if (!query || typeof query !== 'string') {
            console.error('[Search] Invalid query:', query);
            return { error: 'Invalid search query', results: [] };
        }

        return executeSearch(query);
    },
});

/**
 * Search tool for Gemini models
 * Uses 'queries' parameter (array of strings)
 */
export const searchToolGemini = tool({
    description: 'Search the web for current information, news, prices, weather, and facts that require real-time data',
    inputSchema: z.object({
        queries: z.array(z.string()).describe('Search queries to execute'),
    }),
    execute: async ({ queries }): Promise<SearchResponse> => {
        console.log('[Search Gemini] Raw queries:', queries);

        const query = queries?.[0];
        if (!query || typeof query !== 'string') {
            console.error('[Search Gemini] Invalid queries:', queries);
            return { error: 'Invalid search query', results: [] };
        }

        return executeSearch(query);
    },
});

/**
 * Get appropriate tools based on model provider
 */
export function getToolsForModel(modelId: string) {
    if (modelId.startsWith('google/')) {
        return { search: searchToolGemini };
    }
    return { search: searchTool };
}

/**
 * Default tools registry
 */
export const tools = {
    search: searchTool,
} as const;
