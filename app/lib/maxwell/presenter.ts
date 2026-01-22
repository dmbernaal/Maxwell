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
    VerifiedClaim,
} from './types';

// ============================================
// SCHEMAS
// ============================================

export const ThesisFactorSchema = z.object({
    point: z.string(),
    evidence: z.string(),
    sourceIndex: z.number(),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

export const OutcomeAnalysisSchema = z.object({
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

export const SourceSummarySchema = z.object({
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

export function calculateDeadlineString(endDate: Date): string {
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

export function calculateVerificationLevel(
    score: number
): 'VERIFIED' | 'PARTIAL' | 'LOW_CONFIDENCE' {
    if (score >= 70) return 'VERIFIED';
    if (score >= 40) return 'PARTIAL';
    return 'LOW_CONFIDENCE';
}

export function extractTopSources(
    sources: MaxwellSource[],
    claims: VerifiedClaim[],
    limit: number = 5
): Array<{ title: string; domain: string; relevanceScore: number }> {
    const sourceScores = new Map<number, number>();

    for (const claim of claims) {
        for (const citedIdx of claim.bestMatchingSource ? [claim.bestMatchingSource.sourceIndex] : []) {
            const current = sourceScores.get(citedIdx) || 0;
            sourceScores.set(citedIdx, current + claim.confidence);
        }
    }

    return sources
        .map((source, idx) => {
            let domain: string;
            try {
                domain = new URL(source.url).hostname.replace('www.', '');
            } catch {
                domain = source.url;
            }
            return {
                title: source.title,
                domain,
                relevanceScore: sourceScores.get(idx + 1) || 0,
            };
        })
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit)
        .map((s) => ({
            ...s,
            relevanceScore: Math.min(1, s.relevanceScore / 3),
        }));
}

function transformArbitrage(
    arbitrage: { detected: boolean; description: string | null; spread: number | null } | undefined
): { detected: boolean; description?: string; spread?: number } | undefined {
    if (!arbitrage) return undefined;
    return {
        detected: arbitrage.detected,
        description: arbitrage.description ?? undefined,
        spread: arbitrage.spread ?? undefined,
    };
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

    const totalClaims = verification.summary.supported + verification.summary.contradicted + verification.summary.uncertain;
    const verificationScore = Math.round(
        (verification.summary.supported / Math.max(1, totalClaims)) * 100
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
        arbitrage: transformArbitrage(presenterOutput.arbitrage),
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
                date: s.date,
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
