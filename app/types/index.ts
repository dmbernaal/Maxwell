/**
 * Shared type definitions for the search agent
 * Keep minimal - only define types that are actually used
 */

/**
 * A single search result from Tavily
 */
export interface Source {
    title: string;
    url: string;
    content: string;
    score?: number;
}

/**
 * Parsed citation mapping [1] -> Source
 */
export interface Citation {
    index: number;
    source: Source;
}
