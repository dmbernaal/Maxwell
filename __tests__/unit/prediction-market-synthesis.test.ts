/**
 * Phase 3: Structured Synthesis Updates Tests
 *
 * Tests for prediction market-aware synthesis:
 * 1. PREDICTION_MARKET_SYNTHESIS_PROMPT contains required sections
 * 2. PREDICTION_MARKET_SYNTHESIS_PROMPT contains required placeholders
 * 3. createPredictionMarketSynthesisPrompt() fills placeholders correctly
 * 4. getPrimaryOutcome() returns correct outcome for each market type
 *
 * Run: npm test -- __tests__/unit/prediction-market-synthesis.test.ts
 */

import type { MarketContext, MaxwellSource } from '../../app/lib/maxwell/types';

import {
    PREDICTION_MARKET_SYNTHESIS_PROMPT,
    createPredictionMarketSynthesisPrompt,
} from '../../app/lib/maxwell/prompts';
import { getPrimaryOutcome } from '../../app/lib/maxwell/synthesizer';

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

describe('PREDICTION_MARKET_SYNTHESIS_PROMPT', () => {
    it('should be defined and non-empty', () => {
        expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toBeDefined();
        expect(typeof PREDICTION_MARKET_SYNTHESIS_PROMPT).toBe('string');
        expect(PREDICTION_MARKET_SYNTHESIS_PROMPT.length).toBeGreaterThan(500);
    });

    describe('Required Section Headers', () => {
        it('should contain MARKET CONTEXT section', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('## MARKET CONTEXT');
        });

        it('should contain RESOLUTION ANALYSIS section', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('## RESOLUTION ANALYSIS');
        });

        it('should contain FACTORS FOR section template', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('## FACTORS FOR:');
        });

        it('should contain FACTORS AGAINST section template', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('## FACTORS AGAINST:');
        });

        it('should contain KEY UNCERTAINTY section', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('## KEY UNCERTAINTY');
        });

        it('should contain NEXT CATALYST section', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('## NEXT CATALYST');
        });

        it('should contain SOURCE CONFLICTS section', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('## SOURCE CONFLICTS');
        });

        it('should contain MULTI-OUTCOME COMPARISON section', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('## MULTI-OUTCOME COMPARISON');
        });
    });

    describe('Required Placeholders', () => {
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
            it(`should contain placeholder ${placeholder}`, () => {
                expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain(placeholder);
            });
        }
    });

    describe('Forbidden Pattern Rules', () => {
        it('should forbid betting recommendations', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('NEVER say "you should bet"');
        });

        it('should forbid confidence claims', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('NEVER say "I am X% confident"');
        });

        it('should forbid filler phrases', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('NEVER use filler phrases');
        });

        it('should require citation for every factual claim', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('EVERY factual claim MUST cite its source using [n]');
        });

        it('should emphasize dense information', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('Be DENSE');
        });

        it('should require explicit source conflict flagging', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('Flag ALL source conflicts explicitly');
        });
    });

    describe('Output Format Requirements', () => {
        it('should specify Risk Level options in RESOLUTION ANALYSIS', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('Risk Level: LOW | MEDIUM | HIGH');
        });

        it('should specify Assessment options in MULTI-OUTCOME COMPARISON', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('Assessment: UNDERPRICED | OVERPRICED | FAIR');
        });

        it('should specify Confidence options in MULTI-OUTCOME COMPARISON', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('Confidence: HIGH | MEDIUM | LOW');
        });

        it('should require Event, Date, Impact in NEXT CATALYST', () => {
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('- Event:');
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('- Date:');
            expect(PREDICTION_MARKET_SYNTHESIS_PROMPT).toContain('- Impact:');
        });
    });
});

describe('createPredictionMarketSynthesisPrompt', () => {
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

    it('should include market type in prompt', () => {
        const sources = createMockSources(2);
        const marketContext = createMockMarketContext({ type: 'multi-option' });
        const prompt = createPredictionMarketSynthesisPrompt(sources, 'Analyze', marketContext);

        expect(prompt).toContain('multi-option');
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

    it('should set primary outcome to highest-priced outcome for multi-option', () => {
        const sources = createMockSources(2);
        const marketContext = createMockMarketContext({
            type: 'multi-option',
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

    it('should include deadline formatted as date', () => {
        const sources = createMockSources(2);
        const marketContext = createMockMarketContext({
            endDate: new Date('2026-02-08'),
        });
        const prompt = createPredictionMarketSynthesisPrompt(sources, 'Analyze', marketContext);

        // Check that deadline is formatted as a readable date (month name present)
        expect(prompt).toMatch(/Deadline: (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 2026/);
    });

    it('should only include top N outcomes based on selection table', () => {
        const sources = createMockSources(2);
        const outcomes = Array.from({ length: 10 }, (_, i) => ({
            name: `Team ${i + 1}`,
            price: 0.10 - i * 0.005,
        }));
        const marketContext = createMockMarketContext({ outcomes });
        const prompt = createPredictionMarketSynthesisPrompt(sources, 'Analyze', marketContext);

        // 10 outcomes -> top 6 per selection table (7-12 range)
        expect(prompt).toContain('Team 1');
        expect(prompt).toContain('Team 6');
        expect(prompt).not.toContain('Team 7 (');
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

    it('should handle single outcome', () => {
        const marketContext: MarketContext = {
            id: 'poly:single',
            platform: 'polymarket',
            title: 'Single outcome',
            type: 'multi-option',
            outcomes: [{ name: 'Only Option', price: 0.50 }],
            rules: 'Resolves somehow.',
            endDate: new Date('2026-02-08'),
            volume: 1000000,
            volume24h: 50000,
        };

        expect(getPrimaryOutcome(marketContext)).toBe('Only Option');
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

    it('should correctly sort outcomes by price descending', () => {
        const marketContext: MarketContext = {
            id: 'poly:unsorted',
            platform: 'polymarket',
            title: 'Unsorted outcomes',
            type: 'multi-option',
            outcomes: [
                { name: 'Third', price: 0.10 },
                { name: 'First', price: 0.50 },
                { name: 'Second', price: 0.30 },
                { name: 'Fourth', price: 0.05 },
            ],
            rules: 'Resolves to winner.',
            endDate: new Date('2026-02-08'),
            volume: 1000000,
            volume24h: 50000,
        };

        expect(getPrimaryOutcome(marketContext)).toBe('First');
    });
});
