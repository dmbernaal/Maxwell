import type { UnifiedMarket, PricePoint, MarketType, MarketOutcome } from '../types';
import type { PolymarketMarketRaw, PolymarketEventRaw, PolymarketPriceHistory } from './polymarket.types';

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

function parseJsonString<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

function parseStringNumber(str: string | number | undefined): number {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

function determineStatus(raw: PolymarketMarketRaw): 'open' | 'closed' | 'resolved' {
  if (raw.closed) return 'resolved';
  if (!raw.active) return 'closed';
  return 'open';
}

function detectMarketType(outcomeNames: string[]): MarketType {
  if (outcomeNames.length > 2) return 'multi-option';
  
  const normalized = outcomeNames.map(o => o.toLowerCase().trim());
  const isBinary = normalized.includes('yes') && normalized.includes('no');
  
  return isBinary ? 'binary' : 'matchup';
}

function parseOutcomes(raw: PolymarketMarketRaw): MarketOutcome[] {
  const names = parseJsonString<string[]>(raw.outcomes, ['Yes', 'No']);
  const prices = parseJsonString<string[]>(raw.outcomePrices, ['0', '0']);
  
  return names.map((name, i) => ({
    name,
    price: parseStringNumber(prices[i] ?? '0'),
  }));
}

export function normalizePolymarketMarket(raw: PolymarketMarketRaw, eventSlug?: string, eventCategory?: string): UnifiedMarket {
  const outcomes = parseOutcomes(raw);
  const outcomeNames = outcomes.map(o => o.name);
  const marketType = detectMarketType(outcomeNames);
  
  const yesPrice = outcomes[0]?.price ?? 0;
  const noPrice = outcomes[1]?.price ?? 0;
  
  const createdTime = raw.createdTime || raw.createdAt;
  const slug = eventSlug || raw.slug;

  return {
    id: `poly:${raw.id}`,
    externalId: raw.id,
    platform: 'polymarket',
    slug,
    url: `https://polymarket.com/event/${slug}`,
    title: raw.question,
    description: raw.description,
    category: eventCategory || raw.category || 'Uncategorized',
    imageUrl: raw.image || undefined,
    marketType,
    outcomes,
    yesPrice,
    noPrice,
    lastPrice: yesPrice,
    volume: parseStringNumber(raw.volume),
    volume24h: parseStringNumber(raw.volume24hr),
    liquidity: parseStringNumber(raw.liquidity),
    endDate: new Date(raw.endDate),
    createdAt: createdTime ? new Date(createdTime) : new Date(),
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
  order?: 'volume' | 'volume24hr' | 'createdAt' | 'liquidity';
  ascending?: boolean;
}

export async function fetchPolymarketMarkets(options: FetchOptions = {}): Promise<{
  markets: UnifiedMarket[];
  nextCursor?: string;
}> {
  const params = new URLSearchParams();
  
  params.set('closed', 'false');
  params.set('archived', 'false');
  params.set('active', 'true');
  
  const orderField = options.order || 'volume24hr';
  params.set('order', orderField);
  params.set('ascending', String(options.ascending ?? false));
  
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));

  const url = `${GAMMA_API_BASE}/events?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
  }

  const events: PolymarketEventRaw[] = await response.json();
  
  let allMarkets: UnifiedMarket[] = [];
  
  for (const event of events) {
    const activeMarkets = event.markets.filter(m => 
      m.question && 
      m.outcomePrices && 
      m.active && 
      !m.closed &&
      m.acceptingOrders !== false
    );
    
    if (activeMarkets.length === 0) continue;
    
    if (activeMarkets.length === 1) {
      const eventCategory = event.tags?.[0]?.label;
      allMarkets.push(normalizePolymarketMarket(activeMarkets[0], event.slug, eventCategory));
    } else {
      const groupedOutcomes: MarketOutcome[] = activeMarkets.map(m => {
        const prices = parseJsonString<string[]>(m.outcomePrices, ['0', '0']);
        return {
          name: m.groupItemTitle || m.question.replace(event.title, '').trim() || m.question,
          price: parseStringNumber(prices[0] ?? '0'),
        };
      }).sort((a, b) => b.price - a.price);
      
      const topOutcome = groupedOutcomes[0];
      
      const groupedMarket: UnifiedMarket = {
        id: `poly:event:${event.id}`,
        externalId: event.id,
        platform: 'polymarket',
        slug: event.slug,
        url: `https://polymarket.com/event/${event.slug}`,
        title: event.title,
        description: event.description,
        category: event.tags?.[0]?.label || 'Uncategorized',
        imageUrl: event.image || event.icon || undefined,
        marketType: 'multi-option',
        outcomes: groupedOutcomes,
        yesPrice: topOutcome?.price ?? 0,
        noPrice: 1 - (topOutcome?.price ?? 0),
        lastPrice: topOutcome?.price ?? 0,
        volume: event.volume,
        volume24h: event.volume24hr,
        liquidity: event.liquidity,
        endDate: new Date(event.endDate),
        createdAt: new Date(event.createdAt),
        status: event.closed ? 'resolved' : (event.active ? 'open' : 'closed'),
        trending: event.volume24hr > 100000,
      };
      
      allMarkets.push(groupedMarket);
    }
  }
  
  if (options.query) {
    const q = options.query.toLowerCase();
    allMarkets = allMarkets.filter(m => 
      m.title.toLowerCase().includes(q) || 
      m.description?.toLowerCase().includes(q)
    );
  }

  return { markets: allMarkets, nextCursor: undefined };
}

export async function fetchPolymarketMarketById(id: string): Promise<UnifiedMarket | null> {
  const externalId = id.startsWith('poly:') ? id.slice(5) : id;
  const isEvent = externalId.startsWith('event:');
  
  if (isEvent) {
    const eventId = externalId.slice(6);
    const url = `${GAMMA_API_BASE}/events/${eventId}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Polymarket API error: ${response.status}`);

    const event: PolymarketEventRaw = await response.json();
    
    const groupedOutcomes: MarketOutcome[] = event.markets
      .filter(m => m.active && !m.closed)
      .map(m => {
        const prices = parseJsonString<string[]>(m.outcomePrices, ['0', '0']);
        return {
          name: m.groupItemTitle || m.question,
          price: parseStringNumber(prices[0] ?? '0'),
        };
      });
    
    const topOutcome = groupedOutcomes.sort((a, b) => b.price - a.price)[0];
    
    return {
      id: `poly:event:${event.id}`,
      externalId: event.id,
      platform: 'polymarket',
      slug: event.slug,
      url: `https://polymarket.com/event/${event.slug}`,
      title: event.title,
      description: event.description,
      category: event.tags?.[0]?.label || 'Uncategorized',
      imageUrl: event.image || event.icon || undefined,
      marketType: 'multi-option',
      outcomes: groupedOutcomes,
      yesPrice: topOutcome?.price ?? 0,
      noPrice: 1 - (topOutcome?.price ?? 0),
      lastPrice: topOutcome?.price ?? 0,
      volume: event.volume,
      volume24h: event.volume24hr,
      liquidity: event.liquidity,
      endDate: new Date(event.endDate),
      createdAt: new Date(event.createdAt),
      status: event.closed ? 'resolved' : (event.active ? 'open' : 'closed'),
      trending: event.volume24hr > 100000,
    };
  }
  
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
