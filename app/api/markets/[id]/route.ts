import { NextResponse } from 'next/server';
import { fetchMarketById, fetchPriceHistory, fetchOrderBook, fetchMultiOutcomePriceHistory, createApiError } from '@/app/lib/markets/unified';
import type { MarketDetailResponse } from '@/app/lib/markets/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json(
        createApiError('INVALID_REQUEST', 'Market ID is required'),
        { status: 400 }
      );
    }

    const market = await fetchMarketById(decodeURIComponent(id));

    if (!market) {
      return NextResponse.json(
        createApiError('NOT_FOUND', `Market not found: ${id}`),
        { status: 404 }
      );
    }

    const isMultiOutcome = market.marketType === 'multi-option' && market.outcomes.length > 2;

    const [priceHistory, orderBook, outcomePriceHistories] = await Promise.all([
      fetchPriceHistory(market),
      fetchOrderBook(market),
      isMultiOutcome ? fetchMultiOutcomePriceHistory(market, 4) : Promise.resolve([]),
    ]);

    const response: MarketDetailResponse = {
      market: {
        ...market,
        priceHistory,
        outcomePriceHistories: outcomePriceHistories.length > 0 ? outcomePriceHistories : undefined,
        orderBook: orderBook ?? undefined,
        fullDescription: market.description || '',
      },
      asOf: Date.now(),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[Market Detail API] Error:', error);
    
    return NextResponse.json(
      createApiError('UPSTREAM_ERROR', error instanceof Error ? error.message : 'Unknown error'),
      { status: 502 }
    );
  }
}
