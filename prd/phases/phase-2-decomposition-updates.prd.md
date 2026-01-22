# Phase 2: Decomposition Updates

> **Parent PRD**: [Maxwell Trader Intelligence Revamp](../maxwell-trader-revamp.prd.md)  
> **Status**: Ready for Implementation  
> **Estimated Effort**: Day 2 (~6-8 hours)  
> **Dependencies**: Phase 1 (Types & Infrastructure) - COMPLETE

---

## Objective

Update the decomposition phase to be **market-aware**. Currently, the decomposer receives a text query and generates generic sub-queries. After this phase, the decomposer will receive query + `MarketContext` and generate **prediction-market-specific** sub-queries that:

1. Address resolution risk (the #1 trader pain point)
2. Research all top N outcomes (not just one)
3. Find recent catalysts and contrarian signals
4. Target authoritative sources for the market's domain

---

## Deliverables

| # | Deliverable | File Location | Effort |
|---|-------------|---------------|--------|
| 1 | Add prediction market decomposition prompt | `app/lib/maxwell/prompts.ts` | M |
| 2 | Update decomposer to accept MarketContext | `app/lib/maxwell/decomposer.ts` | M |
| 3 | Implement top-N outcome selection logic | `app/lib/maxwell/decomposer.ts` | S |
| 4 | Add outcome-specific query generation | `app/lib/maxwell/decomposer.ts` | M |

---

## Current State

### Current Decomposer Signature
```typescript
export async function decomposeQuery(
    query: string,
    modelId: string = DECOMPOSITION_MODEL
): Promise<DecompositionOutput>
```

### Current SubQuery Schema
```typescript
const SubQuerySchema = z.object({
    id: z.string(),
    query: z.string(),
    purpose: z.string(),
    topic: z.enum(['general', 'news']),
    depth: z.enum(['basic', 'advanced']),
    days: z.number().nullable(),
    domains: z.array(z.string()).nullable(),
});
```

### Current Decomposition Prompt
The current `DECOMPOSITION_PROMPT` in `prompts.ts` is a generic search strategy prompt that:
- Breaks queries into atomic sub-queries
- Uses topic (general/news) and depth (basic/advanced) configuration
- Has no awareness of prediction markets, outcomes, or resolution rules

---

## New Implementation

### 1. New Prediction Market Decomposition Prompt

Add to `prompts.ts`:

```typescript
export const PREDICTION_MARKET_DECOMPOSITION_PROMPT = `You are a Master Search Strategist for a prediction market intelligence platform.

CONTEXT:
- Current Date: {currentDate}
- User Query: {query}

MARKET CONTEXT:
- Title: {marketTitle}
- Type: {marketType}
- Outcomes: {outcomes}
- Current Prices: {prices}
- Resolution Rules: {rules}
- Deadline: {deadline}
- Platform: {platform}

YOUR TASK:
Generate sub-queries that will gather intelligence for a PREDICTION MARKET trader.
Traders need to assess: Is this market fairly priced? What might the market be missing?

REQUIRED SUB-QUERY CATEGORIES:

1. **RESOLUTION CLARITY** (CRITICAL - addresses #1 trader pain point)
   - Search for the exact resolution criteria interpretation
   - Look for historical disputes on similar markets
   - Check for ambiguous language that could cause issues
   - Query: "[market topic] resolution dispute" or "[platform] [topic] controversy"

2. **RECENT CATALYSTS** (last 24-72 hours)
   - What just happened that could affect this market?
   - Breaking news, announcements, developments
   - Use topic: 'news', days: 1-3

3. **FACTORS FOR EACH OUTCOME** (research ALL top outcomes, not just one)
   For multi-outcome markets with {outcomeCount} outcomes, generate queries for the top {topN} by market price:
   {outcomeQueries}

4. **CONTRARIAN SIGNALS**
   - What could prove the market consensus wrong?
   - Expert opinions that diverge from market pricing
   - Historical precedents where similar situations resolved unexpectedly

5. **CROSS-PLATFORM COMPARISON** (if applicable)
   - Search for equivalent market on other platform
   - Note any price discrepancies

OUTPUT FORMAT:
{
  "reasoning": "Your decomposition strategy",
  "complexity": "standard" | "deep_research",
  "complexityReasoning": "Why this complexity level",
  "subQueries": [
    {
      "id": "q1",
      "query": "concise search query",
      "topic": "general" | "news",
      "depth": "basic" | "advanced",
      "days": number | null,
      "domains": ["domain.com"] | null,
      "purpose": "What this query investigates",
      "category": "resolution" | "catalyst" | "factor_for" | "factor_against" | "contrarian" | "cross_platform",
      "targetOutcome": "Seattle" | null
    }
  ]
}

RULES:
- For multi-outcome markets, analyze TOP {topN} outcomes by market price
- Always include at least one resolution-focused query
- Always include recent news queries (days: 1-3)
- Balance queries across FOR and AGAINST factors
- Target authoritative sources for the domain (see DOMAIN TARGETING below)

DOMAIN TARGETING:
- Political markets: fivethirtyeight.com, realclearpolitics.com, politico.com
- Sports markets: espn.com, nfl.com, pro-football-reference.com
- Crypto markets: glassnode.com, arkham.ai, official project domains
- Economic markets: federalreserve.gov, bls.gov, sec.gov, reuters.com
`;
```

### 2. Updated SubQuery Type

Add new fields to the `SubQuery` interface in `types.ts`:

```typescript
export interface SubQuery {
    id: string;
    query: string;
    purpose: string;
    topic: TavilySearchTopic;
    depth: TavilySearchDepth;
    days?: number;
    domains?: string[];
    // NEW: Prediction market specific fields
    category?: 'resolution' | 'catalyst' | 'factor_for' | 'factor_against' | 'contrarian' | 'cross_platform';
    targetOutcome?: string;
}
```

### 3. Top-N Outcome Selection Logic

Implement this function in `decomposer.ts`:

```typescript
export function getTopNOutcomes(outcomes: MarketOutcomeContext[], totalCount: number): number {
    // Table from PRD:
    // | Total Outcomes | Analyze Top N |
    // | 2 (matchup)    | 2 (both)      |
    // | 3-6            | All           |
    // | 7-12           | Top 6         |
    // | 13-32          | Top 8         |
    // | 33+            | Top 10        |
    
    if (totalCount <= 2) return totalCount;
    if (totalCount <= 6) return totalCount;
    if (totalCount <= 12) return 6;
    if (totalCount <= 32) return 8;
    return 10;
}
```

### 4. Updated Decomposer Function Signature

```typescript
export async function decomposeQuery(
    query: string,
    modelId?: string,
    marketContext?: MarketContext
): Promise<DecompositionOutput>
```

The function should:
1. Check if `marketContext` is provided
2. If yes, use `PREDICTION_MARKET_DECOMPOSITION_PROMPT` with market context injected
3. If no, fall back to existing `DECOMPOSITION_PROMPT` for backward compatibility

### 5. Updated Schema for Prediction Market Decomposition

```typescript
const PredictionMarketSubQuerySchema = z.object({
    id: z.string(),
    query: z.string(),
    purpose: z.string(),
    topic: z.enum(['general', 'news']),
    depth: z.enum(['basic', 'advanced']),
    days: z.number().nullable(),
    domains: z.array(z.string()).nullable(),
    category: z.enum(['resolution', 'catalyst', 'factor_for', 'factor_against', 'contrarian', 'cross_platform']),
    targetOutcome: z.string().nullable(),
});

const PredictionMarketDecompositionSchema = z.object({
    reasoning: z.string(),
    complexity: z.enum(['standard', 'deep_research']),
    complexityReasoning: z.string(),
    subQueries: z.array(PredictionMarketSubQuerySchema).min(3).max(12),
});
```

### 6. Helper Function for Prompt Generation

Add to `prompts.ts`:

```typescript
export function createPredictionMarketDecompositionPrompt(
    query: string,
    marketContext: MarketContext
): string {
    const topN = getTopNOutcomes(marketContext.outcomes, marketContext.outcomes.length);
    const topOutcomes = [...marketContext.outcomes]
        .sort((a, b) => b.price - a.price)
        .slice(0, topN);
    
    const outcomeQueries = topOutcomes
        .map(o => `- ${o.name} (${Math.round(o.price * 100)}%): factors for/against`)
        .join('\n   ');
    
    const prices = topOutcomes
        .map(o => `${o.name}: ${Math.round(o.price * 100)}%`)
        .join(', ');
    
    return fillPromptTemplate(PREDICTION_MARKET_DECOMPOSITION_PROMPT, {
        currentDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }),
        query,
        marketTitle: marketContext.title,
        marketType: marketContext.type,
        outcomes: marketContext.outcomes.map(o => o.name).join(', '),
        prices,
        rules: marketContext.rules,
        deadline: marketContext.endDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }),
        platform: marketContext.platform,
        outcomeCount: String(marketContext.outcomes.length),
        topN: String(topN),
        outcomeQueries,
    });
}
```

---

## Implementation Checklist

### prompts.ts
- [ ] Add `PREDICTION_MARKET_DECOMPOSITION_PROMPT` constant
- [ ] Add `createPredictionMarketDecompositionPrompt()` helper function
- [ ] Export new prompt and helper

### types.ts
- [ ] Add `category` field to `SubQuery` interface (optional for backward compat)
- [ ] Add `targetOutcome` field to `SubQuery` interface (optional)
- [ ] Add `SubQueryCategory` type alias

### decomposer.ts
- [ ] Add `getTopNOutcomes()` function
- [ ] Add `PredictionMarketSubQuerySchema` Zod schema
- [ ] Add `PredictionMarketDecompositionSchema` Zod schema
- [ ] Update `decomposeQuery()` to accept optional `MarketContext` parameter
- [ ] Implement conditional prompt selection based on marketContext presence
- [ ] Add market context template injection logic
- [ ] Preserve backward compatibility (no marketContext = existing behavior)

### Tests
- [ ] Test `getTopNOutcomes()` for all outcome count ranges
- [ ] Test decomposer with MarketContext produces market-specific queries
- [ ] Test decomposer without MarketContext uses existing prompt
- [ ] Test that output includes resolution-focused queries
- [ ] Test that output includes queries for top N outcomes

---

## Verification Criteria

1. **Backward Compatibility**: `decomposeQuery(query)` without marketContext works identically to before
2. **Market-Aware**: `decomposeQuery(query, undefined, marketContext)` produces prediction-market-specific queries
3. **Resolution Coverage**: Output always includes at least one query with `category: 'resolution'`
4. **Outcome Coverage**: For multi-outcome markets, queries cover the top N outcomes per the selection table
5. **Type Safety**: All new types compile without errors
6. **Tests Pass**: All new and existing tests pass

---

## Example Output

### Input
```typescript
const marketContext: MarketContext = {
    id: 'poly:superbowl2026',
    platform: 'polymarket',
    title: 'Super Bowl Champion 2026',
    type: 'multi-option',
    outcomes: [
        { name: 'Seattle', price: 0.24 },
        { name: 'Los Angeles Rams', price: 0.21 },
        { name: 'Buffalo', price: 0.14 },
        { name: 'New England', price: 0.13 },
        // ... more outcomes
    ],
    rules: 'This market will resolve to the team that wins Super Bowl LX.',
    endDate: new Date('2026-02-08'),
    volume: 675000000,
    volume24h: 917000,
};

await decomposeQuery('Analyze Super Bowl Champion 2026', undefined, marketContext);
```

### Expected Output Structure
```typescript
{
    originalQuery: 'Analyze Super Bowl Champion 2026',
    subQueries: [
        {
            id: 'q1',
            query: 'Super Bowl LX resolution rules Polymarket dispute',
            purpose: 'Check for resolution ambiguity and historical disputes',
            topic: 'general',
            depth: 'basic',
            category: 'resolution',
            targetOutcome: null,
        },
        {
            id: 'q2',
            query: 'NFL playoff news injuries January 2026',
            purpose: 'Recent developments affecting playoff teams',
            topic: 'news',
            depth: 'advanced',
            days: 3,
            category: 'catalyst',
            targetOutcome: null,
        },
        {
            id: 'q3',
            query: 'Seattle Seahawks Super Bowl chances 2026 analysis',
            purpose: 'Factors supporting Seattle winning',
            topic: 'general',
            depth: 'advanced',
            domains: ['espn.com', 'nfl.com'],
            category: 'factor_for',
            targetOutcome: 'Seattle',
        },
        {
            id: 'q4',
            query: 'Seattle Seahawks weaknesses playoff concerns 2026',
            purpose: 'Factors against Seattle winning',
            topic: 'general',
            depth: 'advanced',
            category: 'factor_against',
            targetOutcome: 'Seattle',
        },
        // ... similar for Los Angeles Rams, Buffalo, etc.
        {
            id: 'q9',
            query: 'Super Bowl upset prediction dark horse 2026',
            purpose: 'Contrarian signals the market might be missing',
            topic: 'general',
            depth: 'advanced',
            category: 'contrarian',
            targetOutcome: null,
        },
    ],
    reasoning: 'Multi-outcome sports market requiring analysis of top contenders...',
    complexity: 'deep_research',
    complexityReasoning: 'Multi-outcome market with 8+ outcomes requires comprehensive analysis',
    durationMs: 1850,
}
```

---

## Domain Targeting Reference

From PRD Section 5:

| Market Category | Target Domains |
|-----------------|----------------|
| Political | fivethirtyeight.com, realclearpolitics.com, politico.com |
| Sports | espn.com, nfl.com, pro-football-reference.com |
| Crypto | glassnode.com, arkham.ai, official project domains |
| Economic | federalreserve.gov, bls.gov, sec.gov, reuters.com |

---

## Top-N Outcome Selection Reference

From PRD Section 5:

| Total Outcomes | Analyze Top N |
|----------------|---------------|
| 2 (matchup) | 2 (both) |
| 3-6 | All |
| 7-12 | Top 6 |
| 13-32 | Top 8 |
| 33+ | Top 10 |

---

## Notes

- The `category` and `targetOutcome` fields are optional on `SubQuery` for backward compatibility
- When `marketContext` is not provided, the decomposer falls back to the existing generic prompt
- The complexity for prediction market analysis should never be `'simple'` - at minimum `'standard'`
- Resolution-focused queries are CRITICAL per PRD research (trader pain point #1)

---

## Next Phase

Upon completion, proceed to **Phase 3: Synthesis Updates** which will:
- Add structured synthesis prompt to output thesis format (not prose)
- Update synthesizer to accept market context
- Add multi-outcome synthesis logic for comparative analysis
