import { RateLimiter, QueryCache, withRetry } from '../../app/lib/market-chat/resilience';

describe('MarketChat — Resilience', () => {
  describe('RateLimiter', () => {
    it('should allow requests within limit', () => {
      const limiter = new RateLimiter(5, 60_000);
      for (let i = 0; i < 5; i++) {
        expect(limiter.check('user-1')).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      const limiter = new RateLimiter(3, 60_000);
      expect(limiter.check('user-1')).toBe(true);
      expect(limiter.check('user-1')).toBe(true);
      expect(limiter.check('user-1')).toBe(true);
      expect(limiter.check('user-1')).toBe(false);
    });

    it('should track different keys independently', () => {
      const limiter = new RateLimiter(2, 60_000);
      expect(limiter.check('user-1')).toBe(true);
      expect(limiter.check('user-1')).toBe(true);
      expect(limiter.check('user-1')).toBe(false);
      expect(limiter.check('user-2')).toBe(true);
    });

    it('should reset after window expires', () => {
      const limiter = new RateLimiter(1, 50);
      expect(limiter.check('user-1')).toBe(true);
      expect(limiter.check('user-1')).toBe(false);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(limiter.check('user-1')).toBe(true);
          resolve();
        }, 60);
      });
    });

    it('should return remaining count', () => {
      const limiter = new RateLimiter(5, 60_000);
      limiter.check('user-1');
      limiter.check('user-1');
      expect(limiter.remaining('user-1')).toBe(3);
    });
  });

  describe('QueryCache', () => {
    it('should return undefined for cache miss', () => {
      const cache = new QueryCache(10, 60_000);
      expect(cache.get('market-1', 'what is the price?')).toBeUndefined();
    });

    it('should return cached value for cache hit', () => {
      const cache = new QueryCache(10, 60_000);
      cache.set('market-1', 'what is the price?', 'The price is 42%');
      expect(cache.get('market-1', 'what is the price?')).toBe('The price is 42%');
    });

    it('should scope cache by market', () => {
      const cache = new QueryCache(10, 60_000);
      cache.set('market-1', 'price?', 'answer-1');
      cache.set('market-2', 'price?', 'answer-2');
      expect(cache.get('market-1', 'price?')).toBe('answer-1');
      expect(cache.get('market-2', 'price?')).toBe('answer-2');
    });

    it('should normalize queries (case-insensitive, trimmed)', () => {
      const cache = new QueryCache(10, 60_000);
      cache.set('m1', '  What Is The Price?  ', 'answer');
      expect(cache.get('m1', 'what is the price?')).toBe('answer');
    });

    it('should evict oldest entries when capacity exceeded', () => {
      const cache = new QueryCache(2, 60_000);
      cache.set('m1', 'q1', 'a1');
      cache.set('m1', 'q2', 'a2');
      cache.set('m1', 'q3', 'a3');
      expect(cache.get('m1', 'q1')).toBeUndefined();
      expect(cache.get('m1', 'q3')).toBe('a3');
    });

    it('should expire entries after TTL', () => {
      const cache = new QueryCache(10, 50);
      cache.set('m1', 'q1', 'a1');

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cache.get('m1', 'q1')).toBeUndefined();
          resolve();
        }, 60);
      });
    });
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn, 3);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail-1'))
        .mockResolvedValue('success');
      const result = await withRetry(fn, 3, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after exhausting retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always-fail'));
      await expect(withRetry(fn, 2, 10)).rejects.toThrow('always-fail');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should return fallback value on failure if provided', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const result = await withRetry(fn, 2, 10, 'fallback');
      expect(result).toBe('fallback');
    });
  });
});
