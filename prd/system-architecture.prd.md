# Maxwell Prediction Markets - System Architecture PRD

**Version**: 1.0 (MVP)  
**Last Updated**: January 2025  
**Status**: Draft - Pending Approval

---

## Executive Summary

Maxwell transforms from a general search verification agent into a **prediction market research platform** that normalizes markets from Polymarket + Kalshi, then runs the existing Maxwell verification pipeline against a selected market's question. MVP favors **polling + client-side caching** (IndexedDB) over new infrastructure.

---

## 1. System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                               NEXT.JS APP                                 │
│                                                                          │
│  ┌───────────────┐        ┌──────────────────────────┐                   │
│  │  Markets UI    │        │   Market Detail UI        │                  │
│  │  /             │        │   /markets/[id]           │                  │
│  │  Grid + Search │        │   Split: Market | Maxwell │                  │
│  └───────┬───────┘        └───────────┬──────────────┘                   │
│          │                             │                                  │
│          │ GET /api/markets            │ POST /api/maxwell/* (SSE)        │
│          ▼                             ▼                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │  Unified Market API       │  │ Maxwell Multi-Endpoint API           │  │
│  │  app/api/markets/*        │  │ app/api/maxwell/*                    │  │
│  └───────────┬──────────────┘  └───────────┬──────────────────────────┘  │
│              │                               │                            │
└──────────────┼───────────────────────────────┼────────────────────────────┘
               │                               │
     ┌─────────▼─────────┐           ┌─────────▼─────────┐
     │ Polymarket GAMMA  │           │ Kalshi REST API    │
     │ (no auth)         │           │ (public endpoints) │
     └───────────────────┘           └───────────────────┘

Client Persistence (MVP):
  IndexedDB stores:
  - Market list cache + timestamps
  - Per-market Maxwell analysis results
```

---

## 2. Data Flow Diagrams

### 2.1 Market Data Pipeline

```
Polymarket GAMMA API                    Kalshi REST API
/markets?active=true                    /markets?status=open
        │                                       │
        ▼                                       ▼
PolymarketAdapter                        KalshiAdapter
- Parse JSON-string fields               - Handle cents → 0-1
- Parse volume strings                   - Map status values
- Normalize to 0-1 odds                  - Handle pagination
        │                                       │
        └───────────────┬───────────────────────┘
                        ▼
                  UnifiedMarket[]
                        │
                        ▼
              /api/markets (Next route)
              - Query filtering
              - Pagination abstraction
              - Rate limit handling
                        │
                        ▼
               Frontend (Grid/Search)
```

### 2.2 Maxwell Analysis Pipeline

```
User clicks market card
        │
        ▼
Navigate to /markets/[id]
        │
        ├── GET /api/markets/[id] ──────► Market data (left panel)
        │
        └── User clicks "Run Analysis"
                    │
                    ▼
            Build query from market:
            "{market.title}? Context: {rules}, Deadline: {endDate}"
                    │
                    ▼
    ┌───────────────┴───────────────┐
    │  Existing Maxwell Pipeline     │
    │                                │
    │  POST /api/maxwell/decompose   │
    │  POST /api/maxwell/search      │
    │  POST /api/maxwell/synthesize  │ ◄── SSE streaming
    │  POST /api/maxwell/verify      │ ◄── SSE streaming
    │  POST /api/maxwell/adjudicate  │ ◄── SSE streaming
    │                                │
    └───────────────┬───────────────┘
                    │
                    ▼
         Store in IndexedDB:
         key: "analysis:{marketId}"
         value: { verdict, claims, sources, timestamp }
```

### 2.3 Real-time Updates (MVP: Polling)

```
MarketsGrid mounted
        │
        ├── Initial fetch: GET /api/markets
        │
        ├── Every 60s (with jitter):
        │     GET /api/markets?sort=volume&limit=50
        │
        ├── On search input (debounced 300ms):
        │     GET /api/markets?query={input}
        │
        └── Store snapshot in IndexedDB (TTL: 60s)
```

---

## 3. Technical Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Next.js 15 (App Router) | Existing |
| State | Zustand | Existing `useChatStore` pattern |
| Styling | Tailwind CSS v4 | Existing |
| Animation | Framer Motion | Existing |
| Storage | IndexedDB (via Zustand persist) | MVP only |
| HTTP | Native fetch + SSE | Existing Maxwell pattern |
| Future Cache | Redis (Vercel KV) | Post-MVP |

---

## 4. Rate Limits (Basic/Free Tiers)

| Platform | Endpoint | Limit | Our Usage (MVP) |
|----------|----------|-------|-----------------|
| Polymarket GAMMA | /markets | 300 req/10s | ~1 req/60s ✅ |
| Polymarket GAMMA | General | 4000 req/10s | Well under ✅ |
| Kalshi Basic | All endpoints | 20 req/s | ~1 req/60s ✅ |

**Mitigation Strategies**:
- Client-side caching with 60s TTL
- Debounced search (300ms)
- Exponential backoff on 429 errors
- Request deduplication (in-flight tracking)

---

## 5. API Route Structure

### New Routes

```
app/api/markets/
├── route.ts              GET /api/markets
│                         Query: ?query, ?platform, ?sort, ?limit
│                         Returns: { markets: UnifiedMarket[], nextCursor? }
│
└── [id]/
    └── route.ts          GET /api/markets/:id
                          Returns: { market: UnifiedMarket }
```

### Existing Routes (Unchanged)

```
app/api/maxwell/
├── decompose/route.ts    POST - Query decomposition
├── search/route.ts       POST - Parallel search
├── synthesize/route.ts   POST - SSE answer synthesis
├── verify/route.ts       POST - SSE claim verification
└── adjudicate/route.ts   POST - SSE final verdict
```

---

## 6. State Management

### New Stores

```typescript
// useMarketsStore
{
  marketsById: Record<string, UnifiedMarket>,
  searchQuery: string,
  searchResults: string[], // market IDs
  lastFetchTimestamp: number,
  isLoading: boolean,
  error: string | null,
}

// useMarketAnalysisStore (or extend existing)
{
  analysisByMarketId: Record<string, {
    question: string,
    verdict: string,
    verification: VerificationOutput,
    sources: MaxwellSource[],
    timestamp: number,
    durationMs: number,
  }>,
}
```

### Existing Stores (Preserved)

```typescript
// useChatStore - unchanged, used for general chat if needed
```

---

## 7. Caching Strategy (Client-Side MVP)

| Data | Cache Key | TTL | Invalidation |
|------|-----------|-----|--------------|
| Market list | `markets:{platform}:{sort}` | 60s | Manual refresh |
| Single market | `market:{id}` | 60s | On detail view |
| Maxwell analysis | `analysis:{marketId}` | ∞ | User re-runs |

---

## 8. Error Handling

### API Error Contract

```typescript
// Success
{ data: T, asOf: number }

// Error
{ 
  error: { 
    code: 'RATE_LIMITED' | 'UPSTREAM_ERROR' | 'INVALID_QUERY',
    message: string,
    retryAfterMs?: number
  },
  asOf: number 
}
```

### UI Behavior

| Scenario | Behavior |
|----------|----------|
| Stale cache + fetch error | Show cached data + "Updating..." badge |
| No cache + fetch error | Show error state + retry button |
| Maxwell phase error | Show partial results + "Retry analysis" CTA |
| Rate limit hit | Show toast + auto-retry after backoff |

---

## 9. Security Considerations

1. **Kalshi Credentials**: Server-only via env vars (if needed for auth later)
2. **Request Validation**: Clamp `limit`, validate `platform`, sanitize `query`
3. **Timeouts**: 10s timeout on upstream API calls
4. **No User Data**: MVP only uses public market endpoints

---

## 10. Future Considerations (Post-MVP)

| Feature | Trigger | Approach |
|---------|---------|----------|
| Redis caching | Multi-user traffic | Vercel KV |
| WebSocket prices | Real-time demand | Polymarket WS (no auth) |
| Background sync | Scale | Vercel Cron |
| Cross-device sync | User accounts | Database migration |

---

## Approval

- [ ] Engineering Lead
- [ ] Product Owner
- [ ] Design Lead

---

*This document should be updated as implementation progresses.*
