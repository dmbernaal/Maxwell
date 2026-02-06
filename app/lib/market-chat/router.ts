import { streamText, stepCountIs, type ModelMessage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '../env';
import { fetchMarketById } from '../markets/unified';
import type { UnifiedMarket } from '../markets/types';
import type { MaxwellIntelligence } from '../maxwell/types';
import type { ServerEvent, CostBreakdown, ScoredSource } from './types';
import { emptyCost } from './types';
import { classifyComplexity } from './classifier';
import { buildMarketChatSystemPrompt } from './context-builder';
import { calculateLLMCost } from './costs';
import { searchNewsTool } from './tools/search-news';
import { calculateTool } from './tools/calculate';
import { createMarketDataTool } from './tools/market-data';
import { deepExtractTool } from './tools/deep-extract';
import type { SearchNewsResult } from './tools/search-news';
import type { ExtractedFact } from './memory';
import { filterActiveFacts, extractFacts } from './memory';
import { runDeepResearch } from './deep-research';

const MAIN_MODEL = 'google/gemini-3-flash-preview';

const openrouter = createOpenRouter({ apiKey: env.openRouterApiKey() });

function toCoreMessages(
  history: Array<{ role: string; content: string }>,
  latestQuery: string
): ModelMessage[] {
  const msgs: ModelMessage[] = history.map(m => ({
    role: m.role === 'agent' ? 'assistant' as const : 'user' as const,
    content: m.content,
  }));
  msgs.push({ role: 'user', content: latestQuery });
  return msgs;
}

async function* emitFacts(responseText: string): AsyncGenerator<ServerEvent> {
  try {
    const facts = await extractFacts(responseText);
    if (facts.length > 0) {
      yield { type: 'facts', facts };
    }
  } catch {
    // Non-blocking — fact extraction failure should never break the response
  }
}

export async function* handleMarketChatQuery(
  query: string,
  marketId: string,
  messages: Array<{ role: string; content: string }>,
  maxwellReport: MaxwellIntelligence | null = null,
  conversationFacts: ExtractedFact[] = []
): AsyncGenerator<ServerEvent> {
  const startTime = Date.now();

  let market: UnifiedMarket | null;
  try {
    market = await fetchMarketById(marketId);
  } catch {
    yield { type: 'error', message: 'Failed to fetch market data', code: 'MARKET_FETCH_ERROR' };
    return;
  }

  if (!market) {
    yield { type: 'error', message: 'Market not found', code: 'NOT_FOUND' };
    return;
  }

  const totalCost: CostBreakdown = emptyCost();

  const complexity = await classifyComplexity(
    query,
    market.title,
    !!maxwellReport,
    messages.slice(-4).map(m => ({ role: m.role, content: m.content }))
  );
  totalCost.classification = 0.00015;

  const activeFacts = filterActiveFacts(conversationFacts).map(f => f.content);
  const systemPrompt = buildMarketChatSystemPrompt(market, maxwellReport, activeFacts);

  switch (complexity) {
    case 'simple':
      yield* handleSimple(query, systemPrompt, messages, totalCost, startTime);
      break;
    case 'moderate':
      yield* handleModerate(query, systemPrompt, messages, market, totalCost, startTime);
      break;
    case 'complex':
      yield* handleComplex(query, systemPrompt, messages, market, totalCost, startTime);
      break;
    case 'research':
      yield* runDeepResearch(query, systemPrompt, messages, market, maxwellReport, totalCost, startTime);
      break;
  }
}

async function* handleSimple(
  query: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  totalCost: CostBreakdown,
  startTime: number,
): AsyncGenerator<ServerEvent> {
  yield { type: 'status', status: 'thinking' };

  let fullText = '';
  const result = streamText({
    model: openrouter(MAIN_MODEL),
    system: systemPrompt,
    messages: toCoreMessages(messages, query),
    maxOutputTokens: 1500,
    temperature: 0.3,
  });

  for await (const chunk of result.textStream) {
    fullText += chunk;
    yield { type: 'chunk', content: chunk };
  }

  const usage = await result.usage;
  totalCost.llm += calculateLLMCost(
    { promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0 },
    MAIN_MODEL
  );
  totalCost.total = totalCost.llm + totalCost.search + totalCost.extract + totalCost.classification;

  yield* emitFacts(fullText);

  yield {
    type: 'complete',
    tier: 'simple',
    cost: totalCost,
    latencyMs: Date.now() - startTime,
  };
}

async function* handleModerate(
  query: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  market: UnifiedMarket,
  totalCost: CostBreakdown,
  startTime: number,
): AsyncGenerator<ServerEvent> {
  yield { type: 'status', status: 'thinking' };

  let fullText = '';
  const collectedSources: ScoredSource[] = [];

  const result = streamText({
    model: openrouter(MAIN_MODEL),
    system: systemPrompt,
    messages: toCoreMessages(messages, query),
    tools: {
      search_news: searchNewsTool,
      calculate: calculateTool,
      get_market_data: createMarketDataTool(market),
    },
    stopWhen: stepCountIs(5),
    temperature: 0.3,
    maxOutputTokens: 2000,
  });

  for await (const event of result.fullStream) {
    if (event.type === 'text-delta') {
      fullText += event.text;
      yield { type: 'chunk', content: event.text };
    } else if (event.type === 'tool-call') {
      const statusMap: Record<string, string> = {
        search_news: 'searching',
        calculate: 'calculating',
        get_market_data: 'searching',
      };
      yield { type: 'status', status: statusMap[event.toolName] || 'thinking', tool: event.toolName };
    } else if (event.type === 'tool-result') {
      const output = (event as any).result as SearchNewsResult | undefined;
      if (output && 'results' in output && Array.isArray(output.results)) {
        collectedSources.push(...output.results);
        if ('searchCost' in output && typeof output.searchCost === 'number') {
          totalCost.search += output.searchCost;
        }
      }
    }
  }

  const usage = await result.usage;
  totalCost.llm += calculateLLMCost(
    { promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0 },
    MAIN_MODEL
  );
  totalCost.total = totalCost.llm + totalCost.search + totalCost.extract + totalCost.classification;

  if (collectedSources.length > 0) {
    yield { type: 'sources', sources: collectedSources };
  }

  yield* emitFacts(fullText);

  yield {
    type: 'complete',
    tier: 'moderate',
    cost: totalCost,
    latencyMs: Date.now() - startTime,
  };
}

async function* handleComplex(
  query: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  market: UnifiedMarket,
  totalCost: CostBreakdown,
  startTime: number,
): AsyncGenerator<ServerEvent> {
  yield { type: 'status', status: 'thinking' };

  let fullText = '';
  const collectedSources: ScoredSource[] = [];

  const result = streamText({
    model: openrouter(MAIN_MODEL),
    system: systemPrompt,
    messages: toCoreMessages(messages, query),
    tools: {
      search_news: searchNewsTool,
      calculate: calculateTool,
      get_market_data: createMarketDataTool(market),
      deep_extract: deepExtractTool,
    },
    stopWhen: stepCountIs(8),
    temperature: 0.3,
    maxOutputTokens: 2500,
  });

  for await (const event of result.fullStream) {
    if (event.type === 'text-delta') {
      fullText += event.text;
      yield { type: 'chunk', content: event.text };
    } else if (event.type === 'tool-call') {
      const statusMap: Record<string, string> = {
        search_news: 'searching',
        calculate: 'calculating',
        get_market_data: 'searching',
        deep_extract: 'researching',
      };
      yield { type: 'status', status: statusMap[event.toolName] || 'thinking', tool: event.toolName };
    } else if (event.type === 'tool-result') {
      const output = (event as any).result;
      if (output && 'results' in output && Array.isArray(output.results)) {
        if (output.results[0]?.qualityScore !== undefined) {
          collectedSources.push(...output.results);
        }
        if ('searchCost' in output && typeof output.searchCost === 'number') {
          totalCost.search += output.searchCost;
        }
        if ('extractCost' in output && typeof output.extractCost === 'number') {
          totalCost.extract += output.extractCost;
        }
      }
    }
  }

  const usage = await result.usage;
  totalCost.llm += calculateLLMCost(
    { promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0 },
    MAIN_MODEL
  );
  totalCost.total = totalCost.llm + totalCost.search + totalCost.extract + totalCost.classification;

  if (collectedSources.length > 0) {
    yield { type: 'sources', sources: collectedSources };
  }

  yield* emitFacts(fullText);

  yield {
    type: 'complete',
    tier: 'complex',
    cost: totalCost,
    latencyMs: Date.now() - startTime,
  };
}
