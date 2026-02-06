import { scoreSourceQuality, scoreRecency, getSourceTier } from '../../app/lib/market-chat/source-quality';

describe('MarketChat — Source Quality Scoring', () => {
  describe('scoreSourceQuality', () => {
    it('should return tier1 score for gold-standard sources', () => {
      expect(scoreSourceQuality('https://reuters.com/article/test')).toBe(0.95);
      expect(scoreSourceQuality('https://apnews.com/article/test')).toBe(0.95);
      expect(scoreSourceQuality('https://www.federalreserve.gov/data')).toBe(0.98);
      expect(scoreSourceQuality('https://fivethirtyeight.com/features/test')).toBe(0.98);
    });

    it('should return tier2 score for major outlets', () => {
      expect(scoreSourceQuality('https://www.bloomberg.com/news/test')).toBe(0.92);
      expect(scoreSourceQuality('https://www.wsj.com/articles/test')).toBe(0.90);
      expect(scoreSourceQuality('https://www.nytimes.com/2026/test')).toBe(0.88);
      expect(scoreSourceQuality('https://www.cnn.com/politics/test')).toBe(0.85);
    });

    it('should return tier3 score for acceptable sources', () => {
      expect(scoreSourceQuality('https://www.axios.com/test')).toBe(0.78);
      expect(scoreSourceQuality('https://thehill.com/test')).toBe(0.75);
    });

    it('should return tier4 score for low-quality sources', () => {
      expect(scoreSourceQuality('https://twitter.com/user/status/123')).toBe(0.40);
      expect(scoreSourceQuality('https://x.com/user/status/123')).toBe(0.40);
      expect(scoreSourceQuality('https://reddit.com/r/test')).toBe(0.35);
    });

    it('should strip www. prefix when matching domains', () => {
      expect(scoreSourceQuality('https://www.reuters.com/test')).toBe(0.95);
      expect(scoreSourceQuality('https://www.bbc.com/news')).toBe(0.88);
    });

    it('should return 0.50 default for unknown domains', () => {
      expect(scoreSourceQuality('https://randomsite.xyz/page')).toBe(0.50);
      expect(scoreSourceQuality('https://myblog.example.com')).toBe(0.50);
    });

    it('should return 0.30 for invalid URLs', () => {
      expect(scoreSourceQuality('not-a-url')).toBe(0.30);
      expect(scoreSourceQuality('')).toBe(0.30);
    });
  });

  describe('scoreRecency', () => {
    it('should return 1.0 for articles published today', () => {
      const now = new Date().toISOString();
      expect(scoreRecency(now)).toBe(1.0);
    });

    it('should return 0.95 for articles 2 days old', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
      expect(scoreRecency(twoDaysAgo)).toBe(0.95);
    });

    it('should return 0.85 for articles 5 days old', () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
      expect(scoreRecency(fiveDaysAgo)).toBe(0.85);
    });

    it('should return 0.75 for articles 10 days old', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
      expect(scoreRecency(tenDaysAgo)).toBe(0.75);
    });

    it('should return 0.60 for articles 20 days old', () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 86400000).toISOString();
      expect(scoreRecency(twentyDaysAgo)).toBe(0.60);
    });

    it('should return 0.40 for articles 60 days old', () => {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();
      expect(scoreRecency(sixtyDaysAgo)).toBe(0.40);
    });

    it('should return 0.25 for articles over 90 days old', () => {
      const oldArticle = new Date(Date.now() - 120 * 86400000).toISOString();
      expect(scoreRecency(oldArticle)).toBe(0.25);
    });
  });

  describe('getSourceTier', () => {
    it('should classify tier1 for scores >= 0.90', () => {
      expect(getSourceTier(0.98)).toBe('tier1');
      expect(getSourceTier(0.90)).toBe('tier1');
    });

    it('should classify tier2 for scores >= 0.80', () => {
      expect(getSourceTier(0.89)).toBe('tier2');
      expect(getSourceTier(0.80)).toBe('tier2');
    });

    it('should classify tier3 for scores >= 0.65', () => {
      expect(getSourceTier(0.79)).toBe('tier3');
      expect(getSourceTier(0.65)).toBe('tier3');
    });

    it('should classify tier4 for scores < 0.65', () => {
      expect(getSourceTier(0.64)).toBe('tier4');
      expect(getSourceTier(0.30)).toBe('tier4');
      expect(getSourceTier(0.0)).toBe('tier4');
    });
  });
});
