/**
 * Maxwell Prediction Markets - Core Types
 * 
 * This file defines the normalized types for the prediction market feature.
 * These types form the CONTRACT between API adapters, API routes, and frontend components.
 * 
 * @see prd/types.prd.md for full specification
 */

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Supported prediction market platforms
 */
export type Platform = 'polymarket' | 'kalshi';

/**
 * Market type classification for UI rendering
 */
export type MarketType = 'binary' | 'matchup' | 'multi-option';

/**
 * Individual outcome/option in a market
 */
export interface MarketOutcome {
  name: string;
  price: number;
  imageUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED MARKET
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalized market data from any platform.
 * This is the SINGLE SOURCE OF TRUTH for the frontend.
 */
export interface UnifiedMarket {
  // ─────────────────────────────────────────────
  // IDENTITY
  // ─────────────────────────────────────────────
  
  /** Prefixed ID: "poly:abc123" or "kalshi:KXBTC" */
  id: string;
  
  /** Original platform ID (no prefix) */
  externalId: string;
  
  /** Source platform */
  platform: Platform;
  
  /** URL-friendly slug */
  slug: string;
  
  /** Direct link to market on platform */
  url: string;
  
  // ─────────────────────────────────────────────
  // DISPLAY
  // ─────────────────────────────────────────────
  
  /** Market question/title */
  title: string;
  
  /** Full description (may be long) */
  description?: string;
  
  /** Category: "Politics", "Economics", "Science", etc. */
  category: string;
  
  /** Market image URL if available */
  imageUrl?: string;
  
  // ─────────────────────────────────────────────
  // MARKET TYPE & OUTCOMES
  // ─────────────────────────────────────────────
  
  /** Classification for UI rendering */
  marketType: MarketType;
  
  /** All outcomes with their prices (supports multi-outcome) */
  outcomes: MarketOutcome[];
  
  // ─────────────────────────────────────────────
  // PRICING (NORMALIZED TO 0-1) - Legacy for binary
  // ─────────────────────────────────────────────
  
  /** YES probability (0.0 - 1.0) */
  yesPrice: number;
  
  /** NO probability (0.0 - 1.0) */
  noPrice: number;
  
  /** Last trade price */
  lastPrice?: number;
  
  /** Previous price (for calculating change) */
  previousPrice?: number;
  
  // ─────────────────────────────────────────────
  // BID/ASK (NORMALIZED TO 0-1)
  // ─────────────────────────────────────────────
  
  /** Best bid for YES */
  yesBid?: number;
  
  /** Best ask for YES */
  yesAsk?: number;
  
  /** Best bid for NO */
  noBid?: number;
  
  /** Best ask for NO */
  noAsk?: number;
  
  // ─────────────────────────────────────────────
  // VOLUME (NORMALIZED TO USD)
  // ─────────────────────────────────────────────
  
  /** Total volume in USD */
  volume: number;
  
  /** 24-hour volume in USD */
  volume24h: number;
  
  /** Current liquidity */
  liquidity?: number;
  
  /** Open interest (contracts outstanding) */
  openInterest?: number;
  
  // ─────────────────────────────────────────────
  // TIMING
  // ─────────────────────────────────────────────
  
  /** Resolution deadline */
  endDate: Date;
  
  /** Market creation date */
  createdAt: Date;
  
  /** Market status */
  status: 'open' | 'closed' | 'resolved';
  
  // ─────────────────────────────────────────────
  // RESOLUTION
  // ─────────────────────────────────────────────
  
  /** Resolution rules text */
  rules?: string;
  
  /** Resolution source description */
  resolutionSource?: string;
  
  /** Final result (if resolved) */
  result?: 'yes' | 'no' | null;
  
  // ─────────────────────────────────────────────
  // UI HELPERS
  // ─────────────────────────────────────────────
  
  /** Is this market trending? */
  trending?: boolean;
  
  /** Featured/promoted market? */
  featured?: boolean;
  
  /** Event grouping ID (for related markets) */
  eventId?: string;
  
  /** Event title for grouping */
  eventTitle?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTENDED TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Price history data point
 */
export interface PricePoint {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  
  /** Price (0.0 - 1.0) */
  price: number;
}

/**
 * Price history for a single outcome in multi-outcome markets
 */
export interface OutcomePriceHistory {
  outcomeName: string;
  tokenId?: string;
  history: PricePoint[];
  color?: string;
}

/**
 * Order book data
 */
export interface OrderBook {
  /** Bid orders: [price, size][] */
  bids: [number, number][];
  
  /** Ask orders: [price, size][] */
  asks: [number, number][];
  
  /** Timestamp when fetched */
  asOf: number;
}

/**
 * Market with full detail (for detail page)
 */
export interface UnifiedMarketDetail extends UnifiedMarket {
  /** Historical price data (for binary/simple markets) */
  priceHistory: PricePoint[];
  
  /** Per-outcome price history (for multi-outcome markets) */
  outcomePriceHistories?: OutcomePriceHistory[];
  
  /** Current order book */
  orderBook?: OrderBook;
  
  /** Full description (never truncated) */
  fullDescription: string;
  
  /** Related markets (same event/series) */
  relatedMarkets?: UnifiedMarket[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/markets request query params
 */
export interface MarketsRequest {
  query?: string;
  platform?: Platform | 'all';
  category?: string;
  sort?: 'volume' | 'trending' | 'endDate' | 'newest';
  limit?: number;
  cursor?: string;
}

/**
 * GET /api/markets response
 */
export interface MarketsResponse {
  markets: UnifiedMarket[];
  nextCursor?: string;
  totalCount?: number;
  asOf: number;
}

/**
 * GET /api/markets/:id response
 */
export interface MarketDetailResponse {
  market: UnifiedMarketDetail;
  asOf: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ApiErrorCode = 
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'AUTH_ERROR'
  | 'NORMALIZATION_ERROR';

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    retryAfterMs?: number;
    source?: Platform;
    details?: unknown;
  };
  asOf: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT PROP TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketCardProps {
  market: UnifiedMarket;
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

export interface MarketGridProps {
  markets: UnifiedMarket[];
  isLoading?: boolean;
  onMarketClick: (market: UnifiedMarket) => void;
}

export interface MarketAutocompleteProps {
  query: string;
  results: UnifiedMarket[];
  trendingQueries: string[];
  onSelectMarket: (market: UnifiedMarket) => void;
  onSelectQuery: (query: string) => void;
  isVisible: boolean;
}

export interface MarketDataPanelProps {
  market: UnifiedMarketDetail;
  isLoading?: boolean;
}

export interface PriceChartProps {
  data: PricePoint[];
  platform: Platform;
  interval: '1h' | '1d' | '1w' | '1m' | 'all';
  onIntervalChange: (interval: string) => void;
}

export interface OrderBookProps {
  orderBook: OrderBook;
  platform: Platform;
}
