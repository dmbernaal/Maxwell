# Maxwell Prediction Markets - APIs PRD

**Version**: 1.0 (MVP)  
**Last Updated**: January 2025  
**Status**: Draft - Pending Approval

---

## Overview

This document defines the external APIs we consume and the internal API routes we build.

---

## 1. External APIs (Data Sources)

### 1.1 Polymarket APIs (Official)

**Documentation**: https://docs.polymarket.com/quickstart/overview

#### GAMMA API (Market Discovery)

| Property | Value |
|----------|-------|
| Base URL | `https://gamma-api.polymarket.com` |
| Auth | None required (public) |
| Rate Limit | 300 req/10s for `/markets` |

**Endpoints Used**:

```
GET /markets
  Query params:
    - active: boolean
    - closed: boolean
    - limit: number (default 100)
    - offset: number
    - order: string (e.g., "volume24hr")
    - ascending: boolean
  
  Response: {
    markets: PolymarketMarket[]
  }

GET /markets/{id}
  Response: PolymarketMarket
```

**Response Schema (PolymarketMarket)**:

```typescript
interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  description: string;
  outcomes: string;           // JSON string: '["Yes", "No"]'
  outcomePrices: string;      // JSON string: '["0.24", "0.76"]'
  volume: string;             // String number
  volume24hr: string;
  liquidity: string;
  active: boolean;
  closed: boolean;
  endDate: string;            // ISO date
  createdTime: string;
  category: string;
  // ... more fields
}
```

**⚠️ Gotchas**:
- `outcomes` and `outcomePrices` are JSON strings, not arrays
- `volume` is a string, not a number
- Must parse defensively

---

#### CLOB API (Prices & Orderbook)

| Property | Value |
|----------|-------|
| Base URL | `https://clob.polymarket.com` |
| Auth | Required for trading, optional for prices |
| Rate Limit | 1500 req/10s for `/price` |

**Endpoints Used**:

```
GET /prices-history
  Query params:
    - market: string (token ID)
    - interval: "1m" | "1h" | "6h" | "1d" | "1w" | "max"
    - fidelity: number (resolution in minutes)
  
  Response: {
    history: Array<{ t: number, p: number }>
  }

GET /book
  Query params:
    - token_id: string
  
  Response: {
    bids: Array<[price, size]>,
    asks: Array<[price, size]>
  }
```

---

### 1.2 Kalshi API (Official)

**Documentation**: https://docs.kalshi.com/welcome

| Property | Value |
|----------|-------|
| Base URL | `https://api.elections.kalshi.com/trade-api/v2` |
| Auth | RSA-PSS signing (required for most endpoints) |
| Rate Limit | 20 req/s (Basic tier) |

**Note**: Despite "elections" in URL, this provides ALL markets.

**Endpoints Used**:

```
GET /markets
  Query params:
    - status: "open" | "closed" | "settled"
    - limit: number
    - cursor: string (pagination)
  
  Headers (for auth):
    - KALSHI-ACCESS-KEY: string
    - KALSHI-ACCESS-SIGNATURE: string (RSA-PSS)
    - KALSHI-ACCESS-TIMESTAMP: string (ms)
  
  Response: {
    markets: KalshiMarket[],
    cursor: string
  }

GET /markets/{ticker}
  Response: {
    market: KalshiMarket
  }

GET /markets/{ticker}/orderbook
  Query params:
    - depth: number
  
  Response: {
    orderbook: {
      yes: Array<[price, quantity]>,
      no: Array<[price, quantity]>
    }
  }
```

**Response Schema (KalshiMarket)**:

```typescript
interface KalshiMarket {
  ticker: string;
  title: string;
  subtitle: string;
  status: "open" | "closed" | "settled";
  yes_bid: number;              // In cents (0-100)
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;           // In cents
  volume: number;
  volume_24h: number;
  open_interest: number;
  close_time: number;           // Unix timestamp
  result: "yes" | "no" | null;
  category: string;
  // ... more fields
}
```

**⚠️ Gotchas**:
- Prices are in CENTS (0-100), not 0-1
- Uses cursor-based pagination
- Auth required even for public data (read)

---

## 2. Internal API Routes (To Build)

### 2.1 GET /api/markets

**Purpose**: Unified market list from both platforms

**Request**:
```typescript
interface MarketsRequest {
  query?: string;           // Search term
  platform?: 'polymarket' | 'kalshi' | 'all';
  sort?: 'volume' | 'trending' | 'endDate';
  limit?: number;           // Default 50, max 100
  cursor?: string;          // Opaque pagination token
}
```

**Response**:
```typescript
interface MarketsResponse {
  markets: UnifiedMarket[];
  nextCursor?: string;
  asOf: number;             // Timestamp
}
```

**Implementation Notes**:
- Fetch from both APIs in parallel
- Normalize to UnifiedMarket
- Merge and sort results
- Cache with 60s TTL

---

### 2.2 GET /api/markets/[id]

**Purpose**: Single market detail

**Request**:
```
GET /api/markets/poly:abc123
GET /api/markets/kalshi:KXBTC
```

**Response**:
```typescript
interface MarketDetailResponse {
  market: UnifiedMarket;
  priceHistory?: PricePoint[];
  orderBook?: OrderBook;
  asOf: number;
}
```

**Implementation Notes**:
- Parse platform from ID prefix
- Fetch from appropriate API
- Include price history if available

---

### 2.3 POST /api/maxwell/analyze (Existing, Extended)

**Purpose**: Run Maxwell analysis on market question

**Request**:
```typescript
interface AnalyzeRequest {
  marketId: string;
  question: string;         // Market title
  context?: string;         // Rules, deadline, etc.
}
```

**Response**: SSE stream (existing Maxwell events)

**Implementation Notes**:
- Reuses existing Maxwell pipeline
- Adds market context to decomposition
- Returns standard Maxwell events via SSE

---

## 3. Error Response Contract

All API routes return consistent error format:

```typescript
interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    retryAfterMs?: number;
    source?: 'polymarket' | 'kalshi';
  };
  asOf: number;
}

type ErrorCode = 
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'AUTH_ERROR';
```

---

## 4. Rate Limit Strategy

### Client-Side

```typescript
const RATE_LIMIT_CONFIG = {
  // Debounce search input
  SEARCH_DEBOUNCE_MS: 300,
  
  // Polling intervals
  MARKET_LIST_POLL_MS: 60_000,
  MARKET_DETAIL_POLL_MS: 30_000,
  
  // Backoff on 429
  INITIAL_BACKOFF_MS: 1_000,
  MAX_BACKOFF_MS: 30_000,
  BACKOFF_MULTIPLIER: 2,
};
```

### Server-Side

```typescript
// Request deduplication
const inFlightRequests = new Map<string, Promise<Response>>();

// Exponential backoff wrapper
async function fetchWithBackoff(url: string, options: RequestInit) {
  let backoff = INITIAL_BACKOFF_MS;
  
  while (true) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      await sleep(backoff);
      backoff = Math.min(backoff * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);
      continue;
    }
    
    return response;
  }
}
```

---

## 5. Caching Strategy

| Endpoint | Cache Location | TTL | Invalidation |
|----------|---------------|-----|--------------|
| `/api/markets` | Server memory | 30s | Time-based |
| `/api/markets/[id]` | Server memory | 30s | Time-based |
| Price history | Client IndexedDB | 5min | Manual refresh |
| Order book | None | N/A | Always fresh |

---

## 6. Authentication (Kalshi)

For MVP, we'll attempt to use public endpoints. If auth is required:

```typescript
// Environment variables (server-only)
KALSHI_API_KEY_ID=xxx
KALSHI_PRIVATE_KEY_PEM=xxx

// Signing implementation
import { createSign } from 'crypto';

function signKalshiRequest(
  method: string, 
  path: string, 
  timestamp: string
): string {
  const message = `${timestamp}${method}${path}`;
  const sign = createSign('SHA256');
  sign.update(message);
  return sign.sign(privateKey, 'base64');
}
```

---

## 7. API Route File Structure

```
app/api/
├── markets/
│   ├── route.ts              // GET /api/markets
│   └── [id]/
│       ├── route.ts          // GET /api/markets/:id
│       └── chart/
│           └── route.ts      // GET /api/markets/:id/chart
└── maxwell/
    ├── decompose/route.ts    // Existing
    ├── search/route.ts       // Existing
    ├── synthesize/route.ts   // Existing
    ├── verify/route.ts       // Existing
    └── adjudicate/route.ts   // Existing
```

---

## Approval

- [ ] Engineering Lead
- [ ] Product Owner

---

*Keep this document updated as API contracts evolve.*
