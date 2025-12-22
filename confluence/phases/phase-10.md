This is a solid plan for the Frontend Hook. It correctly manages the complex state of a streaming agent.

However, I found **two small but impactful holes** that we should fix to make this production-ready:

1. **Missing Verification Progress:** In Phase 8, we added granular progress updates ("Verifying claim 3/12..."). Your hook currently ignores the `verification-progress` event. We should add this to the state so the user isn't staring at a static spinner during the 20-second verification phase.
2. **Import Safety:** Just like in Phase 9, relying on `@/` aliases can sometimes break in specific test setups or if `tsconfig.json` isn't perfect. We will use relative imports `../lib/maxwell/types` to be 100% safe.

Here is the **Revised, Robust Phase 10 Guide**.

---

# Phase 10: Frontend Hook

## React Hook for Maxwell API Interaction

### Context

This phase creates the "brain" of the frontend. It connects to the streaming API we built in Phase 9 and manages the complex state transitions (Decomposition -> Search -> Synthesis -> Verification).

**Key Engineering Decision:** We add specific state for `verificationProgress` so we can show granular updates (e.g., "Verifying claim 5/12") to the user, preventing them from thinking the app has frozen.

### Prerequisites

[ ] Phase 9 complete (API endpoint working)
[ ] React 18+ environment (Next.js App Router)

### Implementation

#### Step 1: Create `app/hooks/use-maxwell.ts`

Copy this code. It includes the fix for Verification Progress tracking.

```typescript
// app/hooks/use-maxwell.ts

/**
 * useMaxwell Hook
 * * React hook for interacting with the Maxwell search agent API.
 * Handles SSE parsing, state management, and error handling.
 * * @module hooks/use-maxwell
 */

'use client';

import { useState, useCallback, useRef } from 'react';

// Use relative import for safety
import type {
  SubQuery,
  Source,
  SearchMetadata,
  VerificationOutput,
  MaxwellEvent,
  ExecutionPhase,
  MaxwellState,
  // Ensure this type exists in your types.ts from Phase 8/9
  // If not, we define it locally or treat payload as any
} from '../lib/maxwell/types';

// ============================================
// EXTENDED STATE (UI Specific)
// ============================================

export interface VerificationProgressState {
  current: number;
  total: number;
  status: string;
}

// Extend core state with UI-specific fields
export interface MaxwellUIState extends MaxwellState {
  verificationProgress: VerificationProgressState | null;
}

const initialState: MaxwellUIState = {
  phase: 'idle',
  subQueries: [],
  searchMetadata: [],
  sources: [],
  answer: '',
  verification: null,
  error: null,
  phaseDurations: {},
  verificationProgress: null, // ✅ Added
};

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseMaxwellReturn extends MaxwellUIState {
  isLoading: boolean;
  search: (query: string) => Promise<void>;
  reset: () => void;
  abort: () => void;
}

// ============================================
// MAIN HOOK
// ============================================

export function useMaxwell(): UseMaxwellReturn {
  const [state, setState] = useState<MaxwellUIState>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(initialState);
    setIsLoading(false);
  }, []);
  
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);
  
  const handleEvent = useCallback((event: MaxwellEvent) => {
    switch (event.type) {
      case 'phase-start':
        setState((prev) => ({
          ...prev,
          phase: event.phase as ExecutionPhase,
          // Clear progress when verification starts
          verificationProgress: event.phase === 'verification' 
            ? { current: 0, total: 0, status: 'Starting verification...' } 
            : prev.verificationProgress
        }));
        break;
        
      case 'phase-complete':
        handlePhaseComplete(event);
        break;
        
      case 'synthesis-chunk':
        setState((prev) => ({
          ...prev,
          answer: prev.answer + event.content,
        }));
        break;
      
      // ✅ Handle Verification Progress (Phase 8/9 feature)
      // Note: We need to cast event type if it wasn't strictly defined in MaxwellEvent union
      case 'verification-progress' as any: 
        setState((prev) => ({
          ...prev,
          verificationProgress: (event as any).data
        }));
        break;
        
      case 'complete':
        setState((prev) => ({
          ...prev,
          phase: 'complete',
          verificationProgress: null, // Clear progress on done
          phaseDurations: {
            ...prev.phaseDurations,
            total: event.data.totalDurationMs,
          },
        }));
        break;
        
      case 'error':
        setState((prev) => ({
          ...prev,
          phase: 'error',
          error: event.message,
        }));
        break;
    }
  }, []);
  
  const handlePhaseComplete = useCallback((event: MaxwellEvent & { type: 'phase-complete' }) => {
    const { phase, data } = event;
    
    // Cast data to any to access properties safely without complex type guards
    const phaseData = data as any;

    setState((prev) => {
      const updates: Partial<MaxwellUIState> = {};
      
      switch (phase) {
        case 'decomposition':
          updates.subQueries = phaseData.subQueries || [];
          updates.phaseDurations = { ...prev.phaseDurations, decomposition: phaseData.durationMs };
          break;
          
        case 'search':
          updates.sources = phaseData.sources || [];
          updates.searchMetadata = phaseData.searchMetadata || [];
          updates.phaseDurations = { ...prev.phaseDurations, search: phaseData.durationMs };
          break;
          
        case 'synthesis':
          updates.answer = phaseData.answer || prev.answer;
          updates.phaseDurations = { ...prev.phaseDurations, synthesis: phaseData.durationMs };
          break;
          
        case 'verification':
          updates.verification = phaseData as VerificationOutput;
          updates.phaseDurations = { ...prev.phaseDurations, verification: phaseData.durationMs };
          break;
      }
      
      return { ...prev, ...updates };
    });
  }, []);
  
  const search = useCallback(async (query: string) => {
    reset();
    setIsLoading(true);
    
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch('/api/maxwell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            
            try {
              const event: MaxwellEvent = JSON.parse(data);
              handleEvent(event);
            } catch (parseError) {
              console.warn('SSE Parse Error:', parseError);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      
      setState((prev) => ({
        ...prev,
        phase: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [reset, handleEvent]);
  
  return { ...state, isLoading, search, reset, abort };
}

// ============================================
// UTILITY HOOK
// ============================================

export function usePhaseInfo(phase: ExecutionPhase): {
  label: string;
  description: string;
  isActive: boolean;
  isComplete: boolean;
} {
  const phaseInfo: Record<ExecutionPhase, { label: string; description: string }> = {
    idle: { label: 'Ready', description: 'Enter a query to begin' },
    decomposition: { label: 'Analyzing', description: 'Breaking down query...' },
    search: { label: 'Searching', description: 'Finding sources...' },
    synthesis: { label: 'Synthesizing', description: 'Generating answer...' },
    verification: { label: 'Verifying', description: 'Checking claims...' },
    complete: { label: 'Complete', description: 'Search finished' },
    error: { label: 'Error', description: 'Something went wrong' },
  };
  
  const info = phaseInfo[phase] || phaseInfo.idle;
  const isActive = !['idle', 'complete', 'error'].includes(phase);
  const isComplete = phase === 'complete';
  
  return { ...info, isActive, isComplete };
}

```

#### Step 2: Testing (Manual)

Create `app/test-maxwell.tsx` to verify the hook in a real browser environment.

```tsx
// app/test-maxwell.tsx
'use client';

import { useState } from 'react';
import { useMaxwell, usePhaseInfo } from './hooks/use-maxwell';

export default function TestMaxwell() {
  const [query, setQuery] = useState('What is Tesla revenue in 2024?');
  
  const {
    phase,
    subQueries,
    sources,
    answer,
    verification,
    error,
    verificationProgress, // ✅ Check this works
    isLoading,
    search,
    reset,
  } = useMaxwell();
  
  const phaseInfo = usePhaseInfo(phase);
  
  return (
    <div className="p-8 max-w-2xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-4">Maxwell Hook Test</h1>
      
      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 p-2 border rounded text-black"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
        />
        <button 
          onClick={() => search(query)}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {isLoading ? 'Running...' : 'Search'}
        </button>
        <button 
          onClick={reset}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
        >
          Reset
        </button>
      </div>

      {/* Status Bar */}
      <div className={`p-4 rounded mb-6 ${error ? 'bg-red-100' : 'bg-gray-100'}`}>
        <div className="font-bold text-lg flex items-center gap-2">
          {phaseInfo.label}
          {isLoading && <span className="animate-spin">⏳</span>}
        </div>
        <div className="text-gray-600">{phaseInfo.description}</div>
        {/* Verification Progress Bar */}
        {verificationProgress && (
           <div className="mt-2 text-sm text-blue-600">
             Progress: {verificationProgress.current}/{verificationProgress.total} - {verificationProgress.status}
           </div>
        )}
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      <div className="space-y-6">
        {/* Answer Stream */}
        {answer && (
          <div className="p-4 border rounded bg-white shadow-sm whitespace-pre-wrap">
            {answer}
          </div>
        )}

        {/* Verification Results */}
        {verification && (
          <div className="p-4 border border-green-200 bg-green-50 rounded">
            <h3 className="font-bold text-green-800 mb-2">
              Verification ({verification.overallConfidence}% Confidence)
            </h3>
            <div className="space-y-2">
              {verification.claims.map(claim => (
                <div key={claim.id} className="text-sm border-b border-green-200 pb-2">
                  <div className="flex justify-between">
                    <span>{claim.text}</span>
                    <span className="font-mono text-xs bg-white px-1 rounded border">
                      {claim.entailment}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Debug Info */}
        <div className="text-xs text-gray-400 mt-8 border-t pt-4">
           SubQueries: {subQueries.length} | Sources: {sources.length}
        </div>
      </div>
    </div>
  );
}

```

Create `app/test/page.tsx` to render it:

```tsx
import TestMaxwell from '../test-maxwell';
export default function Page() { return <TestMaxwell />; }

```

#### Step 3: Run Validation

1. Run `npm run dev`.
2. Go to `http://localhost:3000/test`.
3. Type "What is Tesla revenue 2024?".
4. Watch for:
* Phase changing (Decomposition -> Search...).
* Text streaming in.
* **Crucially:** Watch the "Verification" phase. You should see "Progress: X/Y" updating rapidly (thanks to parallelization).



#### Step 4: Documentation

Update `documentation/CHANGELOG.md`:

```markdown
## Phase 10: Frontend Hook
**Status**: Complete
**Completed**: [Current Date]

### Files Created
- `app/hooks/use-maxwell.ts`

### Features
- **SSE Parsing:** Robust `TextDecoder` stream loop.
- **State Management:** Handles full lifecycle + Verification Progress.
- **Progress UI:** Added `verificationProgress` state to track granular updates.

```

### Checklist

[ ] `use-maxwell.ts` created with `verificationProgress` support.
[ ] Test component created.
[ ] Manual test passed (Validation UI updates).
[ ] Documentation updated.

Proceed to **Phase 11: Frontend Components**.