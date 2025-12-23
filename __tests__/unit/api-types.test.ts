/**
 * API Types & Contract Tests
 *
 * Tests that API request/response types are properly structured.
 * Validates the contract between client and server endpoints.
 *
 * Run: npm test -- __tests__/unit/api-types.test.ts
 */

import type {
    DecomposeRequest,
    DecomposeResponse,
    SearchRequest,
    SearchResponse,
    SynthesizeRequest,
    VerifyRequest,
    AdjudicateRequest,
} from '../../app/lib/maxwell/api-types';
import type { SubQuery, MaxwellSource, VerificationOutput } from '../../app/lib/maxwell/types';
import { createExecutionConfig } from '../../app/lib/maxwell/configFactory';

describe('API Contract Types', () => {
    describe('Decompose Endpoint', () => {
        it('should accept valid DecomposeRequest', () => {
            const request: DecomposeRequest = {
                query: 'What is the capital of France?',
            };

            expect(request.query).toBeDefined();
            expect(typeof request.query).toBe('string');
        });

        it('should produce valid DecomposeResponse', () => {
            const response: DecomposeResponse = {
                subQueries: [
                    { id: 'q1', query: 'capital of France', purpose: 'Find capital', topic: 'general', depth: 'basic' },
                    { id: 'q2', query: 'Paris France', purpose: 'Verify', topic: 'general', depth: 'basic' },
                    { id: 'q3', query: 'French capital city', purpose: 'Confirm', topic: 'general', depth: 'basic' },
                ],
                config: createExecutionConfig('simple', 'Simple factual query'),
                complexity: 'simple',
                complexityReasoning: 'Simple factual lookup',
                durationMs: 1500,
            };

            expect(response.subQueries.length).toBeGreaterThanOrEqual(1);
            expect(response.config).toBeDefined();
            expect(response.complexity).toBeDefined();
            expect(response.durationMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Search Endpoint', () => {
        it('should accept valid SearchRequest', () => {
            const subQueries: SubQuery[] = [
                { id: 'q1', query: 'capital of France', purpose: 'Find capital', topic: 'general', depth: 'basic' },
            ];
            const config = createExecutionConfig('simple', 'Test');

            const request: SearchRequest = {
                subQueries,
                config,
            };

            expect(request.subQueries).toBeDefined();
            expect(request.config).toBeDefined();
        });

        it('should produce valid SearchResponse with blob URL', () => {
            const response: SearchResponse = {
                sources: [
                    {
                        id: 's1',
                        title: 'Wikipedia - Paris',
                        url: 'https://en.wikipedia.org/wiki/Paris',
                        snippet: 'Paris is the capital of France.',
                        score: 0.95,
                        date: '2024-01-01',
                    },
                ],
                searchMetadata: [
                    { subQueryId: 'q1', resultsCount: 1, searchType: 'general', durationMs: 500 },
                ],
                evidenceBlobUrl: 'https://blob.vercel-storage.com/evidence-123.json',
                evidenceStats: {
                    passageCount: 10,
                    embeddingCount: 10,
                },
                durationMs: 2500,
            };

            expect(response.sources.length).toBeGreaterThan(0);
            expect(response.evidenceBlobUrl).toBeDefined();
            expect(response.evidenceStats.passageCount).toBeGreaterThan(0);
        });

        it('should support local data URL format', () => {
            // Local development uses data URLs instead of Blob URLs
            const localResponse: SearchResponse = {
                sources: [],
                searchMetadata: [],
                evidenceBlobUrl: 'data:application/json;base64,eyJ0ZXN0IjogdHJ1ZX0=',
                evidenceStats: { passageCount: 0, embeddingCount: 0 },
                durationMs: 100,
            };

            expect(localResponse.evidenceBlobUrl.startsWith('data:')).toBe(true);
        });
    });

    describe('Synthesize Endpoint', () => {
        it('should accept valid SynthesizeRequest', () => {
            const sources: MaxwellSource[] = [
                {
                    id: 's1',
                    title: 'Test Source',
                    url: 'https://example.com',
                    snippet: 'Test content',
                    score: 0.9,
                },
            ];

            const request: SynthesizeRequest = {
                query: 'What is the capital of France?',
                sources,
                synthesisModel: 'google/gemini-3-flash-preview',
            };

            expect(request.query).toBeDefined();
            expect(request.sources).toBeDefined();
            expect(request.synthesisModel).toBeDefined();
        });
    });

    describe('Verify Endpoint', () => {
        it('should accept valid VerifyRequest with blob URL', () => {
            const request: VerifyRequest = {
                answer: 'Paris is the capital of France.',
                sources: [],
                evidenceBlobUrl: 'https://blob.vercel-storage.com/evidence-123.json',
                maxClaimsToVerify: 30,
                verificationConcurrency: 6,
            };

            expect(request.answer).toBeDefined();
            expect(request.evidenceBlobUrl).toBeDefined();
        });

        it('should accept local data URL for evidence', () => {
            const request: VerifyRequest = {
                answer: 'Paris is the capital of France.',
                sources: [],
                evidenceBlobUrl: 'data:application/json;base64,eyJ0ZXN0IjogdHJ1ZX0=',
            };

            expect(request.evidenceBlobUrl.startsWith('data:')).toBe(true);
        });
    });

    describe('Adjudicate Endpoint', () => {
        it('should accept valid AdjudicateRequest', () => {
            const verification: VerificationOutput = {
                claims: [],
                overallConfidence: 85,
                summary: {
                    total: 5,
                    supported: 4,
                    contradicted: 0,
                    uncertain: 1,
                    averageConfidence: 0.85,
                },
                durationMs: 5000,
            };

            const request: AdjudicateRequest = {
                query: 'What is the capital of France?',
                answer: 'Paris is the capital of France.',
                verification,
                adjudicatorModel: 'google/gemini-3-flash-preview',
            };

            expect(request.query).toBeDefined();
            expect(request.answer).toBeDefined();
            expect(request.verification).toBeDefined();
        });
    });

    describe('Type Safety', () => {
        it('should enforce required fields in SubQuery', () => {
            const validSubQuery: SubQuery = {
                id: 'q1',
                query: 'test query',
                purpose: 'test purpose',
                topic: 'general',
                depth: 'basic',
            };

            // These should all be defined
            expect(validSubQuery.id).toBeDefined();
            expect(validSubQuery.query).toBeDefined();
            expect(validSubQuery.purpose).toBeDefined();
        });

        it('should enforce required fields in MaxwellSource', () => {
            const validSource: MaxwellSource = {
                id: 's1',
                title: 'Test',
                url: 'https://example.com',
                snippet: 'Content',
                score: 0.9,
            };

            expect(validSource.id).toBeDefined();
            expect(validSource.title).toBeDefined();
            expect(validSource.url).toBeDefined();
            expect(validSource.snippet).toBeDefined();
            expect(validSource.score).toBeDefined();
        });
    });
});

