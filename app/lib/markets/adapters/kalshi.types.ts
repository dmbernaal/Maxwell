export interface KalshiMarketRaw {
  ticker: string;
  title: string;
  subtitle: string;
  event_ticker: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  previous_price?: number;
  previous_yes_bid?: number;
  volume: number;
  volume_24h: number;
  open_interest: number;
  liquidity?: number;
  close_time: number;
  open_time: number;
  status: 'open' | 'closed' | 'settled' | 'active';
  result: 'yes' | 'no' | '' | null;
  category: string;
  rules_primary?: string;
  rules_secondary?: string;
  settlement_source_url?: string;
}

export interface KalshiOrderBookRaw {
  orderbook: {
    yes: Array<[number, number]>;
    no: Array<[number, number]>;
  };
}

export interface KalshiMarketsResponse {
  markets: KalshiMarketRaw[];
  cursor?: string;
}

export interface KalshiMarketResponse {
  market: KalshiMarketRaw;
}
