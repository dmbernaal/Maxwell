export class RateLimiter {
  private windows: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  check(key: string): boolean {
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || now >= entry.resetAt) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  remaining(key: string): number {
    const now = Date.now();
    const entry = this.windows.get(key);
    if (!entry || now >= entry.resetAt) return this.maxRequests;
    return Math.max(0, this.maxRequests - entry.count);
  }
}

export class QueryCache {
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private insertionOrder: string[] = [];

  constructor(
    private maxEntries: number,
    private ttlMs: number
  ) {}

  private normalizeKey(marketId: string, query: string): string {
    return `${marketId}::${query.toLowerCase().trim()}`;
  }

  get(marketId: string, query: string): string | undefined {
    const key = this.normalizeKey(marketId, query);
    const entry = this.cache.get(key);

    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      this.insertionOrder = this.insertionOrder.filter(k => k !== key);
      return undefined;
    }

    return entry.value;
  }

  set(marketId: string, query: string, value: string): void {
    const key = this.normalizeKey(marketId, query);

    if (this.cache.has(key)) {
      this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
      return;
    }

    while (this.insertionOrder.length >= this.maxEntries) {
      const oldest = this.insertionOrder.shift();
      if (oldest) this.cache.delete(oldest);
    }

    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    this.insertionOrder.push(key);
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  baseDelayMs: number = 500,
  fallback?: T
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  if (fallback !== undefined) return fallback;
  throw lastError;
}

export const chatRateLimiter = new RateLimiter(20, 60_000);

export const simpleQueryCache = new QueryCache(100, 5 * 60_000);
