# Phase 6: Hook Updates

> **Parent PRD**: [Maxwell Trader Intelligence Revamp](../maxwell-trader-revamp.prd.md)  
> **Status**: Ready for Implementation  
> **Estimated Effort**: Day 6 (~6-8 hours)  
> **Dependencies**: Phase 5 (Presenter Implementation) - COMPLETE

---

## Objective

Update the `useMaxwell` hook to support prediction market intelligence. This phase transforms the hook from a general-purpose verified search agent into a prediction market intelligence pipeline by:

1. Accepting `MarketContext` as an optional input
2. Adding Phase 6: Presenter to the pipeline (after adjudication)
3. Replacing `answer`/`adjudication` output with structured `MaxwellIntelligence`
4. Updating caching to store `MaxwellIntelligence` instead of prose

### Key Transformation

| Current State | Future State |
|---------------|--------------|
| 5-phase pipeline (decompose → search → synthesize → verify → adjudicate) | 6-phase pipeline (+ present) |
| Output: `answer` (prose) + `adjudication` (prose) | Output: `MaxwellIntelligence` (structured JSON) |
| No market context awareness | Market context flows through entire pipeline |
| Prose-based caching | Structured intelligence caching |
| `search(query: string)` | `search(query: string, marketContext?: MarketContext)` |

---

## Deliverables

| # | Deliverable | File Location | Effort |
|---|-------------|---------------|--------|
| 1 | Add `MarketContext` to hook options | `app/hooks/use-maxwell.ts` | S |
| 2 | Update `search()` to accept optional `MarketContext` | `app/hooks/use-maxwell.ts` | M |
| 3 | Pass market context to decompose API | `app/hooks/use-maxwell.ts` | S |
| 4 | Pass market context to synthesize API | `app/hooks/use-maxwell.ts` | S |
| 5 | Add Phase 6: Presenter call after adjudication | `app/hooks/use-maxwell.ts` | M |
| 6 | Add `intelligence` to `MaxwellUIState` | `app/hooks/use-maxwell.ts` | S |
| 7 | Update final state to include `MaxwellIntelligence` | `app/hooks/use-maxwell.ts` | M |
| 8 | Update store message with intelligence | `app/hooks/use-maxwell.ts` | M |
| 9 | Add `presenter` to `ExecutionPhase` type | `app/lib/maxwell/types.ts` | S |
| 10 | Add `presenter` to phase utilities | `app/hooks/use-maxwell.ts` | S |
| 11 | Update decompose API to accept marketContext | `app/api/maxwell/decompose/route.ts` | M |
| 12 | Update synthesize API to accept marketContext | `app/api/maxwell/synthesize/route.ts` | M |
| 13 | Write unit tests | `__tests__/unit/hook-updates.test.ts` | M |

---

## Current State

### Existing `useMaxwell` Hook (739 lines)

The current hook orchestrates 5 phases:

```
1. /api/maxwell/decompose    → Query decomposition
2. /api/maxwell/search       → Parallel search + pre-embedding
3. /api/maxwell/synthesize   → Answer synthesis (SSE)
4. /api/maxwell/verify       → Claim verification (SSE)
5. /api/maxwell/adjudicate   → Final verdict (SSE)
```

**Key State Fields:**
```typescript
interface MaxwellUIState {
    phase: ExecutionPhase;
    subQueries: SubQuery[];
    sources: MaxwellSource[];
    searchMetadata: SearchMetadata[];
    verification: VerificationOutput | null;
    verificationProgress: VerificationProgress | null;
    answer: string;                    // ← Prose output
    adjudication: string | null;       // ← Prose output
    phaseDurations: PhaseDurations;
    phaseStartTimes: Record<string, number>;
    events: MaxwellEvent[];
    error: string | null;
    reasoning?: string;
    config?: ExecutionConfig;
}
```

**Key Method:**
```typescript
search: (query: string) => Promise<void>
```

### Existing `ExecutionPhase` Type

```typescript
// In types.ts
export type ExecutionPhase =
    | 'idle'
    | 'decomposition'
    | 'search'
    | 'synthesis'
    | 'verification'
    | 'adjudication'
    | 'complete'
    | 'error';
```

### Existing API Endpoints

**Decompose** (`/api/maxwell/decompose/route.ts`):
```typescript
interface DecomposeRequest {
    query: string;
    // NO market context currently
}
```

**Synthesize** (`/api/maxwell/synthesize/route.ts`):
```typescript
interface SynthesizeRequest {
    query: string;
    sources: MaxwellSource[];
    synthesisModel: string;
    // NO market context currently
}
```

---

## New Implementation

### 1. Update `ExecutionPhase` Type

Update `app/lib/maxwell/types.ts`:

```typescript
export type ExecutionPhase =
    | 'idle'
    | 'decomposition'
    | 'search'
    | 'synthesis'
    | 'verification'
    | 'adjudication'
    | 'presenter'        // NEW
    | 'complete'
    | 'error';
```

### 2. Update `MaxwellUIState` Interface

Update in `app/hooks/use-maxwell.ts`:

```typescript
import type { MaxwellIntelligence, MarketContext } from '../lib/maxwell/types';

export interface MaxwellUIState {
    phase: ExecutionPhase;
    subQueries: SubQuery[];
    sources: MaxwellSource[];
    searchMetadata: SearchMetadata[];
    verification: VerificationOutput | null;
    verificationProgress: VerificationProgress | null;
    answer: string;
    adjudication: string | null;
    intelligence: MaxwellIntelligence | null;   // NEW
    phaseDurations: PhaseDurations;
    phaseStartTimes: Record<string, number>;
    events: MaxwellEvent[];
    error: string | null;
    reasoning?: string;
    config?: ExecutionConfig;
}

const initialState: MaxwellUIState = {
    phase: 'idle',
    subQueries: [],
    sources: [],
    searchMetadata: [],
    verification: null,
    verificationProgress: null,
    answer: '',
    adjudication: null,
    intelligence: null,                          // NEW
    phaseDurations: {},
    phaseStartTimes: {},
    events: [],
    error: null,
    reasoning: undefined,
    config: undefined,
};
```

### 3. Update `UseMaxwellReturn` Interface

```typescript
export interface UseMaxwellReturn extends MaxwellUIState {
    isLoading: boolean;
    search: (query: string, marketContext?: MarketContext) => Promise<void>;  // UPDATED
    reset: () => void;
    abort: () => void;
    hydrate: (state: MaxwellUIState) => void;
}
```

### 4. Update `search()` Function Signature

```typescript
const search = useCallback(
    async (query: string, marketContext?: MarketContext) => {
        // ... existing setup ...
```

### 5. Update Decompose API Call

When `marketContext` is provided, pass it to decompose:

```typescript
// PHASE 1: DECOMPOSITION
setPhase('decomposition', sessionId);

const decomposeRes = await fetch('/api/maxwell/decompose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query,
        marketContext: marketContext || undefined,  // NEW: Optional market context
    }),
    signal: abortControllerRef.current.signal,
});
```

### 6. Update Synthesize API Call

When `marketContext` is provided, pass it to synthesize:

```typescript
// PHASE 3: SYNTHESIS
setPhase('synthesis', sessionId);

const synthesizeRes = await fetch('/api/maxwell/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query,
        sources: searchOutput.sources,
        synthesisModel: decomposition.config.synthesisModel,
        marketContext: marketContext || undefined,  // NEW: Optional market context
    }),
    signal: abortControllerRef.current.signal,
});
```

### 7. Add Phase 6: Presenter (Prediction Markets Only)

Add after adjudication, but ONLY when `marketContext` is provided:

```typescript
// ═══════════════════════════════════════════════════════════
// PHASE 6: PRESENTER (only for prediction markets)
// ═══════════════════════════════════════════════════════════

let intelligence: MaxwellIntelligence | null = null;

if (marketContext) {
    setPhase('presenter', sessionId);

    const presenterRes = await fetch('/api/maxwell/present', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            marketContext,
            synthesis: answer,
            verification,
            adjudication: adjudicationText,
            sources: searchOutput.sources,
            pipelineDurationMs: Date.now() - overallStart,
        }),
        signal: abortControllerRef.current.signal,
    });

    if (!presenterRes.ok) {
        const errorData = await presenterRes.json().catch(() => ({}));
        throw new Error(errorData.error || `Presenter failed: HTTP ${presenterRes.status}`);
    }

    const presenterOutput = await presenterRes.json();
    intelligence = presenterOutput.intelligence;

    setState((prev) => ({
        ...prev,
        intelligence,
        phaseDurations: {
            ...prev.phaseDurations,
            presenter: presenterOutput.durationMs,
        },
    }));

    logEvent({
        type: 'phase-complete',
        phase: 'presenter',
        data: { intelligence, durationMs: presenterOutput.durationMs },
    });
}
```

### 8. Update Final State

```typescript
const finalState: MaxwellUIState = {
    phase: 'complete',
    subQueries: decomposition.subQueries,
    sources: searchOutput.sources,
    searchMetadata: searchOutput.searchMetadata,
    verification,
    verificationProgress: null,
    answer,
    adjudication: adjudicationText || null,
    intelligence,                                    // NEW
    phaseDurations: {
        decomposition: decomposition.durationMs,
        search: searchOutput.durationMs,
        synthesis: synthesisDuration,
        verification: verification.durationMs,
        adjudication: adjudicationDuration,
        presenter: intelligence ? (Date.now() - overallStart - /* previous phases */) : undefined,
        total: Date.now() - overallStart,
    },
    phaseStartTimes: {},
    events: [],
    error: null,
    reasoning: decomposition.reasoning,
    config: decomposition.config,
};
```

### 9. Update Store Message with Intelligence

```typescript
// Final update with full state persistence
if (agentMessageIdRef.current) {
    const baseSources = searchOutput.sources.map(mapMaxwellSourceToSource);
    updateMessage(
        agentMessageIdRef.current,
        intelligence ? intelligence.raw.synthesis : answer,  // Use synthesis from intelligence if available
        baseSources,
        sessionId,
        undefined,
        {
            ...finalState,
            // Store intelligence for UI components
            intelligence,
        }
    );
}
```

### 10. Update Phase Utilities

```typescript
export function usePhaseInfo(phase: ExecutionPhase): {
    label: string;
    description: string;
    isActive: boolean;
    isComplete: boolean;
} {
    const phaseInfo: Record<ExecutionPhase, { label: string; description: string }> = {
        idle: { label: 'Ready', description: 'Enter a query to begin' },
        decomposition: { label: 'Analyzing', description: 'Breaking down your query...' },
        search: { label: 'Searching', description: 'Finding sources...' },
        synthesis: { label: 'Synthesizing', description: 'Generating answer...' },
        verification: { label: 'Verifying', description: 'Checking claims...' },
        adjudication: { label: 'Adjudicating', description: 'Finalizing verdict...' },
        presenter: { label: 'Presenting', description: 'Structuring intelligence...' },  // NEW
        complete: { label: 'Complete', description: 'Search finished' },
        error: { label: 'Error', description: 'Something went wrong' },
    };

    // ... rest unchanged
}
```

### 11. Update `mapPhaseToAgentState`

```typescript
function mapPhaseToAgentState(phase: ExecutionPhase): 'relaxed' | 'thinking' | 'orchestrating' | 'synthesizing' | 'complete' {
    switch (phase) {
        case 'idle':
            return 'relaxed';
        case 'decomposition':
            return 'thinking';
        case 'search':
            return 'orchestrating';
        case 'synthesis':
            return 'synthesizing';
        case 'verification':
        case 'adjudication':
        case 'presenter':      // NEW
            return 'thinking';
        case 'complete':
        case 'error':
            return 'complete';
        default:
            return 'relaxed';
    }
}
```

---

## API Endpoint Updates

### Decompose Endpoint (`/api/maxwell/decompose/route.ts`)

Update request schema and handler:

```typescript
import { z } from 'zod';
import type { MarketContext } from '@/app/lib/maxwell/types';
import { decomposeQuery } from '@/app/lib/maxwell/decomposer';

const MarketContextSchema = z.object({
    id: z.string(),
    platform: z.enum(['polymarket', 'kalshi']),
    title: z.string(),
    type: z.enum(['binary', 'multi-option', 'matchup']),
    outcomes: z.array(z.object({
        name: z.string(),
        price: z.number(),
        priceChange24h: z.number().optional(),
        volume: z.number().optional(),
    })),
    rules: z.string(),
    resolutionSource: z.string().optional(),
    endDate: z.string().transform((s) => new Date(s)),
    volume: z.number(),
    volume24h: z.number(),
    liquidity: z.number().optional(),
    crossPlatformOdds: z.object({
        platform: z.enum(['polymarket', 'kalshi']),
        outcomes: z.array(z.object({
            name: z.string(),
            price: z.number(),
        })),
    }).optional(),
}).optional();

const DecomposeRequestSchema = z.object({
    query: z.string().min(1),
    marketContext: MarketContextSchema,  // NEW: Optional
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const parsed = DecomposeRequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: parsed.error.issues },
                { status: 400 }
            );
        }

        const { query, marketContext } = parsed.data;

        // Pass market context to decomposer (uses prediction market prompt if provided)
        const result = await decomposeQuery(query, marketContext);

        const config = getExecutionConfig(result.complexity);

        return NextResponse.json({
            ...result,
            config,
        });
    } catch (error) {
        console.error('Decompose error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
```

### Synthesize Endpoint (`/api/maxwell/synthesize/route.ts`)

Update request schema and handler:

```typescript
const SynthesizeRequestSchema = z.object({
    query: z.string().min(1),
    sources: z.array(MaxwellSourceSchema),
    synthesisModel: z.string(),
    marketContext: MarketContextSchema,  // NEW: Optional
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const parsed = SynthesizeRequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: parsed.error.issues },
                { status: 400 }
            );
        }

        const { query, sources, synthesisModel, marketContext } = parsed.data;

        // Use prediction market synthesis prompt if market context provided
        const stream = await synthesize(query, sources, synthesisModel, marketContext);

        // ... rest of SSE streaming logic unchanged
    } catch (error) {
        // ... error handling unchanged
    }
}
```

---

## PhaseDurations Type Update

Update `app/lib/maxwell/types.ts`:

```typescript
export interface PhaseDurations {
    decomposition?: number;
    search?: number;
    synthesis?: number;
    verification?: number;
    adjudication?: number;
    presenter?: number;      // NEW
    total?: number;
}
```

---

## Backward Compatibility

**CRITICAL**: All changes must maintain backward compatibility:

1. **`marketContext` is optional** - The hook works without it for general searches
2. **Presenter phase is conditional** - Only runs when `marketContext` is provided
3. **`answer` and `adjudication` fields remain** - UI components that use prose still work
4. **`intelligence` is null by default** - Only populated for prediction market queries

**Validation Flow:**

```
search("What is Bitcoin?")
→ marketContext = undefined
→ Phases: decompose → search → synthesize → verify → adjudicate
→ Output: { answer: "...", adjudication: "...", intelligence: null }

search("Super Bowl Champion 2026", marketContext)
→ marketContext = { ... }
→ Phases: decompose → search → synthesize → verify → adjudicate → present
→ Output: { answer: "...", adjudication: "...", intelligence: { ... } }
```

---

## Test Specification

### Test File: `__tests__/unit/hook-updates.test.ts`

```typescript
import type {
    ExecutionPhase,
    PhaseDurations,
    MarketContext,
    MaxwellIntelligence,
} from '../../app/lib/maxwell/types';

describe('ExecutionPhase', () => {
    it('should include presenter phase', () => {
        const phases: ExecutionPhase[] = [
            'idle',
            'decomposition',
            'search',
            'synthesis',
            'verification',
            'adjudication',
            'presenter',
            'complete',
            'error',
        ];
        expect(phases).toContain('presenter');
    });
});

describe('PhaseDurations', () => {
    it('should include presenter duration field', () => {
        const durations: PhaseDurations = {
            decomposition: 1000,
            search: 2000,
            synthesis: 1500,
            verification: 3000,
            adjudication: 1000,
            presenter: 500,
            total: 9000,
        };
        expect(durations.presenter).toBe(500);
    });

    it('should allow undefined presenter duration', () => {
        const durations: PhaseDurations = {
            decomposition: 1000,
            total: 5000,
        };
        expect(durations.presenter).toBeUndefined();
    });
});

describe('DecomposeRequest', () => {
    it('should accept request without marketContext', () => {
        const request = {
            query: 'What is Bitcoin?',
        };
        expect(request.query).toBeDefined();
        expect((request as any).marketContext).toBeUndefined();
    });

    it('should accept request with marketContext', () => {
        const request = {
            query: 'Super Bowl Champion 2026',
            marketContext: {
                id: 'poly:superbowl2026',
                platform: 'polymarket' as const,
                title: 'Super Bowl Champion 2026',
                type: 'multi-option' as const,
                outcomes: [{ name: 'Seattle', price: 0.24 }],
                rules: 'Resolves to Super Bowl winner',
                endDate: new Date('2026-02-08'),
                volume: 675000000,
                volume24h: 917000,
            },
        };
        expect(request.marketContext).toBeDefined();
        expect(request.marketContext.platform).toBe('polymarket');
    });
});

describe('SynthesizeRequest', () => {
    it('should accept request without marketContext', () => {
        const request = {
            query: 'What is Bitcoin?',
            sources: [],
            synthesisModel: 'google/gemini-3-flash-preview',
        };
        expect((request as any).marketContext).toBeUndefined();
    });

    it('should accept request with marketContext', () => {
        const request = {
            query: 'Super Bowl Champion 2026',
            sources: [],
            synthesisModel: 'google/gemini-3-flash-preview',
            marketContext: {
                id: 'poly:superbowl2026',
                platform: 'polymarket' as const,
                title: 'Super Bowl Champion 2026',
                type: 'binary' as const,
                outcomes: [{ name: 'Yes', price: 0.65 }],
                rules: 'Resolves YES if...',
                endDate: new Date('2026-02-08'),
                volume: 1000000,
                volume24h: 50000,
            },
        };
        expect(request.marketContext).toBeDefined();
    });
});

describe('MaxwellUIState', () => {
    it('should include intelligence field', () => {
        const state = {
            phase: 'complete' as ExecutionPhase,
            subQueries: [],
            sources: [],
            searchMetadata: [],
            verification: null,
            verificationProgress: null,
            answer: '',
            adjudication: null,
            intelligence: null,
            phaseDurations: {},
            phaseStartTimes: {},
            events: [],
            error: null,
        };
        expect(state.intelligence).toBeNull();
    });

    it('should accept populated intelligence', () => {
        const mockIntelligence: Partial<MaxwellIntelligence> = {
            market: {
                question: 'Who will win?',
                type: 'multi-option',
                deadline: '23 days',
                deadlineDate: '2026-02-08T00:00:00Z',
                resolutionCriteria: 'NFL official result',
            },
            assessment: {
                primaryOutcome: 'Seattle',
                marketPrice: 0.24,
                maxwellRange: { low: 0.22, mid: 0.28, high: 0.34 },
                verdict: 'UNDERPRICED',
                confidence: 'MEDIUM',
                headline: 'Seattle health advantage undervalued.',
            },
        };
        const state = {
            phase: 'complete' as ExecutionPhase,
            intelligence: mockIntelligence as MaxwellIntelligence,
        };
        expect(state.intelligence?.assessment.verdict).toBe('UNDERPRICED');
    });
});

describe('usePhaseInfo', () => {
    it('should return info for presenter phase', () => {
        const phaseInfo: Record<ExecutionPhase, { label: string; description: string }> = {
            idle: { label: 'Ready', description: 'Enter a query to begin' },
            decomposition: { label: 'Analyzing', description: 'Breaking down your query...' },
            search: { label: 'Searching', description: 'Finding sources...' },
            synthesis: { label: 'Synthesizing', description: 'Generating answer...' },
            verification: { label: 'Verifying', description: 'Checking claims...' },
            adjudication: { label: 'Adjudicating', description: 'Finalizing verdict...' },
            presenter: { label: 'Presenting', description: 'Structuring intelligence...' },
            complete: { label: 'Complete', description: 'Search finished' },
            error: { label: 'Error', description: 'Something went wrong' },
        };
        expect(phaseInfo.presenter.label).toBe('Presenting');
        expect(phaseInfo.presenter.description).toBe('Structuring intelligence...');
    });
});

describe('mapPhaseToAgentState', () => {
    it('should map presenter to thinking', () => {
        const mapPhaseToAgentState = (phase: ExecutionPhase) => {
            switch (phase) {
                case 'idle': return 'relaxed';
                case 'decomposition': return 'thinking';
                case 'search': return 'orchestrating';
                case 'synthesis': return 'synthesizing';
                case 'verification':
                case 'adjudication':
                case 'presenter':
                    return 'thinking';
                case 'complete':
                case 'error':
                    return 'complete';
                default:
                    return 'relaxed';
            }
        };
        expect(mapPhaseToAgentState('presenter')).toBe('thinking');
    });
});

describe('Backward Compatibility', () => {
    it('should work without marketContext', () => {
        const generalSearchResult = {
            answer: 'Bitcoin is a cryptocurrency...',
            adjudication: 'The claims are verified...',
            intelligence: null,
        };
        expect(generalSearchResult.answer).toBeDefined();
        expect(generalSearchResult.intelligence).toBeNull();
    });

    it('should include intelligence when marketContext provided', () => {
        const marketSearchResult = {
            answer: '## MARKET CONTEXT\n...',
            adjudication: 'Based on verified evidence...',
            intelligence: {
                assessment: {
                    verdict: 'UNDERPRICED',
                },
            },
        };
        expect(marketSearchResult.intelligence).not.toBeNull();
        expect(marketSearchResult.intelligence?.assessment.verdict).toBe('UNDERPRICED');
    });
});
```

---

## Implementation Checklist

### types.ts
- [ ] Add `'presenter'` to `ExecutionPhase` union type
- [ ] Add `presenter?: number` to `PhaseDurations` interface

### use-maxwell.ts
- [ ] Add import for `MarketContext`, `MaxwellIntelligence`
- [ ] Add `intelligence: MaxwellIntelligence | null` to `MaxwellUIState`
- [ ] Add `intelligence: null` to `initialState`
- [ ] Update `search` signature: `(query: string, marketContext?: MarketContext)`
- [ ] Store `marketContext` in a ref for use across phases
- [ ] Pass `marketContext` to decompose API call
- [ ] Pass `marketContext` to synthesize API call
- [ ] Add Phase 6 presenter call (conditional on `marketContext`)
- [ ] Update `finalState` to include `intelligence`
- [ ] Update store message with `intelligence`
- [ ] Add `'presenter'` case to `mapPhaseToAgentState`
- [ ] Add `presenter` to `usePhaseInfo` phaseInfo record
- [ ] Update `UseMaxwellReturn` interface

### decompose/route.ts
- [ ] Add `MarketContextSchema` Zod schema (or import from shared location)
- [ ] Update `DecomposeRequestSchema` to include optional `marketContext`
- [ ] Pass `marketContext` to `decomposeQuery()` function

### synthesize/route.ts
- [ ] Update `SynthesizeRequestSchema` to include optional `marketContext`
- [ ] Pass `marketContext` to `synthesize()` function

### Tests
- [ ] Create `__tests__/unit/hook-updates.test.ts`
- [ ] Test `ExecutionPhase` includes `presenter`
- [ ] Test `PhaseDurations` includes `presenter`
- [ ] Test `DecomposeRequest` with/without `marketContext`
- [ ] Test `SynthesizeRequest` with/without `marketContext`
- [ ] Test `MaxwellUIState` includes `intelligence`
- [ ] Test `usePhaseInfo` for `presenter` phase
- [ ] Test `mapPhaseToAgentState` for `presenter` phase
- [ ] Test backward compatibility (general search without market context)

---

## Verification Criteria

1. **Type Safety**: All new fields type-check correctly
2. **Backward Compatibility**: General searches work without `marketContext`
3. **Presenter Integration**: Presenter phase runs when `marketContext` provided
4. **State Updates**: `intelligence` field populates in final state
5. **Store Persistence**: Intelligence is stored with message for rehydration
6. **Tests Pass**: All new and existing tests pass
7. **Build Passes**: `npm run build` completes successfully

---

## Data Flow

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                            useMaxwell Hook                                     │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  search(query, marketContext?)                                                │
│       │                                                                       │
│       ▼                                                                       │
│  ┌─────────────────────┐                                                      │
│  │ Phase 1: Decompose  │──── marketContext? ────► prediction market prompt   │
│  └─────────────────────┘                                                      │
│       │                                                                       │
│       ▼                                                                       │
│  ┌─────────────────────┐                                                      │
│  │ Phase 2: Search     │                                                      │
│  └─────────────────────┘                                                      │
│       │                                                                       │
│       ▼                                                                       │
│  ┌─────────────────────┐                                                      │
│  │ Phase 3: Synthesize │──── marketContext? ────► prediction market prompt   │
│  └─────────────────────┘                                                      │
│       │                                                                       │
│       ▼                                                                       │
│  ┌─────────────────────┐                                                      │
│  │ Phase 4: Verify     │                                                      │
│  └─────────────────────┘                                                      │
│       │                                                                       │
│       ▼                                                                       │
│  ┌─────────────────────┐                                                      │
│  │ Phase 5: Adjudicate │                                                      │
│  └─────────────────────┘                                                      │
│       │                                                                       │
│       ▼                                                                       │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐                                                      │
│    Phase 6: Present     ◄──── ONLY if marketContext                          │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘                                                      │
│       │                                                                       │
│       ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐          │
│  │                         Final State                              │          │
│  ├──────────────────────────────────────────────────────────────────┤          │
│  │  answer: string                ─── Always populated              │          │
│  │  adjudication: string          ─── Always populated              │          │
│  │  intelligence: MaxwellIntelligence | null                        │          │
│  │                                    ├── null (general search)     │          │
│  │                                    └── {...} (market search)     │          │
│  └──────────────────────────────────────────────────────────────────┘          │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Example Usage

### General Search (No Market Context)

```typescript
const { search, answer, adjudication, intelligence } = useMaxwell();

await search("What is the current price of Bitcoin?");

// Result:
// answer: "Bitcoin is currently trading at $95,234..."
// adjudication: "Based on verified evidence..."
// intelligence: null
```

### Prediction Market Search (With Market Context)

```typescript
const { search, answer, adjudication, intelligence } = useMaxwell();

const marketContext: MarketContext = {
    id: 'poly:superbowl2026',
    platform: 'polymarket',
    title: 'Super Bowl Champion 2026',
    type: 'multi-option',
    outcomes: [
        { name: 'Seattle', price: 0.24 },
        { name: 'Los Angeles Rams', price: 0.21 },
    ],
    rules: 'This market will resolve to the team that wins Super Bowl LX.',
    endDate: new Date('2026-02-08'),
    volume: 675000000,
    volume24h: 917000,
};

await search("Super Bowl Champion 2026", marketContext);

// Result:
// answer: "## MARKET CONTEXT\n..."
// adjudication: "Based on verified evidence..."
// intelligence: {
//     market: { question: "Who will win Super Bowl LX?", ... },
//     assessment: { verdict: "UNDERPRICED", primaryOutcome: "Seattle", ... },
//     thesis: { factorsFor: [...], factorsAgainst: [...], ... },
//     verification: { score: 82, level: "VERIFIED", ... },
//     ...
// }
```

---

## Notes

- The presenter phase adds ~2-3 seconds to the pipeline
- Intelligence is only generated for prediction market queries (saves cost for general searches)
- The `answer` and `adjudication` fields are preserved for backward compatibility
- UI components can progressively adopt `intelligence` without breaking existing functionality
- The `marketContext` is stored in a ref to avoid passing through all phase calls

---

## Next Phase

Upon completion, proceed to **Phase 7: UI Implementation** which will:
- Create `IntelligencePanel.tsx` component
- Create terminal-inspired primitives (MaxwellRangeBar, WaveformSignature, etc.)
- Create section components (AssessmentSection, ThesisSection, etc.)
- Integrate with the updated hook
