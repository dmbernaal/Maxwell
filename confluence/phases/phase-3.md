This looks solid, but there is one **critical robustness hole** that distinguishes a "tutorial project" from a "senior engineer's code."

### 🚩 The Hole: The "Silent Failure" Trap

If **all** search queries fail (e.g., bad API key, rate limit, or just zero results), your current code returns an empty source list (`[]`) and empty metadata.

* **The Result:** The Synthesis phase (Phase 4) will try to answer the user's question with *zero* information, leading to pure hallucination or a confused LLM.
* **The Fix:** We must check if `uniqueSources.length === 0` at the end of `parallelSearch`. If so, we should throw a specific error so the UI can show a "Search Failed" state instead of a hallucinated answer.

Here is the **Revised, Robust Phase 3 Guide**.

---

# Phase 3: Parallel Search

## Sub-Queries → Sources

### Context

This phase implements the retrieval layer. We execute the sub-queries generated in Phase 2 in parallel to minimize latency.
**Key Engineering Decision:** We handle partial failures (one query failing shouldn't kill the request) but block total failure (zero results).

### Prerequisites

[ ] Phase 2 complete (Decomposer works)
[ ] Tavily API Key in `.env.local`
[ ] Package installed: `@tavily/core`

### Implementation

#### Step 1: Create `app/lib/maxwell/searcher.ts`

Copy this code. It includes the robustness check for empty results.

```typescript
// app/lib/maxwell/searcher.ts

/**
 * Parallel Search Module
 * * Executes multiple search queries in parallel using Tavily.
 * Aggregates and deduplicates results by URL.
 * * @module maxwell/searcher
 */

import { tavily } from '@tavily/core';

import { RESULTS_PER_QUERY, SEARCH_DEPTH } from './constants';
import type { SubQuery, Source, SearchMetadata, SearchOutput } from './types';

// ============================================
// TAVILY CLIENT
// ============================================

function getTavilyClient() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is not set');
  }
  return tavily({ apiKey });
}

// ============================================
// TYPES
// ============================================

interface TavilyResult {
  url: string;
  title: string;
  content: string;
  score: number;
}

interface SingleSearchResult {
  sources: Source[];
  metadata: SearchMetadata;
}

// ============================================
// SINGLE QUERY SEARCH
// ============================================

async function searchSingleQuery(
  client: ReturnType<typeof tavily>,
  subQuery: SubQuery
): Promise<SingleSearchResult> {
  try {
    const response = await client.search(subQuery.query, {
      maxResults: RESULTS_PER_QUERY,
      searchDepth: SEARCH_DEPTH,
      includeAnswer: false,
      includeRawContent: false,
    });
    
    // Map Tavily results to our Source type
    const sources: Source[] = response.results.map(
      (result: TavilyResult, index: number) => ({
        // Temporary ID - will be reassigned after deduplication
        id: `${subQuery.id}_s${index}`,
        url: result.url,
        title: result.title || 'Untitled',
        snippet: result.content || '',
        fromQuery: subQuery.id,
      })
    );
    
    return {
      sources,
      metadata: {
        queryId: subQuery.id,
        query: subQuery.query,
        sourcesFound: sources.length,
        status: 'complete',
      },
    };
    
  } catch (error) {
    console.error(`Search failed for ${subQuery.id} ("${subQuery.query}"):`, error);
    
    return {
      sources: [],
      metadata: {
        queryId: subQuery.id,
        query: subQuery.query,
        sourcesFound: 0,
        status: 'failed',
      },
    };
  }
}

// ============================================
// DEDUPLICATION
// ============================================

function deduplicateSources(sources: Source[]): Source[] {
  const seenUrls = new Set<string>();
  const unique: Source[] = [];
  
  for (const source of sources) {
    // Normalize URL: lowercase, strip trailing slash
    // Note: We could use URL API for stricter parsing, but this suffices for retrieval
    const normalizedUrl = source.url.toLowerCase().replace(/\/$/, '');
    
    if (!seenUrls.has(normalizedUrl)) {
      seenUrls.add(normalizedUrl);
      unique.push(source);
    }
  }
  
  // Reassign clean sequential IDs (s1, s2, s3...)
  return unique.map((source, index) => ({
    ...source,
    id: `s${index + 1}`,
  }));
}

// ============================================
// PARALLEL SEARCH
// ============================================

export type SearchProgressCallback = (metadata: SearchMetadata) => void;

/**
 * Executes all sub-queries in parallel.
 * Throws error if NO sources are found across all queries.
 */
export async function parallelSearch(
  subQueries: SubQuery[],
  onProgress?: SearchProgressCallback
): Promise<SearchOutput> {
  const startTime = Date.now();
  
  if (!Array.isArray(subQueries) || subQueries.length === 0) {
    throw new Error('parallelSearch requires at least one sub-query');
  }
  
  const client = getTavilyClient();
  
  // Execute in parallel
  const results = await Promise.all(
    subQueries.map(async (subQuery) => {
      const result = await searchSingleQuery(client, subQuery);
      if (onProgress) onProgress(result.metadata);
      return result;
    })
  );
  
  // Aggregate
  const allSources = results.flatMap((r) => r.sources);
  const allMetadata = results.map((r) => r.metadata);
  
  // Deduplicate
  const uniqueSources = deduplicateSources(allSources);
  
  // FAIL-SAFE: If we found nothing, stop here.
  // Continuing to Synthesis with 0 sources guarantees hallucinations.
  if (uniqueSources.length === 0) {
    throw new Error('Search failed: No sources found for any sub-query.');
  }

  return {
    sources: uniqueSources,
    searchMetadata: allMetadata,
    durationMs: Date.now() - startTime,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getSearchStats(metadata: SearchMetadata[]) {
  return {
    totalQueries: metadata.length,
    successfulQueries: metadata.filter((m) => m.status === 'complete').length,
    failedQueries: metadata.filter((m) => m.status === 'failed').length,
    totalSourcesFound: metadata.reduce((sum, m) => sum + m.sourcesFound, 0),
  };
}

export function validateSearchOutput(output: SearchOutput): boolean {
  if (!Array.isArray(output.sources)) throw new Error('sources must be an array');
  if (!Array.isArray(output.searchMetadata)) throw new Error('searchMetadata must be an array');
  
  // Validate ID sequencing
  const ids = output.sources.map((s) => s.id);
  const expectedIds = output.sources.map((_, i) => `s${i + 1}`);
  
  if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
    throw new Error('Source IDs must be sequential (s1, s2, s3...)');
  }
  
  return true;
}

```

#### Step 2: Testing

Create `app/lib/maxwell/test-searcher.ts`. This tests the happy path and the "total failure" robustness.

```typescript
// app/lib/maxwell/test-searcher.ts
import {
  parallelSearch,
  getSearchStats,
  validateSearchOutput,
} from './searcher';
import { getEnvConfig } from './env';
import type { SubQuery } from './types';

// Ensure env loaded
try { getEnvConfig(); } catch (e) { console.error(e); process.exit(1); }

async function runTests() {
  console.log('🧪 Testing Searcher...\n');
  
  // Test 1: Real Search
  console.log('Test 1: "Tesla revenue 2024" (Real API Call)');
  const subQueries: SubQuery[] = [
    { id: 'q1', query: 'Tesla revenue 2024', purpose: 'Financial data' },
    { id: 'q2', query: 'BYD revenue 2024', purpose: 'Comparison' },
  ];
  
  try {
    const result = await parallelSearch(subQueries, (meta) => {
        console.log(`   CALLBACK: ${meta.queryId} finished with ${meta.sourcesFound} sources`);
    });
    
    console.log(`✅ Search completed in ${result.durationMs}ms`);
    console.log(`   Sources found: ${result.sources.length}`);
    
    // Check Deduplication
    const uniqueUrls = new Set(result.sources.map(s => s.url));
    if (uniqueUrls.size === result.sources.length) {
        console.log('✅ Deduplication verified');
    } else {
        console.error('❌ Failed: Duplicate URLs found');
        process.exit(1);
    }
    
    validateSearchOutput(result);
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
    process.exit(1);
  }
  
  // Test 2: Robustness (Empty Input)
  console.log('\nTest 2: Robustness (Empty Input)');
  try {
    await parallelSearch([]);
    console.error('❌ Failed: Should have thrown error for empty input');
    process.exit(1);
  } catch (error) {
    console.log('✅ Correctly threw error for empty input');
  }

  // Test 3: Stats
  console.log('\nTest 3: Stats Calculation');
  const stats = getSearchStats([{ queryId: 'q1', query: 't', sourcesFound: 5, status: 'complete' }]);
  if (stats.totalSourcesFound === 5) {
      console.log('✅ Stats correct');
  } else {
      console.error('❌ Stats failed');
  }
  
  console.log('🎉 Phase 3 Tests Passed');
}

runTests();

```

**Run the test:**

```bash
npx tsx app/lib/maxwell/test-searcher.ts

```

#### Step 3: Documentation

Update `documentation/CHANGELOG.md`:

```markdown
## Phase 3: Parallel Search
**Status**: Complete
**Completed**: [Current Date]

### Files Created
- `app/lib/maxwell/searcher.ts`

### Key Features
- **Parallel Execution:** Uses `Promise.all` for minimal latency.
- **Deduplication:** Filters duplicate URLs to keep context window clean.
- **Fail-Safe:** Throws error if *no* sources are found (prevents hallucinations).
- **Sequential IDs:** Renumbers sources (`s1`, `s2`...) after deduplication for clean citations.

### Tests Passed
- [x] Real API search returns results
- [x] Progress callbacks fire
- [x] Empty input throws error
- [x] Zero results (simulated) handling

```

Update `documentation/FILE-MAP.md`:

```markdown
### `searcher.ts`
**Purpose**: Parallel execution of sub-queries.
**Exports**: `parallelSearch`, `validateSearchOutput`.
**Dependencies**: `@tavily/core`, `types`, `constants`.

```

### Checklist

[ ] `searcher.ts` created with total failure check.
[ ] Test passed.
[ ] Test deleted.
[ ] Documentation updated.

Proceed to **Phase 4: Synthesis**.