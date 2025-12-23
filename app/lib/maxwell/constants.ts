/**
 * Maxwell Constants
 *
 * All configuration values, thresholds, and magic numbers.
 * Centralizing these makes tuning and testing easier.
 *
 * @module maxwell/constants
 */

// ============================================
// QUALITY PRESETS
// ============================================

/**
 * Quality preset determines synthesis model and verification concurrency.
 *
 * FAST: Gemini Flash for synthesis, high concurrency (8) - DEFAULT
 *       Best for: Live demos, quick answers, cost efficiency
 *       Trade-off: Slightly less nuanced prose
 *
 * MEDIUM: Claude Sonnet for synthesis, medium concurrency (6)
 *         Best for: Balanced quality and speed
 *         Trade-off: ~2x slower than FAST
 *
 * SLOW: Claude Sonnet for synthesis, lower concurrency (4)
 *       Best for: Maximum quality, complex topics
 *       Trade-off: ~3x slower than FAST
 */
export type QualityPreset = 'fast' | 'medium' | 'slow';

export const QUALITY_PRESETS = {
    fast: {
        synthesisModel: 'google/gemini-3-flash-preview',
        verificationConcurrency: 8,
        description: 'Fastest response, good quality',
    },
    medium: {
        synthesisModel: 'anthropic/claude-sonnet-4.5',
        verificationConcurrency: 6,
        description: 'Balanced quality and speed',
    },
    slow: {
        synthesisModel: 'anthropic/claude-sonnet-4.5',
        verificationConcurrency: 4,
        description: 'Highest quality, thorough verification',
    },
} as const;

/** Default quality preset */
export const DEFAULT_QUALITY_PRESET: QualityPreset = 'fast';

// ============================================
// MODEL CONFIGURATION
// ============================================

/** Model for query decomposition (fast, good at structured output) */
export const DECOMPOSITION_MODEL = 'google/gemini-3-flash-preview';

/** Model for answer synthesis - DYNAMICALLY SET BY QUALITY PRESET */
export const SYNTHESIS_MODEL = QUALITY_PRESETS[DEFAULT_QUALITY_PRESET].synthesisModel;

/** Model for claim extraction (fast, simple task) */
export const CLAIM_EXTRACTION_MODEL = 'google/gemini-3-flash-preview';

/** Model for NLI entailment checking (fast, works with strict prompts) */
export const NLI_MODEL = 'google/gemini-3-flash-preview';

/** Primary embedding model - Gemini for reliability and broad domain coverage (top MTEB scores) */
export const EMBEDDING_MODEL = 'google/gemini-embedding-001';

/** Fallback embedding model - Qwen3 as backup if primary fails */
export const EMBEDDING_MODEL_FALLBACK = 'qwen/qwen3-embedding-8b';

/** Default verification concurrency - DYNAMICALLY SET BY QUALITY PRESET */
export const DEFAULT_VERIFICATION_CONCURRENCY = QUALITY_PRESETS[DEFAULT_QUALITY_PRESET].verificationConcurrency;

/** Model for adjudication (fast, authoritative) */
export const ADJUDICATOR_MODEL = 'google/gemini-3-flash-preview';

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

/** Maximum claims to verify (fallback default - standard mode) */
export const MAX_CLAIMS_TO_VERIFY = 30;

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

/**
 * Maximum passages to embed and transfer between endpoints.
 *
 * Vercel has a ~4.5MB request body limit.
 * Each embedding: 4096 floats × 4 bytes = 16KB
 * With ~3MB budget for embeddings: 3MB / 16KB ≈ 187
 *
 * Set to 200 for safety margin. Passages are prioritized by relevance.
 */
export const MAX_PASSAGES_FOR_TRANSFER = 200;

// ============================================
// API CONFIGURATION
// ============================================

/** Maximum query length (characters) */
export const MAX_QUERY_LENGTH = 50000;

/** API route timeout (seconds) */
export const API_TIMEOUT_SECONDS = 60;
