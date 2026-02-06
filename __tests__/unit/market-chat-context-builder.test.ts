import { buildMarketChatSystemPrompt } from '../../app/lib/market-chat/context-builder';
import type { UnifiedMarket } from '../../app/lib/markets/types';
import type { MaxwellIntelligence } from '../../app/lib/maxwell/types';

const mockMarket: UnifiedMarket = {
  id: 'poly:test123',
  externalId: 'test123',
  platform: 'polymarket',
  slug: 'test-market',
  url: 'https://polymarket.com/event/test',
  title: 'Will BTC hit $200k by end of 2026?',
  category: 'Crypto',
  marketType: 'binary',
  outcomes: [
    { name: 'Yes', price: 0.42 },
    { name: 'No', price: 0.58 },
  ],
  yesPrice: 0.42,
  noPrice: 0.58,
  volume: 5_200_000,
  volume24h: 340_000,
  liquidity: 1_800_000,
  endDate: new Date('2026-12-31'),
  createdAt: new Date('2025-06-01'),
  status: 'open',
  rules: 'Resolves YES if BTC exceeds $200k.',
};

const mockReport: MaxwellIntelligence = {
  market: {
    question: 'Will BTC hit $200k?',
    type: 'binary',
    deadline: '2026-12-31',
    deadlineDate: '2026-12-31',
    resolutionCriteria: 'BTC > $200k on any major exchange',
  },
  resolutionRisk: {
    level: 'LOW',
    score: 0.2,
    factors: ['Clear resolution criteria', 'Multiple oracle sources'],
  },
  assessment: {
    primaryOutcome: 'Yes',
    marketPrice: 0.42,
    maxwellRange: { low: 35, mid: 45, high: 55 },
    verdict: 'FAIR',
    confidence: 'MEDIUM',
    headline: 'Market fairly priced given current macro conditions',
  },
  thesis: {
    factorsFor: [
      { point: 'ETF inflows accelerating', evidence: 'BlackRock data', sourceIndex: 1, confidence: 'HIGH' },
      { point: 'Halving cycle historically bullish', evidence: 'Historical data', sourceIndex: 2, confidence: 'MEDIUM' },
    ],
    factorsAgainst: [
      { point: 'Fed rate uncertainty', evidence: 'FOMC minutes', sourceIndex: 3, confidence: 'HIGH' },
    ],
    keyUncertainty: 'Macro environment and regulatory actions',
    nextCatalyst: { event: 'FOMC meeting', date: '2026-03-15', impact: 'Could shift sentiment' },
  },
  verification: {
    score: 78,
    level: 'PARTIAL',
    sourcesAnalyzed: 12,
    claimsVerified: 8,
    claimsDisputed: 1,
    topSources: [],
  },
  raw: { synthesis: '', adjudication: '', allSources: [], allClaims: [] },
  generatedAt: new Date().toISOString(),
  pipelineDurationMs: 15000,
  modelUsed: 'gemini-3-flash',
};

describe('MarketChat — Context Builder', () => {
  describe('buildMarketChatSystemPrompt', () => {
    it('should include market data in the prompt', () => {
      const prompt = buildMarketChatSystemPrompt(mockMarket, null, []);
      expect(prompt).toContain('Will BTC hit $200k');
      expect(prompt).toContain('polymarket');
      expect(prompt).toContain('binary');
      expect(prompt).toContain('42.0%');
      expect(prompt).toContain('5.20M');
    });

    it('should include Maxwell report when available', () => {
      const prompt = buildMarketChatSystemPrompt(mockMarket, mockReport, []);
      expect(prompt).toContain('VERDICT: FAIR');
      expect(prompt).toContain('MEDIUM confidence');
      expect(prompt).toContain('ETF inflows');
      expect(prompt).toContain('Fed rate uncertainty');
      expect(prompt).toContain('FOMC meeting');
      expect(prompt).toContain('35%-55%');
    });

    it('should show "Not available" when no Maxwell report', () => {
      const prompt = buildMarketChatSystemPrompt(mockMarket, null, []);
      expect(prompt).toContain('Not available');
      expect(prompt).toContain('has not run analysis');
    });

    it('should include conversation facts when provided', () => {
      const facts = [
        'BTC is currently at $95,000',
        'ETF inflows hit $2B last week',
      ];
      const prompt = buildMarketChatSystemPrompt(mockMarket, null, facts);
      expect(prompt).toContain('ESTABLISHED FACTS');
      expect(prompt).toContain('$95,000');
      expect(prompt).toContain('$2B last week');
    });

    it('should include critical system instructions', () => {
      const prompt = buildMarketChatSystemPrompt(mockMarket, null, []);
      expect(prompt).toContain('CHECK CONTEXT FIRST');
      expect(prompt).toContain('NEVER say "Maxwell"');
      expect(prompt).toContain('our analysis');
      expect(prompt).toContain('[Analysis]');
    });

    it('should include resolution rules when available', () => {
      const prompt = buildMarketChatSystemPrompt(mockMarket, null, []);
      expect(prompt).toContain('Resolves YES if BTC exceeds $200k');
    });

    it('should keep prompt under ~2000 tokens (rough char estimate)', () => {
      const prompt = buildMarketChatSystemPrompt(mockMarket, mockReport, [
        'Fact 1', 'Fact 2', 'Fact 3',
      ]);
      // ~4 chars per token, 2000 tokens ≈ 8000 chars — generous upper bound
      expect(prompt.length).toBeLessThan(8000);
    });
  });
});
