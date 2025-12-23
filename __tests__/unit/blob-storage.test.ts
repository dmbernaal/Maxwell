/**
 * Blob Storage Unit Tests
 *
 * Tests encoding/decoding utilities for the Vercel Blob storage system.
 * These tests run WITHOUT external API calls.
 *
 * Run: npm test -- __tests__/unit/blob-storage.test.ts
 */

import {
    encodeEmbeddingsToBase64,
    decodeEmbeddingsFromBase64,
} from '../../app/lib/maxwell/blob-storage';

describe('Blob Storage Encoding', () => {
    describe('encodeEmbeddingsToBase64', () => {
        it('should encode empty array correctly', () => {
            const result = encodeEmbeddingsToBase64([]);
            expect(result.base64).toBe('');
            expect(result.rows).toBe(0);
            expect(result.cols).toBe(0);
        });

        it('should encode single embedding correctly', () => {
            const embeddings = [[1.0, 2.0, 3.0, 4.0]];
            const result = encodeEmbeddingsToBase64(embeddings);

            expect(result.rows).toBe(1);
            expect(result.cols).toBe(4);
            expect(result.base64).toBeTruthy();
            expect(typeof result.base64).toBe('string');
        });

        it('should encode multiple embeddings correctly', () => {
            const embeddings = [
                [1.0, 2.0, 3.0],
                [4.0, 5.0, 6.0],
                [7.0, 8.0, 9.0],
            ];
            const result = encodeEmbeddingsToBase64(embeddings);

            expect(result.rows).toBe(3);
            expect(result.cols).toBe(3);
            expect(result.base64).toBeTruthy();
        });

        it('should handle high-dimensional embeddings (like real 3072-dim)', () => {
            // Simulate real embedding dimensions
            const embedding = new Array(3072).fill(0).map(() => Math.random());
            const embeddings = [embedding];

            const result = encodeEmbeddingsToBase64(embeddings);

            expect(result.rows).toBe(1);
            expect(result.cols).toBe(3072);
            // Base64 of 3072 floats (4 bytes each) = 3072 * 4 * 4/3 ≈ 16KB
            expect(result.base64.length).toBeGreaterThan(10000);
        });
    });

    describe('decodeEmbeddingsFromBase64', () => {
        it('should decode empty data correctly', () => {
            const result = decodeEmbeddingsFromBase64('', 0, 0);
            expect(result).toEqual([]);
        });

        it('should decode null/undefined gracefully', () => {
            const result = decodeEmbeddingsFromBase64('', 5, 3);
            expect(result).toEqual([]);
        });
    });

    describe('round-trip encoding/decoding', () => {
        it('should preserve simple values through encode/decode', () => {
            const original = [
                [1.0, 2.0, 3.0],
                [4.0, 5.0, 6.0],
            ];

            const encoded = encodeEmbeddingsToBase64(original);
            const decoded = decodeEmbeddingsFromBase64(encoded.base64, encoded.rows, encoded.cols);

            expect(decoded.length).toBe(original.length);
            expect(decoded[0].length).toBe(original[0].length);

            // Check values are approximately equal (floating point precision)
            for (let i = 0; i < original.length; i++) {
                for (let j = 0; j < original[i].length; j++) {
                    expect(decoded[i][j]).toBeCloseTo(original[i][j], 5);
                }
            }
        });

        it('should preserve precision for real embedding values', () => {
            // Real embeddings have values like -0.0234, 0.1567, etc.
            const original = [
                [0.0234, -0.1567, 0.8901, -0.0001],
                [-0.5432, 0.7890, -0.0012, 0.9999],
            ];

            const encoded = encodeEmbeddingsToBase64(original);
            const decoded = decodeEmbeddingsFromBase64(encoded.base64, encoded.rows, encoded.cols);

            for (let i = 0; i < original.length; i++) {
                for (let j = 0; j < original[i].length; j++) {
                    expect(decoded[i][j]).toBeCloseTo(original[i][j], 5);
                }
            }
        });

        it('should handle large batch of embeddings (stress test)', () => {
            // Simulate 100 embeddings with 3072 dimensions each
            const original: number[][] = [];
            for (let i = 0; i < 100; i++) {
                original.push(new Array(3072).fill(0).map(() => Math.random() * 2 - 1));
            }

            const startEncode = Date.now();
            const encoded = encodeEmbeddingsToBase64(original);
            const encodeTime = Date.now() - startEncode;

            const startDecode = Date.now();
            const decoded = decodeEmbeddingsFromBase64(encoded.base64, encoded.rows, encoded.cols);
            const decodeTime = Date.now() - startDecode;

            expect(decoded.length).toBe(100);
            expect(decoded[0].length).toBe(3072);

            // Performance: should complete in reasonable time
            expect(encodeTime).toBeLessThan(1000); // < 1 second
            expect(decodeTime).toBeLessThan(1000); // < 1 second

            // Spot check a few values
            expect(decoded[0][0]).toBeCloseTo(original[0][0], 5);
            expect(decoded[50][1500]).toBeCloseTo(original[50][1500], 5);
            expect(decoded[99][3071]).toBeCloseTo(original[99][3071], 5);
        });
    });
});

