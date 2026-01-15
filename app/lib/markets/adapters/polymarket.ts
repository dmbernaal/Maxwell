import type { UnifiedMarket, PricePoint, MarketType, MarketOutcome, OutcomePriceHistory, MarketComment } from '../types';
import type { PolymarketMarketRaw, PolymarketEventRaw, PolymarketPriceHistory, PolymarketCommentRaw } from './polymarket.types';

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
    rules: undefined,
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

const CLOB_API_BASE = 'https://clob.polymarket.com';

export async function fetchPolymarketPriceHistory(tokenId: string): Promise<PricePoint[]> {
  try {
    const url = `${CLOB_API_BASE}/prices-history?market=${tokenId}&interval=max&fidelity=360`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) return [];

    const data: PolymarketPriceHistory = await response.json();
    return normalizePolymarketPriceHistory(data);
  } catch {
    return [];
  }
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
    
    const activeMarkets = event.markets.filter(m => m.active && !m.closed);
    
    const groupedOutcomes: MarketOutcome[] = activeMarkets
      .map(m => {
        const prices = parseJsonString<string[]>(m.outcomePrices, ['0', '0']);
        return {
          name: m.groupItemTitle || m.question,
          price: parseStringNumber(prices[0] ?? '0'),
        };
      });
    
    const topOutcome = groupedOutcomes.sort((a, b) => b.price - a.price)[0];
    
    const firstMarketRules = activeMarkets[0]?.description;
    
    return {
      id: `poly:event:${event.id}`,
      externalId: event.id,
      platform: 'polymarket',
      slug: event.slug,
      url: `https://polymarket.com/event/${event.slug}`,
      title: event.title,
      description: event.description,
      rules: firstMarketRules,
      resolutionSource: event.resolutionSource || undefined,
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

const MULTI_OUTCOME_COLORS = [
  '#4a9eff',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
];

export async function fetchPolymarketMultiOutcomePriceHistory(
  eventId: string,
  topN: number = 4
): Promise<OutcomePriceHistory[]> {
  try {
    const url = `${GAMMA_API_BASE}/events/${eventId}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!response.ok) return [];

    const event: PolymarketEventRaw = await response.json();
    
    const marketsWithTokens = event.markets
      .filter(m => m.active && !m.closed && m.clobTokenIds)
      .map(m => {
        const clobTokenIds = parseJsonString<string[]>(m.clobTokenIds || '[]', []);
        const prices = parseJsonString<string[]>(m.outcomePrices, ['0', '0']);
        return {
          name: m.groupItemTitle || m.question,
          tokenId: clobTokenIds[0],
          price: parseStringNumber(prices[0] ?? '0'),
        };
      })
      .filter(m => m.tokenId)
      .sort((a, b) => b.price - a.price)
      .slice(0, topN);

    const results: OutcomePriceHistory[] = await Promise.all(
      marketsWithTokens.map(async (market, idx) => {
        const history = await fetchPolymarketPriceHistory(market.tokenId);
        return {
          outcomeName: market.name,
          tokenId: market.tokenId,
          history,
          color: MULTI_OUTCOME_COLORS[idx % MULTI_OUTCOME_COLORS.length],
        };
      })
    );

    return results.filter(r => r.history.length > 0);
  } catch {
    return [];
  }
}


export async function fetchPolymarketComments(marketId: string): Promise<MarketComment[]> {
  try {
    const id = marketId.startsWith('poly:') ? marketId.slice(5) : marketId;
    const isEvent = id.startsWith('event:');
    
    // STRATEGY 1: Try Series level first (if event has a series)
    // This is the PRIMARY way Polymarket fetches comments for recurring events
    if (isEvent) {
      const eventId = id.slice(6);
      try {
        const eventUrl = `${GAMMA_API_BASE}/events/${eventId}`;
        const eventRes = await fetch(eventUrl, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 60 },
        });

        if (eventRes.ok) {
          const eventData: PolymarketEventRaw = await eventRes.json();
          
          // Check if event has a series (recurring events like FOMC, NBA, etc.)
          if (eventData.series && eventData.series.length > 0) {
            const seriesId = eventData.series[0].id;
            
            // Fetch comments from Series level - THIS IS KEY!
            // Series aggregates comments across all events in the series
            const seriesUrl = `${GAMMA_API_BASE}/comments?parent_entity_type=Series&parent_entity_id=${seriesId}&limit=50&order=createdAt&ascending=false`;
            const seriesRes = await fetch(seriesUrl, {
              headers: { 'Accept': 'application/json' },
              next: { revalidate: 30 },
            });

            if (seriesRes.ok) {
              const seriesComments: PolymarketCommentRaw[] = await seriesRes.json();
              if (Array.isArray(seriesComments) && seriesComments.length > 0) {
                return seriesComments.map(c => ({
                  id: c.id,
                  userId: c.userAddress,
                  username: c.profile.pseudonym || c.profile.name || c.userAddress.slice(0, 6),
                  avatarUrl: c.profile.profileImage,
                  text: c.body,
                  timestamp: new Date(c.createdAt).getTime(),
                  likes: c.reactionCount || 0,
                  replyCount: c.replyCount || 0,
                  platform: 'polymarket',
                  sentiment: c.body.toLowerCase().includes('yes') || c.body.toLowerCase().includes('buy') ? 'bullish' :
                             c.body.toLowerCase().includes('no') || c.body.toLowerCase().includes('sell') ? 'bearish' : 
                             undefined
                }));
              }
            }
          }
        }
      } catch (err) {
        // Series fetch failed, continue to Event level
        console.warn('Failed to fetch series comments for event:', eventId);
      }
    }
    
    // STRATEGY 2: Try Event level (for standalone events without series)
    // Note: 'market' entity type is invalid, always use 'Event' for comment lookup
    const entityType = 'Event';
    const entityId = isEvent ? id.slice(6) : id;

const url = `${GAMMA_API_BASE}/comments?parent_entity_type=${entityType}&parent_entity_id=${entityId}&limit=50&order=createdAt&ascending=false`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 30 },
    });

    if (!response.ok) return [];

    let comments: PolymarketCommentRaw[] = await response.json();
    
    // If no comments found and this is an event, try token-level fallback
    if (comments.length === 0 && isEvent) {
      try {
        const eventId = id.slice(6);
        const eventUrl = `${GAMMA_API_BASE}/events/${eventId}`;
        const eventRes = await fetch(eventUrl, { next: { revalidate: 60 } });
        
        if (eventRes.ok) {
          const eventData: PolymarketEventRaw = await eventRes.json();
          const mainMarket = eventData.markets.sort((a, b) => 
            Number(b.volume24hr || 0) - Number(a.volume24hr || 0)
          )[0];

          if (mainMarket && mainMarket.clobTokenIds) {
            const tokenIds = parseJsonString<string[]>(mainMarket.clobTokenIds, []);
            if (tokenIds.length > 0) {
              const tokenUrl = `${GAMMA_API_BASE}/comments?parent_entity_type=Token&parent_entity_id=${tokenIds[0]}&limit=50&order=createdAt&ascending=false`;
              const tokenRes = await fetch(tokenUrl, { next: { revalidate: 30 } });
              
              if (tokenRes.ok) {
                const tokenComments = await tokenRes.json();
                if (Array.isArray(tokenComments) && tokenComments.length > 0) {
                  comments = tokenComments;
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch fallback comments for event:', id);
      }
    }
    
// STRATEGY 3: For individual markets with no comments, check if they belong to an event with a series
    if (comments.length === 0 && !isEvent) {
      try {
        const marketUrl = `${GAMMA_API_BASE}/markets/${id}`;
        const marketRes = await fetch(marketUrl, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 60 },
        });
        
        if (marketRes.ok) {
          const marketData: PolymarketMarketRaw = await marketRes.json();
          
          // Try to find event by using the market's slug (since eventSlug might be null)
          if (marketData.slug) {
const slugEventUrl = `${GAMMA_API_BASE}/events?slug=${marketData.slug}`;
            const eventRes = await fetch(slugEventUrl, {
              headers: { 'Accept': 'application/json' },
              next: { revalidate: 60 },
            });
            
            if (eventRes.ok) {
              const events: PolymarketEventRaw[] = await eventRes.json();
              if (events.length > 0) {
                const eventData = events[0];
                
                // Check if event has a series with comments
                if (eventData.series && eventData.series.length > 0) {
                  const seriesId = eventData.series[0].id;
                  
                  const seriesUrl = `${GAMMA_API_BASE}/comments?parent_entity_type=Series&parent_entity_id=${seriesId}&limit=50&order=createdAt&ascending=false`;
                  const seriesRes = await fetch(seriesUrl, {
                    headers: { 'Accept': 'application/json' },
                    next: { revalidate: 30 },
                  });
                  
                  if (seriesRes.ok) {
                    const seriesComments: PolymarketCommentRaw[] = await seriesRes.json();
                    if (Array.isArray(seriesComments) && seriesComments.length > 0) {
                      comments = seriesComments;
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch series comments for individual market:', id);
      }
    }
    
    return comments.map(c => ({
      id: c.id,
      userId: c.userAddress,
      username: c.profile.pseudonym || c.profile.name || c.userAddress.slice(0, 6),
      avatarUrl: c.profile.profileImage,
      text: c.body,
      timestamp: new Date(c.createdAt).getTime(),
      likes: c.reactionCount || 0,
      replyCount: c.replyCount || 0,
      platform: 'polymarket',
      sentiment: c.body.toLowerCase().includes('yes') || c.body.toLowerCase().includes('buy') ? 'bullish' :
                 c.body.toLowerCase().includes('no') || c.body.toLowerCase().includes('sell') ? 'bearish' : 
                 undefined
    }));
  } catch {
    return [];
  }
}

