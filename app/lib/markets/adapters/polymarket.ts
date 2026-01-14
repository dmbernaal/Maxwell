import type { UnifiedMarket, PricePoint } from '../types';
import type { PolymarketMarketRaw, PolymarketPriceHistory } from './polymarket.types';

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

function parseJsonString<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

function parseStringNumber(str: string): number {
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

function determineStatus(raw: PolymarketMarketRaw): 'open' | 'closed' | 'resolved' {
  if (raw.closed) return 'resolved';
  if (!raw.active) return 'closed';
  return 'open';
}

export function normalizePolymarketMarket(raw: PolymarketMarketRaw): UnifiedMarket {
  const outcomePrices = parseJsonString<string[]>(raw.outcomePrices, ['0', '0']);
  const yesPrice = parseStringNumber(outcomePrices[0] ?? '0');
  const noPrice = parseStringNumber(outcomePrices[1] ?? '0');

  return {
    id: `poly:${raw.id}`,
    externalId: raw.id,
    platform: 'polymarket',
    slug: raw.slug,
    url: `https://polymarket.com/event/${raw.slug}`,
    title: raw.question,
    description: raw.description,
    category: raw.category || 'Uncategorized',
    imageUrl: raw.image || undefined,
    yesPrice,
    noPrice,
    lastPrice: yesPrice,
    volume: parseStringNumber(raw.volume),
    volume24h: parseStringNumber(raw.volume24hr),
    liquidity: parseStringNumber(raw.liquidity),
    endDate: new Date(raw.endDate),
    createdAt: new Date(raw.createdTime),
    status: determineStatus(raw),
    trending: parseStringNumber(raw.volume24hr) > 100000,
  };
}

export function normalizePolymarketPriceHistory(raw: PolymarketPriceHistory): PricePoint[] {
  return raw.history.map(point => ({
    timestamp: point.t * 1000,
    price: point.p,
  }));
}

interface FetchOptions {
  query?: string;
  limit?: number;
  offset?: number;
  active?: boolean;
  order?: 'volume24hr' | 'liquidity' | 'startDate' | 'volume';
  ascending?: boolean;
}

export async function fetchPolymarketMarkets(options: FetchOptions = {}): Promise<{
  markets: UnifiedMarket[];
  nextCursor?: string;
}> {
  const params = new URLSearchParams();
  
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));
  if (options.active !== undefined) params.set('closed', String(!options.active));
  
  const orderField = options.order === 'volume' ? 'volume24hr' : (options.order || 'volume24hr');
  params.set('order', orderField);
  params.set('ascending', String(options.ascending ?? false));

  const url = `${GAMMA_API_BASE}/markets?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
  }

  let rawMarkets: PolymarketMarketRaw[] = await response.json();
  
  if (options.query) {
    const q = options.query.toLowerCase();
    rawMarkets = rawMarkets.filter(m => 
      m.question?.toLowerCase().includes(q) || 
      m.description?.toLowerCase().includes(q)
    );
  }
  
  const markets = rawMarkets
    .filter(m => m.question && m.outcomePrices)
    .map(normalizePolymarketMarket);

  return { markets, nextCursor: undefined };
}

export async function fetchPolymarketMarketById(id: string): Promise<UnifiedMarket | null> {
  const externalId = id.startsWith('poly:') ? id.slice(5) : id;
  
  const url = `${GAMMA_API_BASE}/markets/${externalId}`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 60 },
  });

  if (response.status === 404) return null;
  
  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status}`);
  }

  const raw: PolymarketMarketRaw = await response.json();
  return normalizePolymarketMarket(raw);
}
