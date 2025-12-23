/**
 * Maxwell Embeddings Test
 *
 * Tests Phase 5 embeddings: single/batch API calls, cosine similarity math.
 * Run with: npx tsx --env-file=.env tests/test-embeddings.ts
 *
 * Note: This test hits the real OpenRouter Embedding API (very cheap)
 */

import {
    embedText,
    embedTexts,
    cosineSimilarity,
    findTopMatches,
} from '../app/lib/maxwell/embeddings';
import { getMaxwellEnvConfig } from '../app/lib/maxwell/env';

// Ensure env is loaded
try {
    getMaxwellEnvConfig();
} catch (error) {
    console.error('❌ Environment check failed:', error);
    process.exit(1);
}

async function runTests(): Promise<void> {
    console.log('🧪 Testing Embeddings (OpenRouter Fetch)...\n');

    // Test 1: Real API Call (Single)
    console.log('Test 1: Single Embedding');
    let singleVectorDimensions = 0;
    try {
        const vector = await embedText('Tesla revenue growth 2024');
        singleVectorDimensions = vector.length;
        console.log(`✅ Generated vector with ${vector.length} dimensions`);
    } catch (error) {
        console.error('❌ Test 1 Failed:', error);
        process.exit(1);
    }

    // Test 2: Batch API Call
    console.log('\nTest 2: Batch Embedding');
    try {
        const vectors = await embedTexts(['Tesla revenue', 'BYD revenue', 'Electric vehicle market']);
        console.log(`✅ Generated ${vectors.length} vectors`);

        // Check dimensions match
        if (vectors.every((v) => v.length === singleVectorDimensions)) {
            console.log(`✅ All vectors have consistent dimensions (${singleVectorDimensions})`);
        } else {
            console.error('❌ Vector dimension mismatch in batch');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Test 2 Failed:', error);
        process.exit(1);
    }

    // Test 3: Cosine Similarity Math
    console.log('\nTest 3: Similarity Calculation');
    const vecA = [1, 0, 0];
    const vecB = [1, 0, 0];
    const vecC = [0, 1, 0];
    const vecD = [-1, 0, 0];

    const simIdentical = cosineSimilarity(vecA, vecB); // Should be 1
    const simOrthogonal = cosineSimilarity(vecA, vecC); // Should be 0
    const simOpposite = cosineSimilarity(vecA, vecD); // Should be -1

    if (
        Math.abs(simIdentical - 1) < 0.001 &&
        Math.abs(simOrthogonal) < 0.001 &&
        Math.abs(simOpposite + 1) < 0.001
    ) {
        console.log('✅ Similarity Math Correct');
        console.log(`   Identical: ${simIdentical.toFixed(4)}`);
        console.log(`   Orthogonal: ${simOrthogonal.toFixed(4)}`);
        console.log(`   Opposite: ${simOpposite.toFixed(4)}`);
    } else {
        console.error(`❌ Math Failed: Identical=${simIdentical}, Orthogonal=${simOrthogonal}, Opposite=${simOpposite}`);
        process.exit(1);
    }

    // Test 4: Find Top Matches
    console.log('\nTest 4: Find Top Matches');
    const queryVec = [1, 0, 0, 0];
    const itemVecs = [
        [0.9, 0.1, 0, 0], // Most similar
        [0, 1, 0, 0], // Orthogonal
        [0.5, 0.5, 0, 0], // Somewhat similar
        [-1, 0, 0, 0], // Opposite
    ];

    const matches = findTopMatches(queryVec, itemVecs, 2);
    if (matches[0].index === 0 && matches[1].index === 2) {
        console.log('✅ Top matches found correctly');
        console.log(`   #1: index ${matches[0].index} (similarity: ${matches[0].similarity.toFixed(4)})`);
        console.log(`   #2: index ${matches[1].index} (similarity: ${matches[1].similarity.toFixed(4)})`);
    } else {
        console.error('❌ Top matches incorrect:', matches);
        process.exit(1);
    }

    // Test 5: Empty Input Handling
    console.log('\nTest 5: Empty Input Handling');
    try {
        const emptyResult = await embedTexts([]);
        if (emptyResult.length === 0) {
            console.log('✅ Empty array returns empty result');
        } else {
            console.error('❌ Empty array should return empty result');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Test 5 Failed:', error);
        process.exit(1);
    }

    console.log('\n🎉 Phase 5 Tests Passed!\n');
}

runTests().catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
