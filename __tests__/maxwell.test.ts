// Mock the embeddings module to avoid ESM import issues with p-limit
jest.mock('../app/lib/maxwell/embeddings', () => ({
    embedText: jest.fn(),
    embedTexts: jest.fn(),
    cosineSimilarity: jest.fn(),
    findTopMatches: jest.fn(),
}));

import { checkNumericConsistency } from '../app/lib/maxwell/verifier';
import { createExecutionConfig } from '../app/lib/maxwell/configFactory';

describe('Maxwell Core Logic', () => {

    describe('Numeric Verification (Range Logic)', () => {
        test('should match exact numbers', () => {
            const result = checkNumericConsistency(['100'], ['100']);
            expect(result.match).toBe(true);
        });

        test('should match numbers with currency symbols', () => {
            const result = checkNumericConsistency(['$100'], ['100']);
            expect(result.match).toBe(true);
        });

        test('should handle range overlaps (The "Battery Cost" Fix)', () => {
            // Claim: $400-$800, Evidence: $400-$600
            // This used to fail. It should now pass because minimums match.
            const result = checkNumericConsistency(['400', '800'], ['400', '600']);
            expect(result.match).toBe(true);
        });

        test('should handle range containment', () => {
            // Evidence range fully contains claim value
            const result = checkNumericConsistency(['500'], ['400', '600']);
            expect(result.match).toBe(true);
        });

        test('should reject clear mismatches', () => {
            const result = checkNumericConsistency(['15'], ['25']);
            expect(result.match).toBe(false);
        });

        test('should pass when no claim numbers exist', () => {
            const result = checkNumericConsistency([], ['100', '200']);
            expect(result.match).toBe(true);
        });
    });

    describe('Adaptive Compute Configuration', () => {
        test('should allocate minimal resources for simple queries', () => {
            const config = createExecutionConfig('simple', 'Quick lookup');

            expect(config.complexity).toBe('simple');
            expect(config.maxSubQueries).toBe(2);
            expect(config.resultsPerQuery).toBe(4);
            expect(config.verificationConcurrency).toBe(4);
            expect(config.maxClaimsToVerify).toBe(4);
            expect(config.synthesisModel).toContain('flash');
        });

        test('should allocate balanced resources for standard queries', () => {
            const config = createExecutionConfig('standard', 'General analysis');

            expect(config.complexity).toBe('standard');
            expect(config.maxSubQueries).toBe(4);
            expect(config.resultsPerQuery).toBe(5);
            expect(config.maxClaimsToVerify).toBe(10);
            expect(config.synthesisModel).toContain('claude');
        });

        test('should allocate maximum resources for deep research', () => {
            const config = createExecutionConfig('deep_research', 'Comprehensive analysis');

            expect(config.complexity).toBe('deep_research');
            expect(config.maxSubQueries).toBe(7);
            expect(config.resultsPerQuery).toBe(8);
            expect(config.verificationConcurrency).toBe(10);
            expect(config.maxClaimsToVerify).toBe(24);
            expect(config.synthesisModel).toContain('claude');
            expect(config.adjudicatorModel).toContain('pro');
        });

        test('should preserve reasoning in config', () => {
            const reasoning = 'User requested comprehensive medical analysis';
            const config = createExecutionConfig('deep_research', reasoning);

            expect(config.reasoning).toBe(reasoning);
        });
    });
});
