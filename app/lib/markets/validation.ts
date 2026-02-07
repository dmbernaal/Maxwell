import { z } from 'zod';

export const PlatformSchema = z.enum(['polymarket', 'kalshi']);

export const UnifiedMarketSchema = z.object({
  id: z.string().regex(/^(poly|kalshi):/),
  externalId: z.string(),
  platform: PlatformSchema,
  slug: z.string(),
  url: z.string().url(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string(),
  imageUrl: z.string().url().optional().nullable(),
  yesPrice: z.number().min(0).max(1),
  noPrice: z.number().min(0).max(1),
  lastPrice: z.number().min(0).max(1).optional(),
  volume: z.number().min(0),
  volume24h: z.number().min(0),
  liquidity: z.number().min(0).optional(),
  openInterest: z.number().min(0).optional(),
  endDate: z.coerce.date(),
  createdAt: z.coerce.date(),
  status: z.enum(['open', 'closed', 'resolved']),
  rules: z.string().optional(),
  resolutionSource: z.string().optional(),
  result: z.enum(['yes', 'no']).nullable().optional(),
  trending: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export const PricePointSchema = z.object({
  timestamp: z.number(),
  price: z.number().min(0).max(1),
});

export const OrderBookSchema = z.object({
  bids: z.array(z.tuple([z.number(), z.number()])),
  asks: z.array(z.tuple([z.number(), z.number()])),
  asOf: z.number(),
});

export const UnifiedMarketDetailSchema = UnifiedMarketSchema.extend({
  priceHistory: z.array(PricePointSchema),
  orderBook: OrderBookSchema.optional(),
  fullDescription: z.string(),
  relatedMarkets: z.array(UnifiedMarketSchema).optional(),
});

export const MarketsRequestSchema = z.object({
  query: z.string().optional(),
  platform: z.enum(['polymarket', 'kalshi', 'all']).optional(),
  category: z.string().optional(),
  sort: z.enum(['volume', 'trending', 'endDate', 'newest']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

export const MarketsResponseSchema = z.object({
  markets: z.array(UnifiedMarketSchema),
  nextCursor: z.string().optional(),
  totalCount: z.number().optional(),
  asOf: z.number(),
});

export const ApiErrorCodeSchema = z.enum([
  'RATE_LIMITED',
  'UPSTREAM_ERROR',
  'INVALID_REQUEST',
  'NOT_FOUND',
  'AUTH_ERROR',
  'NORMALIZATION_ERROR',
]);

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    retryAfterMs: z.number().optional(),
    source: PlatformSchema.optional(),
    details: z.unknown().optional(),
  }),
  asOf: z.number(),
});
