/**
 * Blob Storage Utility for Maxwell Embeddings
 *
 * Stores prepared evidence (passages + embeddings) in Vercel Blob Storage
 * to avoid the 4.5MB request body limit between serverless functions.
 *
 * HYBRID MODE:
 * - Production (Vercel): Uses Blob Storage (external URL)
 * - Development (local): Uses in-memory cache with reference ID
 *   (Data URLs caused browser OOM crashes with large embeddings)
 *
 * @module maxwell/blob-storage
 */

import { put, del } from '@vercel/blob';
import type { Passage } from './types';

const LOCAL_EVIDENCE_CACHE = new Map<string, SerializedEvidence>();
const LOCAL_CACHE_PREFIX = 'maxwell-local://';

// ============================================
// TYPES
// ============================================

/**
 * Serializable format for prepared evidence.
 * Embeddings are stored as base64 to preserve precision.
 */
export interface SerializedEvidence {
    passages: Passage[];
    embeddingsBase64: string;
    embeddingsDimensions: {
        rows: number; // number of embeddings
        cols: number; // dimensions per embedding (typically 4096)
    };
    createdAt: number;
}

/**
 * Result from storing evidence in Blob.
 */
export interface StoredEvidenceResult {
    blobUrl: string;
    passageCount: number;
    embeddingCount: number;
}

// ============================================
// ENCODING UTILITIES
// ============================================

/**
 * Encodes a 2D array of embeddings to base64 string.
 * Uses Float32Array for efficient binary representation.
 */
export function encodeEmbeddingsToBase64(embeddings: number[][]): {
    base64: string;
    rows: number;
    cols: number;
} {
    if (embeddings.length === 0) {
        return { base64: '', rows: 0, cols: 0 };
    }

    const rows = embeddings.length;
    const cols = embeddings[0].length;

    // Flatten to 1D array
    const flat = new Float32Array(rows * cols);
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            flat[i * cols + j] = embeddings[i][j];
        }
    }

    // Convert to base64
    const buffer = Buffer.from(flat.buffer);
    const base64 = buffer.toString('base64');

    return { base64, rows, cols };
}

/**
 * Decodes base64 string back to 2D array of embeddings.
 */
export function decodeEmbeddingsFromBase64(
    base64: string,
    rows: number,
    cols: number
): number[][] {
    if (!base64 || rows === 0 || cols === 0) {
        return [];
    }

    const buffer = Buffer.from(base64, 'base64');
    const flat = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);

    const embeddings: number[][] = [];
    for (let i = 0; i < rows; i++) {
        const row: number[] = [];
        for (let j = 0; j < cols; j++) {
            row.push(flat[i * cols + j]);
        }
        embeddings.push(row);
    }

    return embeddings;
}

// ============================================
// ENVIRONMENT DETECTION
// ============================================

/**
 * Check if we're running on Vercel (production) or locally.
 * Vercel sets VERCEL=1 in the environment.
 */
function isVercelEnvironment(): boolean {
    return process.env.VERCEL === '1' || !!process.env.BLOB_READ_WRITE_TOKEN;
}

// ============================================
// BLOB OPERATIONS
// ============================================

/**
 * Stores prepared evidence in Vercel Blob Storage (production)
 * or as a data URL (local development).
 *
 * @param passages - Array of text passages
 * @param embeddings - Corresponding embedding vectors
 * @returns URL to retrieve the stored evidence
 */
export async function storeEvidenceInBlob(
    passages: Passage[],
    embeddings: number[][]
): Promise<StoredEvidenceResult> {
    // Encode embeddings
    const { base64, rows, cols } = encodeEmbeddingsToBase64(embeddings);

    // Create serializable evidence object
    const evidence: SerializedEvidence = {
        passages,
        embeddingsBase64: base64,
        embeddingsDimensions: { rows, cols },
        createdAt: Date.now(),
    };

    const jsonString = JSON.stringify(evidence);

    if (!isVercelEnvironment()) {
        const cacheId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        LOCAL_EVIDENCE_CACHE.set(cacheId, evidence);

        console.log('[Maxwell Blob] Stored evidence in local memory cache:', {
            cacheId,
            passages: passages.length,
            embeddings: embeddings.length,
            sizeEstimate: `~${Math.round(jsonString.length / 1024)}KB`,
            cacheSize: LOCAL_EVIDENCE_CACHE.size,
        });

        return {
            blobUrl: `${LOCAL_CACHE_PREFIX}${cacheId}`,
            passageCount: passages.length,
            embeddingCount: embeddings.length,
        };
    }

    // PRODUCTION: Store in Vercel Blob
    const blobName = `maxwell-evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;

    const blob = await put(blobName, jsonString, {
        access: 'public', // Needed for cross-function access
        addRandomSuffix: false, // We already have unique name
    });

    console.log('[Maxwell Blob] Stored evidence in Vercel Blob:', {
        url: blob.url,
        passages: passages.length,
        embeddings: embeddings.length,
        sizeEstimate: `~${Math.round(base64.length / 1024)}KB`,
    });

    return {
        blobUrl: blob.url,
        passageCount: passages.length,
        embeddingCount: embeddings.length,
    };
}

/**
 * Retrieves prepared evidence from Vercel Blob Storage or data URL.
 *
 * @param blobUrl - URL returned from storeEvidenceInBlob (can be Blob URL or data URL)
 * @returns Deserialized passages and embeddings
 */
export async function fetchEvidenceFromBlob(blobUrl: string): Promise<{
    passages: Passage[];
    embeddings: number[][];
}> {
    let evidence: SerializedEvidence;

    if (blobUrl.startsWith(LOCAL_CACHE_PREFIX)) {
        const cacheId = blobUrl.slice(LOCAL_CACHE_PREFIX.length);
        const cached = LOCAL_EVIDENCE_CACHE.get(cacheId);
        
        if (!cached) {
            throw new Error(`Local evidence cache miss: ${cacheId}`);
        }
        
        evidence = cached;
        LOCAL_EVIDENCE_CACHE.delete(cacheId);

        console.log('[Maxwell Blob] Fetched evidence from local memory cache:', {
            cacheId,
            passages: evidence.passages.length,
            embeddings: evidence.embeddingsDimensions.rows,
            remainingCacheSize: LOCAL_EVIDENCE_CACHE.size,
        });
    } else if (blobUrl.startsWith('data:')) {
        const base64Data = blobUrl.split(',')[1];
        const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
        evidence = JSON.parse(jsonString);

        console.log('[Maxwell Blob] Fetched evidence from data URL:', {
            passages: evidence.passages.length,
            embeddings: evidence.embeddingsDimensions.rows,
        });
    } else {
        // PRODUCTION: Fetch from Vercel Blob
        const response = await fetch(blobUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch evidence from Blob: ${response.status}`);
        }

        evidence = await response.json();

        console.log('[Maxwell Blob] Fetched evidence from Vercel Blob:', {
            passages: evidence.passages.length,
            embeddings: evidence.embeddingsDimensions.rows,
            age: `${Math.round((Date.now() - evidence.createdAt) / 1000)}s old`,
        });
    }

    // Decode embeddings
    const embeddings = decodeEmbeddingsFromBase64(
        evidence.embeddingsBase64,
        evidence.embeddingsDimensions.rows,
        evidence.embeddingsDimensions.cols
    );

    return {
        passages: evidence.passages,
        embeddings,
    };
}

/**
 * Deletes evidence from Vercel Blob Storage.
 * Call this after verification is complete to clean up.
 * No-op for data URLs (local development).
 *
 * @param blobUrl - URL of the blob to delete
 */
export async function deleteEvidenceFromBlob(blobUrl: string): Promise<void> {
    if (blobUrl.startsWith(LOCAL_CACHE_PREFIX)) {
        const cacheId = blobUrl.slice(LOCAL_CACHE_PREFIX.length);
        LOCAL_EVIDENCE_CACHE.delete(cacheId);
        return;
    }
    
    if (blobUrl.startsWith('data:')) {
        return;
    }

    try {
        await del(blobUrl);
        console.log('[Maxwell Blob] Deleted evidence:', blobUrl);
    } catch (error) {
        // Don't throw - cleanup failure shouldn't break the flow
        console.warn('[Maxwell Blob] Failed to delete evidence:', error);
    }
}

