/**
 * Parallel Search Module
 *
 * Executes multiple search queries in parallel using Tavily.
 * Aggregates and deduplicates results by URL.
 *
 * @module maxwell/searcher
 */

import { RESULTS_PER_QUERY, SEARCH_DEPTH } from './constants';
import type { SubQuery, MaxwellSource, SearchMetadata, SearchOutput } from './types';

// ============================================
// TAVILY API
// ============================================

/**
 * Get Tavily API key from environment
 * @throws Error if TAVILY_API_KEY is not set
 */
function getTavilyApiKey(): string {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        throw new Error('TAVILY_API_KEY environment variable is not set');
    }
    return apiKey;
}

// ============================================
// TYPES
// ============================================

interface TavilyResult {
    url: string;
    title: string;
    content: string;
    score: number;
}

interface TavilyResponse {
    results: TavilyResult[];
    answer?: string;
}

interface SingleSearchResult {
    sources: MaxwellSource[];
    metadata: SearchMetadata;
}

// ============================================
// SINGLE QUERY SEARCH
// ============================================

/**
 * Execute a single search query against Tavily API
 * Uses direct fetch like existing tools.ts pattern
 */
async function searchSingleQuery(
    apiKey: string,
    subQuery: SubQuery
): Promise<SingleSearchResult> {
    try {
        // Map days to time_range
        let time_range: 'day' | 'week' | 'month' | 'year' | undefined;
        if (subQuery.days) {
            if (subQuery.days <= 1) time_range = 'day';
            else if (subQuery.days <= 7) time_range = 'week';
            else if (subQuery.days <= 30) time_range = 'month';
            else time_range = 'year';
        }

        // Only request raw content if advanced depth
        const includeRaw = subQuery.depth === 'advanced';

        const executeTavilySearch = async (depth: 'basic' | 'advanced', raw: boolean) => {
            return fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: subQuery.query,
                    max_results: RESULTS_PER_QUERY,
                    search_depth: depth,
                    topic: subQuery.topic,
                    time_range: time_range,
                    include_domains: subQuery.domains,
                    include_answer: false,
                    include_raw_content: raw,
                }),
            });
        };

        let response = await executeTavilySearch(subQuery.depth, includeRaw);

        // FAIL-SAFE: If Basic search returned 0 results, retry with Advanced
        if (response.ok) {
            const data = await response.json();
            if ((!data.results || data.results.length === 0) && subQuery.depth === 'basic') {
                console.log(`[Maxwell Search] Basic search failed for "${subQuery.query}". Retrying with Advanced...`);
                response = await executeTavilySearch('advanced', true);
            } else {
                // Return original data if successful
                return processTavilyResponse(data, subQuery);
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Maxwell Search] API error for ${subQuery.id}:`, response.status, errorText);
            return {
                sources: [],
                metadata: {
                    queryId: subQuery.id,
                    query: subQuery.query,
                    sourcesFound: 0,
                    status: 'failed',
                },
            };
        }

        const data = await response.json();
        return processTavilyResponse(data, subQuery);

    } catch (error) {
        console.error(`[Maxwell Search] Failed for ${subQuery.id} ("${subQuery.query}"):`, error);

        return {
            sources: [],
            metadata: {
                queryId: subQuery.id,
                query: subQuery.query,
                sourcesFound: 0,
                status: 'failed',
            },
        };
    }
}

function processTavilyResponse(data: TavilyResponse, subQuery: SubQuery): SingleSearchResult {
    // Map Tavily results to our MaxwellSource type
    const sources: MaxwellSource[] = (data.results || []).map(
        (result: TavilyResult, index: number) => ({
            // Temporary ID - will be reassigned after deduplication
            id: `${subQuery.id}_s${index}`,
            url: result.url,
            title: result.title || 'Untitled',
            snippet: result.content || '',
            fromQuery: subQuery.id,
        })
    );

    return {
        sources,
        metadata: {
            queryId: subQuery.id,
            query: subQuery.query,
            sourcesFound: sources.length,
            status: sources.length > 0 ? 'complete' : 'no_results',
        },
    };
}

// ============================================
// DEDUPLICATION
// ============================================

/**
 * Deduplicate sources by URL and reassign sequential IDs
 */
function deduplicateSources(sources: MaxwellSource[]): MaxwellSource[] {
    const seenUrls = new Set<string>();
    const unique: MaxwellSource[] = [];

    for (const source of sources) {
        // Normalize URL: lowercase, strip trailing slash
        const normalizedUrl = source.url.toLowerCase().replace(/\/$/, '');

        if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            unique.push(source);
        }
    }

    // Reassign clean sequential IDs (s1, s2, s3...)
    return unique.map((source, index) => ({
        ...source,
        id: `s${index + 1}`,
    }));
}

// ============================================
// PARALLEL SEARCH
// ============================================

/**
 * Progress callback type for UI updates
 */
export type SearchProgressCallback = (metadata: SearchMetadata) => void;

/**
 * Executes all sub-queries in parallel.
 *
 * @param subQueries - Array of sub-queries from decomposition
 * @param onProgress - Optional callback fired after each query completes
 * @returns SearchOutput with deduplicated sources and metadata
 * @throws Error if no sub-queries provided or if ALL queries return zero results
 */
export async function parallelSearch(
    subQueries: SubQuery[],
    onProgress?: SearchProgressCallback
): Promise<SearchOutput> {
    const startTime = Date.now();

    if (!Array.isArray(subQueries) || subQueries.length === 0) {
        throw new Error('parallelSearch requires at least one sub-query');
    }

    const apiKey = getTavilyApiKey();

    // Execute in parallel
    const results = await Promise.all(
        subQueries.map(async (subQuery) => {
            const result = await searchSingleQuery(apiKey, subQuery);
            if (onProgress) onProgress(result.metadata);
            return result;
        })
    );

    // Aggregate
    const allSources = results.flatMap((r) => r.sources);
    const allMetadata = results.map((r) => r.metadata);

    // Deduplicate
    const uniqueSources = deduplicateSources(allSources);

    // FAIL-SAFE: If we found nothing, stop here.
    // Continuing to Synthesis with 0 sources guarantees hallucinations.
    if (uniqueSources.length === 0) {
        throw new Error('Search failed: No sources found for any sub-query.');
    }

    return {
        sources: uniqueSources,
        searchMetadata: allMetadata,
        durationMs: Date.now() - startTime,
    };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate statistics from search metadata
 */
export function getSearchStats(metadata: SearchMetadata[]): {
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    noResultsQueries: number;
    totalSourcesFound: number;
} {
    return {
        totalQueries: metadata.length,
        successfulQueries: metadata.filter((m) => m.status === 'complete').length,
        failedQueries: metadata.filter((m) => m.status === 'failed').length,
        noResultsQueries: metadata.filter((m) => m.status === 'no_results').length,
        totalSourcesFound: metadata.reduce((sum, m) => sum + m.sourcesFound, 0),
    };
}

/**
 * Validate SearchOutput structure
 * @throws Error if validation fails
 */
export function validateSearchOutput(output: SearchOutput): boolean {
    if (!Array.isArray(output.sources)) {
        throw new Error('sources must be an array');
    }
    if (!Array.isArray(output.searchMetadata)) {
        throw new Error('searchMetadata must be an array');
    }

    // Validate ID sequencing
    const ids = output.sources.map((s) => s.id);
    const expectedIds = output.sources.map((_, i) => `s${i + 1}`);

    if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
        throw new Error('Source IDs must be sequential (s1, s2, s3...)');
    }

    return true;
}
