# Phase 8: Integration & Cleanup

> **Status**: Ready for Implementation  
> **Parent PRD**: `/prd/maxwell-trader-revamp.prd.md`  
> **Phase**: 8 of 9  
> **Estimated Effort**: Day 10  
> **Dependencies**: Phases 1-7 Complete

---

## Overview

Phase 8 connects all the pieces built in Phases 1-7. The new `IntelligencePanel` and its primitives/sections exist but aren't yet wired into the application. This phase:

1. Constructs `MarketContext` from `UnifiedMarket` data
2. Passes `MarketContext` to `maxwell.search()` to trigger the presenter phase
3. Renders `IntelligencePanel` instead of the old card components
4. Removes deprecated card components after verification

---

## Pre-Requisites Checklist

- [x] Phase 1: Types & Infrastructure - `MarketContext`, `MaxwellIntelligence` defined
- [x] Phase 2: Decomposition accepts `MarketContext`
- [x] Phase 3: Synthesis accepts `MarketContext`
- [x] Phase 4: Resolution Risk Scoring implemented
- [x] Phase 5: Presenter module & API route implemented
- [x] Phase 6: `use-maxwell.ts` updated with presenter phase & intelligence field
- [x] Phase 7: All UI components created in `/app/components/maxwell/`

---

## Task 1: Construct MarketContext in Market Page

**File**: `/app/markets/[id]/page.tsx`

### Current State

The market page fetches `UnifiedMarket` data and calls `maxwell.search(query)` without `MarketContext`:

```typescript
// Current (line ~152-157)
const query = `Analyze the prediction market: "${market.title}"...`;
maxwell.search(query);
```

### Required Changes

1. Create a `buildMarketContext()` helper function
2. Call `maxwell.search(query, marketContext)` with the constructed context

### Implementation

```typescript
// Add import at top
import type { MarketContext, MarketOutcomeContext } from '../../lib/maxwell/types';

/**
 * Constructs MarketContext from UnifiedMarket for Maxwell analysis.
 * This enables market-aware decomposition and the presenter phase.
 */
function buildMarketContext(market: UnifiedMarket): MarketContext {
  // Map outcomes to MarketOutcomeContext
  const outcomes: MarketOutcomeContext[] = market.outcomes.map(outcome => ({
    name: outcome.name,
    price: outcome.price,
    priceChange24h: undefined, // Not available in UnifiedMarket.MarketOutcome
    volume: undefined, // Not available in UnifiedMarket.MarketOutcome
  }));

  // Determine market type
  let type: 'binary' | 'multi-option' | 'matchup';
  if (market.marketType === 'binary') {
    type = 'binary';
  } else if (market.marketType === 'matchup') {
    type = 'matchup';
  } else {
    type = 'multi-option';
  }

  return {
    id: market.id,
    platform: market.platform,
    title: market.title,
    type,
    outcomes,
    rules: market.rules || '',
    resolutionSource: market.resolutionSource,
    endDate: market.endDate,
    volume: market.volume,
    volume24h: market.volume24h,
    liquidity: market.liquidity,
    crossPlatformOdds: undefined, // Future: fetch from other platform
  };
}
```

### Updated handleRunAnalysis

```typescript
const handleRunAnalysis = useCallback((forceRefresh = false) => {
  if (!market) return;
  
  if (forceRefresh) {
    setCachedAnalysisState(null);
    maxwell.reset();
  }
  
  // Build MarketContext for prediction market analysis
  const marketContext = buildMarketContext(market);
  
  // Query for Maxwell - kept simple since context provides structure
  const query = `Analyze: "${market.title}"`;
  
  // Pass marketContext to enable presenter phase
  maxwell.search(query, marketContext);
}, [market, maxwell]);
```

---

## Task 2: Update MaxwellDashboard to Render IntelligencePanel

**File**: `/app/components/maxwell/MaxwellDashboard.tsx`

### Current State

Renders old card components:
- `VerdictCard`
- `AnalysisCard`
- `ClaimsCard`
- `SourcesGrid`

### Required Changes

1. Add `intelligence` prop to `MaxwellDashboardProps`
2. When `intelligence` is available, render `IntelligencePanel`
3. Fall back to old cards only when `intelligence` is null (backward compatibility during transition)

### Updated Props Interface

```typescript
import { IntelligencePanel } from './IntelligencePanel';
import type { MaxwellIntelligence } from '../../lib/maxwell/types';

interface MaxwellDashboardProps {
    phase: ExecutionPhase;
    subQueries: SubQuery[];
    sources: MaxwellSource[];
    searchMetadata: SearchMetadata[];
    verification: VerificationOutput | null;
    verificationProgress: VerificationProgress | null;
    phaseDurations: PhaseDurations;
    phaseStartTimes: Record<string, number>;
    events: MaxwellEvent[];
    answer: string;
    adjudication: string | null;
    config?: ExecutionConfig;
    intelligence?: MaxwellIntelligence | null; // NEW
}
```

### Updated Render Logic

```typescript
export function MaxwellDashboard({
    phase,
    sources,
    verification,
    phaseDurations,
    phaseStartTimes,
    answer,
    adjudication,
    config,
    intelligence, // NEW
}: MaxwellDashboardProps) {
    const isComplete = phase === 'complete' || phase === 'adjudication';
    const isProcessing = phase !== 'idle' && !isComplete;
    const hasData = answer || adjudication || verification || sources.length > 0 || intelligence;

    if (phase === 'idle' && !hasData) {
        return null;
    }

    return (
        <div className="flex flex-col gap-8 w-full pb-12">
            <AnimatePresence>
                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        <PhaseProgress 
                            phase={phase} 
                            phaseDurations={phaseDurations} 
                            phaseStartTimes={phaseStartTimes} 
                        />
                        {config && <PlanningCard config={config} />}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
                {/* NEW: Render IntelligencePanel when intelligence is available */}
                {intelligence && (
                    <motion.div
                        key="intelligence"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                    >
                        <IntelligencePanel data={intelligence} />
                    </motion.div>
                )}

                {/* FALLBACK: Old cards only when no intelligence (backward compat) */}
                {!intelligence && adjudication && (
                    <motion.div
                        key="verdict"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                    >
                        <VerdictCard 
                            adjudication={adjudication} 
                            verification={verification} 
                        />
                    </motion.div>
                )}

                {!intelligence && answer && (
                    <motion.div 
                        key="analysis"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    >
                        <AnalysisCard answer={answer} claims={verification?.claims} />
                    </motion.div>
                )}

                {!intelligence && verification && (
                    <motion.div 
                        key="claims"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 }}
                    >
                        <ClaimsCard verification={verification} />
                    </motion.div>
                )}

                {!intelligence && sources.length > 0 && (
                    <motion.div
                        key="sources"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                    >
                        <SourcesGrid sources={sources} />
                    </motion.div>
                )}
            </AnimatePresence>

            {isComplete && phaseDurations.total && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center pt-4"
                >
                    <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                        Analysis completed in {(phaseDurations.total / 1000).toFixed(1)}s
                    </span>
                </motion.div>
            )}
        </div>
    );
}
```

---

## Task 3: Update Market Page to Pass Intelligence

**File**: `/app/markets/[id]/page.tsx`

### Current State

```typescript
<MaxwellDashboard 
  phase={maxwell.phase}
  subQueries={maxwell.subQueries}
  // ... other props
  adjudication={maxwell.adjudication}
  config={maxwell.config}
/>
```

### Required Changes

Add `intelligence` prop:

```typescript
<MaxwellDashboard 
  phase={maxwell.phase}
  subQueries={maxwell.subQueries}
  searchMetadata={maxwell.searchMetadata}
  sources={maxwell.sources}
  verification={maxwell.verification}
  verificationProgress={maxwell.verificationProgress}
  phaseDurations={maxwell.phaseDurations}
  phaseStartTimes={maxwell.phaseStartTimes}
  events={maxwell.events}
  answer={maxwell.answer}
  adjudication={maxwell.adjudication}
  config={maxwell.config}
  intelligence={maxwell.intelligence} // NEW
/>
```

---

## Task 4: Update MarketIntelligencePanel (Optional)

**File**: `/app/components/maxwell/MarketIntelligencePanel.tsx`

This component is used elsewhere in the app. Apply similar changes:

1. Add `intelligence` prop
2. Render `IntelligencePanel` when available
3. Fall back to old rendering otherwise

### Updated Props

```typescript
interface MarketIntelligencePanelProps {
    // ... existing props
    intelligence?: MaxwellIntelligence | null; // NEW
}
```

### Updated Render

When `intelligence` is available and complete:

```typescript
{hasReport && intelligence && (
    <div className="pt-2">
        <IntelligencePanel data={intelligence} />
    </div>
)}

{hasReport && !intelligence && (
    <div className="space-y-6 pt-2">
        {/* Old rendering with VerdictCard, VerificationPanel, ResponseDisplay */}
    </div>
)}
```

---

## Task 5: Delete Deprecated Components (After Verification)

**IMPORTANT**: Only delete after end-to-end testing confirms IntelligencePanel works correctly.

### Components to Remove

| File | Reason |
|------|--------|
| `/app/components/maxwell/VerdictCard.tsx` | Replaced by `AssessmentSection` |
| `/app/components/maxwell/AnalysisCard.tsx` | Replaced by `ThesisSection` + prose in raw modal |
| `/app/components/maxwell/ClaimsCard.tsx` | Replaced by `VerificationChecklist` primitive |
| `/app/components/maxwell/SourcesGrid.tsx` | Replaced by `SourcesSection` |

### Deletion Process

1. Run full E2E test with new IntelligencePanel
2. Verify all data renders correctly
3. Remove import statements from `MaxwellDashboard.tsx`
4. Remove fallback rendering code
5. Delete component files
6. Run `npm run build` to verify no broken imports
7. Run test suite

---

## Task 6: Update Caching to Include Intelligence

**File**: `/app/lib/markets/analysis-cache.ts`

### Verify CachedAnalysis Type

The `CachedAnalysis` type should already include `intelligence` from Phase 6:

```typescript
interface CachedAnalysis {
  marketId: string;
  query: string;
  verdict: string;
  confidence: number;
  answer: string;
  adjudication: string;
  sources: MaxwellSource[];
  verification: VerificationOutput | null;
  intelligence: MaxwellIntelligence | null; // Should exist
  timestamp: number;
  durationMs: number;
}
```

### Verify Hydration in Market Page

The market page already hydrates `intelligence` in the cache loading:

```typescript
maxwell.hydrate({
  // ... other fields
  intelligence: cached.intelligence, // Should exist
});
```

---

## Task 7: End-to-End Testing Checklist

### Manual Testing Flow

1. **Navigate to market page** (`/markets/[id]`)
2. **Click "Analyze" button**
3. **Verify phase progression**:
   - [ ] Decomposition phase shows
   - [ ] Search phase shows
   - [ ] Synthesis phase shows
   - [ ] Verification phase shows
   - [ ] Adjudication phase shows
   - [ ] **Presenter phase shows** (NEW - only with MarketContext)
   - [ ] Complete phase

4. **Verify IntelligencePanel renders**:
   - [ ] Corner bracket frame visible
   - [ ] Header with ⚡ MAXWELL, waveform, deadline, verification %
   - [ ] Assessment section with verdict pill, range, headline
   - [ ] Outcomes list (for multi-outcome markets)
   - [ ] Thesis disclosure row (expandable)
   - [ ] Resolution risk disclosure row (expandable)
   - [ ] Sources disclosure row (expandable)
   - [ ] Footer with "Raw Output" button and model info

5. **Verify disclosure rows expand/collapse**:
   - [ ] Click Thesis → expands inline
   - [ ] Click Resolution risk → expands inline
   - [ ] Click Sources → expands inline, "View all" opens modal

6. **Verify modals**:
   - [ ] "View all sources" opens SourcesModal
   - [ ] "Raw Output" opens RawAnalysisModal

7. **Verify caching**:
   - [ ] Refresh page → cached data loads
   - [ ] Click "Re-run" → fresh analysis runs

8. **Verify backward compatibility**:
   - [ ] Run analysis WITHOUT MarketContext (e.g., from chat) → old cards render

### Market Types to Test

| Market Type | Example | Specific Checks |
|-------------|---------|-----------------|
| Binary | Will X happen? | Single outcome in assessment |
| Multi-option | Who will win? | Multiple outcomes list |
| Matchup | Team A vs Team B | Two outcomes comparison |

### Edge Cases

- [ ] Market with no resolution rules
- [ ] Market with very long description
- [ ] Market with 10+ outcomes (pagination/collapse)
- [ ] Cached analysis from before Phase 8 (backward compat)
- [ ] Analysis error → error state renders

---

## Implementation Order

1. **Task 1**: Add `buildMarketContext()` to market page
2. **Task 3**: Pass `intelligence` prop to MaxwellDashboard
3. **Task 2**: Update MaxwellDashboard render logic
4. **Task 7**: Run E2E tests
5. **Task 4**: Update MarketIntelligencePanel (if used)
6. **Task 5**: Delete deprecated components (after verification)
7. **Task 6**: Verify caching works

---

## Files Modified

| File | Changes |
|------|---------|
| `/app/markets/[id]/page.tsx` | Add `buildMarketContext()`, pass `marketContext` to search, pass `intelligence` to dashboard |
| `/app/components/maxwell/MaxwellDashboard.tsx` | Add `intelligence` prop, conditional rendering |
| `/app/components/maxwell/MarketIntelligencePanel.tsx` | Add `intelligence` prop (optional) |

## Files to Delete (After Verification)

| File | Replacement |
|------|-------------|
| `/app/components/maxwell/VerdictCard.tsx` | `IntelligencePanel` → `AssessmentSection` |
| `/app/components/maxwell/AnalysisCard.tsx` | `IntelligencePanel` → `ThesisSection` |
| `/app/components/maxwell/ClaimsCard.tsx` | `IntelligencePanel` → `VerificationChecklist` |
| `/app/components/maxwell/SourcesGrid.tsx` | `IntelligencePanel` → `SourcesSection` |

---

## Success Criteria

- [ ] Market page renders `IntelligencePanel` when analysis completes
- [ ] All disclosure sections expand/collapse correctly
- [ ] Modals open and display correct content
- [ ] Build passes (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] No console errors in browser
- [ ] Caching works correctly
- [ ] Old card components can be safely removed

---

## Notes

- **Backward Compatibility**: The old cards remain as fallback until deletion is verified safe
- **MarketContext Construction**: The helper function handles all market types
- **Progressive Enhancement**: IntelligencePanel only renders when presenter phase completes
- **Cache Migration**: Old cached analyses without `intelligence` will use fallback rendering

---

_End of Phase 8 PRD_
