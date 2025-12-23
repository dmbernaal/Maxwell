/**
 * useMaxwell Hook
 *
 * React hook for interacting with the Maxwell verified search agent API.
 * Handles SSE streaming, state management, and store integration.
 *
 * ARCHITECTURE: Multi-endpoint orchestration
 * Instead of a single long-running request, this hook orchestrates calls to:
 * 1. /api/maxwell/decompose - Query decomposition
 * 2. /api/maxwell/search - Parallel search + pre-embedding
 * 3. /api/maxwell/synthesize - Answer synthesis (SSE streaming)
 * 4. /api/maxwell/verify - Claim verification (SSE streaming)
 * 5. /api/maxwell/adjudicate - Final verdict (SSE streaming)
 *
 * This architecture avoids Vercel's 60s timeout by splitting the pipeline.
 *
 * Uses the SHARED store (useChatStore) for message persistence,
 * but manages Maxwell-specific state (phases, verification) locally.
 *
 * @module hooks/use-maxwell
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useChatStore } from '../store';
import type { Source } from '../types';
import type {
    MaxwellSource,
    SubQuery,
    SearchMetadata,
    VerificationOutput,
    MaxwellEvent,
    ExecutionPhase,
    PhaseDurations,
} from '../lib/maxwell/types';
import type { ExecutionConfig } from '../lib/maxwell/configFactory';
import type {
    DecomposeResponse,
    SearchResponse,
} from '../lib/maxwell/api-types';

// ============================================
// STATE TYPES
// ============================================

export interface VerificationProgress {
    current: number;
    total: number;
    status: string;
}

/**
 * Extended Maxwell state with UI-specific fields.
 */
export interface MaxwellUIState {
    phase: ExecutionPhase;
    subQueries: SubQuery[];
    sources: MaxwellSource[];
    searchMetadata: SearchMetadata[];
    verification: VerificationOutput | null;
    verificationProgress: VerificationProgress | null;
    adjudication: string | null;
    phaseDurations: PhaseDurations;
    phaseStartTimes: Record<string, number>;
    events: MaxwellEvent[];
    error: string | null;
    reasoning?: string;
    config?: ExecutionConfig;
}

const initialState: MaxwellUIState = {
    phase: 'idle',
    subQueries: [],
    sources: [],
    searchMetadata: [],
    verification: null,
    verificationProgress: null,
    adjudication: null,
    phaseDurations: {},
    phaseStartTimes: {},
    events: [],
    error: null,
    reasoning: undefined,
    config: undefined,
};

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseMaxwellReturn extends MaxwellUIState {
    isLoading: boolean;
    search: (query: string) => Promise<void>;
    reset: () => void;
    abort: () => void;
    hydrate: (state: MaxwellUIState) => void;
}

// ============================================
// HELPERS
// ============================================

/**
 * Maps MaxwellSource to base Source for store compatibility.
 */
function mapMaxwellSourceToSource(maxwellSource: MaxwellSource): Source {
    return {
        title: maxwellSource.title,
        url: maxwellSource.url,
        content: maxwellSource.snippet,
        score: undefined,
    };
}

/**
 * Maps ExecutionPhase to AgentState for store compatibility.
 */
function mapPhaseToAgentState(phase: ExecutionPhase): 'relaxed' | 'thinking' | 'orchestrating' | 'synthesizing' | 'complete' {
    switch (phase) {
        case 'idle':
            return 'relaxed';
        case 'decomposition':
            return 'thinking';
        case 'search':
            return 'orchestrating';
        case 'synthesis':
            return 'synthesizing';
        case 'verification':
        case 'adjudication':
            return 'thinking';
        case 'complete':
        case 'error':
            return 'complete';
        default:
            return 'relaxed';
    }
}

/**
 * Parse SSE stream and yield events.
 */
async function* parseSSEStream(response: Response): AsyncGenerator<any> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;

                try {
                    yield JSON.parse(data);
                } catch (parseError) {
                    console.warn('[useMaxwell] SSE Parse Error:', parseError);
                }
            }
        }
    }
}

// ============================================
// MAIN HOOK
// ============================================

export function useMaxwell(): UseMaxwellReturn {
    const [state, setState] = useState<MaxwellUIState>(initialState);
    const [isLoading, setIsLoading] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const agentMessageIdRef = useRef<string | null>(null);

    // Shared store integration
    const activeSessionId = useChatStore(s => s.activeSessionId);
    const addMessage = useChatStore(s => s.addMessage);
    const updateMessage = useChatStore(s => s.updateMessage);
    const setAgentState = useChatStore(s => s.setAgentState);
    const getActiveSession = useChatStore(s => s.getActiveSession);

    const reset = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setState(initialState);
        setIsLoading(false);
        agentMessageIdRef.current = null;
    }, []);

    const abort = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
    }, []);

    const hydrate = useCallback((maxwellState: MaxwellUIState) => {
        setState(maxwellState);
        setIsLoading(maxwellState.phase !== 'idle' && maxwellState.phase !== 'complete' && maxwellState.phase !== 'error');
    }, []);

    /**
     * Adds an event to the event log.
     */
    const logEvent = useCallback((event: MaxwellEvent) => {
        setState((prev) => ({
            ...prev,
            events: [...prev.events, event].slice(-100)
        }));
    }, []);

    /**
     * Updates phase and notifies store.
     */
    const setPhase = useCallback((phase: ExecutionPhase, sessionId: string) => {
        setState((prev) => ({
            ...prev,
            phase,
            phaseStartTimes: {
                ...prev.phaseStartTimes,
                [phase]: Date.now(),
            },
            verificationProgress: phase === 'verification'
                ? { current: 0, total: 0, status: 'Starting verification...' }
                : prev.verificationProgress,
        }));

        setAgentState(mapPhaseToAgentState(phase), sessionId);

        // Log phase-start event
        logEvent({ type: 'phase-start', phase: phase as any });

        // Update message with phase for UI sync
        if (agentMessageIdRef.current && (phase === 'verification' || phase === 'adjudication')) {
            const session = getActiveSession();
            const message = session?.messages.find((m) => m.id === agentMessageIdRef.current);
            if (message) {
                updateMessage(
                    agentMessageIdRef.current,
                    message.content,
                    undefined,
                    sessionId,
                    undefined,
                    { phase }
                );
            }
        }
    }, [setAgentState, logEvent, getActiveSession, updateMessage]);

    /**
     * Main search function - orchestrates all 5 phases.
     */
    const search = useCallback(
        async (query: string) => {
            if (!activeSessionId) {
                setState((prev) => ({
                    ...prev,
                    phase: 'error',
                    error: 'No active session',
                }));
                return;
            }

            const sessionId = activeSessionId;
            reset();
            setIsLoading(true);
            abortControllerRef.current = new AbortController();

            try {
                // Add user message to store
                addMessage(query, 'user', false, sessionId);
                setAgentState('thinking', sessionId);

                // Create placeholder agent message
                const agentMessageId = addMessage('', 'agent', false, sessionId);
                agentMessageIdRef.current = agentMessageId;

                const overallStart = Date.now();

                // ═══════════════════════════════════════════════════════════
                // PHASE 1: DECOMPOSITION
                // ═══════════════════════════════════════════════════════════
                setPhase('decomposition', sessionId);

                const decomposeRes = await fetch('/api/maxwell/decompose', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query }),
                    signal: abortControllerRef.current.signal,
                });

                if (!decomposeRes.ok) {
                    const errorData = await decomposeRes.json().catch(() => ({}));
                    throw new Error(errorData.error || `Decomposition failed: HTTP ${decomposeRes.status}`);
                }

                const decomposition: DecomposeResponse = await decomposeRes.json();

                setState((prev) => ({
                    ...prev,
                    subQueries: decomposition.subQueries,
                    config: decomposition.config,
                    reasoning: decomposition.reasoning,
                    phaseDurations: {
                        ...prev.phaseDurations,
                        decomposition: decomposition.durationMs,
                    },
                }));

                // Log decomposition events
                logEvent({
                    type: 'phase-complete',
                    phase: 'decomposition',
                    data: decomposition,
                });
                logEvent({
                    type: 'planning-complete',
                    config: decomposition.config,
                });

                // ═══════════════════════════════════════════════════════════
                // PHASE 2: SEARCH (with pre-embedding)
                // ═══════════════════════════════════════════════════════════
                setPhase('search', sessionId);

                const searchRes = await fetch('/api/maxwell/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subQueries: decomposition.subQueries,
                        config: decomposition.config,
                    }),
                    signal: abortControllerRef.current.signal,
                });

                if (!searchRes.ok) {
                    const errorData = await searchRes.json().catch(() => ({}));
                    throw new Error(errorData.error || `Search failed: HTTP ${searchRes.status}`);
                }

                const searchOutput: SearchResponse = await searchRes.json();

                // Store blob URL for verification phase
                // Embeddings are stored in Vercel Blob to avoid 4.5MB payload limit
                const evidenceBlobUrl = searchOutput.evidenceBlobUrl;

                console.log('[useMaxwell] Evidence stored in Blob:', {
                    url: evidenceBlobUrl.startsWith('data:') ? '[data URL - local]' : evidenceBlobUrl,
                    passageCount: searchOutput.evidenceStats.passageCount,
                    embeddingCount: searchOutput.evidenceStats.embeddingCount,
                });

                setState((prev) => ({
                    ...prev,
                    sources: searchOutput.sources,
                    searchMetadata: searchOutput.searchMetadata,
                    phaseDurations: {
                        ...prev.phaseDurations,
                        search: searchOutput.durationMs,
                    },
                }));

                // Update message with sources
                if (agentMessageIdRef.current) {
                    const baseSources = searchOutput.sources.map(mapMaxwellSourceToSource);
                    updateMessage(agentMessageIdRef.current, '', baseSources, sessionId);
                }

                logEvent({
                    type: 'phase-complete',
                    phase: 'search',
                    data: {
                        sources: searchOutput.sources,
                        searchMetadata: searchOutput.searchMetadata,
                        totalSources: searchOutput.sources.length,
                        durationMs: searchOutput.durationMs,
                    },
                });

                // ═══════════════════════════════════════════════════════════
                // PHASE 3: SYNTHESIS (SSE streaming)
                // ═══════════════════════════════════════════════════════════
                setPhase('synthesis', sessionId);

                const synthesizeRes = await fetch('/api/maxwell/synthesize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query,
                        sources: searchOutput.sources,
                        synthesisModel: decomposition.config.synthesisModel,
                    }),
                    signal: abortControllerRef.current.signal,
                });

                if (!synthesizeRes.ok) {
                    const errorData = await synthesizeRes.json().catch(() => ({}));
                    throw new Error(errorData.error || `Synthesis failed: HTTP ${synthesizeRes.status}`);
                }

                let answer = '';
                let sourcesUsed: string[] = [];
                let synthesisDuration = 0;

                for await (const event of parseSSEStream(synthesizeRes)) {
                    if (abortControllerRef.current?.signal.aborted) break;

                    if (event.type === 'synthesis-chunk') {
                        // Stream chunk to message
                        if (agentMessageIdRef.current) {
                            const session = getActiveSession();
                            const message = session?.messages.find((m) => m.id === agentMessageIdRef.current);
                            const currentContent = message?.content || '';
                            updateMessage(agentMessageIdRef.current, currentContent + event.content, undefined, sessionId);
                        }
                        logEvent({ type: 'synthesis-chunk', content: event.content });
                    } else if (event.type === 'synthesis-complete') {
                        answer = event.answer;
                        sourcesUsed = event.sourcesUsed;
                        synthesisDuration = event.durationMs;
                    } else if (event.type === 'error') {
                        throw new Error(event.message);
                    }
                }

                setState((prev) => ({
                    ...prev,
                    phaseDurations: {
                        ...prev.phaseDurations,
                        synthesis: synthesisDuration,
                    },
                }));

                logEvent({
                    type: 'phase-complete',
                    phase: 'synthesis',
                    data: { answer, sourcesUsed, durationMs: synthesisDuration },
                });

                // ═══════════════════════════════════════════════════════════
                // PHASE 4: VERIFICATION (SSE streaming)
                // ═══════════════════════════════════════════════════════════
                setPhase('verification', sessionId);

                const verifyRes = await fetch('/api/maxwell/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        answer,
                        sources: searchOutput.sources,
                        evidenceBlobUrl, // URL to fetch embeddings from Vercel Blob
                        maxClaimsToVerify: decomposition.config.maxClaimsToVerify,
                        verificationConcurrency: decomposition.config.verificationConcurrency,
                    }),
                    signal: abortControllerRef.current.signal,
                });

                if (!verifyRes.ok) {
                    const errorData = await verifyRes.json().catch(() => ({}));
                    throw new Error(errorData.error || `Verification failed: HTTP ${verifyRes.status}`);
                }

                let verification: VerificationOutput | null = null;

                for await (const event of parseSSEStream(verifyRes)) {
                    if (abortControllerRef.current?.signal.aborted) break;

                    if (event.type === 'verification-progress') {
                        setState((prev) => ({
                            ...prev,
                            verificationProgress: event.data,
                        }));
                        logEvent({ type: 'verification-progress', data: event.data });
                    } else if (event.type === 'verification-complete') {
                        verification = event.data;
                    } else if (event.type === 'error') {
                        throw new Error(event.message);
                    }
                }

                if (!verification) {
                    throw new Error('Verification did not complete');
                }

                setState((prev) => ({
                    ...prev,
                    verification,
                    phaseDurations: {
                        ...prev.phaseDurations,
                        verification: verification!.durationMs,
                    },
                }));

                // Update message with verification confidence
                if (agentMessageIdRef.current) {
                    const session = getActiveSession();
                    const message = session?.messages.find((m) => m.id === agentMessageIdRef.current);
                    if (message) {
                        updateMessage(
                            agentMessageIdRef.current,
                            message.content,
                            undefined,
                            sessionId,
                            undefined,
                            {
                                phase: 'adjudication',
                                verification: { overallConfidence: verification.overallConfidence }
                            }
                        );
                    }
                }

                logEvent({
                    type: 'phase-complete',
                    phase: 'verification',
                    data: verification,
                });

                // ═══════════════════════════════════════════════════════════
                // PHASE 5: ADJUDICATION (SSE streaming)
                // ═══════════════════════════════════════════════════════════
                setPhase('adjudication', sessionId);

                const adjudicateRes = await fetch('/api/maxwell/adjudicate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query,
                        answer,
                        verification,
                    }),
                    signal: abortControllerRef.current.signal,
                });

                if (!adjudicateRes.ok) {
                    const errorData = await adjudicateRes.json().catch(() => ({}));
                    throw new Error(errorData.error || `Adjudication failed: HTTP ${adjudicateRes.status}`);
                }

                let adjudicationText = '';
                let adjudicationDuration = 0;

                for await (const event of parseSSEStream(adjudicateRes)) {
                    if (abortControllerRef.current?.signal.aborted) break;

                    if (event.type === 'adjudication-chunk') {
                        adjudicationText += event.content;
                        setState((prev) => ({
                            ...prev,
                            adjudication: adjudicationText,
                        }));

                        // Stream to store for live UI updates
                        if (agentMessageIdRef.current) {
                            const session = getActiveSession();
                            const message = session?.messages.find((m) => m.id === agentMessageIdRef.current);
                            if (message) {
                                updateMessage(
                                    agentMessageIdRef.current,
                                    message.content,
                                    undefined,
                                    sessionId,
                                    undefined,
                                    {
                                        phase: 'adjudication',
                                        adjudication: adjudicationText,
                                        verification: message.maxwellState?.verification
                                    }
                                );
                            }
                        }

                        logEvent({ type: 'adjudication-chunk', content: event.content });
                    } else if (event.type === 'adjudication-complete') {
                        adjudicationDuration = event.durationMs;
                    } else if (event.type === 'error') {
                        throw new Error(event.message);
                    }
                }

                setState((prev) => ({
                    ...prev,
                    phaseDurations: {
                        ...prev.phaseDurations,
                        adjudication: adjudicationDuration,
                    },
                }));

                logEvent({
                    type: 'phase-complete',
                    phase: 'adjudication',
                    data: { text: adjudicationText, durationMs: adjudicationDuration },
                });

                // ═══════════════════════════════════════════════════════════
                // COMPLETE
                // ═══════════════════════════════════════════════════════════
                const totalDurationMs = Date.now() - overallStart;

                const finalState: MaxwellUIState = {
                    phase: 'complete',
                    subQueries: decomposition.subQueries,
                    sources: searchOutput.sources,
                    searchMetadata: searchOutput.searchMetadata,
                    verification,
                    verificationProgress: null,
                    adjudication: adjudicationText || null,
                    phaseDurations: {
                        decomposition: decomposition.durationMs,
                        search: searchOutput.durationMs,
                        synthesis: synthesisDuration,
                        verification: verification.durationMs,
                        adjudication: adjudicationDuration,
                        total: totalDurationMs,
                    },
                    phaseStartTimes: {},
                    events: [],
                    error: null,
                    reasoning: decomposition.reasoning,
                    config: decomposition.config,
                };

                setState((prev) => ({
                    ...prev,
                    phase: 'complete',
                    verificationProgress: null,
                    phaseDurations: finalState.phaseDurations,
                }));

                // Final update with full state persistence
                if (agentMessageIdRef.current) {
                    const baseSources = searchOutput.sources.map(mapMaxwellSourceToSource);
                    updateMessage(
                        agentMessageIdRef.current,
                        answer,
                        baseSources,
                        sessionId,
                        undefined,
                        finalState
                    );
                }

                setAgentState('complete', sessionId);

                logEvent({
                    type: 'complete',
                    data: {
                        answer,
                        sources: searchOutput.sources,
                        verification,
                        adjudication: adjudicationText || null,
                        phases: {
                            decomposition: { status: 'complete', durationMs: decomposition.durationMs },
                            search: { status: 'complete', durationMs: searchOutput.durationMs },
                            synthesis: { status: 'complete', durationMs: synthesisDuration },
                            verification: { status: 'complete', durationMs: verification.durationMs },
                            adjudication: { status: 'complete', durationMs: adjudicationDuration },
                        },
                        totalDurationMs,
                    },
                });

            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') return;

                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                setState((prev) => ({
                    ...prev,
                    phase: 'error',
                    error: errorMessage,
                }));

                // Add error message to chat
                addMessage(`Sorry, I encountered an error: ${errorMessage}`, 'agent', false, sessionId);
                setAgentState('complete', sessionId);

                logEvent({ type: 'error', message: errorMessage });
            } finally {
                setIsLoading(false);
                abortControllerRef.current = null;
            }
        },
        [activeSessionId, reset, addMessage, setAgentState, getActiveSession, updateMessage, setPhase, logEvent]
    );

    return { ...state, isLoading, search, reset, abort, hydrate };
}

// ============================================
// UTILITY HOOK
// ============================================

/**
 * Utility hook to get human-readable phase info.
 */
export function usePhaseInfo(phase: ExecutionPhase): {
    label: string;
    description: string;
    isActive: boolean;
    isComplete: boolean;
} {
    const phaseInfo: Record<ExecutionPhase, { label: string; description: string }> = {
        idle: { label: 'Ready', description: 'Enter a query to begin' },
        decomposition: { label: 'Analyzing', description: 'Breaking down your query...' },
        search: { label: 'Searching', description: 'Finding sources...' },
        synthesis: { label: 'Synthesizing', description: 'Generating answer...' },
        verification: { label: 'Verifying', description: 'Checking claims...' },
        adjudication: { label: 'Adjudicating', description: 'Finalizing verdict...' },
        complete: { label: 'Complete', description: 'Search finished' },
        error: { label: 'Error', description: 'Something went wrong' },
    };

    const info = phaseInfo[phase] || phaseInfo.idle;
    const isActive = !['idle', 'complete', 'error'].includes(phase);
    const isComplete = phase === 'complete';

    return { ...info, isActive, isComplete };
}
