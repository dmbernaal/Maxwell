/**
 * Embedding Utilities Module
 *
 * Provides text embedding and similarity calculation functions.
 * Uses OpenRouter's Embedding API via native fetch.
 *
 * @module maxwell/embeddings
 */

import { EMBEDDING_MODEL } from './constants';
import { getMaxwellEnvConfig } from './env';

// ============================================
// TYPES
// ============================================

interface OpenRouterEmbeddingResponse {
    data: {
        object: 'embedding';
        embedding: number[];
        index: number;
    }[];
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}

// ============================================
// API CLIENT (Native Fetch)
// ============================================

/**
 * Call OpenRouter Embeddings API directly.
 *
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors
 * @throws Error if API call fails
 */
async function callEmbeddingAPI(texts: string[]): Promise<number[][]> {
    const { OPENROUTER_API_KEY } = getMaxwellEnvConfig();

    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: texts,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenRouter Embedding Error (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as OpenRouterEmbeddingResponse;

    // Sort by index to ensure order matches input
    return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

// ============================================
// SINGLE EMBEDDING
// ============================================

/**
 * Generate an embedding vector for a single text.
 *
 * @param text - The text to embed
 * @returns Embedding vector (array of numbers)
 * @throws Error if text is empty or API fails
 */
export async function embedText(text: string): Promise<number[]> {
    if (!text || typeof text !== 'string') {
        throw new Error('Text must be a non-empty string');
    }
    const trimmed = text.trim();
    if (trimmed.length === 0) {
        throw new Error('Text cannot be empty');
    }

    try {
        const [embedding] = await callEmbeddingAPI([trimmed]);
        return embedding;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Embedding failed: ${message}`);
    }
}

// ============================================
// BATCH EMBEDDING
// ============================================

/**
 * Generate embedding vectors for multiple texts.
 *
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors
 * @throws Error if API fails
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
    if (!Array.isArray(texts)) {
        throw new Error('Texts must be an array');
    }
    if (texts.length === 0) {
        return [];
    }

    // Filter empty strings to avoid API errors
    const validTexts = texts.map((t) => t.trim()).filter((t) => t.length > 0);
    if (validTexts.length === 0) {
        return [];
    }

    try {
        return await callEmbeddingAPI(validTexts);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Batch embedding failed: ${message}`);
    }
}

// ============================================
// COSINE SIMILARITY
// ============================================

/**
 * Calculate cosine similarity between two vectors.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score between -1 and 1 (1 = identical)
 * @throws Error if vectors have different dimensions
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================
// UTILITIES
// ============================================

/**
 * Find the top K most similar items to a query embedding.
 *
 * @param queryEmbedding - The query vector
 * @param itemEmbeddings - Array of item vectors to compare against
 * @param topK - Number of top matches to return (default: 3)
 * @returns Array of { index, similarity } sorted by similarity descending
 */
export function findTopMatches(
    queryEmbedding: number[],
    itemEmbeddings: number[][],
    topK: number = 3
): { index: number; similarity: number }[] {
    const similarities = itemEmbeddings.map((embedding, index) => ({
        index,
        similarity: cosineSimilarity(queryEmbedding, embedding),
    }));

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}
