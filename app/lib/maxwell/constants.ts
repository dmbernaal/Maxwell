/**
 * Maxwell Constants
 *
 * All configuration values, thresholds, and magic numbers.
 * Centralizing these makes tuning and testing easier.
 *
 * @module maxwell/constants
 */

// ============================================
// MODEL CONFIGURATION
// ============================================

/** Model for query decomposition (fast, good at structured output) */
export const DECOMPOSITION_MODEL = 'google/gemini-3-flash-preview';

/** Model for answer synthesis (strong reasoning) */
export const SYNTHESIS_MODEL = 'anthropic/claude-sonnet-4.5';

/** Model for claim extraction (fast, simple task) */
export const CLAIM_EXTRACTION_MODEL = 'google/gemini-3-flash-preview';

/** Model for NLI entailment checking (fast, works with strict prompts) */
export const NLI_MODEL = 'google/gemini-3-flash-preview';

/** Model for embeddings (via OpenRouter, modern and efficient) */
export const EMBEDDING_MODEL = 'qwen/qwen3-embedding-8b';

// ============================================
// DECOMPOSITION CONFIGURATION
// ============================================

/** Minimum number of sub-queries to generate */
export const MIN_SUB_QUERIES = 3;

/** Maximum number of sub-queries to generate */
export const MAX_SUB_QUERIES = 5;

// ============================================
// SEARCH CONFIGURATION
// ============================================

/** Number of results per sub-query from Tavily */
export const RESULTS_PER_QUERY = 5;

/** Tavily search depth ('basic' or 'advanced') */
export const SEARCH_DEPTH = 'basic' as const;

// ============================================
// SYNTHESIS CONFIGURATION
// ============================================

/** Maximum tokens for synthesis response */
export const SYNTHESIS_MAX_TOKENS = 1500;

// ============================================
// VERIFICATION CONFIGURATION
// ============================================

/** Maximum claims to verify (for performance) */
export const MAX_CLAIMS_TO_VERIFY = 12;

// Confidence thresholds
/** Threshold for high confidence (>= this value) */
export const HIGH_CONFIDENCE_THRESHOLD = 0.72;

/** Threshold for medium confidence (>= this value, < HIGH) */
export const MEDIUM_CONFIDENCE_THRESHOLD = 0.42;

// Base confidence by entailment
/** Base confidence for SUPPORTED entailment */
export const ENTAILMENT_SUPPORTED_CONFIDENCE = 1.0;

/** Base confidence for NEUTRAL entailment */
export const ENTAILMENT_NEUTRAL_CONFIDENCE = 0.55;

/** Base confidence for CONTRADICTED entailment */
export const ENTAILMENT_CONTRADICTED_CONFIDENCE = 0.15;

// Signal multipliers
/** Confidence multiplier for low retrieval similarity */
export const LOW_RETRIEVAL_MULTIPLIER = 0.7;

/** Retrieval similarity threshold considered "low" */
export const LOW_RETRIEVAL_THRESHOLD = 0.45;

/** Confidence multiplier for citation mismatch */
export const CITATION_MISMATCH_MULTIPLIER = 0.85;

/** Similarity difference threshold to flag citation mismatch */
export const CITATION_MISMATCH_THRESHOLD = 0.12;

/** Confidence multiplier for numeric mismatch */
export const NUMERIC_MISMATCH_MULTIPLIER = 0.4;

// ============================================
// PASSAGE CONFIGURATION
// ============================================

/** Minimum passage length to include (characters) */
export const MIN_PASSAGE_LENGTH = 20;

// ============================================
// API CONFIGURATION
// ============================================

/** Maximum query length (characters) */
export const MAX_QUERY_LENGTH = 1000;

/** API route timeout (seconds) */
export const API_TIMEOUT_SECONDS = 60;
