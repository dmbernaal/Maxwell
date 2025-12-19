/**
 * Maxwell Foundation Test
 *
 * Tests Phase 0 foundation: types, constants, and environment.
 * Run with: npx tsx tests/test-foundation.ts
 */

import { getMaxwellEnvConfig } from '../app/lib/maxwell/env';
import {
    DECOMPOSITION_MODEL,
    SYNTHESIS_MODEL,
    EMBEDDING_MODEL,
    HIGH_CONFIDENCE_THRESHOLD,
    MEDIUM_CONFIDENCE_THRESHOLD,
    MAX_SUB_QUERIES,
    RESULTS_PER_QUERY,
} from '../app/lib/maxwell/constants';
import type { VerifiedClaim, MaxwellState, SubQuery } from '../app/lib/maxwell/types';

async function runTest(): Promise<void> {
    console.log('🧪 Testing Maxwell Foundation...\n');

    // ============================================
    // 1. Check Types Compile
    // ============================================
    const testClaim: VerifiedClaim = {
        id: 'c1',
        text: 'Test claim for type validation',
        confidence: 0.85,
        confidenceLevel: 'high',
        entailment: 'SUPPORTED',
        entailmentReasoning: 'Evidence directly supports this claim',
        bestMatchingSource: {
            sourceId: 's1',
            sourceTitle: 'Test Source',
            sourceIndex: 1,
            passage: 'Test passage text',
            similarity: 0.92,
            isCitedSource: true,
        },
        citationMismatch: false,
        citedSourceSupport: 0.92,
        globalBestSupport: 0.92,
        numericCheck: null,
        issues: [],
    };

    const testSubQuery: SubQuery = {
        id: 'q1',
        query: 'test query',
        purpose: 'testing types',
    };

    const testState: MaxwellState = {
        phase: 'idle',
        subQueries: [testSubQuery],
        searchMetadata: [],
        sources: [],
        answer: '',
        verification: null,
        error: null,
        phaseDurations: {},
    };

    console.log('✅ Types Compiled and Validated');
    console.log(`   - VerifiedClaim: id=${testClaim.id}, confidence=${testClaim.confidence}`);
    console.log(`   - MaxwellState: phase=${testState.phase}`);

    // ============================================
    // 2. Check Constants
    // ============================================
    console.log('\n📊 Constants:');
    console.log(`   ✅ Decomposition Model: ${DECOMPOSITION_MODEL}`);
    console.log(`   ✅ Synthesis Model: ${SYNTHESIS_MODEL}`);
    console.log(`   ✅ Embedding Model: ${EMBEDDING_MODEL}`);
    console.log(`   ✅ High Confidence Threshold: ${HIGH_CONFIDENCE_THRESHOLD}`);
    console.log(`   ✅ Medium Confidence Threshold: ${MEDIUM_CONFIDENCE_THRESHOLD}`);
    console.log(`   ✅ Max Sub-Queries: ${MAX_SUB_QUERIES}`);
    console.log(`   ✅ Results Per Query: ${RESULTS_PER_QUERY}`);

    // ============================================
    // 3. Check Environment
    // ============================================
    console.log('\n🔐 Environment:');
    try {
        const env = getMaxwellEnvConfig();
        console.log(`   ✅ OPENROUTER_API_KEY: ${env.OPENROUTER_API_KEY.slice(0, 15)}...`);
        console.log(`   ✅ TAVILY_API_KEY: ${env.TAVILY_API_KEY.slice(0, 10)}...`);
    } catch (error) {
        if (error instanceof Error) {
            console.error(`   ❌ Environment Check Failed: ${error.message}`);
            process.exit(1);
        }
    }

    // ============================================
    // SUCCESS
    // ============================================
    console.log('\n🎉 Phase 0 Foundation Test PASSED!\n');
}

runTest().catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
});
