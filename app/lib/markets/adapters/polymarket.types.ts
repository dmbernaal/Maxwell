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
