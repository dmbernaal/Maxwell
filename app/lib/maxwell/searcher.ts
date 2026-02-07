/**
 * Parallel Search Module
 *
 * Executes multiple search queries in parallel using Tavily.
 * Aggregates and deduplicates results by URL.
 *
 * @module maxwell/searcher
 */

import {
    RESULTS_PER_QUERY,
    SEARCH_DEPTH,
    MIN_SEARCH_RELEVANCE_SCORE,
    MAX_SEARCH_RETRIES,
    SEARCH_RETRY_BASE_DELAY_MS,
    DEFAULT_CHUNKS_PER_SOURCE,
    EXCLUDED_DOMAINS,
} from './constants';
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
    published_date?: string;
    raw_content?: string;
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

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
    return status === 429 || status === 500 || status === 502 || status === 503;
}

async function searchSingleQuery(
    apiKey: string,
    subQuery: SubQuery,
    resultsPerQuery: number
): Promise<SingleSearchResult> {
    try {
        let time_range: 'day' | 'week' | 'month' | 'year' | undefined;
        if (subQuery.days) {
            if (subQuery.days <= 1) time_range = 'day';
            else if (subQuery.days <= 7) time_range = 'week';
            else if (subQuery.days <= 30) time_range = 'month';
            else time_range = 'year';
        }

        const isFactLookup =
            subQuery.depth === 'advanced' ||
            /^(who|what|when|where|which|version|release|date|price|cost)/i.test(subQuery.query) ||
            subQuery.purpose.toLowerCase().includes('specific');

        const includeRaw = isFactLookup;

        // Merge global blocklist with per-query excludes
        const mergedExcludeDomains = [
            ...EXCLUDED_DOMAINS,
            ...(subQuery.excludeDomains || []),
        ];

        const executeTavilySearch = async (depth: 'basic' | 'advanced', raw: boolean) => {
            const body: Record<string, unknown> = {
                api_key: apiKey,
                query: subQuery.query,
                max_results: resultsPerQuery,
                search_depth: depth,
                topic: subQuery.topic,
                time_range: time_range,
                include_domains: subQuery.domains,
                exclude_domains: mergedExcludeDomains.length > 0 ? mergedExcludeDomains : undefined,
                include_answer: false,
                include_raw_content: raw,
            };

            // Add chunks_per_source for advanced searches
            if (depth === 'advanced') {
                body.chunks_per_source = DEFAULT_CHUNKS_PER_SOURCE;
            }

            return fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        };

        // Exponential backoff retry loop
        let lastError: string | undefined;
        for (let attempt = 0; attempt <= MAX_SEARCH_RETRIES; attempt++) {
            if (attempt > 0) {
                const delay = SEARCH_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.log(`[Maxwell Search] Retry ${attempt}/${MAX_SEARCH_RETRIES} for "${subQuery.query}" after ${delay}ms`);
                await sleep(delay);
            }

            let response = await executeTavilySearch(subQuery.depth, includeRaw);

            // FAIL-SAFE: If Basic search returned 0 results, retry with Advanced
            if (response.ok) {
                const data = await response.json();
                if ((!data.results || data.results.length === 0) && subQuery.depth === 'basic') {
                    console.log(`[Maxwell Search] Basic search returned 0 results for "${subQuery.query}". Retrying with Advanced...`);
                    response = await executeTavilySearch('advanced', true);
                    if (response.ok) {
                        const advancedData = await response.json();
                        return processTavilyResponse(advancedData, subQuery);
                    }
                } else {
                    return processTavilyResponse(data, subQuery);
                }
            }

            if (!response.ok) {
                lastError = `HTTP ${response.status}`;
                if (isRetryableStatus(response.status) && attempt < MAX_SEARCH_RETRIES) {
                    console.warn(`[Maxwell Search] Retryable error ${response.status} for ${subQuery.id}`);
                    continue;
                }
                const errorText = await response.text();
                console.error(`[Maxwell Search] API error for ${subQuery.id}:`, response.status, errorText);
                break;
            }
        }

        return {
            sources: [],
            metadata: {
                queryId: subQuery.id,
                query: subQuery.query,
                sourcesFound: 0,
                status: 'failed',
            },
        };

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
    const sources: MaxwellSource[] = (data.results || [])
        .filter((result: TavilyResult) => result.score >= MIN_SEARCH_RELEVANCE_SCORE)
        .map((result: TavilyResult, index: number) => ({
            id: `${subQuery.id}_s${index}`,
            url: result.url,
            title: result.title || 'Untitled',
            snippet: result.raw_content || result.content || '',
            fromQuery: subQuery.id,
            date: result.published_date,
            score: result.score,
        }));

    const filtered = (data.results || []).length - sources.length;
    if (filtered > 0) {
        console.log(`[Maxwell Search] Filtered ${filtered} low-relevance results (< ${MIN_SEARCH_RELEVANCE_SCORE}) for ${subQuery.id}`);
    }

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
    resultsPerQuery: number = RESULTS_PER_QUERY, // Added parameter with default
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
            const result = await searchSingleQuery(apiKey, subQuery, resultsPerQuery);
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
