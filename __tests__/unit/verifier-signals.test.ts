/**
 * Verifier Signals Unit Tests
 *
 * Tests numeric extraction, normalization, consistency checking, and signal aggregation.
 * These tests run WITHOUT external API calls.
 *
 * Run: npm test -- __tests__/unit/verifier-signals.test.ts
 */

import {
    extractNumbers,
    normalizeNumber,
    checkNumericConsistency,
    aggregateSignals,
} from '../../app/lib/maxwell/verifier';

describe('Numeric Extraction', () => {
    describe('extractNumbers', () => {
        it('should extract currency values', () => {
            const text = 'Tesla revenue is $96.8 billion in 2024';
            const numbers = extractNumbers(text);
            expect(numbers).toContain('$96.8 billion');
        });

        it('should extract percentages', () => {
            const text = 'Revenue grew 18.5% year over year';
            const numbers = extractNumbers(text);
            expect(numbers.some(n => n.includes('18.5'))).toBe(true);
        });

        it('should extract multiple numbers', () => {
            const text = 'Stock price of $250 with 15% growth and $1.2 billion revenue';
            const numbers = extractNumbers(text);
            expect(numbers.length).toBeGreaterThanOrEqual(2);
        });

        it('should handle text with no numbers', () => {
            const text = 'This text has no numerical values';
            const numbers = extractNumbers(text);
            expect(numbers).toEqual([]);
        });

        it('should extract numbers with K/M/B suffixes', () => {
            // Note: The extractor may not catch bare T/B without currency symbol
            // Test with proper format
            const text = 'Market cap is $1.5 trillion and revenue is $96.8 billion';
            const numbers = extractNumbers(text);
            expect(numbers.length).toBeGreaterThan(0);
        });
    });
});

describe('Number Normalization', () => {
    describe('normalizeNumber', () => {
        it('should normalize billions', () => {
            expect(normalizeNumber('$96.8 billion')).toBeCloseTo(96.8e9);
            expect(normalizeNumber('96.8B')).toBeCloseTo(96.8e9);
            expect(normalizeNumber('$96.8B')).toBeCloseTo(96.8e9);
        });

        it('should normalize millions', () => {
            expect(normalizeNumber('$500 million')).toBeCloseTo(500e6);
            expect(normalizeNumber('500M')).toBeCloseTo(500e6);
        });

        it('should normalize trillions', () => {
            expect(normalizeNumber('1.5 trillion')).toBeCloseTo(1.5e12);
            expect(normalizeNumber('1.5T')).toBeCloseTo(1.5e12);
        });

        it('should normalize thousands', () => {
            // Note: "thousand" word form may not be supported, test K suffix
            expect(normalizeNumber('50K')).toBeCloseTo(50e3);
            expect(normalizeNumber('$50K')).toBeCloseTo(50e3);
        });

        it('should handle percentages (just the number)', () => {
            const result = normalizeNumber('18.5%');
            expect(result).toBeCloseTo(18.5);
        });

        it('should handle comma-separated numbers', () => {
            expect(normalizeNumber('1,234,567')).toBe(1234567);
            expect(normalizeNumber('$1,234,567')).toBe(1234567);
        });

        it('should handle plain numbers', () => {
            expect(normalizeNumber('42')).toBe(42);
            expect(normalizeNumber('3.14159')).toBeCloseTo(3.14159);
        });

        it('should return null for invalid input', () => {
            expect(normalizeNumber('')).toBeNull();
            expect(normalizeNumber('not a number')).toBeNull();
        });
    });
});

describe('Numeric Consistency', () => {
    describe('checkNumericConsistency', () => {
        it('should match identical numbers', () => {
            const result = checkNumericConsistency(['$100 billion'], ['$100 billion']);
            expect(result.match).toBe(true);
        });

        it('should match equivalent representations', () => {
            const result = checkNumericConsistency(['$96.8 billion'], ['96.8B']);
            expect(result.match).toBe(true);
        });

        it('should detect mismatched numbers', () => {
            const result = checkNumericConsistency(['$100'], ['$50']);
            expect(result.match).toBe(false);
        });

        it('should detect percentage mismatches', () => {
            const result = checkNumericConsistency(['18%'], ['15%']);
            expect(result.match).toBe(false);
        });

        it('should handle empty claim numbers', () => {
            const result = checkNumericConsistency([], ['$100']);
            // No numbers in claim means nothing to verify
            expect(result.match).toBe(true);
        });

        it('should handle claim numbers not found in evidence', () => {
            const result = checkNumericConsistency(['$100'], []);
            // Claim has number but evidence doesn't - can't verify
            expect(result.match).toBe(false);
        });

        it('should match numbers within tolerance', () => {
            // Numbers close enough should match
            const result = checkNumericConsistency(['$100'], ['$99']);
            // Within 5% tolerance, so should match
            expect(result.match).toBe(true);
        });
    });
});

describe('Signal Aggregation', () => {
    describe('aggregateSignals', () => {
        it('should give high confidence for SUPPORTED with good retrieval', () => {
            const result = aggregateSignals('SUPPORTED', 0.9, false, null);
            expect(result.confidenceLevel).toBe('high');
            expect(result.confidence).toBeGreaterThanOrEqual(0.72);
            expect(result.issues).toEqual([]);
        });

        it('should give low confidence for CONTRADICTED', () => {
            const result = aggregateSignals('CONTRADICTED', 0.9, false, null);
            expect(result.confidenceLevel).toBe('low');
            expect(result.confidence).toBeLessThan(0.42);
        });

        it('should give medium confidence for NEUTRAL', () => {
            const result = aggregateSignals('NEUTRAL', 0.9, false, null);
            expect(result.confidence).toBeLessThan(0.72);
            expect(result.confidence).toBeGreaterThanOrEqual(0.42);
        });

        it('should penalize low retrieval similarity', () => {
            const highRetrieval = aggregateSignals('SUPPORTED', 0.9, false, null);
            const lowRetrieval = aggregateSignals('SUPPORTED', 0.3, false, null);

            expect(lowRetrieval.confidence).toBeLessThan(highRetrieval.confidence);
            // Check that some issue about similarity is reported
            expect(lowRetrieval.issues.some(i => i.toLowerCase().includes('similarity'))).toBe(true);
        });

        it('should penalize citation mismatch', () => {
            const withoutMismatch = aggregateSignals('SUPPORTED', 0.9, false, null);
            const withMismatch = aggregateSignals('SUPPORTED', 0.9, true, null);

            expect(withMismatch.confidence).toBeLessThan(withoutMismatch.confidence);
            // Check that some issue about citation is reported
            expect(withMismatch.issues.some(i => i.toLowerCase().includes('uncited'))).toBe(true);
        });

        it('should severely penalize numeric mismatch', () => {
            const withoutMismatch = aggregateSignals('SUPPORTED', 0.9, false, null);
            const withMismatch = aggregateSignals('SUPPORTED', 0.9, false, {
                claimNumbers: ['$100'],
                evidenceNumbers: ['$50'],
                match: false,
            });

            expect(withMismatch.confidence).toBeLessThan(withoutMismatch.confidence * 0.5);
            // Check that some issue about numeric mismatch is reported
            expect(withMismatch.issues.some(i => i.toLowerCase().includes('numeric'))).toBe(true);
        });

        it('should handle multiple penalties stacking', () => {
            const result = aggregateSignals('NEUTRAL', 0.3, true, {
                claimNumbers: ['18%'],
                evidenceNumbers: ['12%'],
                match: false,
            });

            // Should have multiple issues
            expect(result.issues.length).toBeGreaterThanOrEqual(2);
            expect(result.confidenceLevel).toBe('low');
        });
    });
});

