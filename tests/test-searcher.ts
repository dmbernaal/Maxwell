/**
 * Maxwell Parallel Search Test
 *
 * Tests Phase 3 parallel search: API calls, deduplication, fail-safe, callbacks.
 * Run with: npx tsx --env-file=.env tests/test-searcher.ts
 *
 * Note: This test hits the real Tavily API (small cost per query)
 */

import {
    parallelSearch,
    getSearchStats,
    validateSearchOutput,
} from '../app/lib/maxwell/searcher';
import { getMaxwellEnvConfig } from '../app/lib/maxwell/env';
import type { SubQuery } from '../app/lib/maxwell/types';

// Ensure env is loaded
try {
    getMaxwellEnvConfig();
} catch (error) {
    console.error('❌ Environment check failed:', error);
    process.exit(1);
}

async function runTests(): Promise<void> {
    console.log('🧪 Testing Searcher...\n');

    // Test 1: Real Search with Progress Callbacks
    console.log('Test 1: "Tesla revenue 2024" (Real API Call)');
    const subQueries: SubQuery[] = [
        { id: 'q1', query: 'Tesla revenue 2024', purpose: 'Financial data' },
        { id: 'q2', query: 'BYD revenue 2024', purpose: 'Comparison' },
    ];

    try {
        const result = await parallelSearch(subQueries, (meta) => {
            console.log(`   CALLBACK: ${meta.queryId} finished with ${meta.sourcesFound} sources (${meta.status})`);
        });

        console.log(`✅ Search completed in ${result.durationMs}ms`);
        console.log(`   Total sources found: ${result.sources.length} (after deduplication)`);

        // Show first few sources
        result.sources.slice(0, 3).forEach((s) => {
            console.log(`   - [${s.id}] ${s.title.slice(0, 50)}...`);
        });

        // Check Deduplication
        const uniqueUrls = new Set(result.sources.map((s) => s.url.toLowerCase()));
        if (uniqueUrls.size === result.sources.length) {
            console.log('✅ Deduplication verified (no duplicate URLs)');
        } else {
            console.error('❌ Failed: Duplicate URLs found');
            process.exit(1);
        }

        // Check ID sequencing
        const expectedIds = result.sources.map((_, i) => `s${i + 1}`);
        const actualIds = result.sources.map((s) => s.id);
        if (JSON.stringify(actualIds) === JSON.stringify(expectedIds)) {
            console.log('✅ ID sequencing verified (s1, s2, s3...)');
        } else {
            console.error('❌ Failed: IDs not sequential');
            process.exit(1);
        }

        validateSearchOutput(result);
        console.log('✅ Validation Passed\n');
    } catch (error) {
        console.error('❌ Test 1 failed:', error);
        process.exit(1);
    }

    // Test 2: Robustness (Empty Input)
    console.log('Test 2: Robustness (Empty Input)');
    try {
        await parallelSearch([]);
        console.error('❌ Failed: Should have thrown error for empty input');
        process.exit(1);
    } catch (error) {
        console.log('✅ Correctly threw error for empty input');
    }

    // Test 3: Stats Calculation
    console.log('\nTest 3: Stats Calculation');
    const stats = getSearchStats([
        { queryId: 'q1', query: 'test', sourcesFound: 5, status: 'complete' },
        { queryId: 'q2', query: 'test2', sourcesFound: 3, status: 'complete' },
        { queryId: 'q3', query: 'test3', sourcesFound: 0, status: 'failed' },
    ]);

    if (
        stats.totalQueries === 3 &&
        stats.successfulQueries === 2 &&
        stats.failedQueries === 1 &&
        stats.totalSourcesFound === 8
    ) {
        console.log('✅ Stats calculation correct');
        console.log(`   - Total: ${stats.totalQueries}, Success: ${stats.successfulQueries}, Failed: ${stats.failedQueries}`);
        console.log(`   - Total sources: ${stats.totalSourcesFound}`);
    } else {
        console.error('❌ Stats calculation failed:', stats);
        process.exit(1);
    }

    console.log('\n🎉 Phase 3 Tests Passed!\n');
}

runTests().catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
