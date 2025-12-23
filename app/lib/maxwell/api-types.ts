/**
 * Maxwell API Types
 *
 * Request/Response types for the multi-endpoint architecture.
 * These types define the contract between the client and each API endpoint.
 *
 * @module maxwell/api-types
 */

import type { ExecutionConfig } from './configFactory';
import type {
    SubQuery,
    MaxwellSource,
    SearchMetadata,
    Passage,
    VerificationOutput,
    DecompositionOutput,
} from './types';

// ============================================
// DECOMPOSE ENDPOINT
// ============================================

export interface DecomposeRequest {
    query: string;
}

export interface DecomposeResponse extends DecompositionOutput {
    config: ExecutionConfig;
}

// ============================================
// SEARCH ENDPOINT
// ============================================

export interface SearchRequest {
    subQueries: SubQuery[];
    config: ExecutionConfig;
}

/**
 * Prepared evidence for verification phase.
 * Pre-computing embeddings during search saves ~45s in verification.
 */
export interface PreparedEvidence {
    passages: Passage[];
    /** Base64-encoded embeddings to reduce payload size */
    embeddingsBase64: string;
    /** Original dimensions for decoding */
    embeddingsDimensions: {
        rows: number;
        cols: number;
    };
}

/**
 * Search response with Blob URL for evidence.
 * Embeddings are stored in Vercel Blob to avoid 4.5MB payload limit.
 */
export interface SearchResponse {
    sources: MaxwellSource[];
    searchMetadata: SearchMetadata[];
    /** URL to fetch prepared evidence from Vercel Blob */
    evidenceBlobUrl: string;
    /** Metadata about the stored evidence */
    evidenceStats: {
        passageCount: number;
        embeddingCount: number;
    };
    durationMs: number;
}

// ============================================
// SYNTHESIZE ENDPOINT
// ============================================

export interface SynthesizeRequest {
    query: string;
    sources: MaxwellSource[];
    synthesisModel: string;
}

// Response is SSE stream with synthesis-chunk events
// Final event contains: { answer: string, sourcesUsed: string[], durationMs: number }

// ============================================
// VERIFY ENDPOINT
// ============================================

export interface VerifyRequest {
    answer: string;
    sources: MaxwellSource[];
    /** URL to fetch prepared evidence from Vercel Blob */
    evidenceBlobUrl: string;
    maxClaimsToVerify?: number;
    verificationConcurrency?: number;
}

// Response is SSE stream with verification-progress events
// Final event contains: VerificationOutput

// ============================================
// ADJUDICATE ENDPOINT
// ============================================

export interface AdjudicateRequest {
    query: string;
    answer: string;
    verification: VerificationOutput;
}

// Response is SSE stream with adjudication-chunk events
// Final event contains: { text: string, durationMs: number }

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Encodes a 2D array of embeddings to base64 for efficient transmission.
 */
export function encodeEmbeddings(embeddings: number[][]): { base64: string; rows: number; cols: number } {
    if (embeddings.length === 0) {
        return { base64: '', rows: 0, cols: 0 };
    }

    const rows = embeddings.length;
    const cols = embeddings[0].length;

    // Flatten to Float32Array for efficient binary encoding
    const flat = new Float32Array(rows * cols);
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            flat[i * cols + j] = embeddings[i][j];
        }
    }

    // Convert to base64
    const bytes = new Uint8Array(flat.buffer);
    const base64 = Buffer.from(bytes).toString('base64');

    return { base64, rows, cols };
}

/**
 * Decodes base64 embeddings back to a 2D array.
 */
export function decodeEmbeddings(base64: string, rows: number, cols: number): number[][] {
    if (!base64 || rows === 0 || cols === 0) {
        return [];
    }

    // Decode base64 to bytes
    const bytes = Buffer.from(base64, 'base64');
    const flat = new Float32Array(bytes.buffer);

    // Reconstruct 2D array
    const result: number[][] = [];
    for (let i = 0; i < rows; i++) {
        const row: number[] = [];
        for (let j = 0; j < cols; j++) {
            row.push(flat[i * cols + j]);
        }
        result.push(row);
    }

    return result;
}

