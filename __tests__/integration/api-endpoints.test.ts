/**
 * Maxwell Multi-Endpoint API Integration Tests
 *
 * Tests the complete multi-endpoint pipeline: Decompose → Search → Synthesize → Verify → Adjudicate
 * 
 * REQUIRES API KEYS:
 * - OPENROUTER_API_KEY
 * - TAVILY_API_KEY
 *
 * Run: npm test -- __tests__/integration/api-endpoints.test.ts
 * Skip: npm test -- --testPathIgnorePatterns=integration
 */

import { decomposeQuery } from '../../app/lib/maxwell/decomposer';
import { parallelSearch } from '../../app/lib/maxwell/searcher';
import { synthesize } from '../../app/lib/maxwell/synthesizer';
import { prepareEvidence, verifyClaimsWithPrecomputedEvidence } from '../../app/lib/maxwell/verifier';
import { adjudicate } from '../../app/lib/maxwell/adjudicator';
import { createExecutionConfig } from '../../app/lib/maxwell/configFactory';
import { getMaxwellEnvConfig } from '../../app/lib/maxwell/env';

// Check if API keys are available
const hasApiKeys = (): boolean => {
    try {
        getMaxwellEnvConfig();
        return true;
    } catch {
        return false;
    }
};

// Skip tests if no API keys
const describeIfApiKeys = hasApiKeys() ? describe : describe.skip;

describeIfApiKeys('Maxwell API Integration', () => {
    // Increase timeout for API calls
    jest.setTimeout(120000); // 2 minutes

    const TEST_QUERY = 'What is the capital of France?';

    describe('Phase 1: Decomposition', () => {
        it('should decompose a query into sub-queries', async () => {
            const result = await decomposeQuery(TEST_QUERY);

            expect(result.subQueries).toBeDefined();
            expect(result.subQueries.length).toBeGreaterThanOrEqual(1);
            expect(result.complexity).toBeDefined();
            expect(['simple', 'standard', 'deep_research']).toContain(result.complexity);
            expect(result.durationMs).toBeGreaterThan(0);

            // Each sub-query should have required fields
            result.subQueries.forEach(sq => {
                expect(sq.id).toBeDefined();
                expect(sq.query).toBeDefined();
                expect(sq.purpose).toBeDefined();
            });
        });

        it('should reject empty queries', async () => {
            await expect(decomposeQuery('')).rejects.toThrow();
        });
    });

    describe('Phase 2: Search', () => {
        it('should find sources for sub-queries', async () => {
            const decomposition = await decomposeQuery(TEST_QUERY);
            const config = createExecutionConfig(decomposition.complexity);

            const result = await parallelSearch(decomposition.subQueries, config.resultsPerQuery);

            expect(result.sources).toBeDefined();
            expect(result.sources.length).toBeGreaterThan(0);
            expect(result.searchMetadata).toBeDefined();

            // Each source should have required fields
            result.sources.forEach(source => {
                expect(source.id).toBeDefined();
                expect(source.title).toBeDefined();
                expect(source.url).toBeDefined();
                expect(source.snippet).toBeDefined();
            });
        });
    });

    describe('Phase 3: Synthesis', () => {
        it('should generate an answer with citations', async () => {
            const decomposition = await decomposeQuery(TEST_QUERY);
            const config = createExecutionConfig(decomposition.complexity);
            const searchResult = await parallelSearch(decomposition.subQueries, config.resultsPerQuery);

            let answer = '';
            let sourcesUsed: string[] = [];

            const generator = synthesize(TEST_QUERY, searchResult.sources, config.synthesisModel);
            for await (const event of generator) {
                if (event.type === 'chunk') {
                    answer += event.content;
                } else if (event.type === 'complete') {
                    answer = event.answer;
                    sourcesUsed = event.sourcesUsed;
                }
            }

            expect(answer).toBeTruthy();
            expect(answer.length).toBeGreaterThan(50);
            // For simple geography questions, should mention Paris
            expect(answer.toLowerCase()).toContain('paris');
        });
    });

    describe('Phase 4: Verification', () => {
        it('should prepare evidence (chunking + embedding)', async () => {
            const decomposition = await decomposeQuery(TEST_QUERY);
            const config = createExecutionConfig(decomposition.complexity);
            const searchResult = await parallelSearch(decomposition.subQueries, config.resultsPerQuery);

            const evidence = await prepareEvidence(searchResult.sources);

            expect(evidence.passages).toBeDefined();
            expect(evidence.passages.length).toBeGreaterThan(0);
            expect(evidence.embeddings).toBeDefined();
            expect(evidence.embeddings.length).toBe(evidence.passages.length);

            // Check embedding dimensions
            if (evidence.embeddings.length > 0) {
                expect(evidence.embeddings[0].length).toBeGreaterThan(100); // Should be high-dim
            }
        });
    });

    describe('Full Pipeline', () => {
        it('should complete the entire Maxwell pipeline', async () => {
            // 1. Decompose
            const decomposition = await decomposeQuery(TEST_QUERY);
            expect(decomposition.complexity).toBeDefined();

            // 2. Search
            const config = createExecutionConfig(decomposition.complexity);
            const searchResult = await parallelSearch(decomposition.subQueries, config.resultsPerQuery);
            expect(searchResult.sources.length).toBeGreaterThan(0);

            // 3. Prepare Evidence
            const evidence = await prepareEvidence(searchResult.sources);
            expect(evidence.passages.length).toBeGreaterThan(0);

            // 4. Synthesize
            let answer = '';
            const synthGen = synthesize(TEST_QUERY, searchResult.sources, config.synthesisModel);
            for await (const event of synthGen) {
                if (event.type === 'complete') {
                    answer = event.answer;
                }
            }
            expect(answer).toBeTruthy();

            // 5. Verify
            let verification: any = null;
            const verifyGen = verifyClaimsWithPrecomputedEvidence(
                answer,
                searchResult.sources,
                evidence,
                config.maxClaimsToVerify,
                config.verificationConcurrency
            );
            for await (const event of verifyGen) {
                if (event.type === 'complete') {
                    verification = event.verification;
                }
            }
            expect(verification).toBeDefined();
            expect(verification.overallConfidence).toBeGreaterThanOrEqual(0);

            // 6. Adjudicate
            let verdict = '';
            const adjGen = adjudicate(TEST_QUERY, answer, verification);
            for await (const event of adjGen) {
                if (event.type === 'chunk') {
                    verdict += event.content;
                }
            }
            expect(verdict).toBeTruthy();
            expect(verdict.toLowerCase()).toContain('paris');

            console.log('\n✅ Full pipeline completed successfully');
            console.log(`   Complexity: ${decomposition.complexity}`);
            console.log(`   Sources: ${searchResult.sources.length}`);
            console.log(`   Passages: ${evidence.passages.length}`);
            console.log(`   Claims: ${verification.claims.length}`);
            console.log(`   Confidence: ${verification.overallConfidence}%`);
        });
    });
});

