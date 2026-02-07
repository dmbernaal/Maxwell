import { NextResponse } from 'next/server';
import { fetchUnifiedMarkets, createApiError } from '@/app/lib/markets/unified';
import { MarketsRequestSchema } from '@/app/lib/markets/validation';
import type { Platform } from '@/app/lib/markets/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const rawParams = {
      query: searchParams.get('query') || undefined,
      platform: searchParams.get('platform') || undefined,
      category: searchParams.get('category') || undefined,
      sort: searchParams.get('sort') || undefined,
      limit: searchParams.get('limit') || undefined,
      cursor: searchParams.get('cursor') || undefined,
    };

    const parsed = MarketsRequestSchema.safeParse(rawParams);
    
    if (!parsed.success) {
      return NextResponse.json(
        createApiError('INVALID_REQUEST', parsed.error.message),
        { status: 400 }
      );
    }

    const response = await fetchUnifiedMarkets({
      query: parsed.data.query,
      platform: parsed.data.platform as Platform | 'all',
      category: parsed.data.category,
      sort: parsed.data.sort,
      limit: parsed.data.limit,
      cursor: parsed.data.cursor,
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[Markets API] Error:', error);
    
    return NextResponse.json(
      createApiError('UPSTREAM_ERROR', error instanceof Error ? error.message : 'Unknown error'),
      { status: 502 }
    );
  }
}
