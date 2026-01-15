'use server';

import { fetchPolymarketComments } from '@/app/lib/markets/adapters/polymarket';
import { MarketComment } from '@/app/lib/markets/types';

export async function getMarketComments(marketId: string): Promise<MarketComment[]> {
  try {
    return await fetchPolymarketComments(marketId);
  } catch (error) {
    console.error('Error in getMarketComments action:', error);
    return [];
  }
}