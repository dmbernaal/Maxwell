# Phase 5: Presenter Implementation

> **Parent PRD**: [Maxwell Trader Intelligence Revamp](../maxwell-trader-revamp.prd.md)  
> **Status**: Ready for Implementation  
> **Estimated Effort**: Day 5 (~6-8 hours)  
> **Dependencies**: Phase 4 (Resolution Risk Scoring) - COMPLETE

---

## Objective

Implement the **Presenter** — the transformation layer that converts prose outputs from synthesis, verification, and adjudication into structured `MaxwellIntelligence` JSON for UI rendering. The Presenter is the bridge between Maxwell's research pipeline and the frontend components.

### Key Transformation

| Input (Prose) | Output (Structured) |
|---------------|---------------------|
| Synthesis markdown with sections | `assessment`, `thesis`, `outcomes` objects |
| Verification claims array | `verification.score`, `verification.level` |
| Resolution risk analysis | `resolutionRisk` object |
| Adjudication text | `raw.adjudication` |
| Sources array | `raw.allSources`, `verification.topSources` |

---

## Deliverables

| # | Deliverable | File Location | Effort |
|---|-------------|---------------|--------|
| 1 | Add `PRESENTER_SYSTEM_PROMPT` constant | `app/lib/maxwell/prompts.ts` | M |
| 2 | Add `PRESENTER_USER_PROMPT` constant | `app/lib/maxwell/prompts.ts` | L |
| 3 | Add `createPresenterPrompt()` helper | `app/lib/maxwell/prompts.ts` | M |
| 4 | Create `MaxwellIntelligenceSchema` Zod schema | `app/lib/maxwell/presenter.ts` | L |
| 5 | Create `present()` function | `app/lib/maxwell/presenter.ts` | M |
| 6 | Update `/api/maxwell/present` route | `app/api/maxwell/present/route.ts` | M |
| 7 | Add `PresentRequest`/`PresentResponse` to api-types | `app/lib/maxwell/api-types.ts` | S |
| 8 | Write unit tests | `__tests__/unit/presenter.test.ts` | M |

---

## Current State

### Existing Types (from Phase 1)

The `MaxwellIntelligence` interface is already fully defined in `types.ts`:

```typescript
export interface MaxwellIntelligence {
    market: {
        question: string;
        type: IntelligenceMarketType;
        deadline: string;
        deadlineDate: string;
        resolutionCriteria: string;
    };
    resolutionRisk: ResolutionRisk;
    assessment: {
        primaryOutcome: string;
        marketPrice: number;
        maxwellRange: { low: number; mid: number; high: number };
        verdict: IntelligenceVerdict;
        confidence: ConfidenceLevel;
        headline: string;
    };
    thesis: {
        factorsFor: ThesisFactor[];
        factorsAgainst: ThesisFactor[];
        keyUncertainty: string;
        nextCatalyst: { event: string; date?: string; impact: string };
        sourceConflicts?: string[];
    };
    outcomes?: OutcomeAnalysis[];
    arbitrage?: { detected: boolean; description?: string; spread?: number };
    verification: {
        score: number;
        level: IntelligenceVerificationLevel;
        sourcesAnalyzed: number;
        claimsVerified: number;
        claimsDisputed: number;
        topSources: SourceSummary[];
    };
    raw: {
        synthesis: string;
        adjudication: string;
        allSources: SourceReference[];
        allClaims: ClaimReference[];
    };
    generatedAt: string;
    pipelineDurationMs: number;
    modelUsed: string;
}
```

### Existing Route Scaffold (from Phase 1)

```typescript
// app/api/maxwell/present/route.ts
export interface PresentRequest {
    query: string;
    marketContext: MarketContext;
    synthesis: string;
    verification: VerificationOutput;
    adjudication: string;
    sources: MaxwellSource[];
    pipelineDurationMs: number;
}

export interface PresentResponse {
    intelligence: MaxwellIntelligence;
    durationMs: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    return NextResponse.json(
        { error: 'Not implemented - Phase 5' },
        { status: 501 }
    );
}
```

---

## New Implementation

### 1. Presenter System Prompt

Add to `prompts.ts`:

```typescript
export const PRESENTER_SYSTEM_PROMPT = `You are the Presentation Layer for a prediction market intelligence platform.

Your job is to transform research outputs into STRUCTURED JSON that a UI can render beautifully.

CRITICAL PRINCIPLES:

1. **INTELLIGENCE, NOT ADVICE**
   - Say "UNDERPRICED" not "BET YES"
   - Say "Maxwell range: 22-28%" not "I predict 25%"
   - Traders make their own decisions

2. **STRUCTURED, NOT PROSE**
   - Every output field must be concise
   - Headlines are ONE sentence
   - Factor descriptions are ONE sentence each
   - No paragraphs in structured fields

3. **PROBABILITY ESTIMATION**
   - Provide a RANGE (low/mid/high), not a point estimate
   - Base on evidence density and source agreement
   - If sources conflict significantly, widen the range

4. **COMPARATIVE ANALYSIS**
   - For multi-outcome markets, rank ALL analyzed outcomes
   - Compare each outcome's evidence quality
   - Identify the most/least favorable based on research

5. **VERDICTS**
   - UNDERPRICED: Evidence suggests higher probability than market
   - OVERPRICED: Evidence suggests lower probability than market
   - FAIR: Evidence aligns with market pricing
   - UNCERTAIN: Insufficient or conflicting evidence

6. **CONFIDENCE LEVELS**
   - HIGH: Strong evidence consensus, high verification score
   - MEDIUM: Mixed evidence, some verification issues
   - LOW: Conflicting sources, low verification score
`;
```

### 2. Presenter User Prompt

Add to `prompts.ts`:

```typescript
export const PRESENTER_USER_PROMPT = `Transform this prediction market research into structured intelligence.

MARKET CONTEXT:
{marketContextJSON}

SYNTHESIS OUTPUT (Phase 3):
{synthesis}

VERIFICATION OUTPUT (Phase 4):
{verificationJSON}

RESOLUTION RISK (Phase 4):
{resolutionRiskJSON}

ADJUDICATION OUTPUT (Phase 5):
{adjudication}

SOURCES USED:
{sourcesJSON}

PIPELINE DURATION: {durationMs}ms

Generate a MaxwellIntelligence JSON object following this EXACT schema:

{
  "market": {
    "question": "string - the market question in plain language",
    "type": "binary | multi-option | matchup",
    "deadline": "string - human readable like '23 days'",
    "deadlineDate": "ISO date string",
    "resolutionCriteria": "string - plain language summary of how this resolves"
  },
  "assessment": {
    "primaryOutcome": "string - the outcome being primarily assessed",
    "marketPrice": 0.XX,
    "maxwellRange": {
      "low": 0.XX,
      "mid": 0.XX,
      "high": 0.XX
    },
    "verdict": "UNDERPRICED | OVERPRICED | FAIR | UNCERTAIN",
    "confidence": "HIGH | MEDIUM | LOW",
    "headline": "One sentence capturing the key insight"
  },
  "thesis": {
    "factorsFor": [
      {
        "point": "Brief factor title",
        "evidence": "One sentence of supporting evidence",
        "sourceIndex": 1,
        "confidence": "HIGH | MEDIUM | LOW"
      }
    ],
    "factorsAgainst": [
      {
        "point": "Brief factor title",
        "evidence": "One sentence of supporting evidence",
        "sourceIndex": 2,
        "confidence": "HIGH | MEDIUM | LOW"
      }
    ],
    "keyUncertainty": "The single biggest unknown",
    "nextCatalyst": {
      "event": "What event",
      "date": "When (if known)",
      "impact": "How it affects odds"
    },
    "sourceConflicts": ["Array of conflicts or empty"]
  },
  "outcomes": [
    {
      "name": "Outcome name",
      "marketPrice": 0.XX,
      "maxwellRange": { "low": 0.XX, "mid": 0.XX, "high": 0.XX },
      "view": "UNDERPRICED | OVERPRICED | FAIR | UNCERTAIN",
      "confidence": "HIGH | MEDIUM | LOW",
      "oneLiner": "One sentence assessment",
      "rank": 1
    }
  ],
  "arbitrage": {
    "detected": false,
    "description": null,
    "spread": null
  },
  "verification": {
    "score": 0-100,
    "level": "VERIFIED | PARTIAL | LOW_CONFIDENCE",
    "sourcesAnalyzed": number,
    "claimsVerified": number,
    "claimsDisputed": number,
    "topSources": [
      { "title": "string", "domain": "string", "relevanceScore": 0.XX }
    ]
  }
}

RULES:
- factorsFor and factorsAgainst should have 3-5 items each
- outcomes array should be sorted by rank (1 = most favorable)
- topSources should have max 5 items
- All text fields should be concise - no paragraphs
- The headline should be memorable and insightful
- If multi-outcome, the assessment.primaryOutcome should match the rank 1 outcome
- sourceIndex values must reference valid source indices (1-based)
`;
```

### 3. Prompt Helper Function

Add to `prompts.ts`:

```typescript
export function createPresenterPrompt(
    marketContext: MarketContext,
    synthesis: string,
    verification: VerificationOutput,
    resolutionRisk: ResolutionRisk,
    adjudication: string,
    sources: MaxwellSource[],
    pipelineDurationMs: number
): string {
    return fillPromptTemplate(PRESENTER_USER_PROMPT, {
        marketContextJSON: JSON.stringify(marketContext, null, 2),
        synthesis,
        verificationJSON: JSON.stringify({
            claims: verification.claims,
            summary: verification.summary,
        }, null, 2),
        resolutionRiskJSON: JSON.stringify(resolutionRisk, null, 2),
        adjudication,
        sourcesJSON: JSON.stringify(
            sources.map((s, i) => ({
                index: i + 1,
                title: s.title,
                url: s.url,
                snippet: s.snippet.substring(0, 500),
            })),
            null,
            2
        ),
        durationMs: String(pipelineDurationMs),
    });
}
```

### 4. Presenter Module (`presenter.ts`)

Create new file `app/lib/maxwell/presenter.ts`:

```typescript
import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';

import { PRESENTER_SYSTEM_PROMPT, createPresenterPrompt } from './prompts';
import { PRESENTER_MODEL } from './constants';
import type {
    MarketContext,
    MaxwellIntelligence,
    MaxwellSource,
    VerificationOutput,
    ResolutionRisk,
} from './types';

// ============================================
// SCHEMAS
// ============================================

const ThesisFactorSchema = z.object({
    point: z.string(),
    evidence: z.string(),
    sourceIndex: z.number(),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

const OutcomeAnalysisSchema = z.object({
    name: z.string(),
    marketPrice: z.number(),
    maxwellRange: z.object({
        low: z.number(),
        mid: z.number(),
        high: z.number(),
    }),
    view: z.enum(['UNDERPRICED', 'OVERPRICED', 'FAIR', 'UNCERTAIN']),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    oneLiner: z.string(),
    rank: z.number(),
});

const SourceSummarySchema = z.object({
    title: z.string(),
    domain: z.string(),
    relevanceScore: z.number(),
});

export const PresenterOutputSchema = z.object({
    market: z.object({
        question: z.string(),
        type: z.enum(['binary', 'multi-option', 'matchup']),
        deadline: z.string(),
        deadlineDate: z.string(),
        resolutionCriteria: z.string(),
    }),
    assessment: z.object({
        primaryOutcome: z.string(),
        marketPrice: z.number(),
        maxwellRange: z.object({
            low: z.number(),
            mid: z.number(),
            high: z.number(),
        }),
        verdict: z.enum(['UNDERPRICED', 'OVERPRICED', 'FAIR', 'UNCERTAIN']),
        confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
        headline: z.string(),
    }),
    thesis: z.object({
        factorsFor: z.array(ThesisFactorSchema),
        factorsAgainst: z.array(ThesisFactorSchema),
        keyUncertainty: z.string(),
        nextCatalyst: z.object({
            event: z.string(),
            date: z.string().optional(),
            impact: z.string(),
        }),
        sourceConflicts: z.array(z.string()).optional(),
    }),
    outcomes: z.array(OutcomeAnalysisSchema).optional(),
    arbitrage: z.object({
        detected: z.boolean(),
        description: z.string().nullable(),
        spread: z.number().nullable(),
    }).optional(),
    verification: z.object({
        score: z.number().min(0).max(100),
        level: z.enum(['VERIFIED', 'PARTIAL', 'LOW_CONFIDENCE']),
        sourcesAnalyzed: z.number(),
        claimsVerified: z.number(),
        claimsDisputed: z.number(),
        topSources: z.array(SourceSummarySchema),
    }),
});

export type PresenterOutput = z.infer<typeof PresenterOutputSchema>;

// ============================================
// OPENROUTER CLIENT
// ============================================

function getOpenRouterClient() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }
    return createOpenRouter({ apiKey });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateDeadlineString(endDate: Date): string {
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months`;
    return `${Math.ceil(diffDays / 365)} years`;
}

function calculateVerificationLevel(
    score: number
): 'VERIFIED' | 'PARTIAL' | 'LOW_CONFIDENCE' {
    if (score >= 70) return 'VERIFIED';
    if (score >= 40) return 'PARTIAL';
    return 'LOW_CONFIDENCE';
}

function extractTopSources(
    sources: MaxwellSource[],
    claims: VerificationOutput['claims'],
    limit: number = 5
): Array<{ title: string; domain: string; relevanceScore: number }> {
    const sourceScores = new Map<number, number>();
    
    for (const claim of claims) {
        for (const citedIdx of claim.citedSources) {
            const current = sourceScores.get(citedIdx) || 0;
            sourceScores.set(citedIdx, current + claim.confidence);
        }
    }
    
    return sources
        .map((source, idx) => ({
            title: source.title,
            domain: new URL(source.url).hostname.replace('www.', ''),
            relevanceScore: sourceScores.get(idx + 1) || 0,
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit)
        .map((s) => ({
            ...s,
            relevanceScore: Math.min(1, s.relevanceScore / 3),
        }));
}

// ============================================
// MAIN FUNCTION
// ============================================

export interface PresentInput {
    query: string;
    marketContext: MarketContext;
    synthesis: string;
    verification: VerificationOutput;
    resolutionRisk: ResolutionRisk;
    adjudication: string;
    sources: MaxwellSource[];
    pipelineDurationMs: number;
}

export async function present(input: PresentInput): Promise<MaxwellIntelligence> {
    const {
        marketContext,
        synthesis,
        verification,
        resolutionRisk,
        adjudication,
        sources,
        pipelineDurationMs,
    } = input;

    const startTime = Date.now();
    const openrouter = getOpenRouterClient();

    const prompt = createPresenterPrompt(
        marketContext,
        synthesis,
        verification,
        resolutionRisk,
        adjudication,
        sources,
        pipelineDurationMs
    );

    const { object: presenterOutput } = await generateObject({
        model: openrouter(PRESENTER_MODEL),
        system: PRESENTER_SYSTEM_PROMPT,
        prompt,
        schema: PresenterOutputSchema,
    });

    const verificationScore = Math.round(
        (verification.summary.supported /
            Math.max(1, verification.summary.supported + verification.summary.contradicted + verification.summary.neutral)) *
            100
    );

    const intelligence: MaxwellIntelligence = {
        market: {
            question: presenterOutput.market.question,
            type: presenterOutput.market.type,
            deadline: calculateDeadlineString(marketContext.endDate),
            deadlineDate: marketContext.endDate.toISOString(),
            resolutionCriteria: presenterOutput.market.resolutionCriteria,
        },
        resolutionRisk,
        assessment: presenterOutput.assessment,
        thesis: {
            factorsFor: presenterOutput.thesis.factorsFor,
            factorsAgainst: presenterOutput.thesis.factorsAgainst,
            keyUncertainty: presenterOutput.thesis.keyUncertainty,
            nextCatalyst: presenterOutput.thesis.nextCatalyst,
            sourceConflicts: presenterOutput.thesis.sourceConflicts,
        },
        outcomes: presenterOutput.outcomes,
        arbitrage: presenterOutput.arbitrage,
        verification: {
            score: verificationScore,
            level: calculateVerificationLevel(verificationScore),
            sourcesAnalyzed: sources.length,
            claimsVerified: verification.summary.supported,
            claimsDisputed: verification.summary.contradicted,
            topSources: extractTopSources(sources, verification.claims),
        },
        raw: {
            synthesis,
            adjudication,
            allSources: sources.map((s, i) => ({
                index: i + 1,
                title: s.title,
                url: s.url,
                snippet: s.snippet,
                date: s.publishedDate,
            })),
            allClaims: verification.claims.map((c) => ({
                id: c.id,
                text: c.text,
                confidence: c.confidence,
                entailment: c.entailment,
            })),
        },
        generatedAt: new Date().toISOString(),
        pipelineDurationMs: pipelineDurationMs + (Date.now() - startTime),
        modelUsed: PRESENTER_MODEL,
    };

    return intelligence;
}
```

### 5. Constants Addition

Add to `constants.ts`:

```typescript
/** Model for presenter transformation (structured output, fast) */
export const PRESENTER_MODEL = 'google/gemini-3-flash-preview';
```

### 6. Updated API Route

Update `app/api/maxwell/present/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { present } from '@/app/lib/maxwell/presenter';
import { analyzeResolutionRisk } from '@/app/lib/maxwell/verifier';
import type { PresentRequest, PresentResponse } from '@/app/lib/maxwell/api-types';

const PresentRequestSchema = z.object({
    query: z.string().min(1),
    marketContext: z.object({
        id: z.string(),
        platform: z.enum(['polymarket', 'kalshi']),
        title: z.string(),
        type: z.enum(['binary', 'multi-option', 'matchup']),
        outcomes: z.array(z.object({
            name: z.string(),
            price: z.number(),
        })),
        rules: z.string(),
        resolutionSource: z.string().optional(),
        endDate: z.string().transform((s) => new Date(s)),
        volume: z.number(),
        volume24h: z.number(),
    }),
    synthesis: z.string(),
    verification: z.object({
        claims: z.array(z.any()),
        summary: z.object({
            supported: z.number(),
            contradicted: z.number(),
            neutral: z.number(),
        }),
        durationMs: z.number(),
    }),
    adjudication: z.string(),
    sources: z.array(z.object({
        id: z.string(),
        url: z.string(),
        title: z.string(),
        snippet: z.string(),
        fromQuery: z.string(),
        publishedDate: z.string().optional(),
    })),
    pipelineDurationMs: z.number(),
    resolutionRisk: z.object({
        level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
        score: z.number(),
        factors: z.array(z.string()),
        historicalDisputes: z.string().optional(),
    }).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();

    try {
        const body = await request.json();
        const parsed = PresentRequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: parsed.error.issues },
                { status: 400 }
            );
        }

        const {
            query,
            marketContext,
            synthesis,
            verification,
            adjudication,
            sources,
            pipelineDurationMs,
        } = parsed.data;

        // Use provided resolution risk or analyze if not provided
        const resolutionRisk = parsed.data.resolutionRisk || 
            await analyzeResolutionRisk(marketContext);

        const intelligence = await present({
            query,
            marketContext,
            synthesis,
            verification,
            resolutionRisk,
            adjudication,
            sources,
            pipelineDurationMs,
        });

        const response: PresentResponse = {
            intelligence,
            durationMs: Date.now() - startTime,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Present API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
```

### 7. API Types Update

Add to `api-types.ts`:

```typescript
// ============================================
// PRESENT ENDPOINT
// ============================================

export interface PresentRequest {
    query: string;
    marketContext: MarketContext;
    synthesis: string;
    verification: VerificationOutput;
    adjudication: string;
    sources: MaxwellSource[];
    pipelineDurationMs: number;
    resolutionRisk?: ResolutionRisk;
}

export interface PresentResponse {
    intelligence: MaxwellIntelligence;
    durationMs: number;
}
```

---

## Test Specification

### Test File: `__tests__/unit/presenter.test.ts`

```typescript
import type { 
    MarketContext, 
    MaxwellSource, 
    VerificationOutput,
    ResolutionRisk,
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
    return {
        claims: [
            {
                id: 'c1',
                text: 'Claim 1',
                citedSources: [1],
                confidence: 0.85,
                entailment: 'SUPPORTED',
            },
            {
                id: 'c2',
                text: 'Claim 2',
                citedSources: [2],
                confidence: 0.45,
                entailment: 'NEUTRAL',
            },
        ],
        summary: {
            supported: 1,
            contradicted: 0,
            neutral: 1,
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

    it('should reject verification score > 100', () => {
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
                score: 150,
                level: 'VERIFIED',
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

    it('should reference a Google model for structured output', () => {
        expect(PRESENTER_MODEL).toContain('google/');
    });
});
```

---

## Implementation Checklist

### prompts.ts
- [ ] Add `PRESENTER_SYSTEM_PROMPT` constant
- [ ] Add `PRESENTER_USER_PROMPT` constant
- [ ] Add `createPresenterPrompt()` helper function
- [ ] Export new prompts and helper

### constants.ts
- [ ] Add `PRESENTER_MODEL` constant

### presenter.ts (NEW FILE)
- [ ] Create file `app/lib/maxwell/presenter.ts`
- [ ] Add `ThesisFactorSchema` Zod schema
- [ ] Add `OutcomeAnalysisSchema` Zod schema
- [ ] Add `SourceSummarySchema` Zod schema
- [ ] Add `PresenterOutputSchema` Zod schema
- [ ] Add `PresenterOutput` type export
- [ ] Add `getOpenRouterClient()` helper
- [ ] Add `calculateDeadlineString()` helper
- [ ] Add `calculateVerificationLevel()` helper
- [ ] Add `extractTopSources()` helper
- [ ] Add `PresentInput` interface
- [ ] Implement `present()` function
- [ ] Export schemas and function

### api-types.ts
- [ ] Add `PresentRequest` interface
- [ ] Add `PresentResponse` interface
- [ ] Add required imports (`MarketContext`, `ResolutionRisk`, etc.)

### route.ts (UPDATE)
- [ ] Remove 501 stub implementation
- [ ] Add `PresentRequestSchema` Zod validation
- [ ] Import `present()` function
- [ ] Import `analyzeResolutionRisk()` for fallback
- [ ] Implement full POST handler with error handling

### Tests
- [ ] Create `__tests__/unit/presenter.test.ts`
- [ ] Test `PRESENTER_SYSTEM_PROMPT` contains all principles
- [ ] Test `PRESENTER_USER_PROMPT` contains all placeholders
- [ ] Test `PRESENTER_USER_PROMPT` contains schema definitions
- [ ] Test `createPresenterPrompt()` fills all placeholders
- [ ] Test `ThesisFactorSchema` validates factors
- [ ] Test `OutcomeAnalysisSchema` validates outcomes
- [ ] Test `PresenterOutputSchema` validates complete output
- [ ] Test `PRESENTER_MODEL` is defined

---

## Verification Criteria

1. **Prompt Quality**: Both prompts contain all required principles, placeholders, and schema definitions
2. **Schema Validation**: All Zod schemas validate correct inputs and reject invalid ones
3. **Type Safety**: `present()` returns a valid `MaxwellIntelligence` object
4. **Resolution Risk Integration**: Function accepts pre-computed resolution risk OR computes it
5. **API Route**: Returns 200 with valid `PresentResponse` for valid requests, 400 for invalid
6. **Tests Pass**: All new and existing tests pass
7. **Build Passes**: `npm run build` completes successfully

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PresentRequest                              │
├─────────────────────────────────────────────────────────────────────┤
│  query ─────────────────────────────────────────────────────────┐   │
│  marketContext ──────────────────────────────────────────────┐  │   │
│  synthesis (Phase 3 output) ────────────────────────────┐    │  │   │
│  verification (Phase 4 output) ────────────────────┐    │    │  │   │
│  resolutionRisk (Phase 4 output) ──────────────┐   │    │    │  │   │
│  adjudication (Phase 5 output) ────────────┐   │   │    │    │  │   │
│  sources ─────────────────────────────┐    │   │   │    │    │  │   │
│  pipelineDurationMs ─────────────┐    │    │   │   │    │    │  │   │
└──────────────────────────────────│────│────│───│───│────│────│──│───┘
                                   ▼    ▼    ▼   ▼   ▼    ▼    ▼  ▼
                          ┌────────────────────────────────────────────┐
                          │           createPresenterPrompt()          │
                          │  Combines all inputs into structured prompt│
                          └────────────────────────────────────────────┘
                                              │
                                              ▼
                          ┌────────────────────────────────────────────┐
                          │              generateObject()              │
                          │  LLM transforms prose → structured JSON    │
                          │  Schema: PresenterOutputSchema             │
                          └────────────────────────────────────────────┘
                                              │
                                              ▼
                          ┌────────────────────────────────────────────┐
                          │            present() function              │
                          │  Enriches LLM output with computed fields: │
                          │  - deadline string                         │
                          │  - verification level                      │
                          │  - top sources ranking                     │
                          │  - raw data preservation                   │
                          └────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       MaxwellIntelligence                           │
├─────────────────────────────────────────────────────────────────────┤
│  market: { question, type, deadline, deadlineDate, criteria }       │
│  resolutionRisk: { level, score, factors }                          │
│  assessment: { primaryOutcome, marketPrice, maxwellRange, verdict } │
│  thesis: { factorsFor, factorsAgainst, keyUncertainty, catalyst }   │
│  outcomes: [ { name, price, range, view, rank } ]                   │
│  verification: { score, level, sourcesAnalyzed, topSources }        │
│  raw: { synthesis, adjudication, allSources, allClaims }            │
│  generatedAt, pipelineDurationMs, modelUsed                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Example Request/Response

### Request

```json
{
  "query": "Super Bowl Champion 2026",
  "marketContext": {
    "id": "poly:superbowl2026",
    "platform": "polymarket",
    "title": "Super Bowl Champion 2026",
    "type": "multi-option",
    "outcomes": [
      { "name": "Seattle", "price": 0.24 },
      { "name": "Los Angeles Rams", "price": 0.21 }
    ],
    "rules": "Resolves to the Super Bowl LX winner.",
    "endDate": "2026-02-08T00:00:00Z",
    "volume": 675000000,
    "volume24h": 917000
  },
  "synthesis": "## MARKET CONTEXT\n...",
  "verification": {
    "claims": [...],
    "summary": { "supported": 20, "contradicted": 3, "neutral": 7 }
  },
  "resolutionRisk": {
    "level": "LOW",
    "score": 15,
    "factors": []
  },
  "adjudication": "Based on verified evidence...",
  "sources": [...],
  "pipelineDurationMs": 45000
}
```

### Response

```json
{
  "intelligence": {
    "market": {
      "question": "Who will win Super Bowl LX in 2026?",
      "type": "multi-option",
      "deadline": "18 days",
      "deadlineDate": "2026-02-08T00:00:00Z",
      "resolutionCriteria": "Official NFL championship game result"
    },
    "resolutionRisk": {
      "level": "LOW",
      "score": 15,
      "factors": []
    },
    "assessment": {
      "primaryOutcome": "Seattle",
      "marketPrice": 0.24,
      "maxwellRange": { "low": 0.22, "mid": 0.28, "high": 0.34 },
      "verdict": "UNDERPRICED",
      "confidence": "MEDIUM",
      "headline": "Seattle's playoff health advantage is undervalued by the market."
    },
    "thesis": {
      "factorsFor": [
        { "point": "Healthiest roster", "evidence": "Fewest IR players of any playoff team", "sourceIndex": 1, "confidence": "HIGH" }
      ],
      "factorsAgainst": [
        { "point": "No playoff experience", "evidence": "Zero current players with SB experience", "sourceIndex": 3, "confidence": "MEDIUM" }
      ],
      "keyUncertainty": "How Seattle performs in high-pressure playoff situations",
      "nextCatalyst": { "event": "NFC Divisional Round", "date": "Jan 18", "impact": "First playoff test" }
    },
    "outcomes": [
      { "name": "Seattle", "marketPrice": 0.24, "maxwellRange": { "low": 0.22, "mid": 0.28, "high": 0.34 }, "view": "UNDERPRICED", "confidence": "MEDIUM", "oneLiner": "Health advantage undervalued", "rank": 1 }
    ],
    "verification": {
      "score": 82,
      "level": "VERIFIED",
      "sourcesAnalyzed": 30,
      "claimsVerified": 20,
      "claimsDisputed": 3,
      "topSources": [
        { "title": "ESPN", "domain": "espn.com", "relevanceScore": 0.95 }
      ]
    },
    "raw": { ... },
    "generatedAt": "2026-01-20T15:30:00Z",
    "pipelineDurationMs": 47500,
    "modelUsed": "google/gemini-3-flash-preview"
  },
  "durationMs": 2500
}
```

---

## Notes

- The `present()` function does NOT call resolution risk analysis by default — it expects it as input
- The API route has a fallback to call `analyzeResolutionRisk()` if not provided in request
- Verification score is computed from the claims summary, not from LLM output
- The `deadline` string is computed from `endDate`, not from LLM output (ensures accuracy)
- Top sources are ranked by claim citation frequency weighted by confidence
- All `raw` fields preserve the original prose for potential UI display

---

## Next Phase

Upon completion, proceed to **Phase 6: Hook Updates** which will:
- Update `use-maxwell.ts` to accept `MarketContext`
- Add presenter phase to the pipeline
- Replace `answer`/`adjudication` with `intelligence`
- Update caching to use `MaxwellIntelligence`
