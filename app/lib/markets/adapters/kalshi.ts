import type { UnifiedMarket, OrderBook } from '../types';
import type { KalshiMarketRaw, KalshiMarketsResponse, KalshiOrderBookRaw } from './kalshi.types';

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

function centsToDecimal(cents: number): number {
  return cents / 100;
}

function unixSecondsToDate(unixSeconds: number): Date {
  return new Date(unixSeconds * 1000);
}

function determineStatus(raw: KalshiMarketRaw): 'open' | 'closed' | 'resolved' {
  if (raw.status === 'settled') return 'resolved';
  if (raw.status === 'closed') return 'closed';
  return 'open';
}

function determineResult(raw: KalshiMarketRaw): 'yes' | 'no' | null {
  if (raw.result === 'yes') return 'yes';
  if (raw.result === 'no') return 'no';
  return null;
}

export function normalizeKalshiMarket(raw: KalshiMarketRaw): UnifiedMarket {
  const yesPrice = centsToDecimal(raw.yes_bid || raw.last_price || 50);
  const noPrice = centsToDecimal(raw.no_bid || (100 - (raw.last_price || 50)));

  return {
    id: `kalshi:${raw.ticker}`,
    externalId: raw.ticker,
    platform: 'kalshi',
    slug: raw.ticker.toLowerCase(),
    url: `https://kalshi.com/markets/${raw.ticker}`,
    title: raw.title,
    description: raw.subtitle,
    category: raw.category || 'Uncategorized',
    yesPrice,
    noPrice,
    lastPrice: centsToDecimal(raw.last_price),
    volume: raw.volume,
    volume24h: raw.volume_24h,
    openInterest: raw.open_interest,
    endDate: unixSecondsToDate(raw.close_time),
    createdAt: unixSecondsToDate(raw.open_time),
    status: determineStatus(raw),
    result: determineResult(raw),
    rules: raw.rules_primary,
    resolutionSource: raw.settlement_source_url,
    trending: raw.volume_24h > 10000,
  };
}

export function normalizeKalshiOrderBook(raw: KalshiOrderBookRaw): OrderBook {
  return {
    bids: raw.orderbook.yes.map(([price, size]) => [centsToDecimal(price), size]),
    asks: raw.orderbook.no.map(([price, size]) => [centsToDecimal(price), size]),
    asOf: Date.now(),
  };
}

interface FetchOptions {
  query?: string;
  limit?: number;
  cursor?: string;
  status?: 'open' | 'closed' | 'settled';
}

export async function fetchKalshiMarkets(options: FetchOptions = {}): Promise<{
  markets: UnifiedMarket[];
  nextCursor?: string;
}> {
  const params = new URLSearchParams();
  
  if (options.limit) params.set('limit', String(options.limit));
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.status) params.set('status', options.status);
  
  const url = `${KALSHI_API_BASE}/markets?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Kalshi API error: ${response.status} ${response.statusText}`);
  }

  const data: KalshiMarketsResponse = await response.json();
  
  let markets = data.markets
    .filter(m => m.title && m.ticker)
    .map(normalizeKalshiMarket);

  if (options.query) {
    const q = options.query.toLowerCase();
    markets = markets.filter(m => 
      m.title.toLowerCase().includes(q) || 
      m.description?.toLowerCase().includes(q)
    );
  }

  return { 
    markets, 
    nextCursor: data.cursor 
  };
}

export async function fetchKalshiMarketById(id: string): Promise<UnifiedMarket | null> {
  const ticker = id.startsWith('kalshi:') ? id.slice(7) : id;
  
  const url = `${KALSHI_API_BASE}/markets/${ticker}`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 60 },
  });

  if (response.status === 404) return null;
  
  if (!response.ok) {
    throw new Error(`Kalshi API error: ${response.status}`);
  }

  const data = await response.json();
  return normalizeKalshiMarket(data.market);
}
