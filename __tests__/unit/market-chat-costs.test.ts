import { calculateLLMCost } from '../../app/lib/market-chat/costs';

describe('MarketChat — Cost Calculation', () => {
  describe('calculateLLMCost', () => {
    it('should calculate Gemini 3 Flash cost correctly', () => {
      const cost = calculateLLMCost(
        { promptTokens: 1000, completionTokens: 500 },
        'google/gemini-3-flash-preview'
      );
      // 1000 * 0.50 / 1M + 500 * 3.00 / 1M = 0.0005 + 0.0015 = 0.002
      expect(cost).toBeCloseTo(0.002, 5);
    });

    it('should calculate Gemini 3 Pro cost correctly', () => {
      const cost = calculateLLMCost(
        { promptTokens: 2000, completionTokens: 1000 },
        'google/gemini-3-pro-preview'
      );
      // 2000 * 2.00 / 1M + 1000 * 12.00 / 1M = 0.004 + 0.012 = 0.016
      expect(cost).toBeCloseTo(0.016, 5);
    });

    it('should calculate Grok 4.1 Fast cost correctly', () => {
      const cost = calculateLLMCost(
        { promptTokens: 1000, completionTokens: 500 },
        'x-ai/grok-4.1-fast'
      );
      // 1000 * 0.20 / 1M + 500 * 0.50 / 1M = 0.0002 + 0.00025 = 0.00045
      expect(cost).toBeCloseTo(0.00045, 6);
    });

    it('should return 0 for unknown model', () => {
      const cost = calculateLLMCost(
        { promptTokens: 1000, completionTokens: 500 },
        'unknown/model-xyz'
      );
      expect(cost).toBe(0);
    });

    it('should handle zero tokens', () => {
      const cost = calculateLLMCost(
        { promptTokens: 0, completionTokens: 0 },
        'google/gemini-3-flash-preview'
      );
      expect(cost).toBe(0);
    });

    it('should calculate realistic simple query cost (~$0.002)', () => {
      // Typical simple query: ~800 prompt tokens (system + context), ~300 output tokens
      const cost = calculateLLMCost(
        { promptTokens: 800, completionTokens: 300 },
        'google/gemini-3-flash-preview'
      );
      // 800 * 0.50/1M + 300 * 3.00/1M = 0.0004 + 0.0009 = 0.0013
      expect(cost).toBeLessThan(0.005);
      expect(cost).toBeGreaterThan(0.0005);
    });
  });
});
