/**
 * Decomposer Validation Unit Tests
 *
 * Tests the validation logic for decomposition output.
 * Ensures malformed LLM responses are caught before downstream processing.
 *
 * Run: npm test -- __tests__/unit/decomposer-validation.test.ts
 */

import { validateDecompositionOutput } from '../../app/lib/maxwell/decomposer';
import type { DecompositionOutput, SubQuery } from '../../app/lib/maxwell/types';
import { MIN_SUB_QUERIES, MAX_SUB_QUERIES } from '../../app/lib/maxwell/constants';

describe('Decomposer Validation', () => {
    // Helper to create valid output
    const createValidOutput = (overrides?: Partial<DecompositionOutput>): DecompositionOutput => ({
        originalQuery: 'What is the capital of France?',
        reasoning: 'Simple factual query',
        complexity: 'simple',
        subQueries: [
            { id: 'q1', query: 'capital of France', purpose: 'Find the capital', topic: 'general', depth: 'basic' },
            { id: 'q2', query: 'France capital city', purpose: 'Verify capital', topic: 'general', depth: 'basic' },
            { id: 'q3', query: 'Paris France', purpose: 'Confirm Paris', topic: 'general', depth: 'basic' },
        ],
        durationMs: 1500,
        ...overrides,
    });

    // Helper to create valid sub-query
    const createSubQuery = (overrides?: Partial<SubQuery>): SubQuery => ({
        id: 'q1',
        query: 'test query',
        purpose: 'test purpose',
        topic: 'general',
        depth: 'basic',
        ...overrides,
    });

    describe('validateDecompositionOutput', () => {
        it('should accept valid decomposition output', () => {
            const output = createValidOutput();
            expect(validateDecompositionOutput(output)).toBe(true);
        });

        describe('Original Query Validation', () => {
            it('should reject missing originalQuery', () => {
                const output = createValidOutput({ originalQuery: '' });
                expect(() => validateDecompositionOutput(output)).toThrow('Missing originalQuery');
            });

            it('should reject undefined originalQuery', () => {
                const output = createValidOutput();
                // @ts-expect-error - Testing runtime validation
                output.originalQuery = undefined;
                expect(() => validateDecompositionOutput(output)).toThrow('Missing originalQuery');
            });
        });

        describe('Sub-Queries Array Validation', () => {
            it('should reject non-array subQueries', () => {
                const output = createValidOutput();
                // @ts-expect-error - Testing runtime validation
                output.subQueries = 'not an array';
                expect(() => validateDecompositionOutput(output)).toThrow('subQueries must be an array');
            });

            it('should reject null subQueries', () => {
                const output = createValidOutput();
                // @ts-expect-error - Testing runtime validation
                output.subQueries = null;
                expect(() => validateDecompositionOutput(output)).toThrow('subQueries must be an array');
            });

            it(`should reject fewer than ${MIN_SUB_QUERIES} sub-queries`, () => {
                const output = createValidOutput({
                    subQueries: [createSubQuery({ id: 'q1' })], // Only 1
                });
                expect(() => validateDecompositionOutput(output)).toThrow(
                    `Must have at least ${MIN_SUB_QUERIES} sub-queries`
                );
            });

            it(`should reject more than ${MAX_SUB_QUERIES} sub-queries`, () => {
                const output = createValidOutput({
                    subQueries: Array.from({ length: MAX_SUB_QUERIES + 1 }, (_, i) =>
                        createSubQuery({ id: `q${i + 1}` })
                    ),
                });
                expect(() => validateDecompositionOutput(output)).toThrow(
                    `Must have at most ${MAX_SUB_QUERIES} sub-queries`
                );
            });

            it('should accept exactly MIN_SUB_QUERIES sub-queries', () => {
                const output = createValidOutput({
                    subQueries: Array.from({ length: MIN_SUB_QUERIES }, (_, i) =>
                        createSubQuery({ id: `q${i + 1}` })
                    ),
                });
                expect(validateDecompositionOutput(output)).toBe(true);
            });

            it('should accept exactly MAX_SUB_QUERIES sub-queries', () => {
                const output = createValidOutput({
                    subQueries: Array.from({ length: MAX_SUB_QUERIES }, (_, i) =>
                        createSubQuery({ id: `q${i + 1}` })
                    ),
                });
                expect(validateDecompositionOutput(output)).toBe(true);
            });
        });

        describe('Sub-Query Field Validation', () => {
            it('should reject sub-query without id', () => {
                const output = createValidOutput({
                    subQueries: [
                        createSubQuery({ id: '' }),
                        createSubQuery({ id: 'q2' }),
                        createSubQuery({ id: 'q3' }),
                    ],
                });
                expect(() => validateDecompositionOutput(output)).toThrow('missing required fields');
            });

            it('should reject sub-query without query', () => {
                const output = createValidOutput({
                    subQueries: [
                        createSubQuery({ query: '' }),
                        createSubQuery({ id: 'q2' }),
                        createSubQuery({ id: 'q3' }),
                    ],
                });
                expect(() => validateDecompositionOutput(output)).toThrow('missing required fields');
            });

            it('should reject sub-query without purpose', () => {
                const output = createValidOutput({
                    subQueries: [
                        createSubQuery({ purpose: '' }),
                        createSubQuery({ id: 'q2' }),
                        createSubQuery({ id: 'q3' }),
                    ],
                });
                expect(() => validateDecompositionOutput(output)).toThrow('missing required fields');
            });
        });

        describe('Duplicate ID Detection', () => {
            it('should reject duplicate sub-query IDs', () => {
                const output = createValidOutput({
                    subQueries: [
                        createSubQuery({ id: 'q1' }),
                        createSubQuery({ id: 'q1' }), // Duplicate!
                        createSubQuery({ id: 'q3' }),
                    ],
                });
                expect(() => validateDecompositionOutput(output)).toThrow('Duplicate sub-query ID: q1');
            });

            it('should accept unique IDs', () => {
                const output = createValidOutput({
                    subQueries: [
                        createSubQuery({ id: 'q1' }),
                        createSubQuery({ id: 'q2' }),
                        createSubQuery({ id: 'q3' }),
                    ],
                });
                expect(validateDecompositionOutput(output)).toBe(true);
            });
        });

        describe('Duration Validation', () => {
            it('should reject negative durationMs', () => {
                const output = createValidOutput({ durationMs: -100 });
                expect(() => validateDecompositionOutput(output)).toThrow('durationMs must be a positive number');
            });

            it('should reject non-numeric durationMs', () => {
                const output = createValidOutput();
                // @ts-expect-error - Testing runtime validation
                output.durationMs = 'fast';
                expect(() => validateDecompositionOutput(output)).toThrow('durationMs must be a positive number');
            });

            it('should accept zero durationMs', () => {
                const output = createValidOutput({ durationMs: 0 });
                // Zero is valid (edge case for cached responses)
                expect(validateDecompositionOutput(output)).toBe(true);
            });

            it('should accept positive durationMs', () => {
                const output = createValidOutput({ durationMs: 2500 });
                expect(validateDecompositionOutput(output)).toBe(true);
            });
        });
    });
});

