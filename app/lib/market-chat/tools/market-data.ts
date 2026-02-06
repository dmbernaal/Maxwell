import { tool } from 'ai';
import { z } from 'zod';
import type { UnifiedMarket } from '../../markets/types';
import { fetchMarketById } from '../../markets/unified';

function formatVol(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}

export function createMarketDataTool(currentMarket: UnifiedMarket) {
  return tool({
    description: 'Fetch live market data including current prices and related markets. Use when the user asks about price changes or needs fresh data.',
    inputSchema: z.object({
      action: z.enum(['refresh_prices', 'related_markets'])
        .describe('What data to fetch'),
    }),
    execute: async ({ action }) => {
      switch (action) {
        case 'refresh_prices': {
          const fresh = await fetchMarketById(currentMarket.id);
          if (!fresh) {
            return { error: 'Could not fetch fresh data', outcomes: [] };
          }
          return {
            outcomes: fresh.outcomes.map(o => ({
              name: o.name,
              price: (o.price * 100).toFixed(1) + '%',
            })),
            volume24h: formatVol(fresh.volume24h),
            lastUpdated: new Date().toISOString(),
          };
        }
        case 'related_markets': {
          if (!currentMarket.eventId) {
            return { relatedMarkets: [], note: 'No related markets found for this event.' };
          }
          return {
            relatedMarkets: [],
            note: 'Related markets feature coming in a future update.',
          };
        }
        default:
          return { error: 'Unknown action' };
      }
    },
  });
}
