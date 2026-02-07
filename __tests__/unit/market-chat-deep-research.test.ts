import { assessConfidence, type GatheredEvidence } from '../../app/lib/market-chat/deep-research';

describe('MarketChat — Deep Research', () => {
  describe('assessConfidence', () => {
    it('should return 0 for empty evidence', () => {
      expect(assessConfidence([])).toBe(0);
    });

    it('should return high confidence for many high-quality agreeing sources', () => {
      const evidence: GatheredEvidence[] = Array.from({ length: 8 }, (_, i) => ({
        claim: `Claim ${i}`,
        sources: [
          { id: 1, title: 'Reuters', url: 'https://reuters.com', snippet: '', score: 0.9, qualityScore: 0.95, recencyScore: 0.9, adjustedScore: 0.85, qualityTier: 'tier1' as const },
          { id: 2, title: 'AP', url: 'https://apnews.com', snippet: '', score: 0.9, qualityScore: 0.95, recencyScore: 0.9, adjustedScore: 0.85, qualityTier: 'tier1' as const },
        ],
        confidence: 0.9,
        agreementScore: 0.95,
      }));

      const confidence = assessConfidence(evidence);
      expect(confidence).toBeGreaterThan(0.80);
    });

    it('should return low confidence for few low-quality sources', () => {
      const evidence: GatheredEvidence[] = [{
        claim: 'Some claim',
        sources: [
          { id: 1, title: 'Reddit', url: 'https://reddit.com', snippet: '', score: 0.3, qualityScore: 0.35, recencyScore: 0.5, adjustedScore: 0.2, qualityTier: 'tier4' as const },
        ],
        confidence: 0.3,
        agreementScore: 0.2,
      }];

      const confidence = assessConfidence(evidence);
      expect(confidence).toBeLessThan(0.50);
    });

    it('should weight coverage factor (more evidence = higher confidence)', () => {
      const makeEvidence = (count: number): GatheredEvidence[] =>
        Array.from({ length: count }, (_, i) => ({
          claim: `Claim ${i}`,
          sources: [
            { id: 1, title: 'BBC', url: 'https://bbc.com', snippet: '', score: 0.8, qualityScore: 0.88, recencyScore: 0.85, adjustedScore: 0.75, qualityTier: 'tier2' as const },
          ],
          confidence: 0.7,
          agreementScore: 0.7,
        }));

      const fewEvidence = assessConfidence(makeEvidence(2));
      const manyEvidence = assessConfidence(makeEvidence(8));

      expect(manyEvidence).toBeGreaterThan(fewEvidence);
    });

    it('should return value between 0 and 1', () => {
      const evidence: GatheredEvidence[] = [{
        claim: 'Test',
        sources: [
          { id: 1, title: 'Test', url: 'https://test.com', snippet: '', score: 0.5, qualityScore: 0.5, recencyScore: 0.5, adjustedScore: 0.25, qualityTier: 'tier3' as const },
        ],
        confidence: 0.5,
        agreementScore: 0.5,
      }];

      const confidence = assessConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });
});
