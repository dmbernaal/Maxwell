import type { UnifiedMarket, OrderBook, MarketOutcome } from '../types';
import type { KalshiMarketRaw, KalshiMarketsResponse, KalshiOrderBookRaw } from './kalshi.types';

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

interface KalshiEvent {
  event_ticker: string;
  title: string;
  sub_title?: string;
  category: string;
  mutually_exclusive: boolean;
  series_ticker: string;
}

interface KalshiEventsResponse {
  events: KalshiEvent[];
  cursor: string;
}

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

function isSportsParlay(title: string): boolean {
  return title.includes(',yes ') || 
         title.includes(',no ') || 
         title.startsWith('yes ') || 
         title.startsWith('no ');
}

export function normalizeKalshiMarket(raw: KalshiMarketRaw): UnifiedMarket {
  const yesPrice = centsToDecimal(raw.yes_bid || raw.last_price || 50);
  const noPrice = centsToDecimal(raw.no_bid || (100 - (raw.last_price || 50)));

  const outcomes: MarketOutcome[] = [
    { name: 'Yes', price: yesPrice },
    { name: 'No', price: noPrice },
  ];

  return {
    id: `kalshi:${raw.ticker}`,
    externalId: raw.ticker,
    platform: 'kalshi',
    slug: raw.ticker.toLowerCase(),
    url: `https://kalshi.com/markets/${raw.ticker}`,
    title: raw.title,
    description: raw.subtitle,
    category: raw.category || 'Uncategorized',
    marketType: 'binary',
    outcomes,
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

async function fetchEventsWithMarkets(limit: number): Promise<UnifiedMarket[]> {
  const eventsResponse = await fetch(
    `${KALSHI_API_BASE}/events?limit=50&status=open`,
    { headers: { 'Accept': 'application/json' }, next: { revalidate: 60 } }
  );
  
  if (!eventsResponse.ok) return [];
  
  const eventsData: KalshiEventsResponse = await eventsResponse.json();
  const allMarkets: UnifiedMarket[] = [];
  
  for (const event of eventsData.events.slice(0, 10)) {
    try {
      const marketsResponse = await fetch(
        `${KALSHI_API_BASE}/markets?event_ticker=${event.event_ticker}&limit=20`,
        { headers: { 'Accept': 'application/json' }, next: { revalidate: 60 } }
      );
      
      if (!marketsResponse.ok) continue;
      
        const marketsData: KalshiMarketsResponse = await marketsResponse.json();
        const eventMarkets = marketsData.markets
          .filter(m => m.title && m.ticker && !isSportsParlay(m.title) && m.status === 'active')
          .map(m => ({
            ...normalizeKalshiMarket(m),
            category: event.category || m.category || 'Uncategorized',
          }));
      
      if (eventMarkets.length > 1 && event.mutually_exclusive) {
        const groupedOutcomes: MarketOutcome[] = eventMarkets.map(m => ({
          name: m.externalId.split('-').pop() || m.title,
          price: m.yesPrice,
        })).sort((a, b) => b.price - a.price);
        
        const topMarket = eventMarkets.reduce((a, b) => 
          (a.volume || 0) > (b.volume || 0) ? a : b
        );
        
        allMarkets.push({
          ...topMarket,
          id: `kalshi:event:${event.event_ticker}`,
          externalId: event.event_ticker,
          title: event.title,
          description: event.sub_title,
          category: event.category || 'Uncategorized',
          marketType: 'multi-option',
          outcomes: groupedOutcomes,
          volume: eventMarkets.reduce((sum, m) => sum + (m.volume || 0), 0),
        });
      } else {
        allMarkets.push(...eventMarkets);
      }
      
      if (allMarkets.length >= limit) break;
    } catch {
      continue;
    }
  }
  
  return allMarkets.slice(0, limit);
}

export async function fetchKalshiMarkets(options: FetchOptions = {}): Promise<{
  markets: UnifiedMarket[];
  nextCursor?: string;
}> {
  const limit = options.limit || 20;
  
  const eventMarkets = await fetchEventsWithMarkets(limit);
  
  if (eventMarkets.length >= limit) {
    let markets = eventMarkets;
    
    if (options.query) {
      const q = options.query.toLowerCase();
      markets = markets.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.description?.toLowerCase().includes(q)
      );
    }
    
    return { markets, nextCursor: undefined };
  }
  
  const params = new URLSearchParams();
  params.set('limit', String(limit * 3));
  if (options.cursor) params.set('cursor', options.cursor);
  params.set('status', 'active');
  
  const url = `${KALSHI_API_BASE}/markets?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return { markets: eventMarkets, nextCursor: undefined };
  }

  const data: KalshiMarketsResponse = await response.json();
  
  const directMarkets = data.markets
    .filter(m => m.title && m.ticker && !isSportsParlay(m.title))
    .map(normalizeKalshiMarket);
  
  const existingIds = new Set(eventMarkets.map(m => m.id));
  const uniqueDirectMarkets = directMarkets.filter(m => !existingIds.has(m.id));
  
  let markets = [...eventMarkets, ...uniqueDirectMarkets].slice(0, limit);

  if (options.query) {
    const q = options.query.toLowerCase();
    markets = markets.filter(m => 
      m.title.toLowerCase().includes(q) || 
      m.description?.toLowerCase().includes(q)
    );
  }

  const nextCursor = data.cursor && data.cursor !== '' ? data.cursor : undefined;
  
  return { markets, nextCursor };
}

export async function fetchKalshiMarketById(id: string): Promise<UnifiedMarket | null> {
  const ticker = id.startsWith('kalshi:') ? id.slice(7) : id;
  const isEvent = ticker.startsWith('event:');
  
  if (isEvent) {
    const eventTicker = ticker.slice(6);
    const marketsResponse = await fetch(
      `${KALSHI_API_BASE}/markets?event_ticker=${eventTicker}&limit=50`,
      { headers: { 'Accept': 'application/json' }, next: { revalidate: 60 } }
    );
    
    if (!marketsResponse.ok) return null;
    
    const data: KalshiMarketsResponse = await marketsResponse.json();
    const eventMarkets = data.markets
      .filter(m => m.status === 'active')
      .map(normalizeKalshiMarket);
    
    if (eventMarkets.length === 0) return null;
    
    const groupedOutcomes: MarketOutcome[] = eventMarkets.map(m => ({
      name: m.externalId.split('-').pop() || m.title,
      price: m.yesPrice,
    })).sort((a, b) => b.price - a.price);
    
    const topMarket = eventMarkets[0];
    
    return {
      ...topMarket,
      id: `kalshi:event:${eventTicker}`,
      externalId: eventTicker,
      marketType: 'multi-option',
      outcomes: groupedOutcomes,
      volume: eventMarkets.reduce((sum, m) => sum + (m.volume || 0), 0),
    };
  }
  
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
