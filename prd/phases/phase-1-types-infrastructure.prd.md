# Phase 1: Types & Infrastructure

> **Parent PRD**: [Maxwell Trader Intelligence Revamp](../maxwell-trader-revamp.prd.md)  
> **Status**: Ready for Implementation  
> **Estimated Effort**: Day 1 (~4-6 hours)  
> **Dependencies**: None (foundation phase)

---

## Objective

Define the core TypeScript interfaces and create the API route scaffold that will serve as the foundation for the entire Maxwell Trader Revamp. This phase establishes the data contracts between:
- Market context (input) → Maxwell pipeline
- Maxwell pipeline → Intelligence output (structured JSON)
- Intelligence output → UI components

---

## Deliverables

| # | Deliverable | File Location | Effort |
|---|-------------|---------------|--------|
| 1 | `MarketContext` interface | `app/lib/maxwell/types.ts` | S |
| 2 | `MaxwellIntelligence` interface | `app/lib/maxwell/types.ts` | M |
| 3 | `ResolutionRisk` interface | `app/lib/maxwell/types.ts` | S |
| 4 | Supporting interfaces (ThesisFactor, OutcomeAnalysis, etc.) | `app/lib/maxwell/types.ts` | S |
| 5 | Presenter route scaffold | `app/api/maxwell/present/route.ts` | S |

---

## Type Definitions

### 1. MarketContext (Input)

Market context passed to Maxwell for prediction market analysis. Enables market-aware decomposition and comparative analysis.

```typescript
/**
 * Market context passed to Maxwell for prediction market analysis.
 * This enables market-aware decomposition and comparative analysis.
 */
export interface MarketContext {
  // --- IDENTITY ---
  id: string;                              // "poly:abc123" or "kalshi:xyz789"
  platform: "polymarket" | "kalshi";

  // --- MARKET DEFINITION ---
  title: string;                           // "Super Bowl Champion 2026"
  type: "binary" | "multi-option" | "matchup";

  // --- OUTCOMES ---
  outcomes: MarketOutcomeContext[];        // All outcomes with current prices

  // --- RESOLUTION ---
  rules: string;                           // Full resolution rules text
  resolutionSource?: string;               // "NFL official results"
  endDate: Date;                           // Resolution deadline

  // --- MARKET DATA ---
  volume: number;                          // Total volume USD
  volume24h: number;                       // 24h volume USD
  liquidity?: number;                      // Current liquidity

  // --- CROSS-PLATFORM (if available) ---
  crossPlatformOdds?: {
    platform: "polymarket" | "kalshi";
    outcomes: Array<{ name: string; price: number }>;
  };
}

export interface MarketOutcomeContext {
  name: string;                            // "Seattle"
  price: number;                           // 0.24 (24%)
  priceChange24h?: number;                 // +0.03 (+3%)
  volume?: number;                         // Outcome-specific volume
}
```

### 2. MaxwellIntelligence (Output)

Structured intelligence output for prediction market analysis. Replaces prose-based adjudication for UI rendering.

**Critical Principle**: This is intelligence, not recommendation. We say "UNDERPRICED" not "BET YES".

```typescript
/**
 * Structured intelligence output for prediction market analysis.
 * This replaces the prose-based adjudication output for UI rendering.
 *
 * CRITICAL: This is intelligence, not recommendation.
 * We say "UNDERPRICED" not "BET YES".
 */
export interface MaxwellIntelligence {
  // --- MARKET CONTEXT ---
  market: {
    question: string;                      // "Who will win Super Bowl LX?"
    type: "binary" | "multi-option" | "matchup";
    deadline: string;                      // "23 days"
    deadlineDate: string;                  // ISO date for sorting
    resolutionCriteria: string;            // Plain language summary
  };

  // --- RESOLUTION RISK ---
  resolutionRisk: ResolutionRisk;

  // --- MAXWELL'S ASSESSMENT ---
  assessment: {
    // For binary: applies to YES outcome
    // For multi-option: applies to top-ranked outcome
    primaryOutcome: string;                // "Seattle" or "YES"
    marketPrice: number;                   // 0.24
    maxwellRange: {
      low: number;                         // 0.22 (conservative)
      mid: number;                         // 0.28 (central estimate)
      high: number;                        // 0.34 (optimistic)
    };
    verdict: "UNDERPRICED" | "OVERPRICED" | "FAIR" | "UNCERTAIN";
    confidence: "HIGH" | "MEDIUM" | "LOW";
    headline: string;                      // One sentence insight
  };

  // --- STRUCTURED THESIS ---
  thesis: {
    factorsFor: ThesisFactor[];            // Max 5
    factorsAgainst: ThesisFactor[];        // Max 5
    keyUncertainty: string;                // Single biggest unknown
    nextCatalyst: {
      event: string;                       // "Divisional Round"
      date?: string;                       // "January 18, 2026"
      impact: string;                      // "Will clarify path difficulty"
    };
    sourceConflicts?: string[];            // When sources disagree
  };

  // --- MULTI-OUTCOME RANKINGS ---
  // Only present for multi-option and matchup markets
  outcomes?: OutcomeAnalysis[];            // Ordered by Maxwell conviction

  // --- CROSS-PLATFORM ARBITRAGE ---
  arbitrage?: {
    detected: boolean;
    description?: string;                  // "Polymarket 24% vs Kalshi 28%"
    spread?: number;                       // 0.04 (4%)
  };

  // --- VERIFICATION SUMMARY ---
  verification: {
    score: number;                         // 0-100
    level: "VERIFIED" | "PARTIAL" | "LOW_CONFIDENCE";
    sourcesAnalyzed: number;
    claimsVerified: number;
    claimsDisputed: number;
    topSources: SourceSummary[];           // Top 5 sources
  };

  // --- RAW DATA (for future chat agent) ---
  raw: {
    synthesis: string;                     // Phase 3 output
    adjudication: string;                  // Phase 5 output
    allSources: SourceReference[];
    allClaims: ClaimReference[];
  };

  // --- METADATA ---
  generatedAt: string;                     // ISO timestamp
  pipelineDurationMs: number;
  modelUsed: string;
}
```

### 3. ResolutionRisk

```typescript
export interface ResolutionRisk {
  level: "LOW" | "MEDIUM" | "HIGH";
  score: number;                           // 0-100
  factors: string[];                       // Specific risk factors identified
  historicalDisputes?: string;             // "Similar markets had 23% dispute rate"
}
```

### 4. Supporting Types

```typescript
export interface ThesisFactor {
  point: string;                           // "Healthiest playoff roster"
  evidence: string;                        // Supporting detail
  sourceIndex: number;                     // Reference to source
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface OutcomeAnalysis {
  name: string;                            // "Seattle"
  marketPrice: number;                     // 0.24
  maxwellRange: {
    low: number;
    mid: number;
    high: number;
  };
  view: "UNDERPRICED" | "OVERPRICED" | "FAIR" | "UNCERTAIN";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  oneLiner: string;                        // Brief reasoning
  rank: number;                            // 1 = most favorable
}

export interface SourceSummary {
  title: string;
  domain: string;                          // "espn.com"
  relevanceScore: number;                  // 0-1
}

export interface SourceReference {
  index: number;
  title: string;
  url: string;
  snippet: string;
  date?: string;
}

export interface ClaimReference {
  id: string;
  text: string;
  confidence: number;
  entailment: "SUPPORTED" | "CONTRADICTED" | "NEUTRAL";
}
```

---

## API Route Scaffold

### POST /api/maxwell/present

Create the route scaffold that will be implemented in Phase 5.

```typescript
// app/api/maxwell/present/route.ts

import { NextRequest, NextResponse } from 'next/server';
import type { MarketContext, MaxwellIntelligence, VerificationOutput, MaxwellSource } from '@/app/lib/maxwell/types';

export interface PresentRequest {
  // Original inputs
  query: string;
  marketContext: MarketContext;

  // Phase outputs
  synthesis: string;                       // Phase 3 output
  verification: VerificationOutput;        // Phase 4 output (includes resolution risk)
  adjudication: string;                    // Phase 5 output
  sources: MaxwellSource[];

  // Metadata
  pipelineDurationMs: number;
}

export interface PresentResponse {
  intelligence: MaxwellIntelligence;
  durationMs: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // TODO: Implement in Phase 5
  // For now, return a 501 Not Implemented
  return NextResponse.json(
    { error: 'Not implemented - Phase 5' },
    { status: 501 }
  );
}
```

---

## Implementation Checklist

- [ ] Add `MarketContext` interface to `types.ts`
- [ ] Add `MarketOutcomeContext` interface to `types.ts`
- [ ] Add `MaxwellIntelligence` interface to `types.ts`
- [ ] Add `ResolutionRisk` interface to `types.ts`
- [ ] Add `ThesisFactor` interface to `types.ts`
- [ ] Add `OutcomeAnalysis` interface to `types.ts`
- [ ] Add `SourceSummary` interface to `types.ts`
- [ ] Add `SourceReference` interface to `types.ts`
- [ ] Add `ClaimReference` interface to `types.ts`
- [ ] Create `app/api/maxwell/present/route.ts` with scaffold
- [ ] Add `PresentRequest` and `PresentResponse` types to API route
- [ ] Verify TypeScript compilation passes
- [ ] Verify no conflicts with existing types

---

## Verification Criteria

1. **Type Safety**: All interfaces compile without errors
2. **No Conflicts**: New types don't conflict with existing `types.ts`
3. **Route Created**: `/api/maxwell/present` returns 501 (placeholder)
4. **Export Correctness**: All new types are properly exported

---

## Notes

- The `VerificationOutput` and `MaxwellSource` types already exist in `types.ts` - do not duplicate
- Keep types in logical groups with comment headers for readability
- Use strict typing - avoid `any` and excessive optionals
- The `raw` field in `MaxwellIntelligence` preserves data for future follow-up chat agent

---

## Next Phase

Upon completion, proceed to **Phase 2: Decomposition Updates** which will:
- Add the prediction market decomposition prompt to `prompts.ts`
- Update decomposer to accept `MarketContext`
- Implement top-N outcome selection logic
