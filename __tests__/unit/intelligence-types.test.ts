/**
 * Intelligence Types & Contract Tests - Phase 1
 *
 * Tests for the MaxwellIntelligence type system that powers the trader revamp.
 * These tests validate:
 * 1. Type contracts are properly structured
 * 2. Required fields are enforced
 * 3. Enum values are correct
 * 4. Factory functions produce valid instances
 *
 * Run: npm test -- __tests__/unit/intelligence-types.test.ts
 */

import type {
    MarketContext,
    MarketOutcomeContext,
    MaxwellIntelligence,
    ResolutionRisk,
    ThesisFactor,
    OutcomeAnalysis,
    SourceSummary,
    SourceReference,
    ClaimReference,
    IntelligenceVerdict,
    ConfidenceLevel,
    ResolutionRiskLevel,
    IntelligenceVerificationLevel,
    ClaimEntailment,
} from '../../app/lib/maxwell/types';

// ============================================
// TEST FIXTURES
// ============================================

/**
 * Creates a valid MarketContext for testing
 */
function createMockMarketContext(overrides?: Partial<MarketContext>): MarketContext {
    return {
        id: 'poly:superbowl2026',
        platform: 'polymarket',
        title: 'Super Bowl Champion 2026',
        type: 'multi-option',
        outcomes: [
            { name: 'Seattle', price: 0.24 },
            { name: 'Los Angeles Rams', price: 0.21 },
            { name: 'Buffalo', price: 0.14 },
        ],
        rules: 'This market will resolve to the team that wins Super Bowl LX.',
        endDate: new Date('2026-02-08'),
        volume: 675000000,
        volume24h: 917000,
        ...overrides,
    };
}

/**
 * Creates a valid ResolutionRisk for testing
 */
function createMockResolutionRisk(overrides?: Partial<ResolutionRisk>): ResolutionRisk {
    return {
        level: 'LOW',
        score: 15,
        factors: [],
        ...overrides,
    };
}

/**
 * Creates a valid ThesisFactor for testing
 */
function createMockThesisFactor(overrides?: Partial<ThesisFactor>): ThesisFactor {
    return {
        point: 'Healthiest playoff roster',
        evidence: 'No major injuries reported in the last 4 weeks',
        sourceIndex: 1,
        confidence: 'HIGH',
        ...overrides,
    };
}

/**
 * Creates a valid OutcomeAnalysis for testing
 */
function createMockOutcomeAnalysis(overrides?: Partial<OutcomeAnalysis>): OutcomeAnalysis {
    return {
        name: 'Seattle',
        marketPrice: 0.24,
        maxwellRange: { low: 0.22, mid: 0.28, high: 0.34 },
        view: 'UNDERPRICED',
        confidence: 'HIGH',
        oneLiner: 'Healthiest roster heading into playoffs',
        rank: 1,
        ...overrides,
    };
}

/**
 * Creates a valid MaxwellIntelligence for testing
 */
function createMockMaxwellIntelligence(overrides?: Partial<MaxwellIntelligence>): MaxwellIntelligence {
    return {
        market: {
            question: 'Who will win Super Bowl LX?',
            type: 'multi-option',
            deadline: '23 days',
            deadlineDate: '2026-02-08T00:00:00Z',
            resolutionCriteria: 'NFL official Super Bowl winner',
        },
        resolutionRisk: createMockResolutionRisk(),
        assessment: {
            primaryOutcome: 'Seattle',
            marketPrice: 0.24,
            maxwellRange: { low: 0.22, mid: 0.28, high: 0.34 },
            verdict: 'UNDERPRICED',
            confidence: 'HIGH',
            headline: 'Seattle has a health advantage the market is underweighting',
        },
        thesis: {
            factorsFor: [createMockThesisFactor()],
            factorsAgainst: [createMockThesisFactor({ point: 'No Super Bowl experience', confidence: 'MEDIUM' })],
            keyUncertainty: 'Any key injury fundamentally changes the equation',
            nextCatalyst: {
                event: 'Divisional Round',
                date: 'January 18, 2026',
                impact: 'Will clarify path difficulty',
            },
        },
        outcomes: [createMockOutcomeAnalysis()],
        verification: {
            score: 82,
            level: 'VERIFIED',
            sourcesAnalyzed: 30,
            claimsVerified: 24,
            claimsDisputed: 6,
            topSources: [
                { title: 'ESPN NFL Coverage', domain: 'espn.com', relevanceScore: 0.95 },
            ],
        },
        raw: {
            synthesis: '## MARKET CONTEXT...',
            adjudication: 'Based on verified evidence...',
            allSources: [],
            allClaims: [],
        },
        generatedAt: new Date().toISOString(),
        pipelineDurationMs: 45000,
        modelUsed: 'claude-sonnet-4-20250514',
        ...overrides,
    };
}

// ============================================
// TESTS: MarketContext
// ============================================

describe('MarketContext Type Contract', () => {
    describe('Required Fields', () => {
        it('should have all required identity fields', () => {
            const context = createMockMarketContext();

            expect(context.id).toBeDefined();
            expect(typeof context.id).toBe('string');
            expect(context.platform).toBeDefined();
            expect(['polymarket', 'kalshi']).toContain(context.platform);
        });

        it('should have all required market definition fields', () => {
            const context = createMockMarketContext();

            expect(context.title).toBeDefined();
            expect(typeof context.title).toBe('string');
            expect(context.type).toBeDefined();
            expect(['binary', 'multi-option', 'matchup']).toContain(context.type);
        });

        it('should have outcomes array with required fields', () => {
            const context = createMockMarketContext();

            expect(context.outcomes).toBeDefined();
            expect(Array.isArray(context.outcomes)).toBe(true);
            expect(context.outcomes.length).toBeGreaterThan(0);

            const outcome = context.outcomes[0];
            expect(outcome.name).toBeDefined();
            expect(typeof outcome.price).toBe('number');
            expect(outcome.price).toBeGreaterThanOrEqual(0);
            expect(outcome.price).toBeLessThanOrEqual(1);
        });

        it('should have resolution fields', () => {
            const context = createMockMarketContext();

            expect(context.rules).toBeDefined();
            expect(context.endDate).toBeDefined();
            expect(context.endDate instanceof Date).toBe(true);
        });

        it('should have market data fields', () => {
            const context = createMockMarketContext();

            expect(typeof context.volume).toBe('number');
            expect(typeof context.volume24h).toBe('number');
        });
    });

    describe('Optional Fields', () => {
        it('should allow optional resolutionSource', () => {
            const withSource = createMockMarketContext({ resolutionSource: 'NFL official results' });
            const withoutSource = createMockMarketContext();
            delete (withoutSource as Partial<MarketContext>).resolutionSource;

            expect(withSource.resolutionSource).toBe('NFL official results');
            expect(withoutSource.resolutionSource).toBeUndefined();
        });

        it('should allow optional liquidity', () => {
            const withLiquidity = createMockMarketContext({ liquidity: 13600000 });

            expect(withLiquidity.liquidity).toBe(13600000);
        });

        it('should allow optional crossPlatformOdds', () => {
            const withCross = createMockMarketContext({
                crossPlatformOdds: {
                    platform: 'kalshi',
                    outcomes: [{ name: 'Seattle', price: 0.28 }],
                },
            });

            expect(withCross.crossPlatformOdds).toBeDefined();
            expect(withCross.crossPlatformOdds?.platform).toBe('kalshi');
        });
    });

    describe('Platform Values', () => {
        it('should accept polymarket platform', () => {
            const context = createMockMarketContext({ platform: 'polymarket' });
            expect(context.platform).toBe('polymarket');
        });

        it('should accept kalshi platform', () => {
            const context = createMockMarketContext({ platform: 'kalshi' });
            expect(context.platform).toBe('kalshi');
        });
    });

    describe('Market Types', () => {
        it('should accept binary type', () => {
            const context = createMockMarketContext({ type: 'binary' });
            expect(context.type).toBe('binary');
        });

        it('should accept multi-option type', () => {
            const context = createMockMarketContext({ type: 'multi-option' });
            expect(context.type).toBe('multi-option');
        });

        it('should accept matchup type', () => {
            const context = createMockMarketContext({ type: 'matchup' });
            expect(context.type).toBe('matchup');
        });
    });

    describe('MarketOutcomeContext', () => {
        it('should have required name and price', () => {
            const outcome: MarketOutcomeContext = { name: 'Seattle', price: 0.24 };

            expect(outcome.name).toBeDefined();
            expect(outcome.price).toBeDefined();
        });

        it('should allow optional priceChange24h', () => {
            const outcome: MarketOutcomeContext = { name: 'Seattle', price: 0.24, priceChange24h: 0.03 };

            expect(outcome.priceChange24h).toBe(0.03);
        });

        it('should allow optional volume', () => {
            const outcome: MarketOutcomeContext = { name: 'Seattle', price: 0.24, volume: 5000000 };

            expect(outcome.volume).toBe(5000000);
        });
    });
});

// ============================================
// TESTS: ResolutionRisk
// ============================================

describe('ResolutionRisk Type Contract', () => {
    describe('Required Fields', () => {
        it('should have level, score, and factors', () => {
            const risk = createMockResolutionRisk();

            expect(risk.level).toBeDefined();
            expect(['LOW', 'MEDIUM', 'HIGH']).toContain(risk.level);
            expect(typeof risk.score).toBe('number');
            expect(risk.score).toBeGreaterThanOrEqual(0);
            expect(risk.score).toBeLessThanOrEqual(100);
            expect(Array.isArray(risk.factors)).toBe(true);
        });
    });

    describe('Risk Levels', () => {
        it('should accept LOW risk level', () => {
            const risk = createMockResolutionRisk({ level: 'LOW', score: 15 });
            expect(risk.level).toBe('LOW');
        });

        it('should accept MEDIUM risk level', () => {
            const risk = createMockResolutionRisk({ level: 'MEDIUM', score: 45 });
            expect(risk.level).toBe('MEDIUM');
        });

        it('should accept HIGH risk level', () => {
            const risk = createMockResolutionRisk({ level: 'HIGH', score: 75 });
            expect(risk.level).toBe('HIGH');
        });
    });

    describe('Risk Factors', () => {
        it('should support multiple factors', () => {
            const risk = createMockResolutionRisk({
                level: 'HIGH',
                score: 70,
                factors: [
                    'Ambiguous term: "officially announced" undefined',
                    'Resolution source is social media post',
                    'Similar markets had 23% historical dispute rate',
                ],
            });

            expect(risk.factors.length).toBe(3);
        });

        it('should allow optional historicalDisputes', () => {
            const risk = createMockResolutionRisk({
                historicalDisputes: 'Similar markets had 23% dispute rate',
            });

            expect(risk.historicalDisputes).toBe('Similar markets had 23% dispute rate');
        });
    });
});

// ============================================
// TESTS: MaxwellIntelligence
// ============================================

describe('MaxwellIntelligence Type Contract', () => {
    describe('Market Context Section', () => {
        it('should have all required market fields', () => {
            const intel = createMockMaxwellIntelligence();

            expect(intel.market.question).toBeDefined();
            expect(intel.market.type).toBeDefined();
            expect(intel.market.deadline).toBeDefined();
            expect(intel.market.deadlineDate).toBeDefined();
            expect(intel.market.resolutionCriteria).toBeDefined();
        });
    });

    describe('Assessment Section', () => {
        it('should have all required assessment fields', () => {
            const intel = createMockMaxwellIntelligence();

            expect(intel.assessment.primaryOutcome).toBeDefined();
            expect(typeof intel.assessment.marketPrice).toBe('number');
            expect(intel.assessment.maxwellRange).toBeDefined();
            expect(intel.assessment.maxwellRange.low).toBeDefined();
            expect(intel.assessment.maxwellRange.mid).toBeDefined();
            expect(intel.assessment.maxwellRange.high).toBeDefined();
            expect(intel.assessment.verdict).toBeDefined();
            expect(intel.assessment.confidence).toBeDefined();
            expect(intel.assessment.headline).toBeDefined();
        });

        it('should have maxwell range with low < mid < high', () => {
            const intel = createMockMaxwellIntelligence();
            const range = intel.assessment.maxwellRange;

            expect(range.low).toBeLessThanOrEqual(range.mid);
            expect(range.mid).toBeLessThanOrEqual(range.high);
        });
    });

    describe('Verdict Values', () => {
        it('should accept UNDERPRICED verdict', () => {
            const intel = createMockMaxwellIntelligence();
            intel.assessment.verdict = 'UNDERPRICED';
            expect(intel.assessment.verdict).toBe('UNDERPRICED');
        });

        it('should accept OVERPRICED verdict', () => {
            const intel = createMockMaxwellIntelligence();
            intel.assessment.verdict = 'OVERPRICED';
            expect(intel.assessment.verdict).toBe('OVERPRICED');
        });

        it('should accept FAIR verdict', () => {
            const intel = createMockMaxwellIntelligence();
            intel.assessment.verdict = 'FAIR';
            expect(intel.assessment.verdict).toBe('FAIR');
        });

        it('should accept UNCERTAIN verdict', () => {
            const intel = createMockMaxwellIntelligence();
            intel.assessment.verdict = 'UNCERTAIN';
            expect(intel.assessment.verdict).toBe('UNCERTAIN');
        });
    });

    describe('Confidence Levels', () => {
        it('should accept HIGH confidence', () => {
            const intel = createMockMaxwellIntelligence();
            intel.assessment.confidence = 'HIGH';
            expect(intel.assessment.confidence).toBe('HIGH');
        });

        it('should accept MEDIUM confidence', () => {
            const intel = createMockMaxwellIntelligence();
            intel.assessment.confidence = 'MEDIUM';
            expect(intel.assessment.confidence).toBe('MEDIUM');
        });

        it('should accept LOW confidence', () => {
            const intel = createMockMaxwellIntelligence();
            intel.assessment.confidence = 'LOW';
            expect(intel.assessment.confidence).toBe('LOW');
        });
    });

    describe('Thesis Section', () => {
        it('should have factorsFor and factorsAgainst arrays', () => {
            const intel = createMockMaxwellIntelligence();

            expect(Array.isArray(intel.thesis.factorsFor)).toBe(true);
            expect(Array.isArray(intel.thesis.factorsAgainst)).toBe(true);
        });

        it('should have keyUncertainty and nextCatalyst', () => {
            const intel = createMockMaxwellIntelligence();

            expect(intel.thesis.keyUncertainty).toBeDefined();
            expect(intel.thesis.nextCatalyst).toBeDefined();
            expect(intel.thesis.nextCatalyst.event).toBeDefined();
            expect(intel.thesis.nextCatalyst.impact).toBeDefined();
        });

        it('should allow optional sourceConflicts', () => {
            const intel = createMockMaxwellIntelligence();
            intel.thesis.sourceConflicts = ['ESPN and NFL.com disagree on injury status'];

            expect(intel.thesis.sourceConflicts).toBeDefined();
            expect(intel.thesis.sourceConflicts?.length).toBe(1);
        });
    });

    describe('Outcomes Section (Optional)', () => {
        it('should allow outcomes array for multi-option markets', () => {
            const intel = createMockMaxwellIntelligence();

            expect(intel.outcomes).toBeDefined();
            expect(Array.isArray(intel.outcomes)).toBe(true);
        });

        it('should have valid OutcomeAnalysis structure', () => {
            const intel = createMockMaxwellIntelligence();
            const outcome = intel.outcomes?.[0];

            if (outcome) {
                expect(outcome.name).toBeDefined();
                expect(typeof outcome.marketPrice).toBe('number');
                expect(outcome.maxwellRange).toBeDefined();
                expect(['UNDERPRICED', 'OVERPRICED', 'FAIR', 'UNCERTAIN']).toContain(outcome.view);
                expect(['HIGH', 'MEDIUM', 'LOW']).toContain(outcome.confidence);
                expect(outcome.oneLiner).toBeDefined();
                expect(typeof outcome.rank).toBe('number');
            }
        });
    });

    describe('Arbitrage Section (Optional)', () => {
        it('should allow arbitrage detection', () => {
            const intel = createMockMaxwellIntelligence({
                arbitrage: {
                    detected: true,
                    description: 'Polymarket 24% vs Kalshi 28%',
                    spread: 0.04,
                },
            });

            expect(intel.arbitrage?.detected).toBe(true);
            expect(intel.arbitrage?.spread).toBe(0.04);
        });

        it('should allow no arbitrage', () => {
            const intel = createMockMaxwellIntelligence({
                arbitrage: {
                    detected: false,
                },
            });

            expect(intel.arbitrage?.detected).toBe(false);
        });
    });

    describe('Verification Section', () => {
        it('should have all required verification fields', () => {
            const intel = createMockMaxwellIntelligence();

            expect(typeof intel.verification.score).toBe('number');
            expect(['VERIFIED', 'PARTIAL', 'LOW_CONFIDENCE']).toContain(intel.verification.level);
            expect(typeof intel.verification.sourcesAnalyzed).toBe('number');
            expect(typeof intel.verification.claimsVerified).toBe('number');
            expect(typeof intel.verification.claimsDisputed).toBe('number');
            expect(Array.isArray(intel.verification.topSources)).toBe(true);
        });

        it('should have valid verification score range', () => {
            const intel = createMockMaxwellIntelligence();

            expect(intel.verification.score).toBeGreaterThanOrEqual(0);
            expect(intel.verification.score).toBeLessThanOrEqual(100);
        });
    });

    describe('Raw Data Section', () => {
        it('should preserve raw pipeline outputs', () => {
            const intel = createMockMaxwellIntelligence();

            expect(intel.raw.synthesis).toBeDefined();
            expect(intel.raw.adjudication).toBeDefined();
            expect(Array.isArray(intel.raw.allSources)).toBe(true);
            expect(Array.isArray(intel.raw.allClaims)).toBe(true);
        });
    });

    describe('Metadata Section', () => {
        it('should have generation metadata', () => {
            const intel = createMockMaxwellIntelligence();

            expect(intel.generatedAt).toBeDefined();
            expect(typeof intel.pipelineDurationMs).toBe('number');
            expect(intel.modelUsed).toBeDefined();
        });

        it('should have valid ISO timestamp', () => {
            const intel = createMockMaxwellIntelligence();
            const parsed = new Date(intel.generatedAt);

            expect(parsed.toString()).not.toBe('Invalid Date');
        });
    });
});

// ============================================
// TESTS: Supporting Types
// ============================================

describe('ThesisFactor Type Contract', () => {
    it('should have all required fields', () => {
        const factor = createMockThesisFactor();

        expect(factor.point).toBeDefined();
        expect(factor.evidence).toBeDefined();
        expect(typeof factor.sourceIndex).toBe('number');
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(factor.confidence);
    });
});

describe('OutcomeAnalysis Type Contract', () => {
    it('should have all required fields', () => {
        const outcome = createMockOutcomeAnalysis();

        expect(outcome.name).toBeDefined();
        expect(typeof outcome.marketPrice).toBe('number');
        expect(outcome.maxwellRange).toBeDefined();
        expect(['UNDERPRICED', 'OVERPRICED', 'FAIR', 'UNCERTAIN']).toContain(outcome.view);
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(outcome.confidence);
        expect(outcome.oneLiner).toBeDefined();
        expect(typeof outcome.rank).toBe('number');
    });

    it('should have valid rank (positive integer)', () => {
        const outcome = createMockOutcomeAnalysis();

        expect(outcome.rank).toBeGreaterThanOrEqual(1);
    });
});

describe('SourceSummary Type Contract', () => {
    it('should have all required fields', () => {
        const source: SourceSummary = {
            title: 'ESPN NFL Coverage',
            domain: 'espn.com',
            relevanceScore: 0.95,
        };

        expect(source.title).toBeDefined();
        expect(source.domain).toBeDefined();
        expect(typeof source.relevanceScore).toBe('number');
        expect(source.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(source.relevanceScore).toBeLessThanOrEqual(1);
    });
});

describe('SourceReference Type Contract', () => {
    it('should have all required fields', () => {
        const source: SourceReference = {
            index: 1,
            title: 'ESPN NFL Coverage',
            url: 'https://espn.com/nfl/story',
            snippet: 'Seattle Seahawks have the healthiest roster...',
        };

        expect(typeof source.index).toBe('number');
        expect(source.title).toBeDefined();
        expect(source.url).toBeDefined();
        expect(source.snippet).toBeDefined();
    });

    it('should allow optional date', () => {
        const source: SourceReference = {
            index: 1,
            title: 'ESPN',
            url: 'https://espn.com',
            snippet: 'Content',
            date: '2026-01-15',
        };

        expect(source.date).toBe('2026-01-15');
    });
});

describe('ClaimReference Type Contract', () => {
    it('should have all required fields', () => {
        const claim: ClaimReference = {
            id: 'c1',
            text: 'Seattle has the healthiest roster in the NFL',
            confidence: 0.85,
            entailment: 'SUPPORTED',
        };

        expect(claim.id).toBeDefined();
        expect(claim.text).toBeDefined();
        expect(typeof claim.confidence).toBe('number');
        expect(['SUPPORTED', 'CONTRADICTED', 'NEUTRAL']).toContain(claim.entailment);
    });

    it('should have valid confidence range', () => {
        const claim: ClaimReference = {
            id: 'c1',
            text: 'Test claim',
            confidence: 0.85,
            entailment: 'SUPPORTED',
        };

        expect(claim.confidence).toBeGreaterThanOrEqual(0);
        expect(claim.confidence).toBeLessThanOrEqual(1);
    });
});
