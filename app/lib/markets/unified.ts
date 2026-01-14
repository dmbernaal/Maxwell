import type { UnifiedMarket, Platform, MarketsRequest, MarketsResponse, ApiError } from './types';
import { fetchPolymarketMarkets, fetchPolymarketMarketById } from './adapters/polymarket';
import { fetchKalshiMarkets, fetchKalshiMarketById } from './adapters/kalshi';

export type SortField = 'volume' | 'trending' | 'endDate' | 'newest';

function sortMarkets(markets: UnifiedMarket[], sortBy: SortField): UnifiedMarket[] {
  const sorted = [...markets];
  
  switch (sortBy) {
    case 'volume':
      return sorted.sort((a, b) => b.volume - a.volume);
    case 'trending':
      return sorted.sort((a, b) => b.volume24h - a.volume24h);
    case 'endDate':
      return sorted.sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
    case 'newest':
      return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    default:
      return sorted;
  }
}

function deduplicateMarkets(markets: UnifiedMarket[]): UnifiedMarket[] {
  const seen = new Set<string>();
  return markets.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

export async function fetchUnifiedMarkets(options: MarketsRequest = {}): Promise<MarketsResponse> {
  const { 
    query, 
    platform = 'all', 
    sort = 'volume', 
    limit = 50,
  } = options;

  const shouldFetchPoly = platform === 'all' || platform === 'polymarket';
  const shouldFetchKalshi = platform === 'all' || platform === 'kalshi';

  const results = await Promise.allSettled([
    shouldFetchPoly 
      ? fetchPolymarketMarkets({ query, limit, active: true })
      : Promise.resolve({ markets: [], nextCursor: undefined }),
    shouldFetchKalshi 
      ? fetchKalshiMarkets({ query, limit, status: 'open' })
      : Promise.resolve({ markets: [], nextCursor: undefined }),
  ]);

  const polyResult = results[0];
  const kalshiResult = results[1];

  const polyMarkets = polyResult.status === 'fulfilled' ? polyResult.value.markets : [];
  const kalshiMarkets = kalshiResult.status === 'fulfilled' ? kalshiResult.value.markets : [];

  let allMarkets = [...polyMarkets, ...kalshiMarkets];
  allMarkets = deduplicateMarkets(allMarkets);
  allMarkets = sortMarkets(allMarkets, sort);
  allMarkets = allMarkets.slice(0, limit);

  return {
    markets: allMarkets,
    totalCount: allMarkets.length,
    asOf: Date.now(),
  };
}

export async function fetchMarketById(id: string): Promise<UnifiedMarket | null> {
  if (id.startsWith('poly:')) {
    return fetchPolymarketMarketById(id);
  }
  
  if (id.startsWith('kalshi:')) {
    return fetchKalshiMarketById(id);
  }

  const [polyResult, kalshiResult] = await Promise.allSettled([
    fetchPolymarketMarketById(id),
    fetchKalshiMarketById(id),
  ]);

  if (polyResult.status === 'fulfilled' && polyResult.value) {
    return polyResult.value;
  }
  
  if (kalshiResult.status === 'fulfilled' && kalshiResult.value) {
    return kalshiResult.value;
  }

  return null;
}

export function createApiError(
  code: ApiError['error']['code'],
  message: string,
  source?: Platform
): ApiError {
  return {
    error: { code, message, source },
    asOf: Date.now(),
  };
}
