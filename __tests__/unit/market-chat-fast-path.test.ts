import { checkFastPath } from '../../app/lib/market-chat/fast-path';
import type { UnifiedMarket } from '../../app/lib/markets/types';

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
  rules: 'Resolves YES if BTC price exceeds $200,000 on any major exchange.',
  resolutionSource: 'CoinGecko aggregate price',
};

const multiOutcomeMarket: UnifiedMarket = {
  ...mockMarket,
  id: 'poly:event:multi',
  marketType: 'multi-option',
  outcomes: [
    { name: 'Trump', price: 0.45 },
    { name: 'DeSantis', price: 0.25 },
    { name: 'Haley', price: 0.15 },
    { name: 'Other', price: 0.15 },
  ],
  yesPrice: 0.45,
  noPrice: 0.55,
};

describe('MarketChat — Fast Path', () => {
  describe('date/close queries', () => {
    it('should match "When does this close?"', () => {
      const result = checkFastPath('When does this close?', mockMarket);
      expect(result.matched).toBe(true);
      // Date formatting may shift by ±1 day depending on timezone
      expect(result.response).toMatch(/December 3[01], 2026/);
    });

    it('should match "closing date"', () => {
      const result = checkFastPath('closing date', mockMarket);
      expect(result.matched).toBe(true);
      expect(result.response).toContain('2026');
    });

    it('should match "deadline"', () => {
      const result = checkFastPath('What is the deadline?', mockMarket);
      expect(result.matched).toBe(true);
    });
  });

  describe('price/odds queries', () => {
    it('should match "What\'s the price?" for binary market', () => {
      const result = checkFastPath("What's the price?", mockMarket);
      expect(result.matched).toBe(true);
      expect(result.response).toContain('42.0% Yes');
      expect(result.response).toContain('58.0% No');
    });

    it('should match "how likely" for binary market', () => {
      const result = checkFastPath('How likely is this?', mockMarket);
      expect(result.matched).toBe(true);
      expect(result.response).toContain('42.0%');
    });

    it('should list all outcomes for multi-option market', () => {
      const result = checkFastPath("What's the price?", multiOutcomeMarket);
      expect(result.matched).toBe(true);
      expect(result.response).toContain('Trump');
      expect(result.response).toContain('45.0%');
      expect(result.response).toContain('DeSantis');
    });
  });

  describe('volume queries', () => {
    it('should match "How much volume?"', () => {
      const result = checkFastPath('How much volume?', mockMarket);
      expect(result.matched).toBe(true);
      expect(result.response).toContain('5.20M');
      expect(result.response).toContain('340K');
    });

    it('should include liquidity when available', () => {
      const result = checkFastPath('volume', mockMarket);
      expect(result.matched).toBe(true);
      expect(result.response).toContain('1.80M');
    });
  });

  describe('resolution rules queries', () => {
    it('should match "How does this resolve?"', () => {
      const result = checkFastPath('How does this resolve?', mockMarket);
      expect(result.matched).toBe(true);
      expect(result.response).toContain('$200,000');
      expect(result.response).toContain('CoinGecko');
    });

    it('should handle missing rules gracefully', () => {
      const noRulesMarket = { ...mockMarket, rules: undefined, resolutionSource: undefined };
      const result = checkFastPath('resolution criteria', noRulesMarket);
      expect(result.matched).toBe(true);
      expect(result.response).toContain('not specified');
    });
  });

  describe('outcome listing queries', () => {
    it('should match "What are the outcomes?"', () => {
      const result = checkFastPath('What are the outcomes?', multiOutcomeMarket);
      expect(result.matched).toBe(true);
      expect(result.response).toContain('Outcomes (4)');
      expect(result.response).toContain('Trump');
    });
  });

  describe('non-matching queries', () => {
    it('should NOT match "Is this a good bet?"', () => {
      const result = checkFastPath('Is this a good bet?', mockMarket);
      expect(result.matched).toBe(false);
    });

    it('should NOT match "Any recent news?"', () => {
      const result = checkFastPath('Any recent news?', mockMarket);
      expect(result.matched).toBe(false);
    });

    it('should NOT match "Tell me everything"', () => {
      const result = checkFastPath('Tell me everything', mockMarket);
      expect(result.matched).toBe(false);
    });
  });

  describe('compound query rejection', () => {
    it('should NOT match compound queries with "and what"', () => {
      const result = checkFastPath('When does this close and what is the price?', mockMarket);
      expect(result.matched).toBe(false);
    });

    it('should NOT match queries with multiple question marks', () => {
      const result = checkFastPath('What is the price? And the volume?', mockMarket);
      expect(result.matched).toBe(false);
    });
  });
});
