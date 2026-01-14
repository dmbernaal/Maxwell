# Maxwell Prediction Markets - Types PRD

**Version**: 1.0 (MVP)  
**Last Updated**: January 2025  
**Status**: Draft - Pending Approval

---

## Overview

This document defines the TypeScript types for the prediction market feature. These types form the **contract** between API adapters, API routes, and frontend components.

---

## 1. Core Types

### 1.1 Platform & UnifiedMarket

```typescript
// app/lib/markets/types.ts

/**
 * Supported prediction market platforms
 */
export type Platform = 'polymarket' | 'kalshi';

/**
 * Normalized market data from any platform.
 * This is the SINGLE SOURCE OF TRUTH for the frontend.
 */
export interface UnifiedMarket {
  // ─────────────────────────────────────────────
  // IDENTITY
  // ─────────────────────────────────────────────
  
  /** Prefixed ID: "poly:abc123" or "kalshi:KXBTC" */
  id: string;
  
  /** Original platform ID (no prefix) */
  externalId: string;
  
  /** Source platform */
  platform: Platform;
  
  /** URL-friendly slug */
  slug: string;
  
  /** Direct link to market on platform */
  url: string;
  
  // ─────────────────────────────────────────────
  // DISPLAY
  // ─────────────────────────────────────────────
  
  /** Market question/title */
  title: string;
  
  /** Full description (may be long) */
  description?: string;
  
  /** Category: "Politics", "Economics", "Science", etc. */
  category: string;
  
  /** Market image URL if available */
  imageUrl?: string;
  
  // ─────────────────────────────────────────────
  // PRICING (NORMALIZED TO 0-1)
  // ─────────────────────────────────────────────
  
  /** YES probability (0.0 - 1.0) */
  yesPrice: number;
  
  /** NO probability (0.0 - 1.0) */
  noPrice: number;
  
  /** Last trade price */
  lastPrice?: number;
  
  // ─────────────────────────────────────────────
  // VOLUME (NORMALIZED TO USD)
  // ─────────────────────────────────────────────
  
  /** Total volume in USD */
  volume: number;
  
  /** 24-hour volume in USD */
  volume24h: number;
  
  /** Current liquidity */
  liquidity?: number;
  
  /** Open interest (Kalshi only) */
  openInterest?: number;
  
  // ─────────────────────────────────────────────
  // TIMING
  // ─────────────────────────────────────────────
  
  /** Resolution deadline */
  endDate: Date;
  
  /** Market creation date */
  createdAt: Date;
  
  /** Market status */
  status: 'open' | 'closed' | 'resolved';
  
  // ─────────────────────────────────────────────
  // RESOLUTION
  // ─────────────────────────────────────────────
  
  /** Resolution rules text */
  rules?: string;
  
  /** Resolution source description */
  resolutionSource?: string;
  
  /** Final result (if resolved) */
  result?: 'yes' | 'no' | null;
  
  // ─────────────────────────────────────────────
  // UI HELPERS
  // ─────────────────────────────────────────────
  
  /** Is this market trending? */
  trending?: boolean;
  
  /** Featured/promoted market? */
  featured?: boolean;
}
```

---

### 1.2 Extended Types

```typescript
/**
 * Price history data point
 */
export interface PricePoint {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  
  /** Price (0.0 - 1.0) */
  price: number;
}

/**
 * Order book data
 */
export interface OrderBook {
  /** Bid orders: [price, size][] */
  bids: [number, number][];
  
  /** Ask orders: [price, size][] */
  asks: [number, number][];
  
  /** Timestamp when fetched */
  asOf: number;
}

/**
 * Market with full detail (for detail page)
 */
export interface UnifiedMarketDetail extends UnifiedMarket {
  /** Historical price data */
  priceHistory: PricePoint[];
  
  /** Current order book */
  orderBook?: OrderBook;
  
  /** Full description (never truncated) */
  fullDescription: string;
  
  /** Related markets (same event/series) */
  relatedMarkets?: UnifiedMarket[];
}
```

---

## 2. API Response Types

### 2.1 Markets List

```typescript
/**
 * GET /api/markets request
 */
export interface MarketsRequest {
  query?: string;
  platform?: Platform | 'all';
  sort?: 'volume' | 'trending' | 'endDate' | 'newest';
  limit?: number;
  cursor?: string;
}

/**
 * GET /api/markets response
 */
export interface MarketsResponse {
  markets: UnifiedMarket[];
  nextCursor?: string;
  totalCount?: number;
  asOf: number;
}
```

### 2.2 Market Detail

```typescript
/**
 * GET /api/markets/:id response
 */
export interface MarketDetailResponse {
  market: UnifiedMarketDetail;
  asOf: number;
}
```

### 2.3 Error Response

```typescript
export type ApiErrorCode = 
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'AUTH_ERROR'
  | 'NORMALIZATION_ERROR';

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    retryAfterMs?: number;
    source?: Platform;
    details?: unknown;
  };
  asOf: number;
}
```

---

## 3. Adapter Types (Raw API Responses)

### 3.1 Polymarket Raw Types

```typescript
// app/lib/markets/adapters/polymarket.types.ts

/**
 * Raw response from Polymarket GAMMA API
 * WARNING: Many fields are JSON strings, not actual types!
 */
export interface PolymarketMarketRaw {
  id: string;
  question: string;
  slug: string;
  description: string;
  
  // ⚠️ JSON STRING: '["Yes", "No"]'
  outcomes: string;
  
  // ⚠️ JSON STRING: '["0.24", "0.76"]'
  outcomePrices: string;
  
  // ⚠️ STRING NUMBER: "1234567.89"
  volume: string;
  volume24hr: string;
  liquidity: string;
  
  active: boolean;
  closed: boolean;
  endDate: string;
  createdTime: string;
  category: string;
  image?: string;
  
  // Token IDs for CLOB
  clobTokenIds?: string;
}

/**
 * Polymarket price history response
 */
export interface PolymarketPriceHistory {
  history: Array<{
    t: number;  // timestamp
    p: number;  // price
  }>;
}
```

### 3.2 Kalshi Raw Types

```typescript
// app/lib/markets/adapters/kalshi.types.ts

/**
 * Raw response from Kalshi API
 * WARNING: Prices are in CENTS (0-100), not 0-1!
 */
export interface KalshiMarketRaw {
  ticker: string;
  title: string;
  subtitle: string;
  event_ticker: string;
  
  // ⚠️ CENTS: 24 means 0.24
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  
  volume: number;
  volume_24h: number;
  open_interest: number;
  
  // ⚠️ UNIX TIMESTAMP (seconds)
  close_time: number;
  open_time: number;
  
  status: 'open' | 'closed' | 'settled';
  result: 'yes' | 'no' | '' | null;
  category: string;
}

/**
 * Kalshi order book response
 */
export interface KalshiOrderBook {
  orderbook: {
    yes: Array<[number, number]>;  // [price_cents, quantity]
    no: Array<[number, number]>;
  };
}
```

---

## 4. Normalization Functions (Signatures)

```typescript
// app/lib/markets/adapters/polymarket.ts

/**
 * Convert Polymarket raw response to UnifiedMarket
 */
export function normalizePolymarketMarket(
  raw: PolymarketMarketRaw
): UnifiedMarket;

/**
 * Convert Polymarket price history to PricePoint[]
 */
export function normalizePolymarketPriceHistory(
  raw: PolymarketPriceHistory
): PricePoint[];


// app/lib/markets/adapters/kalshi.ts

/**
 * Convert Kalshi raw response to UnifiedMarket
 */
export function normalizeKalshiMarket(
  raw: KalshiMarketRaw
): UnifiedMarket;

/**
 * Convert Kalshi order book to normalized OrderBook
 */
export function normalizeKalshiOrderBook(
  raw: KalshiOrderBook
): OrderBook;
```

---

## 5. Store Types

```typescript
// app/stores/markets-store.ts

export interface MarketsState {
  // Data
  marketsById: Record<string, UnifiedMarket>;
  searchResults: string[];  // Market IDs
  
  // UI State
  searchQuery: string;
  selectedPlatform: Platform | 'all';
  sortBy: 'volume' | 'trending' | 'endDate';
  
  // Loading
  isLoading: boolean;
  error: string | null;
  lastFetchTimestamp: number | null;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setPlatform: (platform: Platform | 'all') => void;
  setSortBy: (sort: 'volume' | 'trending' | 'endDate') => void;
  fetchMarkets: () => Promise<void>;
  getMarketById: (id: string) => UnifiedMarket | undefined;
}

export interface MarketAnalysisState {
  // Per-market analysis results
  analysisByMarketId: Record<string, SavedAnalysis>;
  
  // Actions
  saveAnalysis: (marketId: string, analysis: SavedAnalysis) => void;
  getAnalysis: (marketId: string) => SavedAnalysis | undefined;
  clearAnalysis: (marketId: string) => void;
}

export interface SavedAnalysis {
  marketId: string;
  question: string;
  verdict: string;
  verification: VerificationOutput;  // From Maxwell
  sources: MaxwellSource[];
  confidence: number;
  timestamp: number;
  durationMs: number;
}
```

---

## 6. Component Prop Types

```typescript
// Market components

export interface MarketCardProps {
  market: UnifiedMarket;
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

export interface MarketGridProps {
  markets: UnifiedMarket[];
  isLoading?: boolean;
  onMarketClick: (market: UnifiedMarket) => void;
}

export interface MarketAutocompleteProps {
  query: string;
  results: UnifiedMarket[];
  trendingQueries: string[];
  onSelectMarket: (market: UnifiedMarket) => void;
  onSelectQuery: (query: string) => void;
  isVisible: boolean;
}

export interface MarketDataPanelProps {
  market: UnifiedMarketDetail;
  isLoading?: boolean;
}

export interface PriceChartProps {
  data: PricePoint[];
  platform: Platform;
  interval: '1h' | '1d' | '1w' | '1m' | 'all';
  onIntervalChange: (interval: string) => void;
}

export interface OrderBookProps {
  orderBook: OrderBook;
  platform: Platform;
}
```

---

## 7. Validation (Zod Schemas)

```typescript
// app/lib/markets/validation.ts

import { z } from 'zod';

export const PlatformSchema = z.enum(['polymarket', 'kalshi']);

export const UnifiedMarketSchema = z.object({
  id: z.string().regex(/^(poly|kalshi):/),
  externalId: z.string(),
  platform: PlatformSchema,
  slug: z.string(),
  url: z.string().url(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string(),
  imageUrl: z.string().url().optional(),
  yesPrice: z.number().min(0).max(1),
  noPrice: z.number().min(0).max(1),
  lastPrice: z.number().min(0).max(1).optional(),
  volume: z.number().min(0),
  volume24h: z.number().min(0),
  liquidity: z.number().min(0).optional(),
  openInterest: z.number().min(0).optional(),
  endDate: z.coerce.date(),
  createdAt: z.coerce.date(),
  status: z.enum(['open', 'closed', 'resolved']),
  rules: z.string().optional(),
  resolutionSource: z.string().optional(),
  result: z.enum(['yes', 'no']).nullable().optional(),
  trending: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export type UnifiedMarket = z.infer<typeof UnifiedMarketSchema>;
```

---

## 8. File Structure

```
app/lib/markets/
├── types.ts                 # Core types (UnifiedMarket, etc.)
├── validation.ts            # Zod schemas
├── adapters/
│   ├── polymarket.ts        # Polymarket client + normalizer
│   ├── polymarket.types.ts  # Raw Polymarket types
│   ├── kalshi.ts            # Kalshi client + normalizer
│   └── kalshi.types.ts      # Raw Kalshi types
└── unified.ts               # Unified fetch + merge logic
```

---

## Approval

- [ ] Engineering Lead
- [ ] Product Owner

---

*Types should be updated as API responses reveal new fields.*
