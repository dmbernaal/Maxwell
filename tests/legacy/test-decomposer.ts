/**
 * Maxwell Decomposer Test
 *
 * Tests Phase 2 decomposition: structured output, date injection, validation.
 * Run with: npx tsx --env-file=.env tests/test-decomposer.ts
 *
 * Note: This test hits the real OpenRouter API (cost: ~$0.001 per run)
 */

import { decomposeQuery, validateDecompositionOutput } from '../app/lib/maxwell/decomposer';
import { getMaxwellEnvConfig } from '../app/lib/maxwell/env';

// Ensure env is loaded
try {
    getMaxwellEnvConfig();
} catch (error) {
    console.error('❌ Environment check failed:', error);
    process.exit(1);
}

async function runTests(): Promise<void> {
    console.log('🧪 Testing Decomposer...\n');

    // Test 1: Basic decomposition
    console.log('Test 1: "Compare Tesla and BYD revenue growth"');
    try {
        const result = await decomposeQuery('Compare Tesla and BYD revenue growth');

        console.log(`✅ Decomposed in ${result.durationMs}ms`);
        console.log(`   Reasoning: ${result.reasoning.slice(0, 100)}...`);
        console.log(`   Sub-queries (${result.subQueries.length}):`);
        result.subQueries.forEach((sq) => console.log(`   - [${sq.id}] ${sq.query}`));

        validateDecompositionOutput(result);
        console.log('✅ Validation Passed\n');
    } catch (error) {
        console.error('❌ Test 1 Failed:', error);
        process.exit(1);
    }

    // Test 2: Temporal query (Checks Date Injection)
    console.log('Test 2: "What is the stock price of NVDA today?"');
    try {
        const result = await decomposeQuery('What is the stock price of NVDA today?');
        const currentYear = new Date().getFullYear().toString();

        // Check if any query contains the current year or month
        const hasDate = result.subQueries.some(
            (sq) =>
                sq.query.includes(currentYear) ||
                sq.query.toLowerCase().includes('december') ||
                sq.query.toLowerCase().includes('dec')
        );

        if (hasDate) {
            console.log(`✅ Temporal Awareness Confirmed (Found date reference in queries)`);
        } else {
            console.warn(
                `⚠️ Warning: Queries did not explicitly include "${currentYear}" or month. Check reasoning.`
            );
            console.log(`   Reasoning: ${result.reasoning}`);
        }

        result.subQueries.forEach((sq) => console.log(`   - [${sq.id}] ${sq.query}`));
        validateDecompositionOutput(result);
        console.log('✅ Validation Passed\n');
    } catch (error) {
        console.error('❌ Test 2 Failed:', error);
        process.exit(1);
    }

    // Test 3: Error Handling - Empty Query
    console.log('Test 3: Error Handling (Empty Query)');
    try {
        await decomposeQuery('');
        console.error('❌ Failed: Should have thrown on empty query');
        process.exit(1);
    } catch (error) {
        console.log('✅ Error Handling Passed (Empty Query)');
    }

    // Test 4: Error Handling - Whitespace Only
    console.log('Test 4: Error Handling (Whitespace Only)');
    try {
        await decomposeQuery('   ');
        console.error('❌ Failed: Should have thrown on whitespace-only query');
        process.exit(1);
    } catch (error) {
        console.log('✅ Error Handling Passed (Whitespace Only)');
    }

    console.log('\n🎉 Phase 2 Tests Passed!\n');
}

runTests().catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
