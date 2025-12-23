/**
 * Maxwell Orchestrator E2E Test
 *
 * Tests the complete pipeline: Decomposition → Search → Synthesis → Verification.
 * Run with: npx tsx --env-file=.env tests/test-orchestrator.ts
 *
 * Note: This test hits real APIs (Tavily search, LLM, embeddings)
 */

import { runMaxwell } from '../app/lib/maxwell';
import { getMaxwellEnvConfig } from '../app/lib/maxwell/env';

// Ensure env is loaded
try {
    getMaxwellEnvConfig();
} catch (error) {
    console.error('❌ Environment check failed:', error);
    process.exit(1);
}

async function runTests(): Promise<void> {
    console.log('🧪 Testing Orchestrator (E2E Pipeline)...\n');

    const query = "What is Tesla's revenue in 2024?";
    console.log(`Query: "${query}"\n`);

    try {
        const phasesHit = new Set<string>();
        let synthesisChunks = 0;
        let totalSources = 0;
        let overallConfidence = 0;
        let totalDuration = 0;

        for await (const event of runMaxwell(query)) {
            switch (event.type) {
                case 'phase-start':
                    console.log(`▶ Phase: ${event.phase}`);
                    phasesHit.add(event.phase);
                    break;

                case 'phase-complete':
                    if (event.phase === 'search' && event.data && typeof event.data === 'object') {
                        const searchData = event.data as { totalSources?: number };
                        if (searchData.totalSources !== undefined) {
                            totalSources = searchData.totalSources;
                            console.log(`   Sources found: ${totalSources}`);
                        }
                    }
                    break;

                case 'synthesis-chunk':
                    synthesisChunks++;
                    process.stdout.write('.'); // Visualize streaming
                    break;

                case 'complete':
                    console.log('\n\n✅ Pipeline Complete');
                    console.log(`   Total Duration: ${event.data.totalDurationMs}ms`);
                    console.log(`   Confidence: ${event.data.verification.overallConfidence}%`);
                    console.log(`   Synthesis Chunks: ${synthesisChunks}`);
                    console.log(`   Sources: ${event.data.sources.length}`);
                    console.log(`   Claims Verified: ${event.data.verification.claims.length}`);

                    overallConfidence = event.data.verification.overallConfidence;
                    totalDuration = event.data.totalDurationMs;

                    // Display summary
                    console.log('\n   Verification Summary:');
                    console.log(`     - Supported: ${event.data.verification.summary.supported}`);
                    console.log(`     - Uncertain: ${event.data.verification.summary.uncertain}`);
                    console.log(`     - Contradicted: ${event.data.verification.summary.contradicted}`);
                    break;

                case 'error':
                    throw new Error(event.message);
            }
        }

        // Assertions
        console.log('\n📊 Assertions:');

        // Check all phases executed
        const expectedPhases = ['decomposition', 'search', 'synthesis', 'verification'];
        const allPhasesHit = expectedPhases.every((p) => phasesHit.has(p));
        if (allPhasesHit) {
            console.log('✅ All 4 phases executed');
        } else {
            const missing = expectedPhases.filter((p) => !phasesHit.has(p));
            console.error(`❌ Missing phases: ${missing.join(', ')}`);
            process.exit(1);
        }

        // Check synthesis produced output
        if (synthesisChunks > 0) {
            console.log(`✅ Synthesis streamed ${synthesisChunks} chunks`);
        } else {
            console.error('❌ No synthesis chunks received');
            process.exit(1);
        }

        // Check sources found
        if (totalSources > 0) {
            console.log(`✅ Search found ${totalSources} sources`);
        } else {
            console.error('❌ No sources found');
            process.exit(1);
        }

        // Check duration is reasonable (< 2 minutes for full pipeline)
        if (totalDuration < 120000) {
            console.log(`✅ Completed in reasonable time (${(totalDuration / 1000).toFixed(1)}s)`);
        } else {
            console.warn(`⚠️ Pipeline took longer than expected (${(totalDuration / 1000).toFixed(1)}s)`);
        }

        console.log('\n🎉 Phase 9 Tests Passed!\n');
    } catch (error) {
        console.error('\n❌ Orchestrator Failed:', error);
        process.exit(1);
    }
}

runTests().catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
