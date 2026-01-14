# Maxwell Prediction Markets - Agent Task Mapping

**Version**: 1.0 (MVP)  
**Last Updated**: January 2025  
**Status**: Draft - Pending Approval

---

## Overview

This document maps PRD sections to implementation tasks for AI agents. Each task is atomic, well-defined, and includes all context needed for implementation.

---

## PRD Reference

| PRD | Location | Purpose |
|-----|----------|---------|
| System Architecture | `prd/system-architecture.prd.md` | Data flow, API structure, state management |
| Design | `prd/design.prd.md` | Colors, typography, components, wireframes |
| APIs | `prd/apis.prd.md` | External APIs, internal routes, contracts |
| Types | `prd/types.prd.md` | TypeScript types, validation schemas |

---

## Implementation Phases

### Phase 1: Foundation (Types + API Clients)

| Task ID | Description | PRD Reference | Priority | Agent |
|---------|-------------|---------------|----------|-------|
| `P1-T1` | Create `UnifiedMarket` types and Zod validation | types.prd.md §1-7 | P0 | Backend |
| `P1-T2` | Build Polymarket GAMMA adapter | apis.prd.md §1.1 | P0 | Backend |
| `P1-T3` | Build Kalshi REST adapter | apis.prd.md §1.2 | P0 | Backend |
| `P1-T4` | Create unified API route `/api/markets` | apis.prd.md §2.1 | P0 | Backend |
| `P1-T5` | Create market detail route `/api/markets/[id]` | apis.prd.md §2.2 | P0 | Backend |

### Phase 2: Core UI

| Task ID | Description | PRD Reference | Priority | Agent |
|---------|-------------|---------------|----------|-------|
| `P2-T1` | Build `MarketCard` component | design.prd.md §6 | P0 | Frontend |
| `P2-T2` | Build `MarketGrid` component | design.prd.md §5 | P0 | Frontend |
| `P2-T3` | Integrate `MarketAutocomplete` with API | design.prd.md §5 | P0 | Frontend |
| `P2-T4` | Update landing page with market grid | design.prd.md §5 | P0 | Frontend |
| `P2-T5` | Create `useMarkets` hook | types.prd.md §5 | P0 | Frontend |

### Phase 3: Market Detail

| Task ID | Description | PRD Reference | Priority | Agent |
|---------|-------------|---------------|----------|-------|
| `P3-T1` | Build `MarketDataPanel` (left side) | design.prd.md §5 | P0 | Frontend |
| `P3-T2` | Build `PriceChart` component | design.prd.md §6 | P1 | Frontend |
| `P3-T3` | Create split-view detail page | design.prd.md §5 | P0 | Frontend |
| `P3-T4` | Integrate `MarketIntelligencePanel` | design.prd.md §5 | P0 | Frontend |
| `P3-T5` | Wire Maxwell analysis trigger | system-architecture.prd.md §2.2 | P0 | Full-stack |

### Phase 4: Polish

| Task ID | Description | PRD Reference | Priority | Agent |
|---------|-------------|---------------|----------|-------|
| `P4-T1` | Add loading/skeleton states | design.prd.md §10 | P1 | Frontend |
| `P4-T2` | Add error handling UI | design.prd.md §10 | P1 | Frontend |
| `P4-T3` | Mobile responsive pass | design.prd.md §7 | P1 | Frontend |
| `P4-T4` | Accessibility fixes (ARIA, keyboard) | design.prd.md §9 | P1 | Frontend |
| `P4-T5` | IndexedDB persistence for analyses | system-architecture.prd.md §6 | P2 | Frontend |

---

## Task Templates

### Backend Task Template

```markdown
## Task: [Task ID] - [Description]

### Context
- PRD Reference: [link to section]
- Dependencies: [list of prior tasks]

### Requirements
[Paste relevant PRD section]

### Files to Create/Modify
- `app/lib/markets/[file].ts`
- `app/api/markets/[route].ts`

### Acceptance Criteria
- [ ] Types match PRD exactly
- [ ] Handles rate limits gracefully
- [ ] Error responses match contract
- [ ] Unit tests pass

### Do NOT
- Add Redis caching (handled separately)
- Modify existing Maxwell pipeline
- Add authentication UI
```

### Frontend Task Template

```markdown
## Task: [Task ID] - [Description]

### Context
- PRD Reference: [link to section]
- Dependencies: [list of prior tasks]
- Design Reference: [wireframe section]

### Requirements
[Paste relevant PRD section]

### Files to Create/Modify
- `app/components/markets/[Component].tsx`

### Component Props
[Paste from types.prd.md]

### Acceptance Criteria
- [ ] Matches wireframe layout
- [ ] Uses correct color tokens
- [ ] Responsive at all breakpoints
- [ ] Passes RAMS accessibility check

### Do NOT
- Create new color variables (use existing)
- Add new dependencies
- Modify existing Maxwell components
```

---

## Detailed Task Specifications

### P1-T1: Create UnifiedMarket Types

```
FILES:
  - app/lib/markets/types.ts (CREATE)
  - app/lib/markets/validation.ts (CREATE)

REFERENCE: types.prd.md sections 1-7

REQUIREMENTS:
  - Define Platform type
  - Define UnifiedMarket interface
  - Define UnifiedMarketDetail interface
  - Define PricePoint, OrderBook types
  - Define API response types
  - Create Zod validation schemas

ACCEPTANCE:
  - All types from PRD are present
  - Zod schemas validate correctly
  - No any types used
```

### P1-T2: Build Polymarket Adapter

```
FILES:
  - app/lib/markets/adapters/polymarket.ts (CREATE)
  - app/lib/markets/adapters/polymarket.types.ts (CREATE)

REFERENCE: apis.prd.md section 1.1, types.prd.md section 3.1

REQUIREMENTS:
  - Define raw Polymarket types (with JSON string gotchas documented)
  - Implement fetchPolymarketMarkets()
  - Implement normalizePolymarketMarket()
  - Handle JSON string parsing for outcomes/outcomePrices
  - Handle string number parsing for volume
  - Generate prefixed ID: "poly:{id}"
  - Generate URL: "https://polymarket.com/event/{slug}"

ACCEPTANCE:
  - Fetches from GAMMA API successfully
  - Normalizes to UnifiedMarket correctly
  - Handles parsing edge cases
  - Includes error handling for malformed responses
```

### P1-T3: Build Kalshi Adapter

```
FILES:
  - app/lib/markets/adapters/kalshi.ts (CREATE)
  - app/lib/markets/adapters/kalshi.types.ts (CREATE)

REFERENCE: apis.prd.md section 1.2, types.prd.md section 3.2

REQUIREMENTS:
  - Define raw Kalshi types (with cents gotchas documented)
  - Implement fetchKalshiMarkets()
  - Implement normalizeKalshiMarket()
  - Convert cents to 0-1 (divide by 100)
  - Convert Unix timestamps to Date objects
  - Handle cursor-based pagination
  - Generate prefixed ID: "kalshi:{ticker}"
  - Generate URL: "https://kalshi.com/markets/{ticker}"

NOTE: Start without auth; add RSA signing only if required

ACCEPTANCE:
  - Fetches from Kalshi API successfully
  - Normalizes to UnifiedMarket correctly
  - Handles cents conversion
  - Handles pagination
```

### P1-T4: Create Unified Markets API Route

```
FILES:
  - app/api/markets/route.ts (CREATE)
  - app/lib/markets/unified.ts (CREATE)

REFERENCE: apis.prd.md section 2.1, system-architecture.prd.md section 5

REQUIREMENTS:
  - Accept query params: query, platform, sort, limit, cursor
  - Fetch from both adapters in parallel
  - Merge and deduplicate results
  - Sort by specified field
  - Return MarketsResponse type
  - Handle errors per API contract
  - Add request deduplication (in-flight tracking)

ACCEPTANCE:
  - Returns unified markets from both platforms
  - Sorting works correctly
  - Filtering by platform works
  - Error responses match contract
```

### P2-T1: Build MarketCard Component

```
FILES:
  - app/components/markets/MarketCard.tsx (CREATE)

REFERENCE: design.prd.md section 6 (MarketCard wireframe)

PROPS:
  interface MarketCardProps {
    market: UnifiedMarket;
    onClick?: () => void;
  }

REQUIREMENTS:
  - Platform badge (blue for Poly, green for Kalshi)
  - Market title (2 lines max, truncate)
  - Odds bar (visual percentage)
  - Volume + end date footer
  - Hover state: translateY(-2px), border glow
  - Use existing color tokens

ACCEPTANCE:
  - Matches wireframe exactly
  - Platform colors are correct
  - Hover animation is smooth
  - Responsive at all sizes
```

### P3-T5: Wire Maxwell Analysis Trigger

```
FILES:
  - app/markets/[id]/page.tsx (MODIFY)
  - app/hooks/use-market-report.ts (CREATE)

REFERENCE: system-architecture.prd.md section 2.2

REQUIREMENTS:
  - "Run Analysis" button in MarketIntelligencePanel
  - Build query from market: "{title}? Context: {rules}"
  - Call existing useMaxwell hook
  - Show PhaseProgress during analysis
  - Display VerdictCard when complete
  - Display VerificationPanel with claims
  - Store result in local state (IndexedDB later)

ACCEPTANCE:
  - Clicking button triggers Maxwell pipeline
  - Progress is visible during analysis
  - Results display in right panel
  - Can re-run analysis
```

---

## Dependency Graph

```
P1-T1 (Types)
   │
   ├──► P1-T2 (Polymarket Adapter)
   │       │
   │       └──► P1-T4 (Unified API)
   │               │
   ├──► P1-T3 (Kalshi Adapter)    │
   │       │                       │
   │       └───────────────────────┘
   │                               │
   │                               ▼
   │                         P2-T5 (useMarkets hook)
   │                               │
   │       ┌───────────────────────┴───────────────────────┐
   │       │                       │                       │
   │       ▼                       ▼                       ▼
   │   P2-T1 (Card)           P2-T2 (Grid)           P2-T3 (Autocomplete)
   │       │                       │                       │
   │       └───────────────────────┴───────────────────────┘
   │                               │
   │                               ▼
   │                         P2-T4 (Landing Page)
   │                               │
   │                               ▼
   │                         P1-T5 (Detail API)
   │                               │
   │       ┌───────────────────────┴───────────────────────┐
   │       │                       │                       │
   │       ▼                       ▼                       ▼
   │   P3-T1 (DataPanel)      P3-T2 (Chart)          P3-T3 (Split View)
   │       │                       │                       │
   │       └───────────────────────┴───────────────────────┘
   │                               │
   │                               ▼
   │                         P3-T4 (Intelligence Panel)
   │                               │
   │                               ▼
   └─────────────────────────► P3-T5 (Maxwell Trigger)
                                   │
                                   ▼
                             P4-T1-T5 (Polish)
```

---

## Agent Assignment Suggestions

| Agent Type | Tasks |
|------------|-------|
| **Backend/API** | P1-T1, P1-T2, P1-T3, P1-T4, P1-T5 |
| **Frontend UI** | P2-T1, P2-T2, P2-T3, P2-T4, P3-T1, P3-T2, P3-T3 |
| **Full-stack** | P2-T5, P3-T4, P3-T5 |
| **Polish/A11Y** | P4-T1, P4-T2, P4-T3, P4-T4, P4-T5 |

---

## Execution Order (Recommended)

```
Week 1:
  Day 1: P1-T1 (Types - foundation for everything)
  Day 2: P1-T2 (Polymarket adapter)
  Day 3: P1-T3 (Kalshi adapter)
  Day 4: P1-T4 (Unified API route)
  Day 5: P1-T5 (Detail API route)

Week 2:
  Day 1: P2-T5 (useMarkets hook)
  Day 2: P2-T1, P2-T2 (Card + Grid)
  Day 3: P2-T3 (Autocomplete integration)
  Day 4: P2-T4 (Landing page)
  Day 5: Buffer / testing

Week 3:
  Day 1: P3-T1 (Data panel)
  Day 2: P3-T2 (Price chart)
  Day 3: P3-T3 (Split view page)
  Day 4: P3-T4, P3-T5 (Intelligence + Maxwell)
  Day 5: Integration testing

Week 4:
  Day 1-2: P4-T1, P4-T2 (Loading/error states)
  Day 3-4: P4-T3, P4-T4 (Mobile + A11Y)
  Day 5: P4-T5 (Persistence) + final testing
```

---

## Approval

- [ ] Engineering Lead
- [ ] Product Owner

---

*Update this mapping as tasks are completed or requirements change.*
