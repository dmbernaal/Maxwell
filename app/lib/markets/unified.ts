import type { UnifiedMarket, Platform, MarketsRequest, MarketsResponse, ApiError, PricePoint, OrderBook, OutcomePriceHistory } from './types';
import { fetchPolymarketMarkets, fetchPolymarketMarketById, fetchPolymarketPriceHistory, fetchPolymarketMultiOutcomePriceHistory } from './adapters/polymarket';
import { fetchKalshiMarkets, fetchKalshiMarketById, fetchKalshiPriceHistory, fetchKalshiOrderBook } from './adapters/kalshi';
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

export async function fetchPriceHistory(market: UnifiedMarket): Promise<PricePoint[]> {
  if (market.platform === 'polymarket') {
    const externalId = market.id.startsWith('poly:') ? market.id.slice(5) : market.id;
    const isEvent = externalId.startsWith('event:');
    
    if (isEvent) {
      const eventId = externalId.slice(6);
      const url = `https://gamma-api.polymarket.com/events/${eventId}`;
      
      try {
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 60 },
        });
        
        if (!response.ok) return [];
        
        const event = await response.json();
        const activeMarkets = event.markets?.filter((m: any) => m.active && !m.closed && m.clobTokenIds) || [];
        
        if (activeMarkets.length === 0) return [];
        
        const topMarket = activeMarkets.reduce((a: any, b: any) => {
          const pricesA = JSON.parse(a.outcomePrices || '["0","0"]');
          const pricesB = JSON.parse(b.outcomePrices || '["0","0"]');
          return parseFloat(pricesA[0]) > parseFloat(pricesB[0]) ? a : b;
        });
        
        if (topMarket?.clobTokenIds) {
          const tokenIds = typeof topMarket.clobTokenIds === 'string' 
            ? JSON.parse(topMarket.clobTokenIds) 
            : topMarket.clobTokenIds;
          
          if (tokenIds?.[0]) {
            return fetchPolymarketPriceHistory(tokenIds[0]);
          }
        }
      } catch {
        return [];
      }
      return [];
    }
    
    try {
      const url = `https://gamma-api.polymarket.com/markets/${externalId}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 60 },
      });
      
      if (!response.ok) return [];
      
      const raw = await response.json();
      
      if (raw.clobTokenIds) {
        const tokenIds = typeof raw.clobTokenIds === 'string' 
          ? JSON.parse(raw.clobTokenIds) 
          : raw.clobTokenIds;
        
        if (tokenIds?.[0]) {
          return fetchPolymarketPriceHistory(tokenIds[0]);
        }
      }
    } catch {
      return [];
    }
    return [];
  }
  
  if (market.platform === 'kalshi') {
    const ticker = market.externalId;
    if (ticker.startsWith('event:')) {
      const eventTicker = ticker.slice(6);
      try {
        const url = `https://api.elections.kalshi.com/trade-api/v2/markets?event_ticker=${eventTicker}&limit=10`;
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 60 },
        });
        
        if (!response.ok) return [];
        
        const data = await response.json();
        const activeMarkets = data.markets?.filter((m: any) => m.status === 'active') || [];
        
        if (activeMarkets.length === 0) return [];
        
        const topMarket = activeMarkets.reduce((a: any, b: any) => 
          (a.yes_bid || 0) > (b.yes_bid || 0) ? a : b
        );
        
        if (topMarket?.ticker) {
          return fetchKalshiPriceHistory(topMarket.ticker);
        }
      } catch {
        return [];
      }
      return [];
    }
    return fetchKalshiPriceHistory(ticker);
  }
  
  return [];
}

export async function fetchOrderBook(market: UnifiedMarket): Promise<OrderBook | null> {
  if (market.platform === 'kalshi') {
    const ticker = market.externalId;
    if (ticker.startsWith('event:')) return null;
    return fetchKalshiOrderBook(ticker);
  }
  return null;
}

export async function fetchMultiOutcomePriceHistory(
  market: UnifiedMarket,
  topN: number = 4
): Promise<OutcomePriceHistory[]> {
  if (market.platform === 'polymarket' && market.marketType === 'multi-option') {
    const externalId = market.id.startsWith('poly:') ? market.id.slice(5) : market.id;
    if (externalId.startsWith('event:')) {
      const eventId = externalId.slice(6);
      return fetchPolymarketMultiOutcomePriceHistory(eventId, topN);
    }
  }
  return [];
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
