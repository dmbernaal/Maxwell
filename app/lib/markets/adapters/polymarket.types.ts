export interface PolymarketMarketRaw {
  id: string;
  question: string;
  slug: string;
  description: string;
  outcomes: string;        // JSON: '["Yes", "No"]'
  outcomePrices: string;   // JSON: '["0.24", "0.76"]'
  volume: string;          // String number
  volume24hr: string;
  liquidity: string;
  active: boolean;
  closed: boolean;
  endDate: string;
  createdTime?: string;    // Optional - not present in events response
  createdAt?: string;      // Alternative field name in events
  category?: string;       // Optional in events response
  image?: string;
  clobTokenIds?: string;
  enableOrderBook?: boolean;
  acceptingOrders?: boolean;
  groupItemTitle?: string;  // For grouped markets (e.g., "March 31, 2026")
  eventSlug?: string;       // Optional - if market belongs to an event
}

export interface PolymarketSeries {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  seriesType: string;
  recurrence: string;
  image?: string;
  icon?: string;
  layout: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  publishedAt: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  commentsEnabled: boolean;
  competitive: string;
  volume24hr: number;
  volume: number;
  liquidity: number;
  startDate: string;
  commentCount: number;
  requiresTranslation: boolean;
}

export interface PolymarketEventRaw {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  resolutionSource?: string;
  image?: string;
  icon?: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  liquidity: number;
  volume: number;
  volume24hr: number;
  createdAt: string;
  updatedAt: string;
  endDate: string;
  startDate: string;
  enableOrderBook: boolean;
  markets: PolymarketMarketRaw[];
  tags?: Array<{ label: string; slug: string }>;
  competitive?: number;
  series?: PolymarketSeries[];  // Array of series (usually 1)
}

export interface PolymarketPriceHistory {
  history: Array<{
    t: number;
    p: number;
  }>;
}

export interface PolymarketApiResponse {
  data?: PolymarketMarketRaw[];
  next_cursor?: string;
}

export interface PolymarketCommentRaw {
  id: string;
  body: string;
  userAddress: string;
  createdAt: string;
  profile: {
    name: string;
    pseudonym: string;
    profileImage: string;
    positions?: Array<{
      tokenId: string;
      positionSize: string;
    }>;
  };
  reactionCount: number;
  replyCount?: number;
}
