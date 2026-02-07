import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { present } from '@/app/lib/maxwell/presenter';
import { analyzeResolutionRisk } from '@/app/lib/maxwell/verifier';
import type { PresentResponse } from '@/app/lib/maxwell/api-types';

const MarketOutcomeContextSchema = z.object({
    name: z.string(),
    price: z.number(),
    priceChange24h: z.number().optional(),
    volume: z.number().optional(),
});

const MarketContextSchema = z.object({
    id: z.string(),
    platform: z.enum(['polymarket', 'kalshi']),
    title: z.string(),
    type: z.enum(['binary', 'multi-option', 'matchup']),
    outcomes: z.array(MarketOutcomeContextSchema),
    rules: z.string(),
    resolutionSource: z.string().optional(),
    endDate: z.string().transform((s) => new Date(s)),
    volume: z.number(),
    volume24h: z.number(),
    liquidity: z.number().optional(),
    crossPlatformOdds: z.object({
        platform: z.enum(['polymarket', 'kalshi']),
        outcomes: z.array(z.object({
            name: z.string(),
            price: z.number(),
        })),
    }).optional(),
});

const VerifiedClaimSchema = z.object({
    id: z.string(),
    text: z.string(),
    confidence: z.number(),
    confidenceLevel: z.enum(['high', 'medium', 'low']),
    entailment: z.enum(['SUPPORTED', 'CONTRADICTED', 'NEUTRAL']),
    entailmentReasoning: z.string(),
    bestMatchingSource: z.object({
        sourceId: z.string(),
        sourceTitle: z.string(),
        sourceIndex: z.number(),
        passage: z.string(),
        similarity: z.number(),
        isCitedSource: z.boolean(),
    }),
    citationMismatch: z.boolean(),
    citedSourceSupport: z.number(),
    globalBestSupport: z.number(),
    numericCheck: z.object({
        claimNumbers: z.array(z.string()),
        evidenceNumbers: z.array(z.string()),
        match: z.boolean(),
    }).nullable(),
    issues: z.array(z.string()),
});

const VerificationOutputSchema = z.object({
    claims: z.array(VerifiedClaimSchema),
    overallConfidence: z.number(),
    summary: z.object({
        supported: z.number(),
        uncertain: z.number(),
        contradicted: z.number(),
        citationMismatches: z.number(),
        numericMismatches: z.number(),
    }),
    durationMs: z.number(),
});

const ResolutionRiskSchema = z.object({
    level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    score: z.number(),
    factors: z.array(z.string()),
    historicalDisputes: z.string().optional(),
});

const MaxwellSourceSchema = z.object({
    id: z.string(),
    url: z.string(),
    title: z.string(),
    snippet: z.string(),
    fromQuery: z.string(),
    date: z.string().optional(),
});

const PresentRequestSchema = z.object({
    query: z.string().min(1),
    marketContext: MarketContextSchema,
    synthesis: z.string(),
    verification: VerificationOutputSchema,
    adjudication: z.string(),
    sources: z.array(MaxwellSourceSchema),
    pipelineDurationMs: z.number(),
    resolutionRisk: ResolutionRiskSchema.optional(),
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
