'use client';

import { useState, useCallback, useRef } from 'react';
import { useChatStore } from '../store';
import type { Source } from '../types';
import { DEFAULT_MODEL } from '../lib/models';

// Must match the delimiter in route.ts
const SOURCES_DELIMITER = '\n\n---SOURCES_JSON---\n';

interface UseChatApiOptions {
    model?: string;
}

interface UseChatApiReturn {
    sendMessage: (content: string) => Promise<void>;
    isStreaming: boolean;
    error: string | null;
    currentModel: string;
    setModel: (model: string) => void;
}

/**
 * Parse sources JSON from the end of the stream
 */
function parseSourcesFromText(text: string): { content: string; sources: Source[] } {
    const delimiterIndex = text.indexOf(SOURCES_DELIMITER);

    if (delimiterIndex === -1) {
        return { content: text, sources: [] };
    }

    const content = text.substring(0, delimiterIndex);
    const sourcesJson = text.substring(delimiterIndex + SOURCES_DELIMITER.length);

    try {
        const sources = JSON.parse(sourcesJson) as Source[];
        console.log('[useChatApi] Parsed sources:', sources.length);
        return { content, sources };
    } catch (error) {
        console.error('[useChatApi] Failed to parse sources:', error);
        return { content: text, sources: [] };
    }
}

/**
 * Custom hook for chat API integration
 * 
 * Handles:
 * - Sending messages to /api/chat
 * - Streaming responses with ReadableStream
 * - Updating Zustand store with streamed content
 * - Extracting sources from response
 * - Agent state transitions
 */
export function useChatApi(options: UseChatApiOptions = {}): UseChatApiReturn {
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentModel, setCurrentModel] = useState(options.model || DEFAULT_MODEL);

    // Get store actions
    const { addMessage, updateMessage, setAgentState, getActiveSession, activeSessionId } = useChatStore();

    // Abort controller ref for cancellation
    const abortControllerRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(async (content: string) => {
        if (!activeSessionId) {
            setError('No active session');
            return;
        }

        // Capture session ID at start (in case user switches during request)
        const sessionId = activeSessionId;

        setError(null);
        setIsStreaming(true);

        // Cancel any existing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            // 1. Add user message
            addMessage(content, 'user', false, sessionId);

            // 2. Set initial state
            setAgentState('thinking', sessionId);

            // 3. Get conversation history for context
            const session = getActiveSession();
            const messages = session?.messages.map(m => ({
                role: m.role === 'agent' ? 'assistant' : 'user',
                content: m.content,
            })) || [];

            // Add the new user message
            messages.push({ role: 'user', content });

            // 4. Make API request
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages,
                    model: currentModel,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API error: ${response.status}`);
            }

            // 5. Create placeholder agent message
            setAgentState('orchestrating', sessionId);
            const agentMessageId = addMessage('', 'agent', false, sessionId);

            // 6. Stream the response
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let accumulatedText = '';
            let updateCount = 0;

            setAgentState('synthesizing', sessionId);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulatedText += chunk;
                updateCount++;

                // Don't show the sources delimiter in the UI during streaming
                const displayText = accumulatedText.split(SOURCES_DELIMITER)[0];

                // Update message every few chunks for performance
                if (updateCount % 3 === 0) {
                    updateMessage(agentMessageId, displayText, undefined, sessionId);
                }
            }

            // 7. Parse sources from the complete response
            const { content: finalContent, sources } = parseSourcesFromText(accumulatedText);

            // Final update with sources
            updateMessage(agentMessageId, finalContent, sources, sessionId);
            console.log('[useChatApi] Final update with sources:', sources.length);

            // 8. Set complete state
            setAgentState('complete', sessionId);

        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                // Request was cancelled, not an error
                return;
            }

            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            console.error('[useChatApi] Error:', err);

            // Add error message to chat
            addMessage(`Sorry, I encountered an error: ${errorMessage}`, 'agent', false, sessionId);
            setAgentState('complete', sessionId);
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    }, [activeSessionId, currentModel, addMessage, updateMessage, setAgentState, getActiveSession]);

    const setModel = useCallback((model: string) => {
        setCurrentModel(model);
    }, []);

    return {
        sendMessage,
        isStreaming,
        error,
        currentModel,
        setModel,
    };
}
