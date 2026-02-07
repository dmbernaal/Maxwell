# Phase 4: Resolution Risk Scoring

> **Parent PRD**: [Maxwell Trader Intelligence Revamp](../maxwell-trader-revamp.prd.md)  
> **Status**: Ready for Implementation  
> **Estimated Effort**: Day 4 (~4-6 hours)  
> **Dependencies**: Phase 3 (Synthesis Updates) - COMPLETE

---

## Objective

Add **AI-powered resolution risk scoring** to the verification phase. Resolution disputes are the **#1 trader pain point** — no existing tool predicts which markets will face disputed resolutions. After this phase, Maxwell will analyze resolution criteria and flag markets with ambiguous language, unreliable sources, or high dispute likelihood.

### Key Value Proposition

| Current State | Future State |
|---------------|--------------|
| No resolution risk assessment | AI-powered resolution risk scoring |
| Traders discover disputes post-facto | Proactive risk identification |
| No analysis of resolution source reliability | Source reliability assessment |
| No edge case identification | Explicit edge case warnings |
| No platform-specific risk awareness | Platform-specific risk factors |

---

## Deliverables

| # | Deliverable | File Location | Effort |
|---|-------------|---------------|--------|
| 1 | Add `RESOLUTION_RISK_PROMPT` constant | `app/lib/maxwell/prompts.ts` | M |
| 2 | Add `createResolutionRiskPrompt()` helper | `app/lib/maxwell/prompts.ts` | S |
| 3 | Add `ResolutionRiskFactorSchema` Zod schema | `app/lib/maxwell/verifier.ts` | S |
| 4 | Add `ResolutionRiskAnalysisSchema` Zod schema | `app/lib/maxwell/verifier.ts` | S |
| 5 | Implement `analyzeResolutionRisk()` function | `app/lib/maxwell/verifier.ts` | M |
| 6 | Add `RESOLUTION_RISK_MODEL` constant | `app/lib/maxwell/constants.ts` | S |
| 7 | Write unit tests | `__tests__/unit/resolution-risk.test.ts` | M |

---

## Current State

### Existing `ResolutionRisk` Type (from Phase 1)

```typescript
// In types.ts (already defined)
export type ResolutionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ResolutionRisk {
    level: ResolutionRiskLevel;
    score: number;
    factors: string[];
    historicalDisputes?: string;
}
```

### Existing Verifier Structure

The verifier (`verifier.ts`) currently handles claim verification with these exports:
- `verifyClaims()` - Main verification function
- `verifyWithProgress()` - Streaming verification generator
- `ClaimsSchema`, `EntailmentSchema` - Zod schemas

The resolution risk analysis will be a **new, independent function** that runs **in parallel** with claim verification.

---

## New Implementation

### 1. Resolution Risk Prompt

Add to `prompts.ts`:

```typescript
export const RESOLUTION_RISK_PROMPT = `You are a prediction market resolution analyst.

Your task is to analyze the RESOLUTION CRITERIA of a prediction market and assess the risk of disputes.

MARKET INFORMATION:
- Platform: {platform}
- Title: {title}
- Resolution Rules: {rules}
- Resolution Source: {resolutionSource}
- Deadline: {deadline}

HISTORICAL CONTEXT (if available):
{historicalDisputes}

ANALYZE FOR THESE RISK FACTORS:

1. **AMBIGUOUS LANGUAGE**
   - Words like "significant", "material", "substantial", "reasonable"
   - Undefined terms that require interpretation
   - Subjective criteria ("in the opinion of...")

2. **RESOLUTION SOURCE RELIABILITY**
   - Official government/organization sources = LOW risk
   - Major news outlets = LOW-MEDIUM risk
   - Social media posts = HIGH risk
   - "To be determined" = HIGH risk

3. **EDGE CASES**
   - What happens if the event is cancelled?
   - What if there's a tie or unclear outcome?
   - What if the resolution source is unavailable?

4. **PLATFORM-SPECIFIC RISKS**
   - Polymarket: UMA oracle disputes, whale voting manipulation
   - Kalshi: Centralized resolution, potential for rule interpretation disputes

5. **TEMPORAL RISKS**
   - Very long time horizons increase uncertainty
   - Markets that depend on future announcements
   - "First to X" markets with unclear timing

OUTPUT FORMAT:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "riskScore": 0-100,
  "factors": [
    {
      "type": "ambiguous_language" | "source_reliability" | "edge_case" | "platform_risk" | "temporal_risk",
      "description": "Specific issue identified",
      "severity": "LOW" | "MEDIUM" | "HIGH"
    }
  ],
  "ambiguousTerms": ["term1", "term2"],
  "recommendation": "Brief recommendation for trader awareness",
  "historicalComparison": "Similar markets had X% dispute rate" | null
}

CALIBRATION:
- LOW (0-30): Clear rules, official sources, well-defined outcomes
- MEDIUM (31-60): Some ambiguity but manageable, reputable sources
- HIGH (61-100): Vague criteria, unreliable sources, high dispute likelihood
`;
```

### 2. Prompt Helper Function

Add to `prompts.ts`:

```typescript
export function createResolutionRiskPrompt(marketContext: MarketContext): string {
    return fillPromptTemplate(RESOLUTION_RISK_PROMPT, {
        platform: marketContext.platform,
        title: marketContext.title,
        rules: marketContext.rules,
        resolutionSource: marketContext.resolutionSource || 'Not specified',
        deadline: marketContext.endDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }),
        historicalDisputes: 'No historical dispute data available.',
    });
}
```

### 3. Zod Schemas for Structured Output

Add to `verifier.ts`:

```typescript
/**
 * Risk factor type for resolution risk analysis.
 */
export const ResolutionRiskFactorTypeSchema = z.enum([
    'ambiguous_language',
    'source_reliability',
    'edge_case',
    'platform_risk',
    'temporal_risk',
]);

/**
 * Individual risk factor identified in resolution analysis.
 */
export const ResolutionRiskFactorSchema = z.object({
    type: ResolutionRiskFactorTypeSchema,
    description: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

/**
 * Complete resolution risk analysis output from LLM.
 */
export const ResolutionRiskAnalysisSchema = z.object({
    riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    riskScore: z.number().min(0).max(100),
    factors: z.array(ResolutionRiskFactorSchema),
    ambiguousTerms: z.array(z.string()),
    recommendation: z.string(),
    historicalComparison: z.string().nullable(),
});

export type ResolutionRiskAnalysis = z.infer<typeof ResolutionRiskAnalysisSchema>;
```

### 4. Resolution Risk Analysis Function

Add to `verifier.ts`:

```typescript
import { createResolutionRiskPrompt } from './prompts';
import { RESOLUTION_RISK_MODEL } from './constants';
import type { MarketContext, ResolutionRisk } from './types';

/**
 * Analyzes resolution risk for a prediction market.
 * 
 * This function runs independently of claim verification and can be
 * executed in parallel using Promise.all().
 * 
 * @param marketContext - The market context containing resolution rules
 * @returns Resolution risk assessment
 */
export async function analyzeResolutionRisk(
    marketContext: MarketContext
): Promise<ResolutionRisk> {
    const openrouter = getOpenRouterClient();
    const prompt = createResolutionRiskPrompt(marketContext);

    try {
        const { object } = await generateObject({
            model: openrouter(RESOLUTION_RISK_MODEL),
            prompt,
            schema: ResolutionRiskAnalysisSchema,
        });

        // Map LLM output to ResolutionRisk interface
        return {
            level: object.riskLevel,
            score: object.riskScore,
            factors: object.factors.map(f => f.description),
            historicalDisputes: object.historicalComparison || undefined,
        };
    } catch (error) {
        // Return conservative estimate on failure
        console.error('Resolution risk analysis failed:', error);
        return {
            level: 'MEDIUM',
            score: 50,
            factors: ['Resolution risk analysis failed - defaulting to medium risk'],
            historicalDisputes: undefined,
        };
    }
}
```

### 5. Constants Addition

Add to `constants.ts`:

```typescript
/**
 * Model for resolution risk analysis.
 * Uses a fast, cost-effective model since this is a classification task.
 */
export const RESOLUTION_RISK_MODEL = 'google/gemini-3-flash-preview';
```

---

## Integration Pattern

The resolution risk analysis is designed to run **in parallel** with claim verification:

```typescript
// Example integration (for Phase 5 or Presenter)
async function verifyWithResolutionRisk(
    answer: string,
    sources: MaxwellSource[],
    marketContext: MarketContext,
    precomputedEvidence?: Map<string, EmbeddedPassage[]>
): Promise<VerificationOutput & { resolutionRisk: ResolutionRisk }> {
    // Run in parallel for optimal performance
    const [claimVerification, resolutionRisk] = await Promise.all([
        verifyClaims(answer, sources, undefined, precomputedEvidence),
        analyzeResolutionRisk(marketContext),
    ]);

    return {
        ...claimVerification,
        resolutionRisk,
    };
}
```

**Note**: The `verifyWithResolutionRisk` wrapper function is NOT part of Phase 4 deliverables. Phase 4 only delivers the standalone `analyzeResolutionRisk()` function. Integration happens in Phase 5 (Verification Updates) or Phase 6 (Presenter).

---

## Test Specification

### Test File: `__tests__/unit/resolution-risk.test.ts`

```typescript
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
// RESOLUTION_RISK_PROMPT TESTS
// ============================================

describe('RESOLUTION_RISK_PROMPT', () => {
    it('should be defined and non-empty', () => {
        expect(RESOLUTION_RISK_PROMPT).toBeDefined();
        expect(typeof RESOLUTION_RISK_PROMPT).toBe('string');
        expect(RESOLUTION_RISK_PROMPT.length).toBeGreaterThan(500);
    });

    it('should contain required placeholders', () => {
        const requiredPlaceholders = [
            '{platform}',
            '{title}',
            '{rules}',
            '{resolutionSource}',
            '{deadline}',
            '{historicalDisputes}',
        ];

        for (const placeholder of requiredPlaceholders) {
            expect(RESOLUTION_RISK_PROMPT).toContain(placeholder);
        }
    });

    it('should contain all risk factor categories', () => {
        const riskCategories = [
            'AMBIGUOUS LANGUAGE',
            'RESOLUTION SOURCE RELIABILITY',
            'EDGE CASES',
            'PLATFORM-SPECIFIC RISKS',
            'TEMPORAL RISKS',
        ];

        for (const category of riskCategories) {
            expect(RESOLUTION_RISK_PROMPT).toContain(category);
        }
    });

    it('should contain calibration guidelines', () => {
        expect(RESOLUTION_RISK_PROMPT).toContain('LOW (0-30)');
        expect(RESOLUTION_RISK_PROMPT).toContain('MEDIUM (31-60)');
        expect(RESOLUTION_RISK_PROMPT).toContain('HIGH (61-100)');
    });

    it('should mention platform-specific risks', () => {
        expect(RESOLUTION_RISK_PROMPT).toContain('Polymarket');
        expect(RESOLUTION_RISK_PROMPT).toContain('UMA oracle');
        expect(RESOLUTION_RISK_PROMPT).toContain('Kalshi');
    });

    it('should specify output format', () => {
        expect(RESOLUTION_RISK_PROMPT).toContain('OUTPUT FORMAT:');
        expect(RESOLUTION_RISK_PROMPT).toContain('"riskLevel"');
        expect(RESOLUTION_RISK_PROMPT).toContain('"riskScore"');
        expect(RESOLUTION_RISK_PROMPT).toContain('"factors"');
    });
});

// ============================================
// createResolutionRiskPrompt TESTS
// ============================================

describe('createResolutionRiskPrompt', () => {
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

        // Should contain formatted date (e.g., "February 8, 2026")
        expect(prompt).toContain('February');
        expect(prompt).toContain('2026');
    });
});

// ============================================
// ZOD SCHEMA TESTS
// ============================================

describe('ResolutionRiskFactorTypeSchema', () => {
    it('should accept valid factor types', () => {
        const validTypes = [
            'ambiguous_language',
            'source_reliability',
            'edge_case',
            'platform_risk',
            'temporal_risk',
        ];

        for (const type of validTypes) {
            expect(() => ResolutionRiskFactorTypeSchema.parse(type)).not.toThrow();
        }
    });

    it('should reject invalid factor types', () => {
        expect(() => ResolutionRiskFactorTypeSchema.parse('invalid_type')).toThrow();
        expect(() => ResolutionRiskFactorTypeSchema.parse('')).toThrow();
        expect(() => ResolutionRiskFactorTypeSchema.parse(123)).toThrow();
    });
});

describe('ResolutionRiskFactorSchema', () => {
    it('should accept valid risk factors', () => {
        const validFactor = {
            type: 'ambiguous_language',
            description: 'Uses term "significant" without definition',
            severity: 'MEDIUM',
        };

        expect(() => ResolutionRiskFactorSchema.parse(validFactor)).not.toThrow();
    });

    it('should accept all severity levels', () => {
        const severities = ['LOW', 'MEDIUM', 'HIGH'];

        for (const severity of severities) {
            const factor = {
                type: 'edge_case',
                description: 'Test factor',
                severity,
            };
            expect(() => ResolutionRiskFactorSchema.parse(factor)).not.toThrow();
        }
    });

    it('should reject missing fields', () => {
        expect(() => ResolutionRiskFactorSchema.parse({ type: 'edge_case' })).toThrow();
        expect(() => ResolutionRiskFactorSchema.parse({ description: 'test' })).toThrow();
        expect(() => ResolutionRiskFactorSchema.parse({ severity: 'LOW' })).toThrow();
    });

    it('should reject invalid severity', () => {
        const invalidFactor = {
            type: 'platform_risk',
            description: 'Test',
            severity: 'CRITICAL', // Invalid
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

    it('should accept all risk levels', () => {
        const levels = ['LOW', 'MEDIUM', 'HIGH'];

        for (const level of levels) {
            const analysis = {
                riskLevel: level,
                riskScore: 50,
                factors: [],
                ambiguousTerms: [],
                recommendation: 'Test',
                historicalComparison: null,
            };
            expect(() => ResolutionRiskAnalysisSchema.parse(analysis)).not.toThrow();
        }
    });

    it('should reject riskScore outside 0-100 range', () => {
        const lowAnalysis = {
            riskLevel: 'LOW',
            riskScore: -5,
            factors: [],
            ambiguousTerms: [],
            recommendation: 'Test',
            historicalComparison: null,
        };
        expect(() => ResolutionRiskAnalysisSchema.parse(lowAnalysis)).toThrow();

        const highAnalysis = {
            riskLevel: 'HIGH',
            riskScore: 150,
            factors: [],
            ambiguousTerms: [],
            recommendation: 'Test',
            historicalComparison: null,
        };
        expect(() => ResolutionRiskAnalysisSchema.parse(highAnalysis)).toThrow();
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

        // Simulate the mapping done in analyzeResolutionRisk
        const resolutionRisk: ResolutionRisk = {
            level: llmOutput.riskLevel,
            score: llmOutput.riskScore,
            factors: llmOutput.factors.map(f => f.description),
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
});

// ============================================
// EDGE CASE TESTS
// ============================================

describe('Edge Cases', () => {
    describe('createResolutionRiskPrompt edge cases', () => {
        function createMockMarketContext(overrides?: Partial<MarketContext>): MarketContext {
            return {
                id: 'poly:test',
                platform: 'polymarket',
                title: 'Test Market',
                type: 'binary',
                outcomes: [
                    { name: 'Yes', price: 0.5 },
                    { name: 'No', price: 0.5 },
                ],
                rules: 'Test rules',
                endDate: new Date('2026-12-31'),
                volume: 1000,
                volume24h: 100,
                ...overrides,
            };
        }

        it('should handle empty rules string', () => {
            const marketContext = createMockMarketContext({ rules: '' });
            const prompt = createResolutionRiskPrompt(marketContext);

            // Should still fill the placeholder, just with empty string
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
                title: 'Will "AI" reach <100ms> latency & cost $0.01/query?' 
            });
            const prompt = createResolutionRiskPrompt(marketContext);

            expect(prompt).toContain('Will "AI" reach <100ms> latency & cost $0.01/query?');
        });
    });

    describe('ResolutionRiskAnalysisSchema boundary tests', () => {
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
    });
});

// ============================================
// PROMPT CONTENT TESTS (DETAILED)
// ============================================

describe('RESOLUTION_RISK_PROMPT detailed content', () => {
    it('should contain ambiguous language examples', () => {
        expect(RESOLUTION_RISK_PROMPT).toContain('significant');
        expect(RESOLUTION_RISK_PROMPT).toContain('material');
        expect(RESOLUTION_RISK_PROMPT).toContain('substantial');
        expect(RESOLUTION_RISK_PROMPT).toContain('reasonable');
    });

    it('should contain source reliability examples', () => {
        expect(RESOLUTION_RISK_PROMPT).toContain('Official government');
        expect(RESOLUTION_RISK_PROMPT).toContain('Social media');
        expect(RESOLUTION_RISK_PROMPT).toContain('Major news outlets');
    });

    it('should contain edge case examples', () => {
        expect(RESOLUTION_RISK_PROMPT).toContain('event is cancelled');
        expect(RESOLUTION_RISK_PROMPT).toContain('tie');
        expect(RESOLUTION_RISK_PROMPT).toContain('resolution source is unavailable');
    });

    it('should contain all factor types in output format', () => {
        expect(RESOLUTION_RISK_PROMPT).toContain('ambiguous_language');
        expect(RESOLUTION_RISK_PROMPT).toContain('source_reliability');
        expect(RESOLUTION_RISK_PROMPT).toContain('edge_case');
        expect(RESOLUTION_RISK_PROMPT).toContain('platform_risk');
        expect(RESOLUTION_RISK_PROMPT).toContain('temporal_risk');
    });
});
```

---

## Implementation Checklist

### prompts.ts
- [ ] Add `RESOLUTION_RISK_PROMPT` constant
- [ ] Add `createResolutionRiskPrompt()` helper function
- [ ] Export new prompt and helper

### verifier.ts
- [ ] Import `MarketContext` type
- [ ] Import `createResolutionRiskPrompt` from prompts
- [ ] Import `RESOLUTION_RISK_MODEL` from constants
- [ ] Add `ResolutionRiskFactorTypeSchema` Zod schema
- [ ] Add `ResolutionRiskFactorSchema` Zod schema
- [ ] Add `ResolutionRiskAnalysisSchema` Zod schema
- [ ] Add `ResolutionRiskAnalysis` type export
- [ ] Implement `analyzeResolutionRisk()` function
- [ ] Export schemas and function

### constants.ts
- [ ] Add `RESOLUTION_RISK_MODEL` constant

### Tests
- [ ] Create `__tests__/unit/resolution-risk.test.ts`
- [ ] Test `RESOLUTION_RISK_PROMPT` contains required placeholders
- [ ] Test `RESOLUTION_RISK_PROMPT` contains risk categories
- [ ] Test `RESOLUTION_RISK_PROMPT` contains calibration guidelines
- [ ] Test `RESOLUTION_RISK_PROMPT` contains ambiguous language examples
- [ ] Test `RESOLUTION_RISK_PROMPT` contains all factor types
- [ ] Test `createResolutionRiskPrompt()` fills all placeholders
- [ ] Test `createResolutionRiskPrompt()` handles missing resolutionSource
- [ ] Test `createResolutionRiskPrompt()` handles empty rules
- [ ] Test `createResolutionRiskPrompt()` handles special characters
- [ ] Test `ResolutionRiskFactorTypeSchema` validates factor types
- [ ] Test `ResolutionRiskFactorSchema` validates complete factors
- [ ] Test `ResolutionRiskAnalysisSchema` validates complete analysis
- [ ] Test `ResolutionRiskAnalysisSchema` accepts boundary scores (0, 100)
- [ ] Test `ResolutionRiskAnalysisSchema` rejects out-of-range scores
- [ ] Test type compatibility between LLM output and ResolutionRisk interface

---

## Verification Criteria

1. **Prompt Quality**: `RESOLUTION_RISK_PROMPT` contains all risk categories and calibration guidelines
2. **Schema Validation**: All Zod schemas validate correct inputs and reject invalid ones
3. **Type Safety**: `analyzeResolutionRisk()` returns a valid `ResolutionRisk` object
4. **Graceful Failure**: Function returns conservative estimate on LLM failure (MEDIUM, score 50)
5. **Independence**: Function can run standalone without claim verification
6. **Parallelizable**: Function signature enables `Promise.all()` usage
7. **Tests Pass**: All new and existing tests pass
8. **Build Passes**: `npm run build` completes successfully

---

## Risk Factor Categories

| Category | Examples | Default Severity |
|----------|----------|------------------|
| `ambiguous_language` | "significant", "material", "reasonable" | MEDIUM-HIGH |
| `source_reliability` | Official sources = LOW, Twitter = HIGH | Varies |
| `edge_case` | Event cancellation, ties, source unavailable | MEDIUM |
| `platform_risk` | UMA oracle disputes, centralized resolution | MEDIUM-HIGH |
| `temporal_risk` | Long horizons, "first to X" markets | MEDIUM |

---

## Score Calibration

| Score Range | Level | Characteristics |
|-------------|-------|-----------------|
| 0-30 | LOW | Clear rules, official sources, well-defined outcomes |
| 31-60 | MEDIUM | Some ambiguity but manageable, reputable sources |
| 61-100 | HIGH | Vague criteria, unreliable sources, high dispute likelihood |

---

## Example Usage

### Input

```typescript
const marketContext: MarketContext = {
    id: 'poly:trump-pardon',
    platform: 'polymarket',
    title: 'Will Trump pardon himself?',
    type: 'binary',
    outcomes: [
        { name: 'Yes', price: 0.35 },
        { name: 'No', price: 0.65 },
    ],
    rules: 'Resolves YES if Trump issues a pardon for himself before leaving office.',
    resolutionSource: 'Official White House announcement',
    endDate: new Date('2029-01-20'),
    volume: 50000000,
    volume24h: 2000000,
};

const risk = await analyzeResolutionRisk(marketContext);
```

### Expected Output

```typescript
{
    level: 'HIGH',
    score: 75,
    factors: [
        'Self-pardon legality is constitutionally untested',
        'Resolution may require Supreme Court interpretation',
        'No clear precedent for self-pardon resolution'
    ],
    historicalDisputes: 'Constitutional ambiguity markets have 35% dispute rate'
}
```

---

## Notes

- The `analyzeResolutionRisk()` function is **stateless** and does not depend on claim verification
- Designed for **parallel execution** with `verifyClaims()` via `Promise.all()`
- Uses a **fast, cheap model** (Gemini Flash) since this is a classification task
- Returns **conservative estimate** on failure to avoid silent errors
- The `factors` array in `ResolutionRisk` contains **description strings only** (mapped from full factor objects)
- Phase 5 or 6 will integrate this into the full verification flow

---

## Next Phase

Upon completion, proceed to **Phase 5: Verification Updates** which will:
- Create `verifyWithResolutionRisk()` wrapper function
- Integrate resolution risk into `VerificationOutput`
- Update verification API endpoint to support market context
