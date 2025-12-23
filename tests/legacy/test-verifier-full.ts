/**
 * Maxwell Full Verification Pipeline Test
 *
 * Tests Phase 8 verification assembly: the complete verifyClaims() pipeline.
 * Run with: npx tsx --env-file=.env tests/test-verifier-full.ts
 *
 * Note: This test hits real APIs (LLM + embeddings)
 */

import { verifyClaims, validateVerificationOutput } from '../app/lib/maxwell/verifier';
import { getMaxwellEnvConfig } from '../app/lib/maxwell/env';
import type { MaxwellSource } from '../app/lib/maxwell/types';

// Ensure env is loaded
try {
    getMaxwellEnvConfig();
} catch (error) {
    console.error('❌ Environment check failed:', error);
    process.exit(1);
}

async function runTests(): Promise<void> {
    console.log('🧪 Testing Full Verification Pipeline...\n');

    const sources: MaxwellSource[] = [
        {
            id: 's1',
            title: 'Tesla Financial Report',
            url: 'http://tesla.com/report',
            snippet: 'Tesla reported revenue of $96 billion for fiscal year 2024. Electric vehicle sales grew 25% year over year.',
            fromQuery: 'q1',
        },
        {
            id: 's2',
            title: 'BYD Annual Results',
            url: 'http://byd.com/results',
            snippet: 'BYD achieved $80 billion in revenue. The company sold 3 million electric vehicles in 2024.',
            fromQuery: 'q1',
        },
    ];

    const answer = 'Tesla reported revenue of $96 billion in 2024 [1]. BYD achieved $80 billion in revenue [2].';

    // Test 1: Full Pipeline Execution
    console.log('Test 1: Full Verification Flow');
    let progressCalls = 0;

    try {
        const result = await verifyClaims(answer, sources, (progress) => {
            progressCalls++;
            console.log(`   Progress: ${progress.status} (${progress.current}/${progress.total})`);
        });

        console.log(`\n✅ Completed in ${result.durationMs}ms`);
        console.log(`   Overall Confidence: ${result.overallConfidence}%`);
        console.log(`   Claims Verified: ${result.claims.length}`);
        console.log(`   Summary:`);
        console.log(`     - Supported: ${result.summary.supported}`);
        console.log(`     - Uncertain: ${result.summary.uncertain}`);
        console.log(`     - Contradicted: ${result.summary.contradicted}`);
        console.log(`     - Citation Mismatches: ${result.summary.citationMismatches}`);
        console.log(`     - Numeric Mismatches: ${result.summary.numericMismatches}`);

        // Validate output structure
        validateVerificationOutput(result);
        console.log('✅ Output validation passed');

        // Check progress callbacks fired
        if (progressCalls > 0) {
            console.log(`✅ Progress callbacks fired (${progressCalls} times)`);
        } else {
            console.error('❌ No progress callbacks received');
            process.exit(1);
        }

        // Check we got claims back
        if (result.claims.length === 0) {
            console.error('❌ No claims extracted');
            process.exit(1);
        }

        // Display each claim
        console.log('\n   Claims Detail:');
        for (const claim of result.claims) {
            console.log(`   [${claim.id}] "${claim.text.slice(0, 50)}..."`);
            console.log(`       Entailment: ${claim.entailment} | Confidence: ${(claim.confidence * 100).toFixed(0)}%`);
            console.log(`       Source: ${claim.bestMatchingSource.sourceTitle}`);
            if (claim.issues.length > 0) {
                console.log(`       Issues: ${claim.issues.join(', ')}`);
            }
        }

        // Check for reasonable confidence
        if (result.overallConfidence > 50) {
            console.log('\n✅ Overall confidence > 50% (reasonable for supported claims)');
        } else {
            console.log(`\n⚠️ Overall confidence is ${result.overallConfidence}% (may vary by model)`);
        }
    } catch (error) {
        console.error('❌ Test 1 Failed:', error);
        process.exit(1);
    }

    // Test 2: Empty Answer
    console.log('\nTest 2: Empty Answer Handling');
    try {
        const emptyResult = await verifyClaims('', sources);
        if (emptyResult.claims.length === 0 && emptyResult.overallConfidence === 0) {
            console.log('✅ Empty answer returns empty result');
        } else {
            console.error('❌ Empty answer should return empty claims');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Test 2 Failed:', error);
        process.exit(1);
    }

    // Test 3: No Sources
    console.log('\nTest 3: No Sources Handling');
    try {
        const noSourcesResult = await verifyClaims('Some claim about data [1].', []);
        if (noSourcesResult.claims.length === 0 || noSourcesResult.overallConfidence === 0) {
            console.log('✅ No sources returns low confidence result');
        } else {
            console.error('❌ No sources should return low confidence');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Test 3 Failed:', error);
        process.exit(1);
    }

    console.log('\n🎉 Phase 8 Tests Passed!\n');
}

runTests().catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
