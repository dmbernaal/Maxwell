/**
 * Maxwell Search Agent - Main Orchestrator
 *
 * Coordinates all phases: Decomposition → Search → Synthesis → Verification.
 * Yields events for real-time UI updates.
 *
 * @module maxwell
 */

import { decomposeQuery } from './decomposer';
import { parallelSearch } from './searcher';
import { synthesize } from './synthesizer';
import { verifyClaims, verifyClaimsStream, prepareEvidence, type PreparedEvidence } from './verifier';
import { adjudicateAnswer } from './adjudicator';

import type {
    MaxwellSource,
    MaxwellEvent,
    MaxwellResponse,
    MaxwellPhases,
} from './types';

// Re-export types for convenience
export * from './types';

// Re-export module functions for consumers
export { decomposeQuery } from './decomposer';
export { parallelSearch } from './searcher';
export { synthesize } from './synthesizer';
export { verifyClaims } from './verifier';
export { adjudicateAnswer } from './adjudicator';

/**
 * Runs the complete Maxwell pipeline.
 * Yields events for every step to power the streaming UI.
 *
 * @param query - The user's search query
 * @yields MaxwellEvent for each phase transition and update
 */
export async function* runMaxwell(query: string): AsyncGenerator<MaxwellEvent> {
    const overallStart = Date.now();

    // State tracking
    let sources: MaxwellSource[] = [];
    let answer = '';

    // Phase tracking for final response
    const phases: MaxwellPhases = {
        decomposition: { status: 'pending' },
        search: { status: 'pending' },
        synthesis: { status: 'pending' },
        verification: { status: 'pending' },
        adjudication: { status: 'pending' },
    };

    try {
        // ═══════════════════════════════════════════════════════════
        // PHASE 1: DECOMPOSITION
        // ═══════════════════════════════════════════════════════════
        yield { type: 'phase-start', phase: 'decomposition' };
        phases.decomposition.status = 'in_progress';

        const decomposition = await decomposeQuery(query);

        phases.decomposition = {
            status: 'complete',
            subQueries: decomposition.subQueries,
            durationMs: decomposition.durationMs,
        };

        yield {
            type: 'phase-complete',
            phase: 'decomposition',
            data: decomposition,
        };

        // ═══════════════════════════════════════════════════════════
        // PHASE 2: PARALLEL SEARCH
        // ═══════════════════════════════════════════════════════════
        yield { type: 'phase-start', phase: 'search' };
        phases.search.status = 'in_progress';

        const searchOutput = await parallelSearch(decomposition.subQueries);

        sources = searchOutput.sources;

        phases.search = {
            status: 'complete',
            totalSources: searchOutput.sources.length,
            searchMetadata: searchOutput.searchMetadata,
            durationMs: searchOutput.durationMs,
        };

        yield {
            type: 'phase-complete',
            phase: 'search',
            data: {
                sources: searchOutput.sources,
                searchMetadata: searchOutput.searchMetadata,
                totalSources: searchOutput.sources.length,
                durationMs: searchOutput.durationMs,
            },
        };

        // ═══════════════════════════════════════════════════════════
        // 🚀 OPTIMIZATION: Start Evidence Prep in BACKGROUND
        // ═══════════════════════════════════════════════════════════
        // We don't await this yet - it runs parallel to Synthesis.
        // This saves ~3-4 seconds by preparing evidence during synthesis.
        const evidencePromise: Promise<PreparedEvidence | null> = prepareEvidence(sources)
            .catch((err) => {
                console.error('[Maxwell] Background evidence prep failed:', err);
                return null; // Handle gracefully, verification will prepare on-demand
            });

        // ═══════════════════════════════════════════════════════════
        // PHASE 3: SYNTHESIS (Streaming)
        // ═══════════════════════════════════════════════════════════
        yield { type: 'phase-start', phase: 'synthesis' };
        phases.synthesis.status = 'in_progress';

        let synthesisDuration = 0;
        let sourcesUsed: string[] = [];

        for await (const event of synthesize(query, sources)) {
            if (event.type === 'chunk') {
                yield { type: 'synthesis-chunk', content: event.content };
            } else if (event.type === 'complete') {
                answer = event.answer;
                sourcesUsed = event.sourcesUsed;
                synthesisDuration = event.durationMs;
            }
        }

        phases.synthesis = {
            status: 'complete',
            durationMs: synthesisDuration,
        };

        yield {
            type: 'phase-complete',
            phase: 'synthesis',
            data: { answer, sourcesUsed, durationMs: synthesisDuration },
        };

        // ═══════════════════════════════════════════════════════════
        // PHASE 4: VERIFICATION
        // ═══════════════════════════════════════════════════════════
        yield { type: 'phase-start', phase: 'verification' };
        phases.verification.status = 'in_progress';

        // 🚀 Await the background evidence prep - should be ready by now!
        // 🚀 Await the background evidence prep - should be ready by now!
        const precomputedEvidence = await evidencePromise;

        let verification: any = null;

        for await (const event of verifyClaimsStream(answer, sources, precomputedEvidence || undefined)) {
            if (event.type === 'progress') {
                yield { type: 'verification-progress', data: event.data };
            } else if (event.type === 'result') {
                verification = event.data;
            }
        }

        phases.verification = {
            status: 'complete',
            claimsExtracted: verification.claims.length,
            claimsVerified: verification.claims.length,
            durationMs: verification.durationMs,
        };

        yield {
            type: 'phase-complete',
            phase: 'verification',
            data: verification,
        };

        // ═══════════════════════════════════════════════════════════
        // PHASE 5: ADJUDICATION
        // ═══════════════════════════════════════════════════════════
        yield { type: 'phase-start', phase: 'adjudication' };
        phases.adjudication.status = 'in_progress';

        let adjudicationText = '';
        const adjudicationStart = Date.now();

        if (verification) {
            for await (const chunk of adjudicateAnswer(query, answer, verification)) {
                adjudicationText += chunk;
                yield { type: 'adjudication-chunk', content: chunk };
            }
        }

        phases.adjudication = {
            status: 'complete',
            durationMs: Date.now() - adjudicationStart,
        };

        yield {
            type: 'phase-complete',
            phase: 'adjudication',
            data: { text: adjudicationText, durationMs: phases.adjudication.durationMs },
        };

        // ═══════════════════════════════════════════════════════════
        // COMPLETE
        // ═══════════════════════════════════════════════════════════
        const response: MaxwellResponse = {
            answer,
            sources,
            verification,
            adjudication: adjudicationText || null,
            phases,
            totalDurationMs: Date.now() - overallStart,
        };

        yield { type: 'complete', data: response };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Maxwell] Pipeline error:', error);

        yield { type: 'error', message: `Pipeline failed: ${message}` };
    }
}

/**
 * Non-streaming wrapper for simple integrations (testing/scripts).
 *
 * @param query - The user's search query
 * @returns Complete MaxwellResponse
 * @throws Error if pipeline fails
 */
export async function runMaxwellComplete(query: string): Promise<MaxwellResponse> {
    let result: MaxwellResponse | null = null;

    for await (const event of runMaxwell(query)) {
        if (event.type === 'complete') {
            result = event.data;
        }
        if (event.type === 'error') {
            throw new Error(event.message);
        }
    }

    if (!result) {
        throw new Error('Maxwell did not complete');
    }

    return result;
}
