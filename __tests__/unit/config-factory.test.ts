/**
 * Adaptive Compute (Config Factory) Unit Tests
 *
 * Tests the ExecutionConfig generation based on query complexity.
 * This is the "brain" that decides how much compute to allocate.
 *
 * Run: npm test -- __tests__/unit/config-factory.test.ts
 */

import { createExecutionConfig, type ComplexityLevel, type ExecutionConfig } from '../../app/lib/maxwell/configFactory';

describe('Adaptive Compute - Config Factory', () => {
    describe('createExecutionConfig', () => {
        const testReasoning = 'Test reasoning';

        describe('Simple Complexity (Speed Mode)', () => {
            let config: ExecutionConfig;

            beforeAll(() => {
                config = createExecutionConfig('simple', testReasoning);
            });

            it('should return simple complexity level', () => {
                expect(config.complexity).toBe('simple');
            });

            it('should use minimal sub-queries for speed', () => {
                expect(config.maxSubQueries).toBeLessThanOrEqual(3);
            });

            it('should use fewer results per query', () => {
                expect(config.resultsPerQuery).toBeLessThanOrEqual(5);
            });

            it('should use high concurrency for parallelism', () => {
                expect(config.verificationConcurrency).toBeGreaterThanOrEqual(6);
            });

            it('should verify few claims for speed', () => {
                expect(config.maxClaimsToVerify).toBeLessThanOrEqual(10);
            });

            it('should use fast model (Gemini Flash)', () => {
                expect(config.synthesisModel).toContain('gemini');
                expect(config.synthesisModel).toContain('flash');
            });

            it('should preserve reasoning', () => {
                expect(config.reasoning).toBe(testReasoning);
            });
        });

        describe('Standard Complexity (Balanced Mode)', () => {
            let config: ExecutionConfig;

            beforeAll(() => {
                config = createExecutionConfig('standard', testReasoning);
            });

            it('should return standard complexity level', () => {
                expect(config.complexity).toBe('standard');
            });

            it('should use moderate sub-queries', () => {
                expect(config.maxSubQueries).toBeGreaterThanOrEqual(3);
                expect(config.maxSubQueries).toBeLessThanOrEqual(5);
            });

            it('should use balanced results per query', () => {
                expect(config.resultsPerQuery).toBeGreaterThanOrEqual(4);
                expect(config.resultsPerQuery).toBeLessThanOrEqual(6);
            });

            it('should verify reasonable number of claims', () => {
                expect(config.maxClaimsToVerify).toBeGreaterThanOrEqual(20);
                expect(config.maxClaimsToVerify).toBeLessThanOrEqual(50);
            });

            it('should use quality model (Claude Sonnet)', () => {
                expect(config.synthesisModel).toContain('claude');
            });
        });

        describe('Deep Research Complexity (God Mode)', () => {
            let config: ExecutionConfig;

            beforeAll(() => {
                config = createExecutionConfig('deep_research', testReasoning);
            });

            it('should return deep_research complexity level', () => {
                expect(config.complexity).toBe('deep_research');
            });

            it('should use maximum sub-queries', () => {
                expect(config.maxSubQueries).toBeGreaterThanOrEqual(5);
            });

            it('should use many results per query', () => {
                expect(config.resultsPerQuery).toBeGreaterThanOrEqual(6);
            });

            it('should verify many claims for thoroughness', () => {
                expect(config.maxClaimsToVerify).toBeGreaterThanOrEqual(50);
            });

            it('should use premium model for synthesis', () => {
                expect(config.synthesisModel).toContain('claude');
            });

            it('should use high-context model for adjudication', () => {
                // Deep research needs large context for all sources
                expect(config.adjudicatorModel).toBeDefined();
            });
        });

        describe('Resource Scaling', () => {
            it('should allocate more resources as complexity increases', () => {
                const simple = createExecutionConfig('simple', testReasoning);
                const standard = createExecutionConfig('standard', testReasoning);
                const deep = createExecutionConfig('deep_research', testReasoning);

                // Sub-queries should scale up
                expect(simple.maxSubQueries).toBeLessThan(standard.maxSubQueries);
                expect(standard.maxSubQueries).toBeLessThan(deep.maxSubQueries);

                // Results per query should scale up
                expect(simple.resultsPerQuery).toBeLessThanOrEqual(standard.resultsPerQuery);
                expect(standard.resultsPerQuery).toBeLessThan(deep.resultsPerQuery);

                // Claims to verify should scale up
                expect(simple.maxClaimsToVerify).toBeLessThan(standard.maxClaimsToVerify);
                expect(standard.maxClaimsToVerify).toBeLessThan(deep.maxClaimsToVerify);
            });
        });

        describe('All Complexity Levels', () => {
            const complexities: ComplexityLevel[] = ['simple', 'standard', 'deep_research'];

            complexities.forEach((complexity) => {
                it(`should return valid config for ${complexity}`, () => {
                    const config = createExecutionConfig(complexity, testReasoning);

                    // Required fields
                    expect(config.complexity).toBe(complexity);
                    expect(config.reasoning).toBe(testReasoning);

                    // Numeric fields should be positive
                    expect(config.maxSubQueries).toBeGreaterThan(0);
                    expect(config.resultsPerQuery).toBeGreaterThan(0);
                    expect(config.verificationConcurrency).toBeGreaterThan(0);
                    expect(config.maxClaimsToVerify).toBeGreaterThan(0);

                    // Model fields should be valid OpenRouter IDs (allow dots for versions like 4.5)
                    expect(config.synthesisModel).toMatch(/^[a-z]+\/[a-z0-9.-]+$/i);
                    expect(config.adjudicatorModel).toMatch(/^[a-z]+\/[a-z0-9.-]+$/i);
                });
            });
        });
    });
});

