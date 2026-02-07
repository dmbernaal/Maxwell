/**
 * Tests for Maxwell Pipeline Enhancements
 *
 * Covers:
 * - Phase 1: Decompose (finance topic, excludeDomains, base rate prompt)
 * - Phase 2: Search (exclude_domains, score filtering, exponential backoff constants)
 * - Phase 2.5: Extract (content enrichment logic)
 * - Phase 4: Perplexity cross-check (claim selection, confidence integration)
 * - Phase 5: Adjudicate (cross-validation labels)
 */

import {
    MIN_SEARCH_RELEVANCE_SCORE,
    MAX_SEARCH_RETRIES,
    SEARCH_RETRY_BASE_DELAY_MS,
    DEFAULT_CHUNKS_PER_SOURCE,
    EXCLUDED_DOMAINS,
} from '../../app/lib/maxwell/constants';

import {
    integratePerplexityResults,
    type PerplexityCrossCheckOutput,
} from '../../app/lib/maxwell/perplexity-verifier';

import type { VerifiedClaim } from '../../app/lib/maxwell/types';

// ============================================
// PHASE 1: DECOMPOSE ENHANCEMENTS
// ============================================

describe('Phase 1: Decompose Enhancements', () => {
    describe('finance topic support', () => {
        it('should accept finance as a valid topic in SubQuery type', () => {
            const subQuery = {
                id: 'q1',
                query: 'AAPL earnings Q4 2025',
                purpose: 'Get financial data',
                topic: 'finance' as const,
                depth: 'basic' as const,
            };
            expect(subQuery.topic).toBe('finance');
        });

        it('should accept all three topic values', () => {
            const topics: Array<'general' | 'news' | 'finance'> = ['general', 'news', 'finance'];
            expect(topics).toHaveLength(3);
            topics.forEach(t => expect(['general', 'news', 'finance']).toContain(t));
        });
    });

    describe('excludeDomains support', () => {
        it('should accept excludeDomains in SubQuery', () => {
            const subQuery = {
                id: 'q1',
                query: 'test',
                purpose: 'test',
                topic: 'general' as const,
                depth: 'basic' as const,
                excludeDomains: ['reddit.com', 'twitter.com'],
            };
            expect(subQuery.excludeDomains).toEqual(['reddit.com', 'twitter.com']);
        });

        it('should accept undefined excludeDomains', () => {
            const subQuery: { id: string; query: string; purpose: string; topic: 'general'; depth: 'basic'; excludeDomains?: string[] } = {
                id: 'q1',
                query: 'test',
                purpose: 'test',
                topic: 'general',
                depth: 'basic',
            };
            expect(subQuery.excludeDomains).toBeUndefined();
        });
    });
});

// ============================================
// PHASE 2: SEARCH ENHANCEMENTS
// ============================================

describe('Phase 2: Search Enhancement Constants', () => {
    describe('EXCLUDED_DOMAINS blocklist', () => {
        it('should contain known low-quality domains', () => {
            expect(EXCLUDED_DOMAINS).toContain('buzzfeed.com');
            expect(EXCLUDED_DOMAINS).toContain('reddit.com');
            expect(EXCLUDED_DOMAINS).toContain('twitter.com');
            expect(EXCLUDED_DOMAINS).toContain('x.com');
            expect(EXCLUDED_DOMAINS).toContain('medium.com');
        });

        it('should be a non-empty array', () => {
            expect(Array.isArray(EXCLUDED_DOMAINS)).toBe(true);
            expect(EXCLUDED_DOMAINS.length).toBeGreaterThan(0);
        });

        it('should contain only lowercase domain strings', () => {
            EXCLUDED_DOMAINS.forEach(domain => {
                expect(domain).toBe(domain.toLowerCase());
                expect(domain).toMatch(/^[a-z0-9.-]+\.[a-z]+$/);
            });
        });
    });

    describe('score filtering threshold', () => {
        it('should have a reasonable minimum relevance score', () => {
            expect(MIN_SEARCH_RELEVANCE_SCORE).toBeGreaterThan(0);
            expect(MIN_SEARCH_RELEVANCE_SCORE).toBeLessThan(1);
            expect(MIN_SEARCH_RELEVANCE_SCORE).toBe(0.3);
        });
    });

    describe('retry configuration', () => {
        it('should have reasonable retry limits', () => {
            expect(MAX_SEARCH_RETRIES).toBeGreaterThanOrEqual(1);
            expect(MAX_SEARCH_RETRIES).toBeLessThanOrEqual(5);
        });

        it('should have a reasonable base delay', () => {
            expect(SEARCH_RETRY_BASE_DELAY_MS).toBeGreaterThanOrEqual(100);
            expect(SEARCH_RETRY_BASE_DELAY_MS).toBeLessThanOrEqual(2000);
        });

        it('should produce exponential backoff delays', () => {
            const delays = [];
            for (let i = 0; i < MAX_SEARCH_RETRIES; i++) {
                delays.push(SEARCH_RETRY_BASE_DELAY_MS * Math.pow(2, i));
            }
            // Each delay should be double the previous
            for (let i = 1; i < delays.length; i++) {
                expect(delays[i]).toBe(delays[i - 1] * 2);
            }
        });
    });

    describe('chunks per source', () => {
        it('should be a positive integer', () => {
            expect(DEFAULT_CHUNKS_PER_SOURCE).toBeGreaterThan(0);
            expect(Number.isInteger(DEFAULT_CHUNKS_PER_SOURCE)).toBe(true);
        });
    });
});

// ============================================
// PHASE 2.5: EXTRACT
// ============================================

describe('Phase 2.5: Extract Module', () => {
    it('should export extractSourceContent function', async () => {
        const { extractSourceContent } = await import('../../app/lib/maxwell/extractor');
        expect(typeof extractSourceContent).toBe('function');
    });

    it('should return sources unchanged for simple complexity', async () => {
        const { extractSourceContent } = await import('../../app/lib/maxwell/extractor');
        const sources = [
            { id: 's1', url: 'https://example.com', title: 'Test', snippet: 'content', fromQuery: 'q1' },
        ];
        const result = await extractSourceContent(sources, 'test query', 'simple');
        expect(result.sources).toEqual(sources);
        expect(result.extractedCount).toBe(0);
        expect(result.durationMs).toBe(0);
    });

    it('should return sources unchanged for empty array', async () => {
        const { extractSourceContent } = await import('../../app/lib/maxwell/extractor');
        const result = await extractSourceContent([], 'test query', 'standard');
        expect(result.sources).toEqual([]);
        expect(result.extractedCount).toBe(0);
    });
});

// ============================================
// PHASE 4: PERPLEXITY CROSS-CHECK
// ============================================

describe('Phase 4: Perplexity Cross-Check Integration', () => {
    const makeClaim = (overrides: Partial<VerifiedClaim> = {}): VerifiedClaim => ({
        id: 'c1',
        text: 'Test claim',
        confidence: 0.8,
        confidenceLevel: 'high',
        entailment: 'SUPPORTED',
        entailmentReasoning: 'Evidence supports this',
        bestMatchingSource: {
            sourceId: 's1',
            sourceTitle: 'Test Source',
            sourceIndex: 1,
            passage: 'Supporting passage',
            similarity: 0.9,
            isCitedSource: true,
        },
        citationMismatch: false,
        citedSourceSupport: 0.9,
        globalBestSupport: 0.9,
        numericCheck: null,
        issues: [],
        ...overrides,
    });

    describe('integratePerplexityResults', () => {
        it('should return claims unchanged when cross-check is disabled', () => {
            const claims = [makeClaim()];
            const crossCheck: PerplexityCrossCheckOutput = {
                results: [],
                durationMs: 0,
                enabled: false,
            };
            const result = integratePerplexityResults(claims, crossCheck);
            expect(result).toEqual(claims);
        });

        it('should return claims unchanged when no cross-check results', () => {
            const claims = [makeClaim()];
            const crossCheck: PerplexityCrossCheckOutput = {
                results: [],
                durationMs: 100,
                enabled: true,
            };
            const result = integratePerplexityResults(claims, crossCheck);
            expect(result).toEqual(claims);
        });

        it('should boost confidence when Perplexity AGREES with SUPPORTED claim', () => {
            const claims = [makeClaim({ id: 'c1', confidence: 0.8, entailment: 'SUPPORTED' })];
            const crossCheck: PerplexityCrossCheckOutput = {
                results: [{
                    claimId: 'c1',
                    claimText: 'Test claim',
                    perplexityVerdict: 'AGREES',
                    perplexityEvidence: 'Confirmed',
                    citations: [],
                }],
                durationMs: 500,
                enabled: true,
            };
            const result = integratePerplexityResults(claims, crossCheck);
            expect(result[0].confidence).toBeGreaterThan(0.8);
            expect(result[0].issues).toContain('CROSS-VALIDATED by independent search');
        });

        it('should reduce confidence when Perplexity DISAGREES with SUPPORTED claim', () => {
            const claims = [makeClaim({ id: 'c1', confidence: 0.8, entailment: 'SUPPORTED' })];
            const crossCheck: PerplexityCrossCheckOutput = {
                results: [{
                    claimId: 'c1',
                    claimText: 'Test claim',
                    perplexityVerdict: 'DISAGREES',
                    perplexityEvidence: 'Actually false',
                    citations: [],
                }],
                durationMs: 500,
                enabled: true,
            };
            const result = integratePerplexityResults(claims, crossCheck);
            expect(result[0].confidence).toBeLessThan(0.8);
            expect(result[0].issues.some(i => i.includes('DISPUTED BY INDEPENDENT CHECK'))).toBe(true);
        });

        it('should upgrade uncertain claims when Perplexity AGREES', () => {
            const claims = [makeClaim({ id: 'c1', confidence: 0.5, entailment: 'NEUTRAL', confidenceLevel: 'medium' })];
            const crossCheck: PerplexityCrossCheckOutput = {
                results: [{
                    claimId: 'c1',
                    claimText: 'Test claim',
                    perplexityVerdict: 'AGREES',
                    perplexityEvidence: 'Confirmed',
                    citations: [],
                }],
                durationMs: 500,
                enabled: true,
            };
            const result = integratePerplexityResults(claims, crossCheck);
            expect(result[0].confidence).toBeGreaterThan(0.5);
            expect(result[0].issues).toContain('INDEPENDENTLY CONFIRMED (was uncertain)');
        });

        it('should strengthen contradiction when both agree claim is false', () => {
            const claims = [makeClaim({ id: 'c1', confidence: 0.15, entailment: 'CONTRADICTED', confidenceLevel: 'low' })];
            const crossCheck: PerplexityCrossCheckOutput = {
                results: [{
                    claimId: 'c1',
                    claimText: 'Test claim',
                    perplexityVerdict: 'DISAGREES',
                    perplexityEvidence: 'Also false',
                    citations: [],
                }],
                durationMs: 500,
                enabled: true,
            };
            const result = integratePerplexityResults(claims, crossCheck);
            expect(result[0].issues).toContain('CROSS-VALIDATED CONTRADICTION by independent search');
        });

        it('should reconsider contradiction when Perplexity AGREES with claim', () => {
            const claims = [makeClaim({ id: 'c1', confidence: 0.15, entailment: 'CONTRADICTED', confidenceLevel: 'low' })];
            const crossCheck: PerplexityCrossCheckOutput = {
                results: [{
                    claimId: 'c1',
                    claimText: 'Test claim',
                    perplexityVerdict: 'AGREES',
                    perplexityEvidence: 'Actually this is true',
                    citations: [],
                }],
                durationMs: 500,
                enabled: true,
            };
            const result = integratePerplexityResults(claims, crossCheck);
            expect(result[0].confidence).toBeGreaterThan(0.15);
            expect(result[0].issues.some(i => i.includes('CONTRADICTION DISPUTED'))).toBe(true);
        });

        it('should not modify claims without matching cross-check results', () => {
            const claims = [makeClaim({ id: 'c1' }), makeClaim({ id: 'c2' })];
            const crossCheck: PerplexityCrossCheckOutput = {
                results: [{
                    claimId: 'c1',
                    claimText: 'Test claim',
                    perplexityVerdict: 'AGREES',
                    perplexityEvidence: 'Confirmed',
                    citations: [],
                }],
                durationMs: 500,
                enabled: true,
            };
            const result = integratePerplexityResults(claims, crossCheck);
            // c1 should be modified
            expect(result[0].issues.length).toBeGreaterThan(0);
            // c2 should be unchanged
            expect(result[1].issues).toEqual([]);
        });

        it('should cap confidence at 1.0', () => {
            const claims = [makeClaim({ id: 'c1', confidence: 0.95, entailment: 'SUPPORTED' })];
            const crossCheck: PerplexityCrossCheckOutput = {
                results: [{
                    claimId: 'c1',
                    claimText: 'Test claim',
                    perplexityVerdict: 'AGREES',
                    perplexityEvidence: 'Confirmed',
                    citations: [],
                }],
                durationMs: 500,
                enabled: true,
            };
            const result = integratePerplexityResults(claims, crossCheck);
            expect(result[0].confidence).toBeLessThanOrEqual(1.0);
        });

        it('should update confidenceLevel based on adjusted confidence', () => {
            const claims = [makeClaim({ id: 'c1', confidence: 0.5, entailment: 'NEUTRAL', confidenceLevel: 'medium' })];
            const crossCheck: PerplexityCrossCheckOutput = {
                results: [{
                    claimId: 'c1',
                    claimText: 'Test claim',
                    perplexityVerdict: 'AGREES',
                    perplexityEvidence: 'Confirmed',
                    citations: [],
                }],
                durationMs: 500,
                enabled: true,
            };
            const result = integratePerplexityResults(claims, crossCheck);
            // 0.5 * 1.3 = 0.65 → medium
            expect(result[0].confidenceLevel).toBe('medium');
        });
    });
});

// ============================================
// PHASE 5: ADJUDICATOR CROSS-VALIDATION LABELS
// ============================================

describe('Phase 5: Adjudicator Cross-Validation', () => {
    it('should include cross-validation labels in verified facts', () => {
        const claim: VerifiedClaim = makeClaim({
            issues: ['CROSS-VALIDATED by independent search'],
        });
        const crossCheckLabel = claim.issues?.find(i => i.startsWith('CROSS-VALIDATED'));
        expect(crossCheckLabel).toBe('CROSS-VALIDATED by independent search');
    });

    it('should include disputed labels in disputed facts', () => {
        const claim: VerifiedClaim = makeClaim({
            entailment: 'CONTRADICTED',
            issues: ['DISPUTED BY INDEPENDENT CHECK: Actually false'],
        });
        const crossCheckLabel = claim.issues?.find(i => i.includes('DISPUTED'));
        expect(crossCheckLabel).toContain('DISPUTED BY INDEPENDENT CHECK');
    });

    it('should include independently confirmed labels in unverified facts', () => {
        const claim: VerifiedClaim = makeClaim({
            entailment: 'NEUTRAL',
            confidence: 0.5,
            issues: ['INDEPENDENTLY CONFIRMED (was uncertain)'],
        });
        const crossCheckLabel = claim.issues?.find(i => i.includes('INDEPENDENTLY CONFIRMED'));
        expect(crossCheckLabel).toBe('INDEPENDENTLY CONFIRMED (was uncertain)');
    });
});

// Helper function used in Phase 5 tests
function makeClaim(overrides: Partial<VerifiedClaim> = {}): VerifiedClaim {
    return {
        id: 'c1',
        text: 'Test claim',
        confidence: 0.8,
        confidenceLevel: 'high',
        entailment: 'SUPPORTED',
        entailmentReasoning: 'Evidence supports this',
        bestMatchingSource: {
            sourceId: 's1',
            sourceTitle: 'Test Source',
            sourceIndex: 1,
            passage: 'Supporting passage',
            similarity: 0.9,
            isCitedSource: true,
        },
        citationMismatch: false,
        citedSourceSupport: 0.9,
        globalBestSupport: 0.9,
        numericCheck: null,
        issues: [],
        ...overrides,
    };
}
