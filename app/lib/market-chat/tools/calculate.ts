import { tool } from 'ai';
import { z } from 'zod';

export const calculateTool = tool({
  description: 'Perform prediction market calculations: expected value (EV), Kelly criterion position sizing, implied probability conversions, and outcome comparisons.',
  inputSchema: z.object({
    operation: z.enum(['ev', 'kelly', 'implied_probability', 'compare_outcomes', 'payout'])
      .describe('Type of calculation to perform'),
    inputs: z.record(z.number())
      .describe('Calculation inputs as key-value pairs. For EV: {userProb, marketPrice, positionSize}. For Kelly: {userProb, marketPrice, bankroll}. For implied_probability: {price}. For payout: {positionSize, marketPrice}.'),
  }),
  execute: async ({ operation, inputs }) => {
    switch (operation) {
      case 'ev': {
        const { userProb = 0.5, marketPrice = 0.5, positionSize = 100 } = inputs;
        const payout = positionSize / marketPrice;
        const winProfit = payout - positionSize;
        const ev = (userProb * winProfit) - ((1 - userProb) * positionSize);
        const roi = (ev / positionSize) * 100;
        const edge = userProb - marketPrice;
        return {
          expectedValue: Math.round(ev * 100) / 100,
          roi: Math.round(roi * 10) / 10,
          edge: Math.round(edge * 1000) / 10,
          payout: Math.round(payout * 100) / 100,
          winProfit: Math.round(winProfit * 100) / 100,
          interpretation: ev > 0 ? 'Positive EV — edge exists' : 'Negative EV — no edge',
        };
      }
      case 'kelly': {
        const { userProb = 0.5, marketPrice = 0.5, bankroll = 1000 } = inputs;
        const b = (1 - marketPrice) / marketPrice;
        const kelly = (b * userProb - (1 - userProb)) / b;
        const fullKellyAmount = kelly * bankroll;
        return {
          fullKelly: Math.round(kelly * 1000) / 10,
          halfKelly: Math.round(kelly * 500) / 10,
          quarterKelly: Math.round(kelly * 250) / 10,
          fullKellyAmount: Math.round(fullKellyAmount * 100) / 100,
          halfKellyAmount: Math.round(fullKellyAmount * 50) / 100,
          quarterKellyAmount: Math.round(fullKellyAmount * 25) / 100,
          recommendation: 'Half-Kelly is recommended for most traders to manage variance.',
        };
      }
      case 'implied_probability': {
        const { price = 0.5 } = inputs;
        return {
          impliedProbability: Math.round(price * 1000) / 10,
          decimalOdds: Math.round((1 / price) * 100) / 100,
          americanOdds: price >= 0.5
            ? Math.round(-(price / (1 - price)) * 100)
            : Math.round(((1 - price) / price) * 100),
        };
      }
      case 'payout': {
        const { positionSize = 100, marketPrice = 0.5 } = inputs;
        const payout = positionSize / marketPrice;
        const profit = payout - positionSize;
        return {
          payout: Math.round(payout * 100) / 100,
          profit: Math.round(profit * 100) / 100,
          returnMultiple: Math.round((1 / marketPrice) * 100) / 100,
        };
      }
      case 'compare_outcomes': {
        const outcomes = Object.entries(inputs).map(([name, price]) => ({
          name,
          price,
          impliedProb: Math.round(price * 1000) / 10,
        }));
        const sorted = outcomes.sort((a, b) => a.price - b.price);
        return {
          outcomes: sorted,
          bestValue: sorted[0],
          totalImplied: Math.round(outcomes.reduce((s, o) => s + o.price, 0) * 1000) / 10,
          overround: Math.round((outcomes.reduce((s, o) => s + o.price, 0) - 1) * 1000) / 10,
        };
      }
      default:
        return { error: `Unknown operation: ${operation}` };
    }
  },
});
