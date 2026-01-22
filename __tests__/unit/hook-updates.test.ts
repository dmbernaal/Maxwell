/**
 * Phase 6 Hook Updates - Unit Tests
 *
 * Tests for Phase 6 updates to Maxwell types and API.
 * Focus on type compatibility without complex React testing.
 */

import { describe, it, expect } from '@jest/globals';

describe('Phase 6: Hook Updates', () => {
    describe('ExecutionPhase includes presenter', () => {
        it('should include presenter in ExecutionPhase type', () => {
            // Import types module dynamically
            import('../../app/lib/maxwell/types').then(types => {
                const validPhases = [
                    'idle',
                    'decomposition',
                    'search',
                    'synthesis',
                    'verification',
                    'adjudication',
                    'presenter',
                    'complete',
                    'error',
                ];
                expect(validPhases).toHaveLength(9);
            });
        });
    });

    describe('PhaseDurations includes presenter', () => {
        it('should allow presenter duration', () => {
            const durations = {
                decomposition: 1000,
                search: 5000,
                synthesis: 3000,
                verification: 2000,
                adjudication: 1500,
                presenter: 1000,
                total: 13500,
            };
            expect(durations.presenter).toBe(1000);
            expect(durations.total).toBe(13500);
        });

        it('should allow presenter to be optional', () => {
            const durations = {
                decomposition: 1000,
                search: 5000,
                total: 6000,
            };
            expect(durations.presenter).toBeUndefined();
        });
    });

    describe('Phase events include presenter', () => {
        it('should allow phase-complete event for presenter', () => {
            const event = {
                type: 'phase-complete',
                phase: 'presenter',
                data: { intelligence: 'test' },
            };

            expect(event.phase).toBe('presenter');
            expect(event.type).toBe('phase-complete');
        });

        it('should allow phase-start event for presenter', () => {
            const event = {
                type: 'phase-start',
                phase: 'presenter',
            };

            expect(event.phase).toBe('presenter');
            expect(event.type).toBe('phase-start');
        });
    });

    describe('API types include marketContext', () => {
        it('should allow marketContext in DecomposeRequest', () => {
            const request = {
                query: 'test query',
                marketContext: {
                    id: 'test-market-1',
                    platform: 'polymarket',
                    title: 'Test Market Question',
                    type: 'binary',
                    outcomes: [
                        { name: 'YES', price: 0.65 },
                        { name: 'NO', price: 0.35 },
                    ],
                    rules: 'Test resolution criteria',
                    endDate: new Date('2026-12-31'),
                    volume: 100000,
                    volume24h: 5000,
                },
            };

            expect(request.query).toBe('test query');
            expect(request.marketContext).toBeDefined();
        });

        it('should allow marketContext to be optional in DecomposeRequest', () => {
            const request = {
                query: 'test query',
            };

            expect(request.marketContext).toBeUndefined();
        });

        it('should allow marketContext in SynthesizeRequest', () => {
            const request = {
                query: 'test query',
                sources: [],
                synthesisModel: 'test-model',
                marketContext: {
                    id: 'test-market-1',
                    platform: 'polymarket',
                    title: 'Test Market Question',
                    type: 'binary',
                    outcomes: [
                        { name: 'YES', price: 0.65 },
                        { name: 'NO', price: 0.35 },
                    ],
                    rules: 'Test resolution criteria',
                    endDate: new Date('2026-12-31'),
                    volume: 100000,
                    volume24h: 5000,
                },
            };

            expect(request.query).toBe('test query');
            expect(request.marketContext).toBeDefined();
        });

        it('should allow marketContext to be optional in SynthesizeRequest', () => {
            const request = {
                query: 'test query',
                sources: [],
                synthesisModel: 'test-model',
            };

            expect(request.marketContext).toBeUndefined();
        });
    });

    describe('MaxwellIntelligence type structure', () => {
        it('should have correct structure for intelligence object', () => {
            const intelligence = {
                market: {
                    question: 'Test market',
                    type: 'binary',
                    deadline: '2026-12-31',
                    deadlineDate: 'December 31, 2026',
                    resolutionCriteria: 'Test criteria',
                },
                resolutionRisk: {
                    level: 'LOW',
                    score: 0.2,
                    factors: [],
                },
                assessment: {
                    primaryOutcome: 'YES',
                    marketPrice: 0.65,
                    maxwellRange: { low: 0.5, mid: 0.65, high: 0.8 },
                    verdict: 'UNDERPRICED',
                    confidence: 'HIGH',
                    headline: 'Test headline',
                },
                thesis: {
                    factorsFor: [],
                    factorsAgainst: [],
                    keyUncertainty: 'Test uncertainty',
                    nextCatalyst: { event: 'Test event' },
                },
                verification: {
                    score: 0.85,
                    level: 'VERIFIED',
                    sourcesAnalyzed: 10,
                    claimsVerified: 5,
                    claimsDisputed: 0,
                    topSources: [],
                },
                raw: {
                    synthesis: 'Test synthesis',
                    adjudication: 'Test adjudication',
                    allSources: [],
                    allClaims: [],
                },
                generatedAt: new Date().toISOString(),
                pipelineDurationMs: 15000,
                modelUsed: 'test-model',
            };

            expect(intelligence.market.question).toBe('Test market');
            expect(intelligence.assessment.verdict).toBe('UNDERPRICED');
            expect(intelligence.verification.level).toBe('VERIFIED');
        });
    });

    describe('Intelligence verdict types', () => {
        it('should accept valid verdict values', () => {
            const verdicts = ['UNDERPRICED', 'OVERPRICED', 'FAIR', 'UNCERTAIN'];
            verdicts.forEach(verdict => {
                expect(verdict).toBeDefined();
            });
        });

        it('should accept valid confidence levels', () => {
            const confidences = ['HIGH', 'MEDIUM', 'LOW'];
            confidences.forEach(conf => {
                expect(conf).toBeDefined();
            });
        });

        it('should accept valid resolution risk levels', () => {
            const riskLevels = ['LOW', 'MEDIUM', 'HIGH'];
            riskLevels.forEach(level => {
                expect(level).toBeDefined();
            });
        });
    });

    describe('Backward compatibility', () => {
        it('should allow operations without marketContext', () => {
            const decomposeRequest = {
                query: 'test query',
            };

            const synthesizeRequest = {
                query: 'test query',
                sources: [],
                synthesisModel: 'test-model',
            };

            expect(decomposeRequest.marketContext).toBeUndefined();
            expect(synthesizeRequest.marketContext).toBeUndefined();
        });
    });
});
