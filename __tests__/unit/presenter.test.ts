import type {
    MarketContext,
    MaxwellSource,
    VerificationOutput,
    ResolutionRisk,
    VerifiedClaim,
} from '../../app/lib/maxwell/types';
import {
    PRESENTER_SYSTEM_PROMPT,
    PRESENTER_USER_PROMPT,
    createPresenterPrompt,
} from '../../app/lib/maxwell/prompts';
import {
    PresenterOutputSchema,
    ThesisFactorSchema,
    OutcomeAnalysisSchema,
    SourceSummarySchema,
} from '../../app/lib/maxwell/presenter';
import { PRESENTER_MODEL } from '../../app/lib/maxwell/constants';

// ============================================
// HELPER FUNCTIONS
// ============================================

function createMockMarketContext(overrides?: Partial<MarketContext>): MarketContext {
    return {
        id: 'poly:test-market',
        platform: 'polymarket',
        title: 'Will X happen by 2026?',
        type: 'binary',
        outcomes: [
            { name: 'Yes', price: 0.65 },
            { name: 'No', price: 0.35 },
        ],
        rules: 'Resolves YES if X happens.',
        endDate: new Date('2026-12-31'),
        volume: 1000000,
        volume24h: 50000,
        ...overrides,
    };
}

function createMockSources(count: number): MaxwellSource[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `s${i + 1}`,
        url: `https://example${i + 1}.com/article`,
        title: `Source ${i + 1}`,
        snippet: `Content from source ${i + 1}`,
        fromQuery: 'q1',
    }));
}

function createMockVerification(): VerificationOutput {
    const claims: VerifiedClaim[] = [
        {
            id: 'c1',
            text: 'Claim 1',
            confidence: 0.85,
            confidenceLevel: 'high',
            entailment: 'SUPPORTED',
            entailmentReasoning: 'Evidence supports this claim',
            bestMatchingSource: {
                sourceId: 's1',
                sourceTitle: 'Source 1',
                sourceIndex: 1,
                passage: 'Relevant passage',
                similarity: 0.9,
                isCitedSource: true,
            },
            citationMismatch: false,
            citedSourceSupport: 0.9,
            globalBestSupport: 0.9,
            numericCheck: null,
            issues: [],
        },
        {
            id: 'c2',
            text: 'Claim 2',
            confidence: 0.45,
            confidenceLevel: 'medium',
            entailment: 'NEUTRAL',
            entailmentReasoning: 'Evidence does not address this claim',
            bestMatchingSource: {
                sourceId: 's2',
                sourceTitle: 'Source 2',
                sourceIndex: 2,
                passage: 'Another passage',
                similarity: 0.6,
                isCitedSource: true,
            },
            citationMismatch: false,
            citedSourceSupport: 0.6,
            globalBestSupport: 0.6,
            numericCheck: null,
            issues: [],
        },
    ];

    return {
        claims,
        overallConfidence: 65,
        summary: {
            supported: 1,
            contradicted: 0,
            uncertain: 1,
            citationMismatches: 0,
            numericMismatches: 0,
        },
        durationMs: 5000,
    };
}

function createMockResolutionRisk(): ResolutionRisk {
    return {
        level: 'LOW',
        score: 20,
        factors: [],
        historicalDisputes: undefined,
    };
}

// ============================================
// PRESENTER_SYSTEM_PROMPT TESTS
// ============================================

describe('PRESENTER_SYSTEM_PROMPT', () => {
    it('should be defined and non-empty', () => {
        expect(PRESENTER_SYSTEM_PROMPT).toBeDefined();
        expect(typeof PRESENTER_SYSTEM_PROMPT).toBe('string');
        expect(PRESENTER_SYSTEM_PROMPT.length).toBeGreaterThan(200);
    });

    describe('Critical Principles', () => {
        it('should contain INTELLIGENCE, NOT ADVICE principle', () => {
            expect(PRESENTER_SYSTEM_PROMPT).toContain('INTELLIGENCE, NOT ADVICE');
        });

        it('should contain STRUCTURED, NOT PROSE principle', () => {
            expect(PRESENTER_SYSTEM_PROMPT).toContain('STRUCTURED, NOT PROSE');
        });

        it('should contain PROBABILITY ESTIMATION principle', () => {
            expect(PRESENTER_SYSTEM_PROMPT).toContain('PROBABILITY ESTIMATION');
        });

        it('should contain COMPARATIVE ANALYSIS principle', () => {
            expect(PRESENTER_SYSTEM_PROMPT).toContain('COMPARATIVE ANALYSIS');
        });

        it('should contain VERDICTS principle', () => {
            expect(PRESENTER_SYSTEM_PROMPT).toContain('VERDICTS');
        });

        it('should contain CONFIDENCE LEVELS principle', () => {
            expect(PRESENTER_SYSTEM_PROMPT).toContain('CONFIDENCE LEVELS');
        });
    });

    describe('Verdict Definitions', () => {
        it('should define UNDERPRICED', () => {
            expect(PRESENTER_SYSTEM_PROMPT).toContain('UNDERPRICED');
        });

        it('should define OVERPRICED', () => {
            expect(PRESENTER_SYSTEM_PROMPT).toContain('OVERPRICED');
        });

        it('should define FAIR', () => {
            expect(PRESENTER_SYSTEM_PROMPT).toContain('FAIR');
        });

        it('should define UNCERTAIN', () => {
            expect(PRESENTER_SYSTEM_PROMPT).toContain('UNCERTAIN');
        });
    });
});

// ============================================
// PRESENTER_USER_PROMPT TESTS
// ============================================

describe('PRESENTER_USER_PROMPT', () => {
    it('should be defined and substantial', () => {
        expect(PRESENTER_USER_PROMPT).toBeDefined();
        expect(PRESENTER_USER_PROMPT.length).toBeGreaterThan(1000);
    });

    describe('Required Placeholders', () => {
        const placeholders = [
            '{marketContextJSON}',
            '{synthesis}',
            '{verificationJSON}',
            '{resolutionRiskJSON}',
            '{adjudication}',
            '{sourcesJSON}',
            '{durationMs}',
        ];

        for (const placeholder of placeholders) {
            it(`should contain placeholder ${placeholder}`, () => {
                expect(PRESENTER_USER_PROMPT).toContain(placeholder);
            });
        }
    });

    describe('Schema Structure', () => {
        it('should define market schema', () => {
            expect(PRESENTER_USER_PROMPT).toContain('"market"');
            expect(PRESENTER_USER_PROMPT).toContain('"question"');
            expect(PRESENTER_USER_PROMPT).toContain('"deadline"');
        });

        it('should define assessment schema', () => {
            expect(PRESENTER_USER_PROMPT).toContain('"assessment"');
            expect(PRESENTER_USER_PROMPT).toContain('"maxwellRange"');
            expect(PRESENTER_USER_PROMPT).toContain('"verdict"');
            expect(PRESENTER_USER_PROMPT).toContain('"headline"');
        });

        it('should define thesis schema', () => {
            expect(PRESENTER_USER_PROMPT).toContain('"thesis"');
            expect(PRESENTER_USER_PROMPT).toContain('"factorsFor"');
            expect(PRESENTER_USER_PROMPT).toContain('"factorsAgainst"');
            expect(PRESENTER_USER_PROMPT).toContain('"keyUncertainty"');
            expect(PRESENTER_USER_PROMPT).toContain('"nextCatalyst"');
        });

        it('should define outcomes schema', () => {
            expect(PRESENTER_USER_PROMPT).toContain('"outcomes"');
            expect(PRESENTER_USER_PROMPT).toContain('"oneLiner"');
            expect(PRESENTER_USER_PROMPT).toContain('"rank"');
        });

        it('should define verification schema', () => {
            expect(PRESENTER_USER_PROMPT).toContain('"verification"');
            expect(PRESENTER_USER_PROMPT).toContain('"sourcesAnalyzed"');
            expect(PRESENTER_USER_PROMPT).toContain('"claimsVerified"');
            expect(PRESENTER_USER_PROMPT).toContain('"topSources"');
        });
    });

    describe('Rules', () => {
        it('should specify factor count rule', () => {
            expect(PRESENTER_USER_PROMPT).toContain('3-5 items');
        });

        it('should specify outcome sorting rule', () => {
            expect(PRESENTER_USER_PROMPT).toContain('sorted by rank');
        });

        it('should specify topSources limit', () => {
            expect(PRESENTER_USER_PROMPT).toContain('max 5');
        });

        it('should specify conciseness rule', () => {
            expect(PRESENTER_USER_PROMPT).toContain('concise');
        });
    });
});

// ============================================
// createPresenterPrompt TESTS
// ============================================

describe('createPresenterPrompt', () => {
    it('should fill all placeholders', () => {
        const prompt = createPresenterPrompt(
            createMockMarketContext(),
            '## MARKET CONTEXT\nTest synthesis',
            createMockVerification(),
            createMockResolutionRisk(),
            'Test adjudication',
            createMockSources(3),
            45000
        );

        expect(prompt).not.toContain('{marketContextJSON}');
        expect(prompt).not.toContain('{synthesis}');
        expect(prompt).not.toContain('{verificationJSON}');
        expect(prompt).not.toContain('{resolutionRiskJSON}');
        expect(prompt).not.toContain('{adjudication}');
        expect(prompt).not.toContain('{sourcesJSON}');
        expect(prompt).not.toContain('{durationMs}');
    });

    it('should include market context JSON', () => {
        const marketContext = createMockMarketContext({ title: 'Super Bowl 2026' });
        const prompt = createPresenterPrompt(
            marketContext,
            'Test synthesis',
            createMockVerification(),
            createMockResolutionRisk(),
            'Test adjudication',
            createMockSources(2),
            30000
        );

        expect(prompt).toContain('Super Bowl 2026');
    });

    it('should include synthesis text', () => {
        const prompt = createPresenterPrompt(
            createMockMarketContext(),
            '## MARKET CONTEXT\nThis is the synthesis output with detailed analysis.',
            createMockVerification(),
            createMockResolutionRisk(),
            'Test adjudication',
            createMockSources(2),
            30000
        );

        expect(prompt).toContain('This is the synthesis output');
    });

    it('should include pipeline duration', () => {
        const prompt = createPresenterPrompt(
            createMockMarketContext(),
            'Test synthesis',
            createMockVerification(),
            createMockResolutionRisk(),
            'Test adjudication',
            createMockSources(2),
            45000
        );

        expect(prompt).toContain('45000');
    });

    it('should include verification JSON', () => {
        const verification = createMockVerification();
        const prompt = createPresenterPrompt(
            createMockMarketContext(),
            'Test synthesis',
            verification,
            createMockResolutionRisk(),
            'Test adjudication',
            createMockSources(2),
            30000
        );

        expect(prompt).toContain('"supported"');
        expect(prompt).toContain('"contradicted"');
    });

    it('should include resolution risk JSON', () => {
        const resolutionRisk = createMockResolutionRisk();
        const prompt = createPresenterPrompt(
            createMockMarketContext(),
            'Test synthesis',
            createMockVerification(),
            resolutionRisk,
            'Test adjudication',
            createMockSources(2),
            30000
        );

        expect(prompt).toContain('"level"');
        expect(prompt).toContain('"LOW"');
    });

    it('should include adjudication text', () => {
        const prompt = createPresenterPrompt(
            createMockMarketContext(),
            'Test synthesis',
            createMockVerification(),
            createMockResolutionRisk(),
            'Based on verified evidence, the market appears fairly priced.',
            createMockSources(2),
            30000
        );

        expect(prompt).toContain('Based on verified evidence');
    });

    it('should include sources with indices', () => {
        const sources = createMockSources(3);
        const prompt = createPresenterPrompt(
            createMockMarketContext(),
            'Test synthesis',
            createMockVerification(),
            createMockResolutionRisk(),
            'Test adjudication',
            sources,
            30000
        );

        expect(prompt).toContain('"index": 1');
        expect(prompt).toContain('"index": 2');
        expect(prompt).toContain('"index": 3');
    });
});

// ============================================
// ZOD SCHEMA TESTS
// ============================================

describe('ThesisFactorSchema', () => {
    it('should accept valid thesis factor', () => {
        const factor = {
            point: 'Strong evidence',
            evidence: 'Multiple sources confirm this.',
            sourceIndex: 1,
            confidence: 'HIGH',
        };
        expect(() => ThesisFactorSchema.parse(factor)).not.toThrow();
    });

    it('should reject missing fields', () => {
        expect(() => ThesisFactorSchema.parse({ point: 'Test' })).toThrow();
    });

    it('should reject invalid confidence', () => {
        const factor = {
            point: 'Test',
            evidence: 'Test',
            sourceIndex: 1,
            confidence: 'EXTREME',
        };
        expect(() => ThesisFactorSchema.parse(factor)).toThrow();
    });

    it('should accept all confidence levels', () => {
        const levels = ['HIGH', 'MEDIUM', 'LOW'];
        for (const confidence of levels) {
            const factor = {
                point: 'Test',
                evidence: 'Test',
                sourceIndex: 1,
                confidence,
            };
            expect(() => ThesisFactorSchema.parse(factor)).not.toThrow();
        }
    });
});

describe('OutcomeAnalysisSchema', () => {
    it('should accept valid outcome analysis', () => {
        const outcome = {
            name: 'Seattle',
            marketPrice: 0.24,
            maxwellRange: { low: 0.22, mid: 0.28, high: 0.34 },
            view: 'UNDERPRICED',
            confidence: 'MEDIUM',
            oneLiner: 'Health advantage undervalued.',
            rank: 1,
        };
        expect(() => OutcomeAnalysisSchema.parse(outcome)).not.toThrow();
    });

    it('should accept all verdict types', () => {
        const verdicts = ['UNDERPRICED', 'OVERPRICED', 'FAIR', 'UNCERTAIN'];
        for (const view of verdicts) {
            const outcome = {
                name: 'Test',
                marketPrice: 0.5,
                maxwellRange: { low: 0.4, mid: 0.5, high: 0.6 },
                view,
                confidence: 'MEDIUM',
                oneLiner: 'Test',
                rank: 1,
            };
            expect(() => OutcomeAnalysisSchema.parse(outcome)).not.toThrow();
        }
    });

    it('should reject invalid view', () => {
        const outcome = {
            name: 'Test',
            marketPrice: 0.5,
            maxwellRange: { low: 0.4, mid: 0.5, high: 0.6 },
            view: 'INVALID',
            confidence: 'MEDIUM',
            oneLiner: 'Test',
            rank: 1,
        };
        expect(() => OutcomeAnalysisSchema.parse(outcome)).toThrow();
    });

    it('should reject missing maxwellRange fields', () => {
        const outcome = {
            name: 'Test',
            marketPrice: 0.5,
            maxwellRange: { low: 0.4, mid: 0.5 }, // missing high
            view: 'FAIR',
            confidence: 'MEDIUM',
            oneLiner: 'Test',
            rank: 1,
        };
        expect(() => OutcomeAnalysisSchema.parse(outcome)).toThrow();
    });
});

describe('SourceSummarySchema', () => {
    it('should accept valid source summary', () => {
        const source = {
            title: 'ESPN',
            domain: 'espn.com',
            relevanceScore: 0.95,
        };
        expect(() => SourceSummarySchema.parse(source)).not.toThrow();
    });

    it('should reject missing fields', () => {
        expect(() => SourceSummarySchema.parse({ title: 'ESPN' })).toThrow();
    });

    it('should accept zero relevance score', () => {
        const source = {
            title: 'Test',
            domain: 'test.com',
            relevanceScore: 0,
        };
        expect(() => SourceSummarySchema.parse(source)).not.toThrow();
    });
});

describe('PresenterOutputSchema', () => {
    it('should accept valid complete output', () => {
        const output = {
            market: {
                question: 'Who will win Super Bowl 2026?',
                type: 'multi-option',
                deadline: '23 days',
                deadlineDate: '2026-02-08T00:00:00Z',
                resolutionCriteria: 'Official NFL result',
            },
            assessment: {
                primaryOutcome: 'Seattle',
                marketPrice: 0.24,
                maxwellRange: { low: 0.22, mid: 0.28, high: 0.34 },
                verdict: 'UNDERPRICED',
                confidence: 'MEDIUM',
                headline: 'Seattle health advantage undervalued by market.',
            },
            thesis: {
                factorsFor: [
                    { point: 'Healthy roster', evidence: 'Fewest injuries', sourceIndex: 1, confidence: 'HIGH' },
                ],
                factorsAgainst: [
                    { point: 'No experience', evidence: 'First playoffs', sourceIndex: 2, confidence: 'MEDIUM' },
                ],
                keyUncertainty: 'Playoff performance unknown',
                nextCatalyst: { event: 'Divisional Round', date: 'Jan 18', impact: 'First test' },
                sourceConflicts: [],
            },
            verification: {
                score: 82,
                level: 'VERIFIED',
                sourcesAnalyzed: 30,
                claimsVerified: 24,
                claimsDisputed: 6,
                topSources: [
                    { title: 'ESPN', domain: 'espn.com', relevanceScore: 0.95 },
                ],
            },
        };

        expect(() => PresenterOutputSchema.parse(output)).not.toThrow();
    });

    it('should accept output with optional outcomes', () => {
        const output = {
            market: {
                question: 'Test?',
                type: 'binary',
                deadline: '5 days',
                deadlineDate: '2026-01-25T00:00:00Z',
                resolutionCriteria: 'Test',
            },
            assessment: {
                primaryOutcome: 'Yes',
                marketPrice: 0.65,
                maxwellRange: { low: 0.60, mid: 0.70, high: 0.80 },
                verdict: 'FAIR',
                confidence: 'HIGH',
                headline: 'Market is fairly priced.',
            },
            thesis: {
                factorsFor: [],
                factorsAgainst: [],
                keyUncertainty: 'Unknown',
                nextCatalyst: { event: 'None', impact: 'None' },
            },
            verification: {
                score: 75,
                level: 'VERIFIED',
                sourcesAnalyzed: 10,
                claimsVerified: 8,
                claimsDisputed: 2,
                topSources: [],
            },
            outcomes: [
                {
                    name: 'Yes',
                    marketPrice: 0.65,
                    maxwellRange: { low: 0.60, mid: 0.70, high: 0.80 },
                    view: 'FAIR',
                    confidence: 'HIGH',
                    oneLiner: 'Fairly priced.',
                    rank: 1,
                },
            ],
        };

        expect(() => PresenterOutputSchema.parse(output)).not.toThrow();
    });

    it('should accept output with optional arbitrage', () => {
        const output = {
            market: {
                question: 'Test?',
                type: 'binary',
                deadline: '5 days',
                deadlineDate: '2026-01-25T00:00:00Z',
                resolutionCriteria: 'Test',
            },
            assessment: {
                primaryOutcome: 'Yes',
                marketPrice: 0.65,
                maxwellRange: { low: 0.60, mid: 0.70, high: 0.80 },
                verdict: 'FAIR',
                confidence: 'HIGH',
                headline: 'Market is fairly priced.',
            },
            thesis: {
                factorsFor: [],
                factorsAgainst: [],
                keyUncertainty: 'Unknown',
                nextCatalyst: { event: 'None', impact: 'None' },
            },
            verification: {
                score: 75,
                level: 'VERIFIED',
                sourcesAnalyzed: 10,
                claimsVerified: 8,
                claimsDisputed: 2,
                topSources: [],
            },
            arbitrage: {
                detected: true,
                description: '3% spread between Polymarket and Kalshi',
                spread: 0.03,
            },
        };

        expect(() => PresenterOutputSchema.parse(output)).not.toThrow();
    });

    it('should accept any numeric verification score (clamping happens in code, not schema)', () => {
        // Schema constraint removed for Anthropic API compatibility.
        // Score clamping (0-100) is enforced in presenter.ts code instead.
        const makeOutput = (score: number) => ({
            market: {
                question: 'Test?',
                type: 'binary',
                deadline: '5 days',
                deadlineDate: '2026-01-25T00:00:00Z',
                resolutionCriteria: 'Test',
            },
            assessment: {
                primaryOutcome: 'Yes',
                marketPrice: 0.65,
                maxwellRange: { low: 0.60, mid: 0.70, high: 0.80 },
                verdict: 'FAIR',
                confidence: 'HIGH',
                headline: 'Test.',
            },
            thesis: {
                factorsFor: [],
                factorsAgainst: [],
                keyUncertainty: 'Unknown',
                nextCatalyst: { event: 'None', impact: 'None' },
            },
            verification: {
                score,
                level: 'VERIFIED',
                sourcesAnalyzed: 10,
                claimsVerified: 8,
                claimsDisputed: 2,
                topSources: [],
            },
        });

        expect(() => PresenterOutputSchema.parse(makeOutput(150))).not.toThrow();
        expect(() => PresenterOutputSchema.parse(makeOutput(-10))).not.toThrow();
        expect(() => PresenterOutputSchema.parse(makeOutput(75))).not.toThrow();
    });

    it('should reject invalid market type', () => {
        const output = {
            market: {
                question: 'Test?',
                type: 'invalid',
                deadline: '5 days',
                deadlineDate: '2026-01-25T00:00:00Z',
                resolutionCriteria: 'Test',
            },
            assessment: {
                primaryOutcome: 'Yes',
                marketPrice: 0.65,
                maxwellRange: { low: 0.60, mid: 0.70, high: 0.80 },
                verdict: 'FAIR',
                confidence: 'HIGH',
                headline: 'Test.',
            },
            thesis: {
                factorsFor: [],
                factorsAgainst: [],
                keyUncertainty: 'Unknown',
                nextCatalyst: { event: 'None', impact: 'None' },
            },
            verification: {
                score: 75,
                level: 'VERIFIED',
                sourcesAnalyzed: 10,
                claimsVerified: 8,
                claimsDisputed: 2,
                topSources: [],
            },
        };

        expect(() => PresenterOutputSchema.parse(output)).toThrow();
    });

    it('should reject invalid verification level', () => {
        const output = {
            market: {
                question: 'Test?',
                type: 'binary',
                deadline: '5 days',
                deadlineDate: '2026-01-25T00:00:00Z',
                resolutionCriteria: 'Test',
            },
            assessment: {
                primaryOutcome: 'Yes',
                marketPrice: 0.65,
                maxwellRange: { low: 0.60, mid: 0.70, high: 0.80 },
                verdict: 'FAIR',
                confidence: 'HIGH',
                headline: 'Test.',
            },
            thesis: {
                factorsFor: [],
                factorsAgainst: [],
                keyUncertainty: 'Unknown',
                nextCatalyst: { event: 'None', impact: 'None' },
            },
            verification: {
                score: 75,
                level: 'INVALID_LEVEL',
                sourcesAnalyzed: 10,
                claimsVerified: 8,
                claimsDisputed: 2,
                topSources: [],
            },
        };

        expect(() => PresenterOutputSchema.parse(output)).toThrow();
    });
});

// ============================================
// CONSTANTS TESTS
// ============================================

describe('PRESENTER_MODEL', () => {
    it('should be defined', () => {
        expect(PRESENTER_MODEL).toBeDefined();
    });

    it('should be a valid model string', () => {
        expect(typeof PRESENTER_MODEL).toBe('string');
        expect(PRESENTER_MODEL.length).toBeGreaterThan(0);
    });

    it('should use a strong model for calibrated probability estimation', () => {
        expect(PRESENTER_MODEL).toBe('anthropic/claude-sonnet-4.5');
    });
});
