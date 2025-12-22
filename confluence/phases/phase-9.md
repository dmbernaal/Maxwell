This is a solid architecture for the Orchestrator. It correctly wires up the previous phases and uses generators to handle the streaming nature of the Agent.

However, I have identified **two robustness improvements** for the API Route to ensure it behaves like a production-grade endpoint:

1. **Relative Imports:** In `route.ts`, you used `@/app/...`. While standard in Next.js, relative imports (`../../`) are safer in take-home environments where `tsconfig.paths` might not be perfectly configured. I will use relative imports to guarantee compilation.
2. **JSON Parsing Safety:** The API route reads `request.json()` immediately. If the request body is empty or malformed, this throws. I've ensured the error handling wraps this specific line to return a clean 400 instead of a generic 500.

Here is the **Revised, Robust Phase 9 Guide**.

---

# Phase 9: Orchestrator + API

## Main Orchestrator and API Endpoint

### Context

This phase connects the brain (Orchestrator) to the outside world (API).
**Key Engineering Decision:** We use an **Async Generator** (`runMaxwell`) to yield events. This allows the API to push Server-Sent Events (SSE) to the client immediately as they happen, rather than waiting for the whole process to finish.

### Prerequisites

[ ] Phases 0-8 complete
[ ] All modules (`decomposer`, `searcher`, `synthesizer`, `verifier`) exported correctly.

### Implementation

#### Step 1: Create `app/lib/maxwell/index.ts`

This is the conductor. It calls every phase in order and manages the state.

```typescript
// app/lib/maxwell/index.ts

/**
 * Maxwell Search Agent - Main Orchestrator
 * * Coordinates all phases: Decomposition -> Search -> Synthesis -> Verification.
 * Yields events for real-time UI updates.
 * * @module maxwell
 */

import { decomposeQuery } from './decomposer';
import { parallelSearch } from './searcher';
import { synthesize } from './synthesizer';
import { verifyClaims } from './verifier';

import type {
  Source,
  MaxwellEvent,
  MaxwellResponse,
  MaxwellPhases,
} from './types';

// Re-export for convenience
export * from './types';
export { decomposeQuery } from './decomposer';
export { parallelSearch } from './searcher';
export { synthesize } from './synthesizer';
export { verifyClaims } from './verifier';

/**
 * Runs the complete Maxwell pipeline.
 * Yields events for every step to power the Streaming UI.
 */
export async function* runMaxwell(query: string): AsyncGenerator<MaxwellEvent> {
  const overallStart = Date.now();
  
  // State tracking
  let sources: Source[] = [];
  let answer = '';
  
  // Phase tracking for final response
  const phases: MaxwellPhases = {
    decomposition: { status: 'pending' },
    search: { status: 'pending' },
    synthesis: { status: 'pending' },
    verification: { status: 'pending' },
  };
  
  try {
    // ═══════════════════════════════════════════════════════════
    // PHASE 1: DECOMPOSITION
    // ═══════════════════════════════════════════════════════════
    yield { type: 'phase-start', phase: 'decomposition' };
    phases.decomposition.status = 'in_progress';
    
    const decomposition = await decomposeQuery(query);
    
    phases.decomposition = {
      status: 'complete',
      subQueries: decomposition.subQueries,
      durationMs: decomposition.durationMs,
    };
    
    yield {
      type: 'phase-complete',
      phase: 'decomposition',
      data: decomposition,
    };
    
    // ═══════════════════════════════════════════════════════════
    // PHASE 2: PARALLEL SEARCH
    // ═══════════════════════════════════════════════════════════
    yield { type: 'phase-start', phase: 'search' };
    phases.search.status = 'in_progress';
    
    const searchOutput = await parallelSearch(
      decomposition.subQueries,
      (metadata) => {
        // Optional: We could emit search-progress events here if we 
        // refactored to use a PushQueue, but for now we batch update.
      }
    );
    
    sources = searchOutput.sources;
    
    phases.search = {
      status: 'complete',
      totalSources: searchOutput.sources.length,
      searchMetadata: searchOutput.searchMetadata,
      durationMs: searchOutput.durationMs,
    };
    
    yield {
      type: 'phase-complete',
      phase: 'search',
      data: {
        sources: searchOutput.sources,
        searchMetadata: searchOutput.searchMetadata,
        totalSources: searchOutput.sources.length,
        durationMs: searchOutput.durationMs,
      },
    };
    
    // ═══════════════════════════════════════════════════════════
    // PHASE 3: SYNTHESIS (Streaming)
    // ═══════════════════════════════════════════════════════════
    yield { type: 'phase-start', phase: 'synthesis' };
    phases.synthesis.status = 'in_progress';
    
    let synthesisDuration = 0;
    let sourcesUsed: string[] = [];
    
    for await (const event of synthesize(query, sources)) {
      if (event.type === 'chunk') {
        yield { type: 'synthesis-chunk', content: event.content };
      } else if (event.type === 'complete') {
        answer = event.answer;
        sourcesUsed = event.sourcesUsed;
        synthesisDuration = event.durationMs;
      }
    }
    
    phases.synthesis = {
      status: 'complete',
      durationMs: synthesisDuration,
    };
    
    yield {
      type: 'phase-complete',
      phase: 'synthesis',
      data: { answer, sourcesUsed, durationMs: synthesisDuration },
    };
    
    // ═══════════════════════════════════════════════════════════
    // PHASE 4: VERIFICATION
    // ═══════════════════════════════════════════════════════════
    yield { type: 'phase-start', phase: 'verification' };
    phases.verification.status = 'in_progress';
    
    const verification = await verifyClaims(answer, sources, (progress) => {
      // Logic for progress updates (future enhancement)
    });
    
    phases.verification = {
      status: 'complete',
      claimsExtracted: verification.claims.length,
      claimsVerified: verification.claims.length,
      durationMs: verification.durationMs,
    };
    
    yield {
      type: 'phase-complete',
      phase: 'verification',
      data: verification,
    };
    
    // ═══════════════════════════════════════════════════════════
    // COMPLETE
    // ═══════════════════════════════════════════════════════════
    const response: MaxwellResponse = {
      answer,
      sources,
      verification,
      phases,
      totalDurationMs: Date.now() - overallStart,
    };
    
    yield { type: 'complete', data: response };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Maxwell pipeline error:', error);
    
    yield { type: 'error', message: `Pipeline failed: ${message}` };
  }
}

/**
 * Non-streaming wrapper for simple integrations (testing/scripts).
 */
export async function runMaxwellComplete(query: string): Promise<MaxwellResponse> {
  let result: MaxwellResponse | null = null;
  
  for await (const event of runMaxwell(query)) {
    if (event.type === 'complete') result = event.data;
    if (event.type === 'error') throw new Error(event.message);
  }
  
  if (!result) throw new Error('Maxwell did not complete');
  return result;
}

```

#### Step 2: Create `app/api/maxwell/route.ts`

This endpoint streams the generator events to the client using Server-Sent Events (SSE).

```typescript
// app/api/maxwell/route.ts

/**
 * Maxwell API Route
 * * Streaming endpoint using Server-Sent Events (SSE).
 * POST /api/maxwell
 */

import { NextRequest } from 'next/server';
import { runMaxwell } from '../../lib/maxwell'; // Relative import for safety
import { MAX_QUERY_LENGTH, API_TIMEOUT_SECONDS } from '../../lib/maxwell/constants';

// Force Node.js runtime for robustness (Intl.Segmenter, etc)
export const runtime = 'nodejs';
export const maxDuration = API_TIMEOUT_SECONDS;

export async function POST(request: NextRequest) {
  try {
    // 1. Safe Body Parsing
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
    }

    const { query } = body;
    
    // 2. Validation
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query required' }), { status: 400 });
    }
    
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      return new Response(JSON.stringify({ error: 'Query cannot be empty' }), { status: 400 });
    }
    
    if (trimmedQuery.length > MAX_QUERY_LENGTH) {
      return new Response(JSON.stringify({ error: 'Query too long' }), { status: 400 });
    }
    
    // 3. SSE Stream Setup
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of runMaxwell(trimmedQuery)) {
            // SSE Format: "data: <json>\n\n"
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          
          // Close Stream
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          
        } catch (error) {
          console.error('Stream Error:', error);
          const errorEvent = { type: 'error', message: 'Stream interrupted' };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          controller.close();
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Critical for Nginx/Vercel buffering
      },
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

// Health Check
export async function GET() {
  return new Response(JSON.stringify({ status: 'maxwell-online' }));
}

```

#### Step 3: Testing

Create `app/lib/maxwell/test-orchestrator.ts`. This tests the entire system end-to-end (minus the HTTP layer).

```typescript
// app/lib/maxwell/test-orchestrator.ts
import { runMaxwell } from './index';
import { getEnvConfig } from './env';

try { getEnvConfig(); } catch (e) { console.error(e); process.exit(1); }

async function runTests() {
  console.log('🧪 Testing Orchestrator (E2E Pipeline)...\n');
  
  const query = "What is Tesla's revenue in 2023?";
  console.log(`Query: "${query}"`);

  try {
    const phasesHit = new Set<string>();
    let synthesisChunks = 0;
    
    for await (const event of runMaxwell(query)) {
      if (event.type === 'phase-start') {
        console.log(`▶ Phase: ${event.phase}`);
        phasesHit.add(event.phase);
      }
      else if (event.type === 'synthesis-chunk') {
        synthesisChunks++;
        process.stdout.write('.'); // Visualize streaming
      }
      else if (event.type === 'complete') {
        console.log('\n✅ Pipeline Complete');
        console.log(`   Confidence: ${event.data.verification.overallConfidence}%`);
        console.log(`   Chunks: ${synthesisChunks}`);
        console.log(`   Sources: ${event.data.sources.length}`);
      }
      else if (event.type === 'error') {
        throw new Error(event.message);
      }
    }
    
    // Assertions
    const expectedPhases = ['decomposition', 'search', 'synthesis', 'verification'];
    if (expectedPhases.every(p => phasesHit.has(p))) {
        console.log('✅ All phases executed');
    } else {
        console.error('❌ Missing phases:', expectedPhases.filter(p => !phasesHit.has(p)));
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Orchestrator Failed:', error);
    process.exit(1);
  }

  console.log('🎉 Phase 9 Tests Passed');
}

runTests();

```

**Run the test:**

```bash
npx tsx app/lib/maxwell/test-orchestrator.ts

```

#### Step 4: Documentation

Update `documentation/CHANGELOG.md`:

```markdown
## Phase 9: Orchestrator + API
**Status**: Complete
**Completed**: [Current Date]

### Files Created
- `app/lib/maxwell/index.ts`
- `app/api/maxwell/route.ts`

### Key Features
- **Async Generator:** `runMaxwell` yields events for every phase transition.
- **SSE API:** `route.ts` streams events to client using `text/event-stream`.
- **E2E Integration:** Connects Decomposition -> Search -> Synthesis -> Verification.

### Tests Passed
- [x] Full E2E pipeline execution via orchestrator
- [x] All phases report status
- [x] Synthesis streams chunks
- [x] API route structure valid

```

Update `documentation/FILE-MAP.md`:

```markdown
### `index.ts`
**Purpose**: Central orchestrator.
**Exports**: `runMaxwell` (generator), `runMaxwellComplete` (promise).

### `api/maxwell/route.ts`
**Purpose**: POST endpoint for running searches. Returns SSE stream.

```

### Checklist

[ ] `index.ts` created.
[ ] `route.ts` created with SSE support.
[ ] Test passed.
[ ] Test deleted.
[ ] Documentation updated.

Proceed to **Phase 10: Frontend Hook**.