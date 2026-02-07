import { calculateTool } from '../../app/lib/market-chat/tools/calculate';

describe('MarketChat — Calculate Tool', () => {
  describe('Expected Value (EV)', () => {
    it('should calculate positive EV correctly', async () => {
      const result = await calculateTool.execute({
        operation: 'ev',
        inputs: { userProb: 0.60, marketPrice: 0.42, positionSize: 100 },
      }, { toolCallId: 'test', messages: [], abortSignal: undefined as any });

      expect(result.expectedValue).toBeGreaterThan(0);
      expect(result.interpretation).toContain('Positive EV');
      expect(result.edge).toBeGreaterThan(0);
    });

    it('should calculate negative EV correctly', async () => {
      const result = await calculateTool.execute({
        operation: 'ev',
        inputs: { userProb: 0.30, marketPrice: 0.42, positionSize: 100 },
      }, { toolCallId: 'test', messages: [], abortSignal: undefined as any });

      expect(result.expectedValue).toBeLessThan(0);
      expect(result.interpretation).toContain('Negative EV');
    });
  });

  describe('Kelly Criterion', () => {
    it('should calculate Kelly with edge', async () => {
      const result = await calculateTool.execute({
        operation: 'kelly',
        inputs: { userProb: 0.60, marketPrice: 0.42, bankroll: 10000 },
      }, { toolCallId: 'test', messages: [], abortSignal: undefined as any });

      expect(result.fullKelly).toBeGreaterThan(0);
      expect(result.halfKelly).toBeLessThan(result.fullKelly);
      expect(result.fullKellyAmount).toBeGreaterThan(0);
      expect(result.recommendation).toContain('Half-Kelly');
    });
  });

  describe('Implied Probability', () => {
    it('should convert price to odds formats', async () => {
      const result = await calculateTool.execute({
        operation: 'implied_probability',
        inputs: { price: 0.42 },
      }, { toolCallId: 'test', messages: [], abortSignal: undefined as any });

      expect(result.impliedProbability).toBeCloseTo(42.0, 0);
      expect(result.decimalOdds).toBeCloseTo(2.38, 1);
      expect(result.americanOdds).toBeGreaterThan(0); // Underdog
    });

    it('should handle favorite odds (price >= 0.5)', async () => {
      const result = await calculateTool.execute({
        operation: 'implied_probability',
        inputs: { price: 0.75 },
      }, { toolCallId: 'test', messages: [], abortSignal: undefined as any });

      expect(result.americanOdds).toBeLessThan(0); // Favorite
    });
  });

  describe('Payout', () => {
    it('should calculate payout and profit', async () => {
      const result = await calculateTool.execute({
        operation: 'payout',
        inputs: { positionSize: 500, marketPrice: 0.42 },
      }, { toolCallId: 'test', messages: [], abortSignal: undefined as any });

      expect(result.payout).toBeCloseTo(1190.48, 0);
      expect(result.profit).toBeCloseTo(690.48, 0);
      expect(result.returnMultiple).toBeCloseTo(2.38, 1);
    });
  });

  describe('Compare Outcomes', () => {
    it('should rank outcomes by price and calculate overround', async () => {
      const result = await calculateTool.execute({
        operation: 'compare_outcomes',
        inputs: { Trump: 0.45, DeSantis: 0.25, Haley: 0.15, Other: 0.15 },
      }, { toolCallId: 'test', messages: [], abortSignal: undefined as any });

      expect(result.outcomes).toHaveLength(4);
      expect(result.bestValue.name).toBe('Haley'); // or Other — both 0.15, sorted by price ascending
      expect(result.totalImplied).toBeCloseTo(100, 0);
    });
  });
});
