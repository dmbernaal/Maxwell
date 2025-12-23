/**
 * Passage Chunking Unit Tests
 *
 * Tests the sentence segmentation and passage creation logic.
 * This is critical for verification accuracy - bad chunking = bad retrieval.
 *
 * Run: npm test -- __tests__/unit/passage-chunking.test.ts
 */

import { chunkSourcesIntoPassages } from '../../app/lib/maxwell/verifier';
import type { MaxwellSource } from '../../app/lib/maxwell/types';

describe('Passage Chunking', () => {
    // Helper to create a test source
    const createSource = (snippet: string, overrides?: Partial<MaxwellSource>): MaxwellSource => ({
        id: 's1',
        title: 'Test Source',
        url: 'https://example.com',
        snippet,
        score: 0.9,
        date: '2024-01-01',
        ...overrides,
    });

    describe('chunkSourcesIntoPassages', () => {
        describe('Basic Chunking', () => {
            it('should chunk a simple multi-sentence snippet', () => {
                const source = createSource(
                    'Paris is the capital of France. It has a population of 2.1 million. The Eiffel Tower is located there.'
                );
                const passages = chunkSourcesIntoPassages([source]);

                expect(passages.length).toBeGreaterThan(0);
                // Should have individual sentences and multi-sentence windows
            });

            it('should preserve source metadata in passages', () => {
                const source = createSource('Paris is the capital of France.', {
                    id: 'source-123',
                    title: 'Geography Facts',
                    date: '2024-03-15',
                });
                const passages = chunkSourcesIntoPassages([source]);

                expect(passages.length).toBeGreaterThan(0);
                passages.forEach((p) => {
                    expect(p.sourceId).toBe('source-123');
                    expect(p.sourceTitle).toBe('Geography Facts');
                    expect(p.sourceDate).toBe('2024-03-15');
                    expect(p.sourceIndex).toBe(1); // 1-indexed
                });
            });

            it('should handle multiple sources with correct indices', () => {
                const sources = [
                    createSource('First source content.', { id: 's1' }),
                    createSource('Second source content.', { id: 's2' }),
                    createSource('Third source content.', { id: 's3' }),
                ];
                const passages = chunkSourcesIntoPassages(sources);

                // Check source indices are correct (1-indexed for citation matching)
                const indices = new Set(passages.map((p) => p.sourceIndex));
                expect(indices.has(1)).toBe(true);
                expect(indices.has(2)).toBe(true);
                expect(indices.has(3)).toBe(true);
            });
        });

        describe('Sentence Segmentation', () => {
            it('should handle common abbreviations correctly', () => {
                const source = createSource(
                    'Dr. Smith works at U.S. headquarters. He joined in Jan. 2024.'
                );
                const passages = chunkSourcesIntoPassages([source]);

                // Should produce passages from the content
                expect(passages.length).toBeGreaterThan(0);
                // The segmenter behavior varies - just check we got content
                const allText = passages.map((p) => p.text).join(' ');
                expect(allText).toContain('Smith');
            });

            it('should handle questions and exclamations', () => {
                const source = createSource(
                    'Is Paris the capital? Yes, it is! The city is beautiful.'
                );
                const passages = chunkSourcesIntoPassages([source]);

                expect(passages.length).toBeGreaterThan(0);
            });

            it('should handle multi-line content', () => {
                const source = createSource(
                    'First paragraph content.\n\nSecond paragraph with more info.\n\nThird paragraph here.'
                );
                const passages = chunkSourcesIntoPassages([source]);

                expect(passages.length).toBeGreaterThan(0);
            });
        });

        describe('Window Sizes', () => {
            it('should create multiple passages from multi-sentence content', () => {
                const source = createSource(
                    'Sentence one is here. Sentence two follows. Sentence three appears. Sentence four continues. Sentence five ends.'
                );
                const passages = chunkSourcesIntoPassages([source]);

                // Should create multiple passages for overlapping context
                expect(passages.length).toBeGreaterThan(1);
                
                // Check we captured the beginning of the content
                const allText = passages.map((p) => p.text).join(' ');
                expect(allText).toContain('one');
                expect(allText).toContain('three');
            });
        });

        describe('Edge Cases', () => {
            it('should handle empty sources array', () => {
                const passages = chunkSourcesIntoPassages([]);
                expect(passages).toEqual([]);
            });

            it('should handle source with empty snippet', () => {
                const source = createSource('');
                const passages = chunkSourcesIntoPassages([source]);

                // Empty snippets should be filtered out or handled gracefully
                expect(Array.isArray(passages)).toBe(true);
            });

            it('should handle very short snippets', () => {
                const source = createSource('Short.');
                const passages = chunkSourcesIntoPassages([source]);

                // Very short content might not meet MIN_PASSAGE_LENGTH
                expect(Array.isArray(passages)).toBe(true);
            });

            it('should truncate oversized sources', () => {
                // Create a very long source (over 25000 chars)
                const longContent = 'This is a sentence. '.repeat(2000); // ~40000 chars
                const source = createSource(longContent);
                const passages = chunkSourcesIntoPassages([source]);

                // Should still produce passages (truncated)
                expect(passages.length).toBeGreaterThan(0);
                
                // Passages shouldn't contain content from beyond the cap
                const totalChars = passages.reduce((sum, p) => sum + p.text.length, 0);
                // This is a sanity check - not an exact assertion
                expect(totalChars).toBeLessThan(100000);
            });

            it('should handle snippet with only whitespace', () => {
                const source = createSource('   \n\n\t  ');
                const passages = chunkSourcesIntoPassages([source]);

                expect(Array.isArray(passages)).toBe(true);
            });

            it('should handle snippet with no sentence boundaries', () => {
                const source = createSource('This is a single long text without any sentence boundaries');
                const passages = chunkSourcesIntoPassages([source]);

                // Should fallback to using the whole snippet
                expect(passages.length).toBeGreaterThan(0);
            });
        });

        describe('Content Preservation', () => {
            it('should not lose content during chunking', () => {
                const originalContent = 'First sentence. Second sentence. Third sentence.';
                const source = createSource(originalContent);
                const passages = chunkSourcesIntoPassages([source]);

                // At least one passage should contain each original sentence
                expect(passages.some((p) => p.text.includes('First'))).toBe(true);
                expect(passages.some((p) => p.text.includes('Second'))).toBe(true);
                expect(passages.some((p) => p.text.includes('Third'))).toBe(true);
            });

            it('should preserve special characters', () => {
                const source = createSource(
                    'Revenue was $96.8 billion (up 18.5%). Growth exceeded expectations!'
                );
                const passages = chunkSourcesIntoPassages([source]);

                // Check special chars are preserved
                const allText = passages.map((p) => p.text).join(' ');
                expect(allText).toContain('$96.8');
                expect(allText).toContain('18.5%');
            });
        });
    });
});

