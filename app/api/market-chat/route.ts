import { NextRequest } from 'next/server';
import { handleMarketChatQuery } from '@/app/lib/market-chat/router';
import type { ServerEvent, MarketChatRequest } from '@/app/lib/market-chat/types';
import type { ExtractedFact } from '@/app/lib/market-chat/memory';
import { chatRateLimiter } from '@/app/lib/market-chat/resilience';

export const maxDuration = 60;

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req);

  if (!chatRateLimiter.check(clientIP)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please wait before sending more messages.' }),
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  let body: MarketChatRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { marketId, messages, maxwellReport, conversationFacts } = body;

  if (!marketId || !messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Invalid request: marketId and messages required' }), { status: 400 });
  }

  if (messages.length > 50) {
    return new Response(JSON.stringify({ error: 'Conversation too long. Please start a new chat.' }), { status: 400 });
  }

  const latestQuery = messages[messages.length - 1]?.content;
  if (!latestQuery || latestQuery.length > 2000) {
    return new Response(JSON.stringify({ error: 'Query must be between 1 and 2000 characters.' }), { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const emit = (event: ServerEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const closeStream = () => {
        if (closed) return;
        closed = true;
        try {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch {
          // Already closed
        }
      };

      req.signal.addEventListener('abort', () => {
        closeStream();
      });

      try {
        const facts = (conversationFacts ?? []) as ExtractedFact[];
        for await (const event of handleMarketChatQuery(latestQuery, marketId, messages, maxwellReport ?? null, facts)) {
          if (req.signal.aborted || closed) break;
          emit(event);
        }
      } catch (error) {
        if (!req.signal.aborted) {
          emit({
            type: 'error',
            message: error instanceof Error ? error.message : 'Internal server error',
            code: 'INTERNAL_ERROR',
          });
        }
      } finally {
        closeStream();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-RateLimit-Remaining': String(chatRateLimiter.remaining(clientIP)),
    },
  });
}
