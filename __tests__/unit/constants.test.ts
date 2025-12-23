/**
 * Constants & Thresholds Unit Tests
 *
 * Tests that configuration constants are sensible and consistent.
 * Catches accidental misconfigurations during refactoring.
 *
 * Run: npm test -- __tests__/unit/constants.test.ts
 */

import {
    // Quality Presets
    QUALITY_PRESETS,
    DEFAULT_QUALITY_PRESET,
    
    // Models
    DECOMPOSITION_MODEL,
    SYNTHESIS_MODEL,
    CLAIM_EXTRACTION_MODEL,
    NLI_MODEL,
    EMBEDDING_MODEL,
    EMBEDDING_MODEL_FALLBACK,
    ADJUDICATOR_MODEL,
    
    // Limits
    MIN_SUB_QUERIES,
    MAX_SUB_QUERIES,
    RESULTS_PER_QUERY,
    MAX_CLAIMS_TO_VERIFY,
    MAX_QUERY_LENGTH,
    SYNTHESIS_MAX_TOKENS,
    
    // Thresholds
    HIGH_CONFIDENCE_THRESHOLD,
    MEDIUM_CONFIDENCE_THRESHOLD,
    LOW_RETRIEVAL_THRESHOLD,
    CITATION_MISMATCH_THRESHOLD,
    
    // Multipliers
    LOW_RETRIEVAL_MULTIPLIER,
    CITATION_MISMATCH_MULTIPLIER,
    NUMERIC_MISMATCH_MULTIPLIER,
    
    // Entailment
    ENTAILMENT_SUPPORTED_CONFIDENCE,
    ENTAILMENT_NEUTRAL_CONFIDENCE,
    ENTAILMENT_CONTRADICTED_CONFIDENCE,
} from '../../app/lib/maxwell/constants';

describe('Maxwell Constants', () => {
    describe('Quality Presets', () => {
        it('should have all required presets', () => {
            expect(QUALITY_PRESETS).toHaveProperty('fast');
            expect(QUALITY_PRESETS).toHaveProperty('medium');
            expect(QUALITY_PRESETS).toHaveProperty('slow');
        });

        it('should have valid default preset', () => {
            expect(['fast', 'medium', 'slow']).toContain(DEFAULT_QUALITY_PRESET);
            expect(QUALITY_PRESETS[DEFAULT_QUALITY_PRESET]).toBeDefined();
        });

        it('should have progressively lower concurrency for higher quality', () => {
            expect(QUALITY_PRESETS.fast.verificationConcurrency).toBeGreaterThanOrEqual(
                QUALITY_PRESETS.medium.verificationConcurrency
            );
            expect(QUALITY_PRESETS.medium.verificationConcurrency).toBeGreaterThanOrEqual(
                QUALITY_PRESETS.slow.verificationConcurrency
            );
        });

        it('should have valid model IDs in all presets', () => {
            Object.values(QUALITY_PRESETS).forEach((preset) => {
                // Allow dots for versions like "claude-sonnet-4.5"
                expect(preset.synthesisModel).toMatch(/^[a-z]+\/[a-z0-9.-]+$/i);
            });
        });
    });

    describe('Model Configuration', () => {
        it('should have valid OpenRouter model IDs', () => {
            const models = [
                DECOMPOSITION_MODEL,
                SYNTHESIS_MODEL,
                CLAIM_EXTRACTION_MODEL,
                NLI_MODEL,
                EMBEDDING_MODEL,
                EMBEDDING_MODEL_FALLBACK,
                ADJUDICATOR_MODEL,
            ];

            models.forEach((model) => {
                expect(model).toMatch(/^[a-z]+\/[a-z0-9-]+$/i);
            });
        });

        it('should use fast models for high-frequency tasks', () => {
            // Decomposition, claim extraction, NLI are called many times
            // They should use fast models
            const fastTaskModels = [DECOMPOSITION_MODEL, CLAIM_EXTRACTION_MODEL, NLI_MODEL];
            
            fastTaskModels.forEach((model) => {
                // Should contain 'flash' or 'fast' or similar
                expect(
                    model.includes('flash') || 
                    model.includes('fast') || 
                    model.includes('gemini')
                ).toBe(true);
            });
        });

        it('should have different primary and fallback embedding models', () => {
            expect(EMBEDDING_MODEL).not.toBe(EMBEDDING_MODEL_FALLBACK);
        });
    });

    describe('Pipeline Limits', () => {
        it('should have sensible sub-query limits', () => {
            expect(MIN_SUB_QUERIES).toBeGreaterThanOrEqual(1);
            expect(MAX_SUB_QUERIES).toBeGreaterThan(MIN_SUB_QUERIES);
            expect(MAX_SUB_QUERIES).toBeLessThanOrEqual(10); // Reasonable cap
        });

        it('should have sensible results per query', () => {
            expect(RESULTS_PER_QUERY).toBeGreaterThanOrEqual(3);
            expect(RESULTS_PER_QUERY).toBeLessThanOrEqual(15);
        });

        it('should have sensible claim verification limit', () => {
            expect(MAX_CLAIMS_TO_VERIFY).toBeGreaterThanOrEqual(10);
            expect(MAX_CLAIMS_TO_VERIFY).toBeLessThanOrEqual(100);
        });

        it('should have sensible query length limit', () => {
            expect(MAX_QUERY_LENGTH).toBeGreaterThanOrEqual(100);
            // Allow up to 50K for copy-pasted documents
            expect(MAX_QUERY_LENGTH).toBeLessThanOrEqual(100000);
        });

        it('should have sensible synthesis token limit', () => {
            expect(SYNTHESIS_MAX_TOKENS).toBeGreaterThanOrEqual(500);
            expect(SYNTHESIS_MAX_TOKENS).toBeLessThanOrEqual(8000);
        });
    });

    describe('Confidence Thresholds', () => {
        it('should have ordered confidence thresholds', () => {
            // HIGH > MEDIUM (no LOW threshold, it's implicit)
            expect(HIGH_CONFIDENCE_THRESHOLD).toBeGreaterThan(MEDIUM_CONFIDENCE_THRESHOLD);
        });

        it('should have thresholds between 0 and 1', () => {
            expect(HIGH_CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
            expect(HIGH_CONFIDENCE_THRESHOLD).toBeLessThanOrEqual(1);
            expect(MEDIUM_CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
            expect(MEDIUM_CONFIDENCE_THRESHOLD).toBeLessThan(1);
        });

        it('should have reasonable retrieval threshold', () => {
            expect(LOW_RETRIEVAL_THRESHOLD).toBeGreaterThan(0.2);
            expect(LOW_RETRIEVAL_THRESHOLD).toBeLessThan(0.7);
        });

        it('should have reasonable citation mismatch threshold', () => {
            expect(CITATION_MISMATCH_THRESHOLD).toBeGreaterThan(0);
            expect(CITATION_MISMATCH_THRESHOLD).toBeLessThan(0.5);
        });
    });

    describe('Penalty Multipliers', () => {
        it('should have multipliers between 0 and 1 (penalties)', () => {
            const multipliers = [
                LOW_RETRIEVAL_MULTIPLIER,
                CITATION_MISMATCH_MULTIPLIER,
                NUMERIC_MISMATCH_MULTIPLIER,
            ];

            multipliers.forEach((m) => {
                expect(m).toBeGreaterThan(0);
                expect(m).toBeLessThanOrEqual(1);
            });
        });

        it('should have numeric mismatch as the harshest penalty', () => {
            // Numeric errors are most serious
            expect(NUMERIC_MISMATCH_MULTIPLIER).toBeLessThanOrEqual(LOW_RETRIEVAL_MULTIPLIER);
            expect(NUMERIC_MISMATCH_MULTIPLIER).toBeLessThanOrEqual(CITATION_MISMATCH_MULTIPLIER);
        });
    });

    describe('Entailment Base Confidences', () => {
        it('should have ordered entailment confidences', () => {
            expect(ENTAILMENT_SUPPORTED_CONFIDENCE).toBeGreaterThan(ENTAILMENT_NEUTRAL_CONFIDENCE);
            expect(ENTAILMENT_NEUTRAL_CONFIDENCE).toBeGreaterThan(ENTAILMENT_CONTRADICTED_CONFIDENCE);
        });

        it('should have SUPPORTED close to 1.0', () => {
            expect(ENTAILMENT_SUPPORTED_CONFIDENCE).toBeGreaterThanOrEqual(0.9);
        });

        it('should have CONTRADICTED below medium threshold', () => {
            expect(ENTAILMENT_CONTRADICTED_CONFIDENCE).toBeLessThan(MEDIUM_CONFIDENCE_THRESHOLD);
        });

        it('should have NEUTRAL in the middle range', () => {
            expect(ENTAILMENT_NEUTRAL_CONFIDENCE).toBeGreaterThan(MEDIUM_CONFIDENCE_THRESHOLD);
            expect(ENTAILMENT_NEUTRAL_CONFIDENCE).toBeLessThan(HIGH_CONFIDENCE_THRESHOLD);
        });
    });
});

