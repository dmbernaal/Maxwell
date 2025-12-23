/**
 * Evidence Retrieval Unit Tests
 *
 * Tests the retrieval logic that finds best-matching passages for claims.
 * This is critical for verification accuracy.
 *
 * Run: npm test -- __tests__/unit/evidence-retrieval.test.ts
 */

import { retrieveEvidence } from '../../app/lib/maxwell/verifier';
import type { Passage } from '../../app/lib/maxwell/types';

describe('Evidence Retrieval', () => {
    // Helper to create a test passage
    const createPassage = (text: string, sourceIndex: number, overrides?: Partial<Passage>): Passage => ({
        text,
        sourceId: `s${sourceIndex}`,
        sourceIndex,
        sourceTitle: `Source ${sourceIndex}`,
        sourceDate: '2024-01-01',
        ...overrides,
    });

    // Simple embeddings for testing (unit vectors in 4D space)
    const embeddings = {
        x: [1, 0, 0, 0],  // Points in X direction
        y: [0, 1, 0, 0],  // Points in Y direction
        z: [0, 0, 1, 0],  // Points in Z direction
        xy: [0.707, 0.707, 0, 0],  // 45 degrees between X and Y
        negX: [-1, 0, 0, 0],  // Opposite to X
    };

    describe('retrieveEvidence', () => {
        describe('Best Match Finding', () => {
            it('should find the most similar passage', () => {
                const passages = [
                    createPassage('Passage about topic A', 1),
                    createPassage('Passage about topic B', 2),
                    createPassage('Passage about topic C', 3),
                ];
                const passageEmbeddings = [
                    embeddings.x,
                    embeddings.y,
                    embeddings.z,
                ];

                // Claim embedding is closest to first passage (X direction)
                const result = retrieveEvidence(embeddings.x, passages, passageEmbeddings, []);

                expect(result.bestPassage.sourceIndex).toBe(1);
                expect(result.retrievalSimilarity).toBeCloseTo(1.0, 5);
            });

            it('should handle intermediate similarity', () => {
                const passages = [
                    createPassage('Passage 1', 1),
                    createPassage('Passage 2', 2),
                ];
                const passageEmbeddings = [
                    embeddings.x,
                    embeddings.y,
                ];

                // Claim at 45 degrees should have equal similarity to both
                const result = retrieveEvidence(embeddings.xy, passages, passageEmbeddings, []);

                expect(result.retrievalSimilarity).toBeGreaterThan(0.5);
                expect(result.retrievalSimilarity).toBeLessThan(1.0);
            });
        });

        describe('Citation Mismatch Detection', () => {
            it('should detect when best evidence is from uncited source', () => {
                const passages = [
                    createPassage('Best match passage', 1),
                    createPassage('Cited but weaker match', 2),
                ];
                const passageEmbeddings = [
                    embeddings.x,  // Best match
                    embeddings.y,  // Weaker match
                ];

                // Claim is closest to source 1, but only source 2 is cited
                const result = retrieveEvidence(embeddings.x, passages, passageEmbeddings, [2]);

                expect(result.citationMismatch).toBe(true);
            });

            it('should not flag mismatch when best evidence is from cited source', () => {
                const passages = [
                    createPassage('Best match passage', 1),
                    createPassage('Weaker match', 2),
                ];
                const passageEmbeddings = [
                    embeddings.x,  // Best match
                    embeddings.y,  // Weaker match
                ];

                // Claim is closest to source 1, and source 1 is cited
                const result = retrieveEvidence(embeddings.x, passages, passageEmbeddings, [1]);

                expect(result.citationMismatch).toBe(false);
            });

            it('should not flag mismatch when no sources are cited', () => {
                const passages = [
                    createPassage('Passage', 1),
                ];
                const passageEmbeddings = [embeddings.x];

                // No citations provided
                const result = retrieveEvidence(embeddings.x, passages, passageEmbeddings, []);

                expect(result.citationMismatch).toBe(false);
            });
        });

        describe('Global vs Cited Support', () => {
            it('should track global best support', () => {
                const passages = [
                    createPassage('Very relevant', 1),
                    createPassage('Somewhat relevant', 2),
                ];
                const passageEmbeddings = [
                    embeddings.x,
                    embeddings.xy,
                ];

                const result = retrieveEvidence(embeddings.x, passages, passageEmbeddings, [2]);

                expect(result.globalBestSupport).toBeCloseTo(1.0, 5); // From source 1
            });

            it('should track cited source support', () => {
                const passages = [
                    createPassage('Best match (uncited)', 1),
                    createPassage('Cited passage', 2),
                ];
                const passageEmbeddings = [
                    embeddings.x,
                    embeddings.y,
                ];

                const result = retrieveEvidence(embeddings.xy, passages, passageEmbeddings, [2]);

                // Cited support should be similarity to source 2
                expect(result.citedSourceSupport).toBeGreaterThan(0);
                expect(result.citedSourceSupport).toBeLessThanOrEqual(result.globalBestSupport);
            });
        });

        describe('Edge Cases', () => {
            it('should throw for empty passages', () => {
                expect(() => {
                    retrieveEvidence(embeddings.x, [], [], []);
                }).toThrow('No passages available');
            });

            it('should throw for empty embeddings', () => {
                const passages = [createPassage('Test', 1)];
                expect(() => {
                    retrieveEvidence(embeddings.x, passages, [], []);
                }).toThrow('No passages available');
            });

            it('should handle single passage', () => {
                const passages = [createPassage('Only passage', 1)];
                const passageEmbeddings = [embeddings.x];

                const result = retrieveEvidence(embeddings.x, passages, passageEmbeddings, []);

                expect(result.bestPassage.sourceIndex).toBe(1);
            });

            it('should handle negative similarity (opposite vectors)', () => {
                const passages = [
                    createPassage('Opposite meaning', 1),
                ];
                const passageEmbeddings = [embeddings.negX];

                const result = retrieveEvidence(embeddings.x, passages, passageEmbeddings, []);

                // Opposite vectors have similarity -1
                expect(result.retrievalSimilarity).toBeLessThan(0);
            });
        });

        describe('Result Structure', () => {
            it('should return all required fields', () => {
                const passages = [createPassage('Test passage', 1)];
                const passageEmbeddings = [embeddings.x];

                const result = retrieveEvidence(embeddings.x, passages, passageEmbeddings, [1]);

                expect(result).toHaveProperty('bestPassage');
                expect(result).toHaveProperty('retrievalSimilarity');
                expect(result).toHaveProperty('citedSourceSupport');
                expect(result).toHaveProperty('globalBestSupport');
                expect(result).toHaveProperty('citationMismatch');

                expect(result.bestPassage).toHaveProperty('text');
                expect(result.bestPassage).toHaveProperty('sourceIndex');
            });
        });
    });
});

