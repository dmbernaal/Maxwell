/**
 * Maxwell Synthesizer Test
 *
 * Tests Phase 4 synthesis: streaming, citation extraction, empty source handling.
 * Run with: npx tsx --env-file=.env tests/test-synthesizer.ts
 *
 * Note: This test hits the real OpenRouter API (cost: ~$0.01-0.02 per run)
 */

import {
    synthesize,
    synthesizeComplete,
    countCitations,
    validateSynthesisOutput,
} from '../app/lib/maxwell/synthesizer';
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
    console.log('🧪 Testing Synthesizer...\n');

    const mockSources: MaxwellSource[] = [
        {
            id: 's1',
            title: 'Tesla Annual Report 2024',
            url: 'http://tesla.com/report',
            snippet: 'Tesla reported revenue of $96.8 billion in 2024, representing an 18% increase from the previous year.',
            fromQuery: 'q1',
        },
        {
            id: 's2',
            title: 'BYD Financial Summary',
            url: 'http://byd.com/financials',
            snippet: 'BYD achieved revenue of $80.2 billion in 2024, with electric vehicle sales growing by 35%.',
            fromQuery: 'q2',
        },
    ];

    // Test 1: Real Streaming
    console.log('Test 1: Streaming Response (Real API)');
    try {
        let chunks = 0;
        let finalAnswer = '';
        let sourcesUsed: string[] = [];
        let durationMs = 0;

        for await (const event of synthesize('Compare Tesla and BYD revenue in 2024', mockSources)) {
            if (event.type === 'chunk') {
                chunks++;
                finalAnswer += event.content;
                process.stdout.write('.'); // Visualize stream
            } else if (event.type === 'complete') {
                console.log('\n✅ Stream Complete');
                console.log(`   Duration: ${event.durationMs}ms`);
                console.log(`   Sources Cited: ${event.sourcesUsed.join(', ') || 'none'}`);
                console.log(`   Answer length: ${event.answer.length} chars`);
                sourcesUsed = event.sourcesUsed;
                durationMs = event.durationMs;
            }
        }

        if (chunks > 0 && finalAnswer.length > 0) {
            console.log(`✅ Received ${chunks} chunks`);
        } else {
            console.error('❌ Failed: No content generated');
            process.exit(1);
        }

        // Check that citations were found
        if (sourcesUsed.length > 0) {
            console.log('✅ Citations detected in response');
        } else {
            console.warn('⚠️ Warning: No citations detected (LLM may not have cited sources)');
        }
    } catch (error) {
        console.error('❌ Test 1 Failed:', error);
        process.exit(1);
    }

    // Test 2: Citation Counting
    console.log('\nTest 2: Citation Utilities');
    const textWithCitations = 'Tesla revenue grew to $96.8 billion [1]. BYD achieved $80.2 billion [2]. This represents significant growth [1][2].';
    const citationCount = countCitations(textWithCitations);
    if (citationCount === 4) {
        console.log(`✅ Counted ${citationCount} citations correctly`);
    } else {
        console.error(`❌ Citation counting failed: expected 4, got ${citationCount}`);
        process.exit(1);
    }

    // Test 3: Empty Sources
    console.log('\nTest 3: Empty Sources Handling');
    try {
        const result = await synthesizeComplete('What is quantum computing?', []);
        if (result.answer.includes("couldn't find")) {
            console.log('✅ Empty sources handled gracefully');
            console.log(`   Message: "${result.answer.slice(0, 50)}..."`);
        } else {
            console.error('❌ Failed empty source check');
            process.exit(1);
        }

        validateSynthesisOutput(result);
        console.log('✅ Output validation passed');
    } catch (error) {
        console.error('❌ Test 3 Failed:', error);
        process.exit(1);
    }

    // Test 4: Synthesis Output Validation
    console.log('\nTest 4: Output Structure Validation');
    const validOutput = {
        answer: 'Test answer [1].',
        sourcesUsed: ['s1', 's2'],
        durationMs: 100,
    };
    try {
        validateSynthesisOutput(validOutput);
        console.log('✅ Valid output passes validation');
    } catch (error) {
        console.error('❌ Validation failed on valid output:', error);
        process.exit(1);
    }

    console.log('\n🎉 Phase 4 Tests Passed!\n');
}

runTests().catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
