import type { UnifiedMarket, Platform, MarketsRequest, MarketsResponse, ApiError } from './types';
import { fetchPolymarketMarkets, fetchPolymarketMarketById } from './adapters/polymarket';
import { fetchKalshiMarkets, fetchKalshiMarketById } from './adapters/kalshi';
import { 
  decodeUnifiedCursor, 
  encodeUnifiedCursor, 
  createReqSig, 
  createInitialCursor,
  type UnifiedCursor 
} from './cursor';

export type SortField = 'volume' | 'trending' | 'endDate' | 'newest';

function sortMarkets(markets: UnifiedMarket[], sortBy: SortField): UnifiedMarket[] {
  const sorted = [...markets];
  
  switch (sortBy) {
    case 'volume':
      return sorted.sort((a, b) => (b.volume - a.volume) || a.id.localeCompare(b.id));
    case 'trending':
      return sorted.sort((a, b) => (b.volume24h - a.volume24h) || a.id.localeCompare(b.id));
    case 'endDate':
      return sorted.sort((a, b) => (a.endDate.getTime() - b.endDate.getTime()) || a.id.localeCompare(b.id));
    case 'newest':
      return sorted.sort((a, b) => (b.createdAt.getTime() - a.createdAt.getTime()) || a.id.localeCompare(b.id));
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

/**
 * Dual-API pagination using "Parallel Window" strategy.
 * Polymarket uses offset, Kalshi uses cursor.
 * Cursor tracks FETCHED counts (not emitted) to prevent re-fetching.
 */
export async function fetchUnifiedMarkets(options: MarketsRequest = {}): Promise<MarketsResponse> {
  const { 
    query, 
    platform = 'all', 
    category,
    sort = 'volume', 
    limit = 20,
    cursor: cursorParam,
  } = options;

  const reqSig = createReqSig(platform, sort, query);
  const decoded = decodeUnifiedCursor(cursorParam);
  
  const cur = (decoded && decoded.reqSig === reqSig) 
    ? decoded 
    : createInitialCursor(reqSig);
  
  console.log('[unified] Fetching with cursor:', {
    polyOffset: cur.polyOffset,
    kalshiCursor: cur.kalshiCursor?.slice(0, 20),
    exhausted: cur.exhausted
  });

  const shouldFetchPoly = (platform === 'all' || platform === 'polymarket') && !cur.exhausted?.poly;
  const shouldFetchKalshi = (platform === 'all' || platform === 'kalshi') && !cur.exhausted?.kalshi;

  const polyOrderMap: Record<SortField, 'volume' | 'volume24hr' | 'createdAt' | 'liquidity'> = {
    volume: 'volume',
    trending: 'volume24hr',
    newest: 'createdAt',
    endDate: 'liquidity',
  };
  const polyOrder = polyOrderMap[sort];
  const polyAscending = sort === 'endDate';
  const fetchLimit = limit;

  const results = await Promise.allSettled([
    shouldFetchPoly 
      ? fetchPolymarketMarkets({ 
          query, 
          limit: fetchLimit, 
          offset: cur.polyOffset,
          active: true,
          order: polyOrder,
          ascending: polyAscending
        })
      : Promise.resolve({ markets: [] as UnifiedMarket[], nextCursor: undefined }),
    shouldFetchKalshi 
      ? fetchKalshiMarkets({ 
          query, 
          limit: fetchLimit, 
          cursor: cur.kalshiCursor,
          status: 'open' 
        })
      : Promise.resolve({ markets: [] as UnifiedMarket[], nextCursor: undefined }),
  ]);

  const polyResult = results[0];
  const kalshiResult = results[1];

  const polyMarkets = polyResult.status === 'fulfilled' ? polyResult.value.markets : [];
  const kalshiMarkets = kalshiResult.status === 'fulfilled' ? kalshiResult.value.markets : [];
  const kalshiNextCursor = kalshiResult.status === 'fulfilled' ? kalshiResult.value.nextCursor : undefined;

  console.log('[unified] Fetched:', {
    polyCount: polyMarkets.length,
    kalshiCount: kalshiMarkets.length,
    kalshiHasNext: !!kalshiNextCursor
  });

  let allMarkets = [...polyMarkets, ...kalshiMarkets];
  allMarkets = deduplicateMarkets(allMarkets);
  
  if (category) {
    const categoryLower = category.toLowerCase();
    allMarkets = allMarkets.filter(m => 
      m.category.toLowerCase() === categoryLower ||
      m.category.toLowerCase().includes(categoryLower)
    );
  }
  
  allMarkets = sortMarkets(allMarkets, sort);

  const next: UnifiedCursor = {
    v: 1,
    reqSig,
    polyOffset: cur.polyOffset + polyMarkets.length,
    kalshiCursor: kalshiNextCursor ?? cur.kalshiCursor,
    exhausted: { ...cur.exhausted },
  };

  const polyExhausted = polyMarkets.length < fetchLimit;
  const kalshiExhausted = kalshiMarkets.length < fetchLimit && !kalshiNextCursor;
  
  if (polyExhausted) next.exhausted = { ...next.exhausted, poly: true };
  if (kalshiExhausted) next.exhausted = { ...next.exhausted, kalshi: true };

  const hasMorePoly = shouldFetchPoly && !polyExhausted;
  const hasMoreKalshi = shouldFetchKalshi && !kalshiExhausted;
  const hasMore = hasMorePoly || hasMoreKalshi;

  console.log('[unified] Result:', {
    returning: allMarkets.length,
    nextPolyOffset: next.polyOffset,
    hasMore,
    polyExhausted,
    kalshiExhausted
  });

  return {
    markets: allMarkets,
    nextCursor: hasMore ? encodeUnifiedCursor(next) : undefined,
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
