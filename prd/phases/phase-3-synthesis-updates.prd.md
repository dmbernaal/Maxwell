# Phase 3: Structured Synthesis Updates

> **Parent PRD**: [Maxwell Trader Intelligence Revamp](../maxwell-trader-revamp.prd.md)  
> **Status**: Ready for Implementation  
> **Estimated Effort**: Day 3 (~6-8 hours)  
> **Dependencies**: Phase 2 (Decomposition Updates) - COMPLETE

---

## Objective

Transform the synthesis phase from **prose output** to **structured thesis format** that the Presenter (Phase 6) can parse into `MaxwellIntelligence` JSON. Currently, the synthesizer generates free-form markdown with citations. After this phase, it will generate a **predictable, section-based format** designed for prediction market traders.

### Key Transformation

| Current State | Future State |
|---------------|--------------|
| Free-form prose with `[n]` citations | Structured sections with defined headings |
| Generic research summary | Market-specific thesis (FOR/AGAINST factors) |
| No resolution analysis | Explicit resolution risk assessment |
| Single outcome focus | Multi-outcome comparative analysis |
| Implicit source conflicts | Explicit SOURCE CONFLICTS section |
| No catalyst tracking | NEXT CATALYST section |

---

## Deliverables

| # | Deliverable | File Location | Effort |
|---|-------------|---------------|--------|
| 1 | Add `PREDICTION_MARKET_SYNTHESIS_PROMPT` constant | `app/lib/maxwell/prompts.ts` | M |
| 2 | Add `createPredictionMarketSynthesisPrompt()` helper | `app/lib/maxwell/prompts.ts` | M |
| 3 | Update `synthesize()` to accept optional `MarketContext` | `app/lib/maxwell/synthesizer.ts` | M |
| 4 | Update `synthesizeComplete()` to accept optional `MarketContext` | `app/lib/maxwell/synthesizer.ts` | S |
| 5 | Add helper to determine primary outcome for synthesis | `app/lib/maxwell/synthesizer.ts` | S |
| 6 | Write unit tests for new synthesis functionality | `__tests__/unit/prediction-market-synthesis.test.ts` | M |

---

## Current State

### Current Synthesizer Signature

```typescript
export async function* synthesize(
    originalQuery: string,
    sources: MaxwellSource[],
    synthesisModel: string = SYNTHESIS_MODEL
): AsyncGenerator<SynthesisEvent>
```

### Current Synthesis Prompt (from `prompts.ts`)

```typescript
export const SYNTHESIS_PROMPT = `You are a research synthesizer. Given a question and search results from multiple queries, produce a comprehensive, well-structured answer.

CONTEXT:
- Current Date: {currentDate}
- User Question: {query}

CRITICAL RULES:
1. **TONE:** Objective, journalistic, and dense. No "I", "me", "Here is". Just the facts.
2. **STRUCTURE:** Use Markdown headers (##) to organize by theme (e.g., ## Technical Specs, ## Market Impact).
3. **CITATIONS:** EVERY factual claim MUST cite its source using [n] notation inline.
...
`;
```

### Current `createSynthesisPrompt()` Signature

```typescript
export function createSynthesisPrompt(sources: MaxwellSource[], query: string): string
```

---

## New Implementation

### 1. New Prediction Market Synthesis Prompt

Add to `prompts.ts`:

```typescript
export const PREDICTION_MARKET_SYNTHESIS_PROMPT = `You are an intelligence analyst for a prediction market research platform.

CONTEXT:
- Current Date: {currentDate}
- Market Question: {marketQuestion}
- Market Type: {marketType}
- Outcomes Being Analyzed: {outcomes}
- Resolution Rules: {rules}
- Deadline: {deadline}

SOURCES PROVIDED:
{sources}

YOUR TASK:
Synthesize the research into a STRUCTURED INTELLIGENCE BRIEFING.
This will be parsed by a downstream system, so follow the format exactly.

OUTPUT FORMAT:

## MARKET CONTEXT
[One paragraph restating what this market is asking, the deadline, and resolution criteria in plain language]

## RESOLUTION ANALYSIS
[Analysis of resolution criteria clarity. Flag any ambiguous language, historical disputes, or interpretation risks]
- Risk Level: LOW | MEDIUM | HIGH
- Risk Factors: [List specific concerns, if any]

## FACTORS FOR: {primaryOutcome}
List 3-5 factors that support this outcome occurring:
1. **[Factor Title]** — [Evidence with citation] [n]
2. **[Factor Title]** — [Evidence with citation] [n]
3. **[Factor Title]** — [Evidence with citation] [n]

## FACTORS AGAINST: {primaryOutcome}
List 3-5 factors that work against this outcome:
1. **[Factor Title]** — [Evidence with citation] [n]
2. **[Factor Title]** — [Evidence with citation] [n]
3. **[Factor Title]** — [Evidence with citation] [n]

## KEY UNCERTAINTY
[The single biggest unknown that could swing the outcome either direction]

## NEXT CATALYST
- Event: [What event could move the market next]
- Date: [When, if known]
- Impact: [How it could affect odds]

## SOURCE CONFLICTS
[Explicitly state when sources disagree on key facts. If no conflicts, state "No significant source conflicts identified."]

## MULTI-OUTCOME COMPARISON
For each analyzed outcome:
### {OutcomeName} ({marketPrice}%)
- Factors For: [Brief summary]
- Factors Against: [Brief summary]
- Assessment: UNDERPRICED | OVERPRICED | FAIR
- Confidence: HIGH | MEDIUM | LOW
- One-liner: [Single sentence assessment]

STRICT RULES:
1. NEVER say "you should bet" or "I recommend" — this is intelligence, not advice
2. NEVER say "I am X% confident" — let the evidence speak
3. NEVER use filler phrases like "it's important to note" or "one must consider"
4. EVERY factual claim MUST cite its source using [n] notation
5. Be DENSE — traders want information, not padding
6. Flag ALL source conflicts explicitly
7. For multi-outcome markets, analyze ALL outcomes provided
`;
```

### 2. Forbidden Patterns Table

The synthesis prompt explicitly forbids:

| Pattern | Example | Why Forbidden |
|---------|---------|---------------|
| Recommendations | "You should bet YES" | Traders decide, not Maxwell |
| Confidence claims | "I am 80% confident" | Presumptuous |
| Filler phrases | "It's important to note..." | Wastes trader time |
| Hedging caveats | "Of course, anything could happen" | Obvious, adds nothing |
| First person | "I found that..." | Breaks analyst persona |

### 3. Helper Function for Prompt Generation

Add to `prompts.ts`:

```typescript
export function createPredictionMarketSynthesisPrompt(
    sources: MaxwellSource[],
    query: string,
    marketContext: MarketContext
): string {
    const formattedSources = formatSourcesForPrompt(sources);
    const topN = getTopNOutcomes(marketContext.outcomes, marketContext.outcomes.length);
    const topOutcomes = [...marketContext.outcomes]
        .sort((a, b) => b.price - a.price)
        .slice(0, topN);

    const primaryOutcome = topOutcomes[0]?.name || 'YES';

    const outcomesForAnalysis = topOutcomes
        .map(o => `${o.name} (${Math.round(o.price * 100)}%)`)
        .join(', ');

    return fillPromptTemplate(PREDICTION_MARKET_SYNTHESIS_PROMPT, {
        currentDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }),
        marketQuestion: marketContext.title,
        marketType: marketContext.type,
        outcomes: outcomesForAnalysis,
        rules: marketContext.rules,
        deadline: marketContext.endDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }),
        primaryOutcome,
        sources: formattedSources,
    });
}
```

### 4. Updated Synthesizer Function Signature

Update `synthesizer.ts`:

```typescript
export async function* synthesize(
    originalQuery: string,
    sources: MaxwellSource[],
    synthesisModel: string = SYNTHESIS_MODEL,
    marketContext?: MarketContext
): AsyncGenerator<SynthesisEvent> {
    const startTime = Date.now();

    if (!originalQuery) throw new Error('Query cannot be empty');
    if (!Array.isArray(sources)) throw new Error('Sources must be an array');

    if (sources.length === 0) {
        const msg = `I couldn't find any relevant sources for "${originalQuery}".`;
        yield { type: 'chunk', content: msg };
        yield {
            type: 'complete',
            answer: msg,
            sourcesUsed: [],
            durationMs: Date.now() - startTime,
        };
        return;
    }

    try {
        const openrouter = getOpenRouterClient();

        // Use prediction market prompt if marketContext is provided
        const prompt = marketContext
            ? createPredictionMarketSynthesisPrompt(sources, originalQuery, marketContext)
            : createSynthesisPrompt(sources, originalQuery);

        const { textStream } = streamText({
            model: openrouter(synthesisModel),
            prompt,
            maxOutputTokens: SYNTHESIS_MAX_TOKENS,
        });

        let fullAnswer = '';

        for await (const chunk of textStream) {
            fullAnswer += chunk;
            yield { type: 'chunk', content: chunk };
        }

        validateCitations(fullAnswer, sources.length);
        const sourcesUsed = extractCitations(fullAnswer, sources.length);

        yield {
            type: 'complete',
            answer: fullAnswer,
            sourcesUsed,
            durationMs: Date.now() - startTime,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Synthesis failed: ${message}`);
    }
}
```

### 5. Updated `synthesizeComplete()` Signature

```typescript
export async function synthesizeComplete(
    originalQuery: string,
    sources: MaxwellSource[],
    synthesisModel: string = SYNTHESIS_MODEL,
    marketContext?: MarketContext
): Promise<SynthesisOutput> {
    let finalResult: SynthesisOutput | null = null;

    for await (const event of synthesize(originalQuery, sources, synthesisModel, marketContext)) {
        if (event.type === 'complete') {
            finalResult = {
                answer: event.answer,
                sourcesUsed: event.sourcesUsed,
                durationMs: event.durationMs,
            };
        }
    }

    if (!finalResult) throw new Error('Synthesis stream ended without completion event');
    return finalResult;
}
```

### 6. Primary Outcome Selection Helper

Add to `synthesizer.ts`:

```typescript
export function getPrimaryOutcome(marketContext: MarketContext): string {
    if (marketContext.type === 'binary') {
        return 'YES';
    }
    
    // For multi-option and matchup, return the highest-priced outcome
    const sorted = [...marketContext.outcomes].sort((a, b) => b.price - a.price);
    return sorted[0]?.name || 'Unknown';
}
```

---

## Import Updates

### `synthesizer.ts` Imports

Update imports to include new dependencies:

```typescript
import { 
    createSynthesisPrompt,
    createPredictionMarketSynthesisPrompt,
} from './prompts';
import { SYNTHESIS_MODEL, SYNTHESIS_MAX_TOKENS } from './constants';
import type { MaxwellSource, SynthesisOutput, MarketContext } from './types';
```

---

## Test Specification

### Test File: `__tests__/unit/prediction-market-synthesis.test.ts`

```typescript
import type { MarketContext, MarketOutcomeContext, MaxwellSource } from '../../app/lib/maxwell/types';
import { 
    PREDICTION_MARKET_SYNTHESIS_PROMPT,
    createPredictionMarketSynthesisPrompt,
} from '../../app/lib/maxwell/prompts';
import { getPrimaryOutcome } from '../../app/lib/maxwell/synthesizer';

describe('PREDICTION_MARKET_SYNTHESIS_PROMPT', () => {
    it('should be defined and non-empty', () => {
        expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toBeDefined();
        expect(typeof PREDICTION_MARKET_SYNTHESIS_PROMPT).toBe('string');
        expect(PREDICTION_MARKET_SYNTHESIS_PROMPT.length).toBeGreaterThan(500);
    });

    it('should contain required section headers', () => {
        const requiredSections = [
            '## MARKET CONTEXT',
            '## RESOLUTION ANALYSIS',
            '## FACTORS FOR:',
            '## FACTORS AGAINST:',
            '## KEY UNCERTAINTY',
            '## NEXT CATALYST',
            '## SOURCE CONFLICTS',
            '## MULTI-OUTCOME COMPARISON',
        ];

        for (const section of requiredSections) {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain(section);
        }
    });

    it('should contain required placeholders', () => {
        const requiredPlaceholders = [
            '{currentDate}',
            '{marketQuestion}',
            '{marketType}',
            '{outcomes}',
            '{rules}',
            '{deadline}',
            '{primaryOutcome}',
            '{sources}',
        ];

        for (const placeholder of requiredPlaceholders) {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain(placeholder);
        }
    });

    it('should contain forbidden pattern rules', () => {
        expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('NEVER say "you should bet"');
        expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('NEVER say "I am X% confident"');
        expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('NEVER use filler phrases');
    });

    it('should contain strict citation rule', () => {
        expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('EVERY factual claim MUST cite its source using [n]');
    });
});

describe('createPredictionMarketSynthesisPrompt', () => {
    function createMockSources(count: number): MaxwellSource[] {
        return Array.from({ length: count }, (_, i) => ({
            id: `s${i + 1}`,
            url: `https://example.com/source${i + 1}`,
            title: `Source ${i + 1}`,
            snippet: `Content from source ${i + 1}`,
            fromQuery: 'q1',
        }));
    }

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

    it('should fill all placeholders with market context', () => {
        const sources = createMockSources(3);
        const marketContext = createMockMarketContext();
        const prompt = createPredictionMarketSynthesisPrompt(sources, 'Analyze this market', marketContext);

        expect(prompt).not.toContain('{currentDate}');
        expect(prompt).not.toContain('{marketQuestion}');
        expect(prompt).not.toContain('{marketType}');
        expect(prompt).not.toContain('{outcomes}');
        expect(prompt).not.toContain('{rules}');
        expect(prompt).not.toContain('{deadline}');
        expect(prompt).not.toContain('{primaryOutcome}');
        expect(prompt).not.toContain('{sources}');
    });

    it('should include market title in prompt', () => {
        const sources = createMockSources(2);
        const marketContext = createMockMarketContext({ title: 'Super Bowl Champion 2026' });
        const prompt = createPredictionMarketSynthesisPrompt(sources, 'Analyze', marketContext);

        expect(prompt).toContain('Super Bowl Champion 2026');
    });

    it('should include resolution rules in prompt', () => {
        const sources = createMockSources(2);
        const rules = 'This market resolves to the winner of Super Bowl LX';
        const marketContext = createMockMarketContext({ rules });
        const prompt = createPredictionMarketSynthesisPrompt(sources, 'Analyze', marketContext);

        expect(prompt).toContain(rules);
    });

    it('should include outcomes with prices in prompt', () => {
        const sources = createMockSources(2);
        const marketContext = createMockMarketContext({
            outcomes: [
                { name: 'Seattle', price: 0.24 },
                { name: 'Buffalo', price: 0.21 },
            ],
        });
        const prompt = createPredictionMarketSynthesisPrompt(sources, 'Analyze', marketContext);

        expect(prompt).toContain('Seattle (24%)');
        expect(prompt).toContain('Buffalo (21%)');
    });

    it('should set primary outcome to highest-priced outcome', () => {
        const sources = createMockSources(2);
        const marketContext = createMockMarketContext({
            outcomes: [
                { name: 'Buffalo', price: 0.14 },
                { name: 'Seattle', price: 0.24 },
                { name: 'Rams', price: 0.21 },
            ],
        });
        const prompt = createPredictionMarketSynthesisPrompt(sources, 'Analyze', marketContext);

        expect(prompt).toContain('## FACTORS FOR: Seattle');
        expect(prompt).toContain('## FACTORS AGAINST: Seattle');
    });

    it('should include formatted sources in prompt', () => {
        const sources = createMockSources(3);
        const marketContext = createMockMarketContext();
        const prompt = createPredictionMarketSynthesisPrompt(sources, 'Analyze', marketContext);

        expect(prompt).toContain('[1] Source 1');
        expect(prompt).toContain('[2] Source 2');
        expect(prompt).toContain('[3] Source 3');
    });
});

describe('getPrimaryOutcome', () => {
    it('should return YES for binary markets', () => {
        const marketContext: MarketContext = {
            id: 'poly:binary',
            platform: 'polymarket',
            title: 'Will X happen?',
            type: 'binary',
            outcomes: [
                { name: 'Yes', price: 0.65 },
                { name: 'No', price: 0.35 },
            ],
            rules: 'Resolves YES if X happens.',
            endDate: new Date('2026-12-31'),
            volume: 1000000,
            volume24h: 50000,
        };

        expect(getPrimaryOutcome(marketContext)).toBe('YES');
    });

    it('should return highest-priced outcome for multi-option markets', () => {
        const marketContext: MarketContext = {
            id: 'poly:multi',
            platform: 'polymarket',
            title: 'Who will win?',
            type: 'multi-option',
            outcomes: [
                { name: 'Buffalo', price: 0.14 },
                { name: 'Seattle', price: 0.24 },
                { name: 'Rams', price: 0.21 },
            ],
            rules: 'Resolves to winner.',
            endDate: new Date('2026-02-08'),
            volume: 1000000,
            volume24h: 50000,
        };

        expect(getPrimaryOutcome(marketContext)).toBe('Seattle');
    });

    it('should return highest-priced outcome for matchup markets', () => {
        const marketContext: MarketContext = {
            id: 'poly:matchup',
            platform: 'polymarket',
            title: 'Team A vs Team B',
            type: 'matchup',
            outcomes: [
                { name: 'Team A', price: 0.45 },
                { name: 'Team B', price: 0.55 },
            ],
            rules: 'Resolves to winner.',
            endDate: new Date('2026-02-08'),
            volume: 1000000,
            volume24h: 50000,
        };

        expect(getPrimaryOutcome(marketContext)).toBe('Team B');
    });

    it('should handle empty outcomes gracefully', () => {
        const marketContext: MarketContext = {
            id: 'poly:empty',
            platform: 'polymarket',
            title: 'Empty market',
            type: 'multi-option',
            outcomes: [],
            rules: 'Resolves somehow.',
            endDate: new Date('2026-02-08'),
            volume: 0,
            volume24h: 0,
        };

        expect(getPrimaryOutcome(marketContext)).toBe('Unknown');
    });
});
```

---

## Implementation Checklist

### prompts.ts
- [ ] Add `PREDICTION_MARKET_SYNTHESIS_PROMPT` constant
- [ ] Add `createPredictionMarketSynthesisPrompt()` helper function
- [ ] Export new prompt and helper

### synthesizer.ts
- [ ] Import `MarketContext` type
- [ ] Import `createPredictionMarketSynthesisPrompt` from prompts
- [ ] Add `getPrimaryOutcome()` helper function
- [ ] Update `synthesize()` generator to accept optional `MarketContext` parameter
- [ ] Update `synthesizeComplete()` to accept optional `MarketContext` parameter
- [ ] Implement conditional prompt selection based on marketContext presence
- [ ] Preserve backward compatibility (no marketContext = existing behavior)
- [ ] Export `getPrimaryOutcome`

### Tests
- [ ] Create `__tests__/unit/prediction-market-synthesis.test.ts`
- [ ] Test `PREDICTION_MARKET_SYNTHESIS_PROMPT` contains required sections
- [ ] Test `PREDICTION_MARKET_SYNTHESIS_PROMPT` contains required placeholders
- [ ] Test `PREDICTION_MARKET_SYNTHESIS_PROMPT` contains forbidden pattern rules
- [ ] Test `createPredictionMarketSynthesisPrompt()` fills all placeholders
- [ ] Test `createPredictionMarketSynthesisPrompt()` includes market context data
- [ ] Test `createPredictionMarketSynthesisPrompt()` sets correct primary outcome
- [ ] Test `getPrimaryOutcome()` for binary markets
- [ ] Test `getPrimaryOutcome()` for multi-option markets
- [ ] Test `getPrimaryOutcome()` for matchup markets
- [ ] Test `getPrimaryOutcome()` handles empty outcomes

---

## Verification Criteria

1. **Backward Compatibility**: `synthesize(query, sources)` without marketContext works identically to before
2. **Market-Aware**: `synthesize(query, sources, model, marketContext)` produces structured thesis format
3. **Section Coverage**: Output contains all required sections (MARKET CONTEXT, RESOLUTION ANALYSIS, FACTORS FOR/AGAINST, KEY UNCERTAINTY, NEXT CATALYST, SOURCE CONFLICTS, MULTI-OUTCOME COMPARISON)
4. **Primary Outcome**: For multi-option markets, primary outcome is the highest-priced outcome
5. **Type Safety**: All new types compile without errors
6. **Tests Pass**: All new and existing tests pass
7. **Build Passes**: `npm run build` completes successfully

---

## Output Format Example

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
    ],
    rules: 'This market will resolve to the team that wins Super Bowl LX.',
    endDate: new Date('2026-02-08'),
    volume: 675000000,
    volume24h: 917000,
};

await synthesizeComplete('Analyze Super Bowl Champion 2026', sources, SYNTHESIS_MODEL, marketContext);
```

### Expected Output Structure

```markdown
## MARKET CONTEXT
This market asks which team will win Super Bowl LX, scheduled for February 8, 2026. The resolution is straightforward: the market resolves to whichever NFL team wins the championship game. Current market leader is Seattle at 24%.

## RESOLUTION ANALYSIS
The resolution criteria are clear and unambiguous. Super Bowl results are official NFL outcomes with no interpretation required.
- Risk Level: LOW
- Risk Factors: None identified. NFL championship results are definitive.

## FACTORS FOR: Seattle
1. **Healthiest Playoff Roster** — Seattle has the fewest players on injured reserve of any playoff team [1]
2. **Home Field Advantage** — Seattle secured home field throughout NFC playoffs [2]
3. **Elite Defense** — Seattle's defense ranks #1 in points allowed during the regular season [3]

## FACTORS AGAINST: Seattle
1. **No Super Bowl Experience** — No current Seattle player has Super Bowl experience [4]
2. **AFC Champions Battle-Tested** — Buffalo and New England both have recent championship game experience [5]
3. **Weaker Strength of Schedule** — Seattle's regular season opponents had a combined losing record [6]

## KEY UNCERTAINTY
Any significant injury to key players in the playoffs would fundamentally change the equation. Seattle's depth at quarterback is particularly concerning.

## NEXT CATALYST
- Event: NFC Divisional Round
- Date: January 18, 2026
- Impact: Seattle's first playoff test will reveal if the regular season dominance translates to postseason performance

## SOURCE CONFLICTS
ESPN [1] reports Seattle as heavy favorites while FiveThirtyEight [4] projects Buffalo as having the best championship probability. The disagreement centers on how to weight regular season performance vs. playoff experience.

## MULTI-OUTCOME COMPARISON
### Seattle (24%)
- Factors For: Healthiest roster, home field, elite defense
- Factors Against: No playoff experience, untested in big moments
- Assessment: UNDERPRICED
- Confidence: MEDIUM
- One-liner: Health advantage and home field make Seattle undervalued at current price

### Los Angeles Rams (21%)
- Factors For: Strong offense, championship experience
- Factors Against: Key injuries, road playoff games
- Assessment: FAIR
- Confidence: MEDIUM
- One-liner: Fairly priced given injury concerns balance experience advantage

### Buffalo (14%)
- Factors For: Elite quarterback, recent playoff success
- Factors Against: Wide receiver injuries limiting ceiling
- Assessment: OVERPRICED
- Confidence: LOW
- One-liner: Injury concerns make current price slightly high

### New England (13%)
- Factors For: Underdog value, experienced coach
- Factors Against: Rebuilding roster, limited offensive weapons
- Assessment: FAIR
- Confidence: LOW
- One-liner: Reasonable value for a long shot with coaching edge
```

---

## Required Section Headers (Parseable Format)

The Presenter (Phase 6) will parse these exact section headers:

| Section Header | Required | Purpose |
|----------------|----------|---------|
| `## MARKET CONTEXT` | Yes | Context for traders unfamiliar with market |
| `## RESOLUTION ANALYSIS` | Yes | Resolution risk scoring input |
| `## FACTORS FOR: {outcome}` | Yes | Thesis factorsFor array |
| `## FACTORS AGAINST: {outcome}` | Yes | Thesis factorsAgainst array |
| `## KEY UNCERTAINTY` | Yes | thesis.keyUncertainty field |
| `## NEXT CATALYST` | Yes | thesis.nextCatalyst object |
| `## SOURCE CONFLICTS` | Yes | thesis.sourceConflicts array |
| `## MULTI-OUTCOME COMPARISON` | For multi-option | outcomes array |

---

## Notes

- The `synthesize()` and `synthesizeComplete()` functions remain streaming-capable
- When `marketContext` is not provided, the synthesizer falls back to the existing generic prompt
- The structured output format is designed to be parseable by the Phase 6 Presenter
- All section headers must match exactly (case-sensitive) for downstream parsing
- The `primaryOutcome` in FACTORS FOR/AGAINST should match the highest-priced outcome
- Citation format `[n]` remains consistent with existing system

---

## Next Phase

Upon completion, proceed to **Phase 4: Resolution Risk Scoring** which will:
- Add `RESOLUTION_RISK_PROMPT` for AI-powered resolution risk analysis
- Update verifier to run resolution risk analysis in parallel with claim verification
- Integrate resolution risk into `VerificationOutput`
