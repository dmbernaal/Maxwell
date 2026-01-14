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
  createdTime: string;
  category: string;
  image?: string;
  clobTokenIds?: string;
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
