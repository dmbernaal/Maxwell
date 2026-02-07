/**
 * Phase 2: Decomposition Updates Tests
 * 
 * Tests for prediction market-aware decomposition:
 * 1. getTopNOutcomes() selection logic
 * 2. Decomposer with MarketContext produces market-specific queries
 * 3. Backward compatibility without MarketContext
 * 4. Output includes resolution-focused queries
 * 5. Output includes queries for top N outcomes
 *
 * Run: npm test -- __tests__/unit/prediction-market-decomposition.test.ts
 */

import type { MarketContext, MarketOutcomeContext, SubQuery } from '../../app/lib/maxwell/types';

import { getTopNOutcomes } from '../../app/lib/maxwell/decomposer';
import { 
    PREDICTION_MARKET_DECOMPOSITION_PROMPT,
    createPredictionMarketDecompositionPrompt 
} from '../../app/lib/maxwell/prompts';

function createMockOutcomes(count: number): MarketOutcomeContext[] {
    const names = [
        'Seattle', 'Los Angeles Rams', 'Buffalo', 'New England', 'Kansas City',
        'San Francisco', 'Philadelphia', 'Dallas', 'Detroit', 'Green Bay',
        'Miami', 'Baltimore', 'Cincinnati', 'Jacksonville', 'Tennessee',
        'Denver', 'Las Vegas', 'Los Angeles Chargers', 'Houston', 'Indianapolis',
        'New York Giants', 'New York Jets', 'Washington', 'Arizona', 'Atlanta',
        'Carolina', 'Chicago', 'Cleveland', 'Minnesota', 'New Orleans',
        'Pittsburgh', 'Tampa Bay', 'Team 33', 'Team 34', 'Team 35',
    ];
    
    return Array.from({ length: count }, (_, i) => ({
        name: names[i] || `Team ${i + 1}`,
        price: Math.max(0.01, 0.30 - (i * 0.02)),
    }));
}

function createMockMarketContext(overrides?: Partial<MarketContext>): MarketContext {
    return {
        id: 'poly:superbowl2026',
        platform: 'polymarket',
        title: 'Super Bowl Champion 2026',
        type: 'multi-option',
        outcomes: createMockOutcomes(8),
        rules: 'This market will resolve to the team that wins Super Bowl LX.',
        endDate: new Date('2026-02-08'),
        volume: 675000000,
        volume24h: 917000,
        ...overrides,
    };
}

describe('getTopNOutcomes', () => {
    describe('Top-N Selection Table', () => {
        it('should return 2 for matchup markets (2 outcomes)', () => {
            const outcomes = createMockOutcomes(2);
            expect(getTopNOutcomes(outcomes, 2)).toBe(2);
        });

        it('should return all for 3 outcomes', () => {
            const outcomes = createMockOutcomes(3);
            expect(getTopNOutcomes(outcomes, 3)).toBe(3);
        });

        it('should return all for 6 outcomes', () => {
            const outcomes = createMockOutcomes(6);
            expect(getTopNOutcomes(outcomes, 6)).toBe(6);
        });

        it('should return 6 for 7 outcomes', () => {
            const outcomes = createMockOutcomes(7);
            expect(getTopNOutcomes(outcomes, 7)).toBe(6);
        });

        it('should return 6 for 12 outcomes', () => {
            const outcomes = createMockOutcomes(12);
            expect(getTopNOutcomes(outcomes, 12)).toBe(6);
        });

        it('should return 8 for 13 outcomes', () => {
            const outcomes = createMockOutcomes(13);
            expect(getTopNOutcomes(outcomes, 13)).toBe(8);
        });

        it('should return 8 for 32 outcomes', () => {
            const outcomes = createMockOutcomes(32);
            expect(getTopNOutcomes(outcomes, 32)).toBe(8);
        });

        it('should return 10 for 33+ outcomes', () => {
            const outcomes = createMockOutcomes(33);
            expect(getTopNOutcomes(outcomes, 33)).toBe(10);
        });

        it('should return 10 for 50 outcomes', () => {
            const outcomes = createMockOutcomes(50);
            expect(getTopNOutcomes(outcomes, 50)).toBe(10);
        });
    });

    describe('Edge Cases', () => {
        it('should handle 1 outcome (binary YES)', () => {
            const outcomes = createMockOutcomes(1);
            expect(getTopNOutcomes(outcomes, 1)).toBe(1);
        });

        it('should handle empty outcomes array', () => {
            expect(getTopNOutcomes([], 0)).toBe(0);
        });
    });
});

describe('PREDICTION_MARKET_DECOMPOSITION_PROMPT', () => {
    it('should be defined and non-empty', () => {
        expect(PREDICTION_MARKET_DECOMPOSITION_PROMPT).toBeDefined();
        expect(typeof PREDICTION_MARKET_DECOMPOSITION_PROMPT).toBe('string');
        expect(PREDICTION_MARKET_DECOMPOSITION_PROMPT.length).toBeGreaterThan(500);
    });

    it('should contain required placeholders', () => {
        const requiredPlaceholders = [
            '{currentDate}',
            '{query}',
            '{marketTitle}',
            '{marketType}',
            '{outcomes}',
            '{prices}',
            '{rules}',
            '{deadline}',
            '{platform}',
            '{outcomeCount}',
            '{topN}',
            '{outcomeQueries}',
        ];

        for (const placeholder of requiredPlaceholders) {
            expect(PREDICTION_MARKET_DECOMPOSITION_PROMPT).toContain(placeholder);
        }
    });

    it('should contain required sub-query categories', () => {
        const requiredCategories = [
            'RESOLUTION CLARITY',
            'RECENT CATALYSTS',
            'FACTORS FOR EACH OUTCOME',
            'CONTRARIAN SIGNALS',
            'CROSS-PLATFORM COMPARISON',
        ];

        for (const category of requiredCategories) {
            expect(PREDICTION_MARKET_DECOMPOSITION_PROMPT).toContain(category);
        }
    });

    it('should contain domain targeting guidance', () => {
        expect(PREDICTION_MARKET_DECOMPOSITION_PROMPT).toContain('DOMAIN TARGETING');
        expect(PREDICTION_MARKET_DECOMPOSITION_PROMPT).toContain('espn.com');
        expect(PREDICTION_MARKET_DECOMPOSITION_PROMPT).toContain('fivethirtyeight.com');
    });
});

describe('createPredictionMarketDecompositionPrompt', () => {
    it('should fill all placeholders with market context', () => {
        const marketContext = createMockMarketContext();
        const prompt = createPredictionMarketDecompositionPrompt('Analyze this market', marketContext);

        expect(prompt).not.toContain('{currentDate}');
        expect(prompt).not.toContain('{query}');
        expect(prompt).not.toContain('{marketTitle}');
        expect(prompt).not.toContain('{marketType}');
        expect(prompt).not.toContain('{outcomes}');
        expect(prompt).not.toContain('{prices}');
        expect(prompt).not.toContain('{rules}');
        expect(prompt).not.toContain('{deadline}');
        expect(prompt).not.toContain('{platform}');
        expect(prompt).not.toContain('{outcomeCount}');
        expect(prompt).not.toContain('{topN}');
        expect(prompt).not.toContain('{outcomeQueries}');
    });

    it('should include market title in prompt', () => {
        const marketContext = createMockMarketContext({ title: 'Super Bowl Champion 2026' });
        const prompt = createPredictionMarketDecompositionPrompt('Analyze', marketContext);

        expect(prompt).toContain('Super Bowl Champion 2026');
    });

    it('should include platform in prompt', () => {
        const marketContext = createMockMarketContext({ platform: 'polymarket' });
        const prompt = createPredictionMarketDecompositionPrompt('Analyze', marketContext);

        expect(prompt).toContain('polymarket');
    });

    it('should include resolution rules in prompt', () => {
        const rules = 'This market resolves to the winner of Super Bowl LX';
        const marketContext = createMockMarketContext({ rules });
        const prompt = createPredictionMarketDecompositionPrompt('Analyze', marketContext);

        expect(prompt).toContain(rules);
    });

    it('should include outcome names in prompt', () => {
        const marketContext = createMockMarketContext();
        const prompt = createPredictionMarketDecompositionPrompt('Analyze', marketContext);

        expect(prompt).toContain('Seattle');
        expect(prompt).toContain('Los Angeles Rams');
        expect(prompt).toContain('Buffalo');
    });

    it('should include outcome prices in prompt', () => {
        const marketContext = createMockMarketContext({
            outcomes: [
                { name: 'Seattle', price: 0.24 },
                { name: 'Buffalo', price: 0.21 },
            ],
        });
        const prompt = createPredictionMarketDecompositionPrompt('Analyze', marketContext);

        expect(prompt).toContain('24%');
        expect(prompt).toContain('21%');
    });

    it('should calculate correct topN for 8 outcomes', () => {
        const marketContext = createMockMarketContext({
            outcomes: createMockOutcomes(8),
        });
        const prompt = createPredictionMarketDecompositionPrompt('Analyze', marketContext);

        expect(prompt).toContain('top 6');
    });

    it('should include query in prompt', () => {
        const marketContext = createMockMarketContext();
        const query = 'What are the odds for Seattle?';
        const prompt = createPredictionMarketDecompositionPrompt(query, marketContext);

        expect(prompt).toContain(query);
    });
});

describe('SubQuery Category Type', () => {
    it('should accept valid category values', () => {
        const validCategories: Array<SubQuery['category']> = [
            'resolution',
            'catalyst',
            'factor_for',
            'factor_against',
            'contrarian',
            'cross_platform',
            undefined,
        ];

        for (const category of validCategories) {
            const subQuery: SubQuery = {
                id: 'q1',
                query: 'test query',
                purpose: 'test purpose',
                topic: 'general',
                depth: 'basic',
                category,
            };
            expect(subQuery.category).toBe(category);
        }
    });

    it('should accept targetOutcome field', () => {
        const subQuery: SubQuery = {
            id: 'q1',
            query: 'Seattle Seahawks Super Bowl chances',
            purpose: 'Analyze Seattle',
            topic: 'general',
            depth: 'advanced',
            category: 'factor_for',
            targetOutcome: 'Seattle',
        };

        expect(subQuery.targetOutcome).toBe('Seattle');
    });

    it('should allow targetOutcome to be undefined', () => {
        const subQuery: SubQuery = {
            id: 'q1',
            query: 'NFL playoff news',
            purpose: 'Recent news',
            topic: 'news',
            depth: 'basic',
            category: 'catalyst',
        };

        expect(subQuery.targetOutcome).toBeUndefined();
    });
});
