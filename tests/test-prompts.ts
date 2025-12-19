/**
 * Maxwell Prompts Test
 *
 * Tests Phase 1 prompts: date injection, no truncation, template filling.
 * Run with: npx tsx tests/test-prompts.ts
 */

import {
    formatSourcesForPrompt,
    createSynthesisPrompt,
    createDecompositionPrompt,
    createNLIPrompt,
    createClaimExtractionPrompt,
} from '../app/lib/maxwell/prompts';

import type { MaxwellSource } from '../app/lib/maxwell/types';

console.log('🧪 Testing Prompts...\n');

// Test 1: Date Injection in Decomposition
const decompPrompt = createDecompositionPrompt('test query');
const currentYear = new Date().getFullYear().toString();
if (!decompPrompt.includes(currentYear)) {
    console.error(`❌ Failed: Decomposition prompt missing current year (${currentYear})`);
    process.exit(1);
}
console.log('✅ Date Injection Working (Decomposition)');

// Test 2: Source Formatting (No Truncation Check)
const longSnippet = 'A'.repeat(2000); // Simulate massive snippet
const sources: MaxwellSource[] = [
    {
        id: 's1',
        url: 'http://test.com',
        title: 'Test Source',
        snippet: longSnippet,
        fromQuery: 'q1',
    },
];
const formatted = formatSourcesForPrompt(sources);

if (formatted.length < 2000) {
    console.error('❌ Failed: Source was truncated! We explicitly requested NO truncation.');
    process.exit(1);
}
console.log('✅ No Truncation Working (Full content preserved)');

// Test 3: Synthesis Prompt Construction
const synthPrompt = createSynthesisPrompt(sources, 'test query');
if (!synthPrompt.includes(currentYear)) {
    console.error('❌ Failed: Synthesis prompt missing date');
    process.exit(1);
}
if (!synthPrompt.includes('[1] Test Source')) {
    console.error('❌ Failed: Source listing missing');
    process.exit(1);
}
console.log('✅ Synthesis Prompt Working');

// Test 4: NLI Prompt
const nli = createNLIPrompt('Test Claim', 'Test Evidence');
if (!nli.includes('CLAIM: "Test Claim"') || !nli.includes('EVIDENCE: "Test Evidence"')) {
    console.error('❌ Failed: NLI template filling');
    process.exit(1);
}
console.log('✅ NLI Prompt Working');

// Test 5: Claim Extraction Prompt
const claimPrompt = createClaimExtractionPrompt('This is the answer text.');
if (!claimPrompt.includes('This is the answer text.')) {
    console.error('❌ Failed: Claim extraction template filling');
    process.exit(1);
}
console.log('✅ Claim Extraction Prompt Working');

// Test 6: Empty sources handling
const emptyFormatted = formatSourcesForPrompt([]);
if (emptyFormatted !== 'No sources available.') {
    console.error('❌ Failed: Empty sources handling');
    process.exit(1);
}
console.log('✅ Empty Sources Handling Working');

console.log('\n🎉 Phase 1 Tests Passed!\n');
