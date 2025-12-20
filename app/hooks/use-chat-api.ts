'use client';

import { useState, useCallback, useRef } from 'react';
import { useChatStore } from '../store';
import type { Source, DebugStep } from '../types';
import { DEFAULT_MODEL } from '../lib/models';

// Must match the delimiter in route.ts
const SOURCES_DELIMITER = '\n\n---SOURCES_JSON---\n';
const DEBUG_DELIMITER = '\n\n---DEBUG_JSON---\n';

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
 * Parse content to extract sources and debug steps
 */
function parseStreamContent(text: string): { cleanText: string; sources: Source[]; debugSteps: DebugStep[] } {
    let cleanText = text;
    let sources: Source[] = [];
    const debugSteps: DebugStep[] = [];

    // 1. Extract Sources (at the end)
    const sourcesSplit = cleanText.split(SOURCES_DELIMITER);
    if (sourcesSplit.length > 1) {
        cleanText = sourcesSplit[0]; // Remove sources part from text
        try {
            // Only try to parse if we have content after the delimiter
            if (sourcesSplit[1].trim()) {
                sources = JSON.parse(sourcesSplit[1]) as Source[];
            }
        } catch (error) {
            console.error('[useChatApi] Failed to parse sources:', error);
        }
    }

    // 2. Extract Debug Steps (interspersed)
    // Regex to match: DELIMITER + (content) + DELIMITER
    // We use [\s\S]*? for non-greedy multiline match
    const debugRegex = new RegExp(`${DEBUG_DELIMITER}([\\s\\S]*?)${DEBUG_DELIMITER}`, 'g');
    
    let match;
    while ((match = debugRegex.exec(text)) !== null) {
        try {
            const step = JSON.parse(match[1]);
            // Avoid duplicates if parsing same text multiple times (though we rebuild array each time)
            if (!debugSteps.find(s => s.id === step.id)) {
                debugSteps.push(step);
            }
        } catch (error) {
            console.error('[useChatApi] Failed to parse debug step:', error);
        }
    }

    // Remove all debug blocks from cleanText
    cleanText = cleanText.replace(debugRegex, '');

    // 3. Handle partial debug blocks at the end of the stream (to prevent flashing raw protocol text)
    // If text ends with start of delimiter, trim it
    const partialStart = DEBUG_DELIMITER.substring(0, 10); // Check first few chars
    const lastIndex = cleanText.lastIndexOf(partialStart);
    if (lastIndex !== -1 && lastIndex > cleanText.length - 50) { // Only if near end
         // Check if it actually matches the start of the full delimiter
         if (DEBUG_DELIMITER.startsWith(cleanText.substring(lastIndex))) {
             cleanText = cleanText.substring(0, lastIndex);
         }
    }

    return { cleanText, sources, debugSteps };
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
                // Parse content to get clean text and debug steps
                const { cleanText, debugSteps } = parseStreamContent(accumulatedText);

                // Update message every few chunks for performance
                if (updateCount % 3 === 0) {
                    updateMessage(agentMessageId, cleanText, undefined, sessionId, debugSteps);
                }
            }

            // 7. Parse sources from the complete response
            const { cleanText: finalContent, sources, debugSteps } = parseStreamContent(accumulatedText);

            // Final update with sources and debug steps
            updateMessage(agentMessageId, finalContent, sources, sessionId, debugSteps);
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
