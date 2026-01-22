/**
 * Phase 4: Resolution Risk Scoring Tests
 *
 * Tests for AI-powered resolution risk analysis:
 * 1. RESOLUTION_RISK_PROMPT contains required content
 * 2. createResolutionRiskPrompt() fills placeholders correctly
 * 3. Zod schemas validate LLM output
 * 4. Type compatibility between LLM output and ResolutionRisk interface
 *
 * Run: npm test -- __tests__/unit/resolution-risk.test.ts
 */

import { z } from 'zod';
import type { MarketContext, ResolutionRisk } from '../../app/lib/maxwell/types';
import {
    RESOLUTION_RISK_PROMPT,
    createResolutionRiskPrompt,
} from '../../app/lib/maxwell/prompts';
import {
    ResolutionRiskFactorTypeSchema,
    ResolutionRiskFactorSchema,
    ResolutionRiskAnalysisSchema,
} from '../../app/lib/maxwell/verifier';
import { RESOLUTION_RISK_MODEL } from '../../app/lib/maxwell/constants';

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
        rules: 'This market resolves YES if X happens before December 31, 2026.',
        endDate: new Date('2026-12-31'),
        volume: 1000000,
        volume24h: 50000,
        ...overrides,
    };
}

// ============================================
// RESOLUTION_RISK_PROMPT TESTS
// ============================================

describe('RESOLUTION_RISK_PROMPT', () => {
    it('should be defined and non-empty', () => {
        expect(RESOLUTION_RISK_PROMPT).toBeDefined();
        expect(typeof RESOLUTION_RISK_PROMPT).toBe('string');
        expect(RESOLUTION_RISK_PROMPT.length).toBeGreaterThan(500);
    });

    describe('Required Placeholders', () => {
        const requiredPlaceholders = [
            '{platform}',
            '{title}',
            '{rules}',
            '{resolutionSource}',
            '{deadline}',
            '{historicalDisputes}',
        ];

        for (const placeholder of requiredPlaceholders) {
            it(`should contain placeholder ${placeholder}`, () => {
                expect(RESOLUTION_RISK_PROMPT).toContain(placeholder);
            });
        }
    });

    describe('Risk Factor Categories', () => {
        const riskCategories = [
            'AMBIGUOUS LANGUAGE',
            'RESOLUTION SOURCE RELIABILITY',
            'EDGE CASES',
            'PLATFORM-SPECIFIC RISKS',
            'TEMPORAL RISKS',
        ];

        for (const category of riskCategories) {
            it(`should contain risk category: ${category}`, () => {
                expect(RESOLUTION_RISK_PROMPT).toContain(category);
            });
        }
    });

    describe('Calibration Guidelines', () => {
        it('should contain LOW calibration (0-30)', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('LOW (0-30)');
        });

        it('should contain MEDIUM calibration (31-60)', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('MEDIUM (31-60)');
        });

        it('should contain HIGH calibration (61-100)', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('HIGH (61-100)');
        });
    });

    describe('Platform-Specific Risks', () => {
        it('should mention Polymarket', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('Polymarket');
        });

        it('should mention UMA oracle', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('UMA oracle');
        });

        it('should mention Kalshi', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('Kalshi');
        });
    });

    describe('Output Format', () => {
        it('should specify output format section', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('OUTPUT FORMAT:');
        });

        it('should contain riskLevel in output', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('"riskLevel"');
        });

        it('should contain riskScore in output', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('"riskScore"');
        });

        it('should contain factors in output', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('"factors"');
        });
    });
});

// ============================================
// RESOLUTION_RISK_PROMPT DETAILED CONTENT TESTS
// ============================================

describe('RESOLUTION_RISK_PROMPT detailed content', () => {
    describe('Ambiguous Language Examples', () => {
        const ambiguousTerms = ['significant', 'material', 'substantial', 'reasonable'];

        for (const term of ambiguousTerms) {
            it(`should contain ambiguous term example: ${term}`, () => {
                expect(RESOLUTION_RISK_PROMPT).toContain(term);
            });
        }
    });

    describe('Source Reliability Examples', () => {
        it('should mention official government sources', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('Official government');
        });

        it('should mention social media as high risk', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('Social media');
        });

        it('should mention major news outlets', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('Major news outlets');
        });
    });

    describe('Edge Case Examples', () => {
        it('should mention event cancellation', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('event is cancelled');
        });

        it('should mention tie scenarios', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('tie');
        });

        it('should mention unavailable resolution source', () => {
            expect(RESOLUTION_RISK_PROMPT).toContain('resolution source is unavailable');
        });
    });

    describe('Factor Types in Output Format', () => {
        const factorTypes = [
            'ambiguous_language',
            'source_reliability',
            'edge_case',
            'platform_risk',
            'temporal_risk',
        ];

        for (const factorType of factorTypes) {
            it(`should contain factor type: ${factorType}`, () => {
                expect(RESOLUTION_RISK_PROMPT).toContain(factorType);
            });
        }
    });
});

// ============================================
// createResolutionRiskPrompt TESTS
// ============================================

describe('createResolutionRiskPrompt', () => {
    it('should fill all placeholders', () => {
        const marketContext = createMockMarketContext();
        const prompt = createResolutionRiskPrompt(marketContext);

        expect(prompt).not.toContain('{platform}');
        expect(prompt).not.toContain('{title}');
        expect(prompt).not.toContain('{rules}');
        expect(prompt).not.toContain('{resolutionSource}');
        expect(prompt).not.toContain('{deadline}');
        expect(prompt).not.toContain('{historicalDisputes}');
    });

    it('should include platform in prompt', () => {
        const marketContext = createMockMarketContext({ platform: 'kalshi' });
        const prompt = createResolutionRiskPrompt(marketContext);

        expect(prompt).toContain('kalshi');
    });

    it('should include market title in prompt', () => {
        const marketContext = createMockMarketContext({ title: 'Super Bowl 2026 Winner' });
        const prompt = createResolutionRiskPrompt(marketContext);

        expect(prompt).toContain('Super Bowl 2026 Winner');
    });

    it('should include resolution rules in prompt', () => {
        const rules = 'Resolves based on official NFL announcement';
        const marketContext = createMockMarketContext({ rules });
        const prompt = createResolutionRiskPrompt(marketContext);

        expect(prompt).toContain(rules);
    });

    it('should include resolution source when provided', () => {
        const marketContext = createMockMarketContext({ resolutionSource: 'Associated Press' });
        const prompt = createResolutionRiskPrompt(marketContext);

        expect(prompt).toContain('Associated Press');
    });

    it('should handle missing resolution source', () => {
        const marketContext = createMockMarketContext();
        delete (marketContext as any).resolutionSource;
        const prompt = createResolutionRiskPrompt(marketContext);

        expect(prompt).toContain('Not specified');
    });

    it('should format deadline correctly', () => {
        const marketContext = createMockMarketContext({ endDate: new Date('2026-02-08') });
        const prompt = createResolutionRiskPrompt(marketContext);

        expect(prompt).toContain('February');
        expect(prompt).toContain('2026');
    });

    describe('Edge Cases', () => {
        it('should handle empty rules string', () => {
            const marketContext = createMockMarketContext({ rules: '' });
            const prompt = createResolutionRiskPrompt(marketContext);

            expect(prompt).not.toContain('{rules}');
            expect(prompt).toContain('Resolution Rules:');
        });

        it('should handle very long rules', () => {
            const longRules = 'A'.repeat(5000);
            const marketContext = createMockMarketContext({ rules: longRules });
            const prompt = createResolutionRiskPrompt(marketContext);

            expect(prompt).toContain(longRules);
        });

        it('should handle special characters in title', () => {
            const marketContext = createMockMarketContext({
                title: 'Will "AI" reach <100ms> latency & cost $0.01/query?',
            });
            const prompt = createResolutionRiskPrompt(marketContext);

            expect(prompt).toContain('Will "AI" reach <100ms> latency & cost $0.01/query?');
        });
    });
});

// ============================================
// ZOD SCHEMA TESTS
// ============================================

describe('ResolutionRiskFactorTypeSchema', () => {
    const validTypes = [
        'ambiguous_language',
        'source_reliability',
        'edge_case',
        'platform_risk',
        'temporal_risk',
    ];

    for (const type of validTypes) {
        it(`should accept valid factor type: ${type}`, () => {
            expect(() => ResolutionRiskFactorTypeSchema.parse(type)).not.toThrow();
        });
    }

    it('should reject invalid factor type', () => {
        expect(() => ResolutionRiskFactorTypeSchema.parse('invalid_type')).toThrow();
    });

    it('should reject empty string', () => {
        expect(() => ResolutionRiskFactorTypeSchema.parse('')).toThrow();
    });

    it('should reject number', () => {
        expect(() => ResolutionRiskFactorTypeSchema.parse(123)).toThrow();
    });
});

describe('ResolutionRiskFactorSchema', () => {
    it('should accept valid risk factor', () => {
        const validFactor = {
            type: 'ambiguous_language',
            description: 'Uses term "significant" without definition',
            severity: 'MEDIUM',
        };

        expect(() => ResolutionRiskFactorSchema.parse(validFactor)).not.toThrow();
    });

    describe('Severity Levels', () => {
        const severities = ['LOW', 'MEDIUM', 'HIGH'];

        for (const severity of severities) {
            it(`should accept severity: ${severity}`, () => {
                const factor = {
                    type: 'edge_case',
                    description: 'Test factor',
                    severity,
                };
                expect(() => ResolutionRiskFactorSchema.parse(factor)).not.toThrow();
            });
        }
    });

    it('should reject missing type field', () => {
        expect(() =>
            ResolutionRiskFactorSchema.parse({ description: 'test', severity: 'LOW' })
        ).toThrow();
    });

    it('should reject missing description field', () => {
        expect(() =>
            ResolutionRiskFactorSchema.parse({ type: 'edge_case', severity: 'LOW' })
        ).toThrow();
    });

    it('should reject missing severity field', () => {
        expect(() =>
            ResolutionRiskFactorSchema.parse({ type: 'edge_case', description: 'test' })
        ).toThrow();
    });

    it('should reject invalid severity', () => {
        const invalidFactor = {
            type: 'platform_risk',
            description: 'Test',
            severity: 'CRITICAL',
        };
        expect(() => ResolutionRiskFactorSchema.parse(invalidFactor)).toThrow();
    });
});

describe('ResolutionRiskAnalysisSchema', () => {
    it('should accept valid complete analysis', () => {
        const validAnalysis = {
            riskLevel: 'MEDIUM',
            riskScore: 45,
            factors: [
                {
                    type: 'ambiguous_language',
                    description: 'Uses "material impact" without definition',
                    severity: 'MEDIUM',
                },
            ],
            ambiguousTerms: ['material', 'significant'],
            recommendation: 'Verify resolution criteria interpretation with platform',
            historicalComparison: 'Similar markets had 15% dispute rate',
        };

        expect(() => ResolutionRiskAnalysisSchema.parse(validAnalysis)).not.toThrow();
    });

    it('should accept null historicalComparison', () => {
        const analysis = {
            riskLevel: 'LOW',
            riskScore: 15,
            factors: [],
            ambiguousTerms: [],
            recommendation: 'Clear resolution criteria',
            historicalComparison: null,
        };

        expect(() => ResolutionRiskAnalysisSchema.parse(analysis)).not.toThrow();
    });

    describe('Risk Levels', () => {
        const levels = ['LOW', 'MEDIUM', 'HIGH'];

        for (const level of levels) {
            it(`should accept risk level: ${level}`, () => {
                const analysis = {
                    riskLevel: level,
                    riskScore: 50,
                    factors: [],
                    ambiguousTerms: [],
                    recommendation: 'Test',
                    historicalComparison: null,
                };
                expect(() => ResolutionRiskAnalysisSchema.parse(analysis)).not.toThrow();
            });
        }
    });

    describe('riskScore Validation', () => {
        it('should accept riskScore = 0 (boundary)', () => {
            const analysis = {
                riskLevel: 'LOW',
                riskScore: 0,
                factors: [],
                ambiguousTerms: [],
                recommendation: 'Perfect clarity',
                historicalComparison: null,
            };
            expect(() => ResolutionRiskAnalysisSchema.parse(analysis)).not.toThrow();
        });

        it('should accept riskScore = 100 (boundary)', () => {
            const analysis = {
                riskLevel: 'HIGH',
                riskScore: 100,
                factors: [],
                ambiguousTerms: [],
                recommendation: 'Maximum risk',
                historicalComparison: null,
            };
            expect(() => ResolutionRiskAnalysisSchema.parse(analysis)).not.toThrow();
        });

        it('should accept decimal riskScore', () => {
            const analysis = {
                riskLevel: 'MEDIUM',
                riskScore: 45.5,
                factors: [],
                ambiguousTerms: [],
                recommendation: 'Test',
                historicalComparison: null,
            };
            expect(() => ResolutionRiskAnalysisSchema.parse(analysis)).not.toThrow();
        });

        it('should reject negative riskScore', () => {
            const analysis = {
                riskLevel: 'LOW',
                riskScore: -5,
                factors: [],
                ambiguousTerms: [],
                recommendation: 'Test',
                historicalComparison: null,
            };
            expect(() => ResolutionRiskAnalysisSchema.parse(analysis)).toThrow();
        });

        it('should reject riskScore > 100', () => {
            const analysis = {
                riskLevel: 'HIGH',
                riskScore: 150,
                factors: [],
                ambiguousTerms: [],
                recommendation: 'Test',
                historicalComparison: null,
            };
            expect(() => ResolutionRiskAnalysisSchema.parse(analysis)).toThrow();
        });
    });

    it('should accept empty factors array', () => {
        const analysis = {
            riskLevel: 'LOW',
            riskScore: 10,
            factors: [],
            ambiguousTerms: [],
            recommendation: 'Clear criteria',
            historicalComparison: null,
        };

        expect(() => ResolutionRiskAnalysisSchema.parse(analysis)).not.toThrow();
    });

    it('should accept multiple factors', () => {
        const analysis = {
            riskLevel: 'HIGH',
            riskScore: 85,
            factors: [
                { type: 'ambiguous_language', description: 'Uses "significant"', severity: 'HIGH' },
                { type: 'source_reliability', description: 'Twitter as source', severity: 'HIGH' },
                { type: 'edge_case', description: 'No tie-breaker rules', severity: 'MEDIUM' },
            ],
            ambiguousTerms: ['significant', 'material'],
            recommendation: 'High dispute risk - consider alternative markets',
            historicalComparison: '40% of similar markets disputed',
        };

        const parsed = ResolutionRiskAnalysisSchema.parse(analysis);
        expect(parsed.factors).toHaveLength(3);
    });
});

// ============================================
// CONSTANTS TESTS
// ============================================

describe('RESOLUTION_RISK_MODEL', () => {
    it('should be defined', () => {
        expect(RESOLUTION_RISK_MODEL).toBeDefined();
    });

    it('should be a valid model string', () => {
        expect(typeof RESOLUTION_RISK_MODEL).toBe('string');
        expect(RESOLUTION_RISK_MODEL.length).toBeGreaterThan(0);
    });

    it('should reference a Google model for cost efficiency', () => {
        expect(RESOLUTION_RISK_MODEL).toContain('google/');
    });
});

// ============================================
// TYPE COMPATIBILITY TESTS
// ============================================

describe('ResolutionRisk type compatibility', () => {
    it('should map LLM analysis output to ResolutionRisk interface', () => {
        const llmOutput = {
            riskLevel: 'MEDIUM' as const,
            riskScore: 45,
            factors: [
                {
                    type: 'ambiguous_language' as const,
                    description: 'Uses vague term "material"',
                    severity: 'MEDIUM' as const,
                },
            ],
            ambiguousTerms: ['material'],
            recommendation: 'Check with platform',
            historicalComparison: '20% dispute rate',
        };

        const resolutionRisk: ResolutionRisk = {
            level: llmOutput.riskLevel,
            score: llmOutput.riskScore,
            factors: llmOutput.factors.map((f) => f.description),
            historicalDisputes: llmOutput.historicalComparison || undefined,
        };

        expect(resolutionRisk.level).toBe('MEDIUM');
        expect(resolutionRisk.score).toBe(45);
        expect(resolutionRisk.factors).toEqual(['Uses vague term "material"']);
        expect(resolutionRisk.historicalDisputes).toBe('20% dispute rate');
    });

    it('should handle null historicalComparison correctly', () => {
        const llmOutput = {
            riskLevel: 'LOW' as const,
            riskScore: 15,
            factors: [],
            ambiguousTerms: [],
            recommendation: 'Clear rules',
            historicalComparison: null,
        };

        const resolutionRisk: ResolutionRisk = {
            level: llmOutput.riskLevel,
            score: llmOutput.riskScore,
            factors: [],
            historicalDisputes: llmOutput.historicalComparison || undefined,
        };

        expect(resolutionRisk.historicalDisputes).toBeUndefined();
    });

    it('should handle multiple factors correctly', () => {
        const llmOutput = {
            riskLevel: 'HIGH' as const,
            riskScore: 80,
            factors: [
                { type: 'ambiguous_language' as const, description: 'Factor 1', severity: 'HIGH' as const },
                { type: 'edge_case' as const, description: 'Factor 2', severity: 'MEDIUM' as const },
                { type: 'platform_risk' as const, description: 'Factor 3', severity: 'HIGH' as const },
            ],
            ambiguousTerms: [],
            recommendation: 'High risk',
            historicalComparison: null,
        };

        const resolutionRisk: ResolutionRisk = {
            level: llmOutput.riskLevel,
            score: llmOutput.riskScore,
            factors: llmOutput.factors.map((f) => f.description),
            historicalDisputes: llmOutput.historicalComparison || undefined,
        };

        expect(resolutionRisk.factors).toHaveLength(3);
        expect(resolutionRisk.factors).toEqual(['Factor 1', 'Factor 2', 'Factor 3']);
    });
});
