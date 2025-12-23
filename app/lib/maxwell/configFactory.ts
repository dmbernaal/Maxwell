import { QualityPreset } from './constants';

export type ComplexityLevel = 'simple' | 'standard' | 'deep_research';

export interface ExecutionConfig {
    complexity: ComplexityLevel;
    reasoning: string;          // Why we chose this mode (for UI)

    // Search Budget
    maxSubQueries: number;
    resultsPerQuery: number;

    // Verification Budget
    verificationConcurrency: number;
    maxClaimsToVerify: number;

    // Model Selection (Must match OpenRouter IDs)
    synthesisModel: string;
    adjudicatorModel: string;
}

/**
 * Creates an execution configuration based on query complexity.
 * This implements the "Adaptive Compute" architecture.
 */
export function createExecutionConfig(
    complexity: ComplexityLevel,
    reasoning: string, // Passed from Decomposer
    userPreset: QualityPreset = 'fast'
): ExecutionConfig {

    // 1. DEEP RESEARCH (The "God Mode")
    // Triggered for: "Comprehensive reports", "Medical/Legal analysis", "Future predictions"
    if (complexity === 'deep_research') {
        return {
            complexity,
            reasoning,
            maxSubQueries: 7,              // Go wide
            resultsPerQuery: 8,            // Go deep
            verificationConcurrency: 8,    // High parallelism (Gemini Flash handles this easily)
            maxClaimsToVerify: 100,        // Effectively "Verify All" - no unverified hallucination-bait
            // Use Sonnet 4.5 for high-quality human-like synthesis
            synthesisModel: 'anthropic/claude-sonnet-4.5',
            // Use Gemini 3 Pro for Adjudication (Massive 1M context to read ALL sources + draft)
            adjudicatorModel: 'google/gemini-3-pro-preview',
        };
    }

    // 2. SIMPLE (The "Speed Mode")
    // Triggered for: "Weather", "Stock Price", "Who is X"
    if (complexity === 'simple') {
        return {
            complexity,
            reasoning,
            maxSubQueries: 2,
            resultsPerQuery: 4,
            verificationConcurrency: 8,    // Fast parallel checks, keep it sub-3s
            maxClaimsToVerify: 5,          // Tight cap for speed - just check the basics
            // Gemini 3 Flash is blazing fast and cheap
            synthesisModel: 'google/gemini-3-flash-preview',
            adjudicatorModel: 'google/gemini-3-flash-preview',
        };
    }

    // 3. STANDARD (The "Balanced Mode")
    // Default fallback
    return {
        complexity,
        reasoning,
        maxSubQueries: 4,
        resultsPerQuery: 5,
        verificationConcurrency: 6,     // Balanced parallelism
        maxClaimsToVerify: 30,          // Covers 90% of normal queries - no more "partial verification"
        // Sonnet 4.5 is the best all-rounder
        synthesisModel: 'anthropic/claude-sonnet-4.5',
        adjudicatorModel: 'google/gemini-3-flash-preview', // Flash is fine for standard adjudication
    };
}
