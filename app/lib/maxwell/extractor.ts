/**
 * Tavily Extract Module
 *
 * Phase 2.5: Extracts full content from top search result URLs.
 * Enriches search snippets with deeper page content before synthesis.
 *
 * Only runs for 'standard' and 'deep_research' complexity levels.
 *
 * @module maxwell/extractor
 */

import type { MaxwellSource } from './types';
import type { ComplexityLevel } from './configFactory';

const MAX_URLS_PER_EXTRACT = 5;
const EXTRACT_TIMEOUT_MS = 15000;

interface TavilyExtractResult {
    url: string;
    raw_content: string;
    failed_results?: Array<{ url: string; error: string }>;
}

interface TavilyExtractResponse {
    results: TavilyExtractResult[];
    failed_results?: Array<{ url: string; error: string }>;
}

function getTavilyApiKey(): string {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        throw new Error('TAVILY_API_KEY environment variable is not set');
    }
    return apiKey;
}

/**
 * Determines how many sources to extract based on complexity.
 */
function getExtractCount(complexity: ComplexityLevel): number {
    switch (complexity) {
        case 'simple': return 0;
        case 'standard': return 3;
        case 'deep_research': return MAX_URLS_PER_EXTRACT;
        default: return 3;
    }
}

/**
 * Extracts full content from top N source URLs using Tavily Extract API.
 * Merges extracted content back into sources, replacing snippets with richer content.
 *
 * @param sources - Sources from search phase, sorted by relevance
 * @param originalQuery - The original query (used for relevance-ranked chunks)
 * @param complexity - Pipeline complexity level
 * @returns Enhanced sources with extracted full content where available
 */
export async function extractSourceContent(
    sources: MaxwellSource[],
    originalQuery: string,
    complexity: ComplexityLevel
): Promise<{ sources: MaxwellSource[]; extractedCount: number; durationMs: number }> {
    const startTime = Date.now();
    const extractCount = getExtractCount(complexity);

    if (extractCount === 0 || sources.length === 0) {
        return { sources, extractedCount: 0, durationMs: 0 };
    }

    // Pick top N sources by score (or first N if no scores)
    const sortedSources = [...sources].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const urlsToExtract = sortedSources
        .slice(0, extractCount)
        .map(s => s.url);

    if (urlsToExtract.length === 0) {
        return { sources, extractedCount: 0, durationMs: 0 };
    }

    const apiKey = getTavilyApiKey();

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);

        const response = await fetch('https://api.tavily.com/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                urls: urlsToExtract,
                query: originalQuery,
                chunks_per_source: 3,
                extract_depth: 'basic',
                include_images: false,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            console.warn(`[Maxwell Extract] API error: HTTP ${response.status}`);
            return { sources, extractedCount: 0, durationMs: Date.now() - startTime };
        }

        const data: TavilyExtractResponse = await response.json();

        // Build URL→content map from extract results
        const extractedContent = new Map<string, string>();
        for (const result of (data.results || [])) {
            if (result.raw_content && result.raw_content.length > 0) {
                const normalizedUrl = result.url.toLowerCase().replace(/\/$/, '');
                extractedContent.set(normalizedUrl, result.raw_content);
            }
        }

        // Merge extracted content back into sources
        const enhancedSources = sources.map(source => {
            const normalizedUrl = source.url.toLowerCase().replace(/\/$/, '');
            const fullContent = extractedContent.get(normalizedUrl);
            if (fullContent && fullContent.length > source.snippet.length) {
                return { ...source, snippet: fullContent };
            }
            return source;
        });

        const extractedCount = extractedContent.size;
        console.log(`[Maxwell Extract] Enriched ${extractedCount}/${urlsToExtract.length} sources with full content`);

        return {
            sources: enhancedSources,
            extractedCount,
            durationMs: Date.now() - startTime,
        };
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.warn('[Maxwell Extract] Timed out after', EXTRACT_TIMEOUT_MS, 'ms');
        } else {
            console.warn('[Maxwell Extract] Failed (non-fatal):', error);
        }
        return { sources, extractedCount: 0, durationMs: Date.now() - startTime };
    }
}
