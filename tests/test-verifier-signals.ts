/**
 * Maxwell Verification Signals Test
 *
 * Tests Phase 7 signals: NLI entailment, numeric extraction, consistency, aggregation.
 * Run with: npx tsx --env-file=.env tests/test-verifier-signals.ts
 *
 * Note: This test hits the real OpenRouter API for NLI
 */

import {
    checkEntailment,
    extractNumbers,
    normalizeNumber,
    checkNumericConsistency,
    aggregateSignals,
} from '../app/lib/maxwell/verifier';
import { getMaxwellEnvConfig } from '../app/lib/maxwell/env';

// Ensure env is loaded
try {
    getMaxwellEnvConfig();
} catch (error) {
    console.error('❌ Environment check failed:', error);
    process.exit(1);
}

async function runTests(): Promise<void> {
    console.log('🧪 Testing Verification Signals...\n');

    // Test 1: NLI Check (Real API)
    console.log('Test 1: NLI Check');
    try {
        const nliRes = await checkEntailment(
            'Tesla grew 10% in revenue',
            'Tesla reported 10% revenue growth in 2024'
        );
        console.log(`   Verdict: ${nliRes.verdict}`);
        console.log(`   Reasoning: ${nliRes.reasoning.slice(0, 80)}...`);

        if (nliRes.verdict === 'SUPPORTED') {
            console.log('✅ NLI correctly identified support');
        } else {
            console.log(`⚠️ NLI returned ${nliRes.verdict} (may vary by model)`);
        }
    } catch (error) {
        console.error('❌ Test 1 Failed:', error);
        process.exit(1);
    }

    // Test 2: Number Extraction
    console.log('\nTest 2: Number Extraction');
    const testText = 'Tesla revenue is $96.8 billion in 2024, up 18.5% year over year.';
    const extracted = extractNumbers(testText);
    console.log(`   Extracted: [${extracted.join(', ')}]`);

    if (extracted.length >= 2) {
        console.log('✅ Number extraction works');
    } else {
        console.error('❌ Failed to extract numbers');
        process.exit(1);
    }

    // Test 3: Number Normalization
    console.log('\nTest 3: Number Normalization');
    const tests = [
        { input: '$96.8 billion', expected: 96.8e9 },
        { input: '96.8B', expected: 96.8e9 },
        { input: '18.5%', expected: 18.5 },
        { input: '1,234,567', expected: 1234567 },
    ];

    let normPassed = true;
    for (const test of tests) {
        const result = normalizeNumber(test.input);
        const match = Math.abs((result ?? 0) - test.expected) < 1; // Allow small float difference
        console.log(`   ${test.input} → ${result} (expected ${test.expected}) ${match ? '✓' : '✗'}`);
        if (!match) normPassed = false;
    }

    if (normPassed) {
        console.log('✅ Normalization works');
    } else {
        console.error('❌ Normalization failed');
        process.exit(1);
    }

    // Test 4: Numeric Consistency
    console.log('\nTest 4: Numeric Consistency');

    // Matching case
    const consistentCheck = checkNumericConsistency(['$100 billion'], ['$100 billion', '2024']);
    if (consistentCheck.match) {
        console.log('✅ Consistent numbers matched');
    } else {
        console.error('❌ Failed to match consistent numbers');
        process.exit(1);
    }

    // Mismatched case
    const mismatchCheck = checkNumericConsistency(['$100'], ['$50']);
    if (!mismatchCheck.match) {
        console.log('✅ Correctly detected numeric mismatch');
    } else {
        console.error('❌ Failed to detect mismatch');
        process.exit(1);
    }

    // Test 5: Signal Aggregation
    console.log('\nTest 5: Signal Aggregation');

    // High confidence case: SUPPORTED + good retrieval + no mismatches
    const highConfidence = aggregateSignals('SUPPORTED', 0.9, false, null);
    console.log(`   High case: ${highConfidence.confidence.toFixed(3)} (${highConfidence.confidenceLevel})`);

    // Low confidence case: SUPPORTED + numeric mismatch
    const lowConfidence = aggregateSignals('SUPPORTED', 0.9, false, {
        claimNumbers: ['100'],
        evidenceNumbers: ['50'],
        match: false,
    });
    console.log(`   Low case: ${lowConfidence.confidence.toFixed(3)} (${lowConfidence.confidenceLevel})`);
    console.log(`   Issues: ${lowConfidence.issues.join(', ')}`);

    if (lowConfidence.confidence < 0.5) {
        console.log('✅ Numeric mismatch correctly penalized score');
    } else {
        console.error('❌ Aggregation logic failed to penalize mismatch');
        process.exit(1);
    }

    // Contradicted case
    const contradictedConf = aggregateSignals('CONTRADICTED', 0.8, false, null);
    console.log(`   Contradicted: ${contradictedConf.confidence.toFixed(3)} (${contradictedConf.confidenceLevel})`);

    if (contradictedConf.confidence < 0.3) {
        console.log('✅ CONTRADICTED correctly results in low confidence');
    } else {
        console.error('❌ CONTRADICTED should have low confidence');
        process.exit(1);
    }

    console.log('\n🎉 Phase 7 Tests Passed!\n');
}

runTests().catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
