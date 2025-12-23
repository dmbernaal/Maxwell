/**
 * Embeddings Math Unit Tests
 *
 * Tests cosine similarity calculation and top matches finding.
 * These tests run WITHOUT external API calls.
 *
 * Run: npm test -- __tests__/unit/embeddings-math.test.ts
 */

import { cosineSimilarity, findTopMatches } from '../../app/lib/maxwell/embeddings';

describe('Cosine Similarity', () => {
    describe('cosineSimilarity', () => {
        it('should return 1 for identical vectors', () => {
            const vec = [1, 2, 3, 4];
            expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0, 5);
        });

        it('should return 0 for orthogonal vectors', () => {
            const vecA = [1, 0, 0];
            const vecB = [0, 1, 0];
            expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0.0, 5);
        });

        it('should return -1 for opposite vectors', () => {
            const vecA = [1, 0, 0];
            const vecB = [-1, 0, 0];
            expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1.0, 5);
        });

        it('should handle high-dimensional vectors', () => {
            // Create two similar high-dimensional vectors
            const vecA = new Array(3072).fill(0).map(() => Math.random());
            const vecB = [...vecA]; // Clone

            // Identical should be 1
            expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5);

            // Slightly perturbed should be close to 1
            vecB[0] += 0.01;
            expect(cosineSimilarity(vecA, vecB)).toBeGreaterThan(0.99);
        });

        it('should be symmetric', () => {
            const vecA = [1, 2, 3];
            const vecB = [4, 5, 6];

            expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(cosineSimilarity(vecB, vecA), 10);
        });

        it('should handle normalized vectors correctly', () => {
            // Pre-normalized unit vectors
            const vecA = [1 / Math.sqrt(2), 1 / Math.sqrt(2), 0];
            const vecB = [1 / Math.sqrt(2), 0, 1 / Math.sqrt(2)];

            const similarity = cosineSimilarity(vecA, vecB);
            expect(similarity).toBeCloseTo(0.5, 5); // cos(60°) = 0.5
        });

        it('should return 0 for zero vector', () => {
            const zero = [0, 0, 0];
            const vec = [1, 2, 3];

            // Zero vector has no direction, similarity should be 0
            expect(cosineSimilarity(zero, vec)).toBe(0);
        });
    });
});

describe('Find Top Matches', () => {
    describe('findTopMatches', () => {
        it('should find the most similar vector', () => {
            const query = [1, 0, 0, 0];
            const candidates = [
                [0.9, 0.1, 0, 0], // Most similar
                [0, 1, 0, 0], // Orthogonal
                [0.5, 0.5, 0, 0], // Somewhat similar
                [-1, 0, 0, 0], // Opposite
            ];

            const matches = findTopMatches(query, candidates, 1);

            expect(matches.length).toBe(1);
            expect(matches[0].index).toBe(0);
            expect(matches[0].similarity).toBeGreaterThan(0.9);
        });

        it('should return top N matches in order', () => {
            const query = [1, 0, 0, 0];
            const candidates = [
                [0.9, 0.1, 0, 0], // #1 Most similar
                [0, 1, 0, 0], // #4 Orthogonal
                [0.7, 0.3, 0, 0], // #2 Second most
                [0.5, 0.5, 0, 0], // #3 Third
            ];

            const matches = findTopMatches(query, candidates, 3);

            expect(matches.length).toBe(3);
            expect(matches[0].index).toBe(0); // 0.9, 0.1
            expect(matches[1].index).toBe(2); // 0.7, 0.3
            expect(matches[2].index).toBe(3); // 0.5, 0.5

            // Verify ordering
            expect(matches[0].similarity).toBeGreaterThan(matches[1].similarity);
            expect(matches[1].similarity).toBeGreaterThan(matches[2].similarity);
        });

        it('should handle requesting more matches than candidates', () => {
            const query = [1, 0];
            const candidates = [[0.9, 0.1], [0.5, 0.5]];

            const matches = findTopMatches(query, candidates, 5);

            expect(matches.length).toBe(2); // Only 2 available
        });

        it('should handle empty candidates', () => {
            const query = [1, 0, 0];
            const matches = findTopMatches(query, [], 3);

            expect(matches).toEqual([]);
        });

        it('should include similarity scores', () => {
            const query = [1, 0, 0];
            const candidates = [[1, 0, 0], [0, 1, 0]];

            const matches = findTopMatches(query, candidates, 2);

            expect(matches[0].similarity).toBeCloseTo(1.0, 5);
            expect(matches[1].similarity).toBeCloseTo(0.0, 5);
        });
    });
});

