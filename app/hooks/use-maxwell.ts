/**
 * useMaxwell Hook
 *
 * React hook for interacting with the Maxwell verified search agent API.
 * Handles SSE streaming, state management, and store integration.
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
    phaseDurations: PhaseDurations;
    error: string | null;
}

const initialState: MaxwellUIState = {
    phase: 'idle',
    subQueries: [],
    sources: [],
    searchMetadata: [],
    verification: null,
    verificationProgress: null,
    phaseDurations: {},
    error: null,
};

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseMaxwellReturn extends MaxwellUIState {
    isLoading: boolean;
    search: (query: string) => Promise<void>;
    reset: () => void;
    abort: () => void;
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
        score: undefined, // MaxwellSource doesn't have score
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
        case 'complete':
            return 'complete';
        case 'error':
            return 'complete';
        default:
            return 'relaxed';
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
    const { addMessage, updateMessage, setAgentState, activeSessionId, getActiveSession } = useChatStore();

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

    const handleEvent = useCallback((event: MaxwellEvent, sessionId: string) => {
        switch (event.type) {
            case 'phase-start':
                setState((prev) => ({
                    ...prev,
                    phase: event.phase as ExecutionPhase,
                    verificationProgress:
                        event.phase === 'verification'
                            ? { current: 0, total: 0, status: 'Starting verification...' }
                            : prev.verificationProgress,
                }));
                setAgentState(mapPhaseToAgentState(event.phase as ExecutionPhase), sessionId);
                break;

            case 'phase-complete':
                handlePhaseComplete(event, sessionId);

                // If search is complete, update the chat message with sources immediately
                if (event.phase === 'search' && agentMessageIdRef.current) {
                    const session = getActiveSession();
                    const message = session?.messages.find((m) => m.id === agentMessageIdRef.current);
                    const currentContent = message?.content || '';
                    const phaseData = event.data as { sources?: MaxwellSource[] };
                    const sources = (phaseData.sources || []).map(mapMaxwellSourceToSource);

                    updateMessage(agentMessageIdRef.current, currentContent, sources, sessionId);
                }
                break;

            case 'synthesis-chunk':
                // Update the agent message in the store with streaming content
                if (agentMessageIdRef.current) {
                    // Get current content and append chunk
                    const session = getActiveSession();
                    const message = session?.messages.find((m) => m.id === agentMessageIdRef.current);
                    const currentContent = message?.content || '';
                    updateMessage(agentMessageIdRef.current, currentContent + event.content, undefined, sessionId);
                }
                break;

            case 'verification-progress':
                setState((prev) => ({
                    ...prev,
                    verificationProgress: event.data,
                }));
                break;

            case 'complete':
                setState((prev) => ({
                    ...prev,
                    phase: 'complete',
                    verificationProgress: null,
                    phaseDurations: {
                        ...prev.phaseDurations,
                        total: event.data.totalDurationMs,
                    },
                }));
                setAgentState('complete', sessionId);

                // Final update with sources
                if (agentMessageIdRef.current && event.data.sources) {
                    const baseSources = event.data.sources.map(mapMaxwellSourceToSource);
                    updateMessage(agentMessageIdRef.current, event.data.answer, baseSources, sessionId);
                }
                break;

            case 'error':
                setState((prev) => ({
                    ...prev,
                    phase: 'error',
                    error: event.message,
                }));
                setAgentState('complete', sessionId);
                break;
        }
    }, [getActiveSession, setAgentState, updateMessage]);

    const handlePhaseComplete = useCallback(
        (event: MaxwellEvent & { type: 'phase-complete' }, sessionId: string) => {
            const { phase, data } = event;
            const phaseData = data as Record<string, unknown>;

            setState((prev) => {
                const updates: Partial<MaxwellUIState> = {};

                switch (phase) {
                    case 'decomposition':
                        updates.subQueries = (phaseData.subQueries as SubQuery[]) || [];
                        updates.phaseDurations = {
                            ...prev.phaseDurations,
                            decomposition: phaseData.durationMs as number,
                        };
                        break;

                    case 'search':
                        updates.sources = (phaseData.sources as MaxwellSource[]) || [];
                        updates.searchMetadata = (phaseData.searchMetadata as SearchMetadata[]) || [];
                        updates.phaseDurations = {
                            ...prev.phaseDurations,
                            search: phaseData.durationMs as number,
                        };
                        break;

                    case 'synthesis':
                        // Answer is already streamed in, just store duration
                        updates.phaseDurations = {
                            ...prev.phaseDurations,
                            synthesis: phaseData.durationMs as number,
                        };
                        break;

                    case 'verification':
                        updates.verification = phaseData as unknown as VerificationOutput;
                        updates.phaseDurations = {
                            ...prev.phaseDurations,
                            verification: phaseData.durationMs as number,
                        };
                        break;
                }

                return { ...prev, ...updates };
            });
        },
        []
    );

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

            // Capture session ID
            const sessionId = activeSessionId;

            // Reset and start
            reset();
            setIsLoading(true);

            abortControllerRef.current = new AbortController();

            try {
                // 1. Add user message to shared store
                addMessage(query, 'user', false, sessionId);

                // 2. Set initial agent state
                setAgentState('thinking', sessionId);

                // 3. Create placeholder agent message
                const agentMessageId = addMessage('', 'agent', false, sessionId);
                agentMessageIdRef.current = agentMessageId;

                // 4. Make request to Maxwell API
                const response = await fetch('/api/maxwell', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query }),
                    signal: abortControllerRef.current.signal,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}`);
                }

                // 5. Stream SSE response
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
                                const event: MaxwellEvent = JSON.parse(data);
                                handleEvent(event, sessionId);
                            } catch (parseError) {
                                console.warn('[useMaxwell] SSE Parse Error:', parseError);
                            }
                        }
                    }
                }
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
            } finally {
                setIsLoading(false);
                abortControllerRef.current = null;
            }
        },
        [activeSessionId, reset, addMessage, setAgentState, handleEvent]
    );

    return { ...state, isLoading, search, reset, abort };
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
        complete: { label: 'Complete', description: 'Search finished' },
        error: { label: 'Error', description: 'Something went wrong' },
    };

    const info = phaseInfo[phase] || phaseInfo.idle;
    const isActive = !['idle', 'complete', 'error'].includes(phase);
    const isComplete = phase === 'complete';

    return { ...info, isActive, isComplete };
}
