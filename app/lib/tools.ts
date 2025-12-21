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

interface SearchOptions {
    topic?: 'general' | 'news';
    search_depth?: 'basic' | 'advanced';
    max_results?: number;
    time_range?: 'day' | 'week' | 'month' | 'year';
}

/**
 * Execute a search using Tavily API
 * Shared implementation used by all tool variants
 */
async function executeSearch(searchQuery: string, options: SearchOptions = {}): Promise<SearchResponse> {
    console.log('[Search] Executing search for:', searchQuery, options);

    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: env.tavilyApiKey(),
                query: searchQuery,
                max_results: options.max_results || 5,
                search_depth: options.search_depth || 'basic',
                topic: options.topic || 'general',
                time_range: options.time_range,
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
    description: 'Search the web for information. Use this for current events, facts, or data.',
    // AI SDK v5 uses 'inputSchema' for tool parameters
    inputSchema: z.object({
        query: z.string().describe('The search query. MUST be concise (under 400 chars). Keywords are better than sentences.'),
        topic: z.enum(['general', 'news']).optional().describe('Set to "news" for recent events, politics, or sports. Set to "general" for evergreen info.'),
        search_depth: z.enum(['basic', 'advanced']).optional().describe('Set to "advanced" for deep research, analysis, or broad topics. Set to "basic" for simple fact lookups.'),
        max_results: z.number().optional().default(5),
        days: z.number().optional().describe('Number of days back to search. Use 1 for "today", 3 for "recent", 7 for "this week".'),
    }),
    execute: async ({ query, topic, search_depth, max_results, days }): Promise<SearchResponse> => {
        console.log('[Search] Raw query:', query, typeof query);

        if (!query || typeof query !== 'string') {
            console.error('[Search] Invalid query:', query);
            return { error: 'Invalid search query', results: [] };
        }

        // Map days to time_range
        let time_range: 'day' | 'week' | 'month' | 'year' | undefined;
        if (days) {
            if (days <= 1) time_range = 'day';
            else if (days <= 7) time_range = 'week';
            else if (days <= 30) time_range = 'month';
            else time_range = 'year';
        }

        return executeSearch(query, { topic, search_depth, max_results, time_range });
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
