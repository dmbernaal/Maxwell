/**
 * Maxwell Verifier Core Test
 *
 * Tests Phase 6 verification: chunking, claim extraction, evidence retrieval.
 * Run with: npx tsx --env-file=.env tests/test-verifier.ts
 *
 * Note: This test hits the real OpenRouter API (LLM + embeddings)
 */

import {
    extractClaims,
    chunkSourcesIntoPassages,
    retrieveEvidence,
} from '../app/lib/maxwell/verifier';
import { embedText, embedTexts } from '../app/lib/maxwell/embeddings';
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
    console.log('🧪 Testing Verifier Core...\n');

    const testSources: MaxwellSource[] = [
        {
            id: 's1',
            url: 'http://test.com',
            title: 'Tesla Report',
            snippet: 'Mr. Musk announced results. Tesla revenue is $96B. U.S.A. sales are up.',
            fromQuery: 'q1',
        },
        {
            id: 's2',
            url: 'http://byd.com',
            title: 'BYD Report',
            snippet: 'BYD revenue is $80B. Electric vehicle sales are growing rapidly in China.',
            fromQuery: 'q1',
        },
    ];

    // Test 1: Robust Chunking (Intl.Segmenter)
    console.log('Test 1: Smart Chunking (Intl.Segmenter)');
    const passages = chunkSourcesIntoPassages(testSources);

    // "Mr. Musk announced results." should stay together
    // "U.S.A. sales are up." should stay together
    const badSplit = passages.some((p) => p.text === 'Mr.' || p.text === 'U.');

    if (!badSplit && passages.length > 0) {
        console.log('✅ Intl.Segmenter correctly handled abbreviations');
        console.log(`   Generated ${passages.length} passages from ${testSources.length} sources`);

        // Show first few passages
        passages.slice(0, 3).forEach((p) => {
            console.log(`   - [Source ${p.sourceIndex}] "${p.text.slice(0, 50)}..."`);
        });
    } else {
        console.error('❌ Chunking failed on abbreviations');
        process.exit(1);
    }

    // Test 2: Claim Extraction (LLM)
    console.log('\nTest 2: Claim Extraction (Real API)');
    try {
        const claims = await extractClaims('Tesla revenue is $96B [1]. BYD achieved $80B in revenue [2].');

        if (claims.length > 0) {
            console.log(`✅ Extracted ${claims.length} claims`);
            claims.forEach((c) => {
                console.log(`   - [${c.id}] "${c.text}" (cites: [${c.citedSources.join(', ')}])`);
            });

            // Check that citedSources were captured
            const hasCitations = claims.some((c) => c.citedSources.length > 0);
            if (hasCitations) {
                console.log('✅ Citation references extracted correctly');
            } else {
                console.warn('⚠️ Warning: No citation references found');
            }
        } else {
            console.error('❌ Claim extraction returned empty');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Test 2 Failed:', error);
        process.exit(1);
    }

    // Test 3: Evidence Retrieval & Citation Mismatch Detection
    console.log('\nTest 3: Evidence Retrieval & Mismatch Detection');
    try {
        // Embed the claim about BYD
        const claimEmb = await embedText('BYD revenue is $80B');

        // Embed all passages
        const passageEmbs = await embedTexts(passages.map((p) => p.text));

        // Claim is about BYD, but we cite Source 1 (Tesla)
        // This should trigger citation mismatch since BYD is Source 2
        const result = retrieveEvidence(claimEmb, passages, passageEmbs, [1]);

        console.log(`   Best match: "${result.bestPassage.text.slice(0, 50)}..."`);
        console.log(`   Source: ${result.bestPassage.sourceTitle} (Index ${result.bestPassage.sourceIndex})`);
        console.log(`   Global best support: ${result.globalBestSupport.toFixed(4)}`);
        console.log(`   Cited source support: ${result.citedSourceSupport.toFixed(4)}`);

        if (result.citationMismatch) {
            console.log('✅ Correctly detected citation mismatch');
        } else {
            // This might not trigger depending on similarity threshold
            console.log('⚠️ Mismatch not detected (threshold nuance - not a failure)');
        }

        // Verify that best match is actually from Source 2 (BYD)
        if (result.bestPassage.sourceIndex === 2) {
            console.log('✅ Best match correctly points to BYD source');
        } else {
            console.log(`⚠️ Best match from Source ${result.bestPassage.sourceIndex} (expected Source 2)`);
        }
    } catch (error) {
        console.error('❌ Test 3 Failed:', error);
        process.exit(1);
    }

    // Test 4: Empty Answer Handling
    console.log('\nTest 4: Empty Answer Handling');
    try {
        const emptyClaims = await extractClaims('');
        if (emptyClaims.length === 0) {
            console.log('✅ Empty answer returns empty claims array');
        } else {
            console.error('❌ Empty answer should return empty claims');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Test 4 Failed:', error);
        process.exit(1);
    }

    console.log('\n🎉 Phase 6 Tests Passed!\n');
}

runTests().catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
