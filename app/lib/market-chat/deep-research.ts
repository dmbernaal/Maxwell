import { generateText, streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '../env';
import type { UnifiedMarket } from '../markets/types';
import type { MaxwellIntelligence } from '../maxwell/types';
import type { ServerEvent, ScoredSource, CostBreakdown } from './types';
import { emptyCost } from './types';
import { scoreSourceQuality, scoreRecency, getSourceTier } from './source-quality';
import { calculateLLMCost } from './costs';
import { createResearchPlan, type ResearchPlan } from './planner';
import { buildMarketChatSystemPrompt } from './context-builder';

const FLASH_MODEL = 'google/gemini-3-flash-preview';
const PRO_MODEL = 'google/gemini-3-pro-preview';
const CONFIDENCE_THRESHOLD = 0.80;
const MAX_ITERATIONS = 3;

export interface GatheredEvidence {
  claim: string;
  sources: ScoredSource[];
  confidence: number;
  agreementScore: number;
}

interface ResearchState {
  iteration: number;
  evidence: GatheredEvidence[];
  confidence: number;
  allSources: ScoredSource[];
  searchQueries: string[];
}

export function assessConfidence(evidence: GatheredEvidence[]): number {
  if (evidence.length === 0) return 0;

  const avgSourceQuality = evidence.reduce((sum, e) => {
    if (e.sources.length === 0) return sum;
    return sum + e.sources.reduce((s, src) => s + src.qualityScore, 0) / e.sources.length;
  }, 0) / evidence.length;

  const avgAgreement = evidence.reduce((sum, e) => sum + e.agreementScore, 0) / evidence.length;
  const coverageFactor = Math.min(1, evidence.length / 8);

  return (avgSourceQuality * 0.3) + (avgAgreement * 0.4) + (coverageFactor * 0.3);
}

async function executeSearchTask(
  params: Record<string, any>
): Promise<{ sources: ScoredSource[]; tavilyAnswer?: string; cost: number }> {
  const query = params.query || '';
  const depth = params.depth || 'basic';
  const topic = params.topic || 'general';
  const maxResults = params.maxResults || 5;

  let time_range: string | undefined;
  if (params.days) {
    if (params.days <= 1) time_range = 'day';
    else if (params.days <= 7) time_range = 'week';
    else if (params.days <= 30) time_range = 'month';
    else time_range = 'year';
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: env.tavilyApiKey(),
        query,
        max_results: maxResults,
        search_depth: depth,
        topic,
        time_range,
        include_answer: true,
        include_raw_content: depth === 'advanced',
        chunks_per_source: depth === 'advanced' ? 3 : undefined,
      }),
    });

    if (!response.ok) {
      return { sources: [], cost: depth === 'advanced' ? 0.016 : 0.008 };
    }

    const data = await response.json();
    const sources: ScoredSource[] = (data.results || []).map((r: any, i: number) => {
      const quality = scoreSourceQuality(r.url);
      const recency = r.published_date ? scoreRecency(r.published_date) : 0.5;
      return {
        id: i + 1,
        title: r.title,
        url: r.url,
        snippet: r.content,
        score: r.score || 0.5,
        qualityScore: quality,
        recencyScore: recency,
        adjustedScore: (r.score || 0.5) * quality * recency,
        qualityTier: getSourceTier(quality),
        publishedDate: r.published_date,
      };
    }).sort((a: ScoredSource, b: ScoredSource) => b.adjustedScore - a.adjustedScore);

    return {
      sources,
      tavilyAnswer: data.answer,
      cost: depth === 'advanced' ? 0.016 : 0.008,
    };
  } catch {
    return { sources: [], cost: depth === 'advanced' ? 0.016 : 0.008 };
  }
}

async function aggregateIntoEvidence(
  searchResults: Array<{ sources: ScoredSource[]; tavilyAnswer?: string }>,
  query: string
): Promise<GatheredEvidence[]> {
  const allSources = searchResults.flatMap(r => r.sources);
  if (allSources.length === 0) return [];

  const openrouter = createOpenRouter({ apiKey: env.openRouterApiKey() });

  try {
    const { text } = await generateText({
      model: openrouter(FLASH_MODEL),
      prompt: `Given these search results for "${query}", extract key claims with evidence.

Sources:
${allSources.slice(0, 15).map((s, i) => `[${i + 1}] ${s.title}: ${s.snippet?.slice(0, 200)}`).join('\n')}

Return JSON array: [{"claim": "specific factual claim", "sourceIds": [1,2], "confidence": 0.0-1.0, "agreementScore": 0.0-1.0}]
- confidence: how certain is this claim based on source quality
- agreementScore: how many sources agree (1.0 = all agree, 0.5 = mixed, 0.0 = contradicted)
Extract 3-6 claims maximum.`,
      maxOutputTokens: 800,
      temperature: 0.1,
    });

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const claims = JSON.parse(cleaned);

    if (!Array.isArray(claims)) return [];

    return claims.slice(0, 6).map((c: any) => ({
      claim: c.claim || '',
      sources: (c.sourceIds || [])
        .filter((id: number) => id >= 1 && id <= allSources.length)
        .map((id: number) => allSources[id - 1]),
      confidence: Math.max(0, Math.min(1, c.confidence || 0.5)),
      agreementScore: Math.max(0, Math.min(1, c.agreementScore || 0.5)),
    }));
  } catch {
    return allSources.slice(0, 3).map(s => ({
      claim: s.snippet?.slice(0, 100) || s.title,
      sources: [s],
      confidence: s.qualityScore * 0.8,
      agreementScore: 0.5,
    }));
  }
}

async function identifyGapsAndRefine(
  evidence: GatheredEvidence[],
  originalQuery: string,
  previousQueries: string[]
): Promise<string[]> {
  const openrouter = createOpenRouter({ apiKey: env.openRouterApiKey() });

  try {
    const { text } = await generateText({
      model: openrouter(FLASH_MODEL),
      prompt: `Given research evidence for "${originalQuery}":

Evidence:
${evidence.map(e => `- ${e.claim} (confidence: ${e.confidence.toFixed(2)}, agreement: ${e.agreementScore.toFixed(2)})`).join('\n')}

Previous searches: ${previousQueries.join('; ')}

Generate 2-3 refined search queries to fill knowledge gaps. Avoid repeating previous queries.
Return as JSON array of strings.`,
      maxOutputTokens: 300,
      temperature: 0.3,
    });

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const queries = JSON.parse(cleaned);
    return Array.isArray(queries) ? queries.slice(0, 3) : [];
  } catch {
    return [];
  }
}

export async function* runDeepResearch(
  query: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  market: UnifiedMarket,
  maxwellReport: MaxwellIntelligence | null,
  totalCost: CostBreakdown,
  startTime: number
): AsyncGenerator<ServerEvent> {
  const state: ResearchState = {
    iteration: 0,
    evidence: [],
    confidence: 0,
    allSources: [],
    searchQueries: [],
  };

  yield { type: 'status', status: 'planning', estimatedTime: '20-30 seconds' };

  let plan: ResearchPlan;
  try {
    plan = await createResearchPlan(query, market, maxwellReport);
    totalCost.llm += calculateLLMCost({ promptTokens: 2000, completionTokens: 1000 }, PRO_MODEL);
  } catch {
    yield* fallbackToModerate(query, systemPrompt, messages, market, totalCost, startTime);
    return;
  }

  while (state.iteration < MAX_ITERATIONS && state.confidence < CONFIDENCE_THRESHOLD) {
    state.iteration++;

    yield {
      type: 'status',
      status: 'researching',
      estimatedTime: state.iteration === 1 ? '15-20 seconds' : '10 seconds',
    };

    const searchTasks = plan.subtasks.filter(t => t.type === 'search');
    const searchPromises = searchTasks.map(task => executeSearchTask(task.params));
    const searchResults = await Promise.allSettled(searchPromises);

    const successfulResults: Array<{ sources: ScoredSource[]; tavilyAnswer?: string }> = [];
    for (const result of searchResults) {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
        totalCost.search += result.value.cost;
        state.allSources.push(...result.value.sources);
      }
    }

    state.searchQueries.push(...searchTasks.map(t => t.params.query || ''));

    const newEvidence = await aggregateIntoEvidence(successfulResults, query);
    totalCost.llm += calculateLLMCost({ promptTokens: 1500, completionTokens: 500 }, FLASH_MODEL);
    state.evidence.push(...newEvidence);

    state.confidence = assessConfidence(state.evidence);

    if (state.confidence >= CONFIDENCE_THRESHOLD) break;

    if (state.iteration < MAX_ITERATIONS) {
      const refinedQueries = await identifyGapsAndRefine(
        state.evidence,
        query,
        state.searchQueries
      );
      totalCost.llm += calculateLLMCost({ promptTokens: 800, completionTokens: 300 }, FLASH_MODEL);

      if (refinedQueries.length > 0) {
        plan = {
          ...plan,
          subtasks: refinedQueries.map((q, i) => ({
            id: `search-${state.iteration + 1}-${i}`,
            type: 'search' as const,
            description: q,
            params: { query: q, depth: 'advanced', days: 7, maxResults: 8, topic: 'news' },
            dependsOn: [],
          })),
        };
      }
    }
  }

  yield { type: 'status', status: 'synthesizing' };

  const openrouter = createOpenRouter({ apiKey: env.openRouterApiKey() });

  const evidenceSummary = state.evidence
    .map((e, i) => `${i + 1}. ${e.claim} (confidence: ${e.confidence.toFixed(2)}, sources: ${e.sources.length})`)
    .join('\n');

  const sourceSummary = state.allSources
    .sort((a, b) => b.adjustedScore - a.adjustedScore)
    .slice(0, 10)
    .map((s, i) => `[${i + 1}] ${s.title} — ${new URL(s.url).hostname} (${s.qualityTier})`)
    .join('\n');

  const synthesisPrompt = `You are synthesizing a deep research report for a prediction market query.

MARKET: ${market.title}
PRICE: ${(market.yesPrice * 100).toFixed(1)}%
${maxwellReport ? `ANALYSIS VERDICT: ${maxwellReport.assessment.verdict} (${maxwellReport.assessment.confidence})` : ''}

USER QUERY: "${query}"

RESEARCH EVIDENCE (${state.iteration} iteration${state.iteration > 1 ? 's' : ''}, confidence: ${(state.confidence * 100).toFixed(0)}%):
${evidenceSummary}

SOURCES:
${sourceSummary}

Write a comprehensive research report using this structure:
## Research Report

### Executive Summary
2-3 sentences with key finding and recommendation.

### Key Findings
Numbered findings with citations [1][2].

### Probability Assessment
Market price vs our estimate, confidence level, edge.

### Risk Factors
Key risks with severity.

### Recommendation
BUY/SELL/HOLD with reasoning.

Rules:
- Cite sources as [1], [2], etc.
- Bold key numbers and verdicts
- Never say "Maxwell" — say "our analysis"
- Be direct and actionable`;

  const result = streamText({
    model: openrouter(PRO_MODEL),
    prompt: synthesisPrompt,
    maxOutputTokens: 3000,
    temperature: 0.3,
  });

  for await (const chunk of result.textStream) {
    yield { type: 'chunk', content: chunk };
  }

  const usage = await result.usage;
  totalCost.llm += calculateLLMCost(
    { promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0 },
    PRO_MODEL
  );
  totalCost.total = totalCost.llm + totalCost.search + totalCost.extract + totalCost.classification;

  const uniqueSources = deduplicateSources(state.allSources);
  if (uniqueSources.length > 0) {
    yield { type: 'sources', sources: uniqueSources.slice(0, 10) };
  }

  yield {
    type: 'complete',
    tier: 'research',
    cost: totalCost,
    latencyMs: Date.now() - startTime,
  };
}

function deduplicateSources(sources: ScoredSource[]): ScoredSource[] {
  const seen = new Set<string>();
  return sources
    .sort((a, b) => b.adjustedScore - a.adjustedScore)
    .filter(s => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    })
    .map((s, i) => ({ ...s, id: i + 1 }));
}

async function* fallbackToModerate(
  query: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  market: UnifiedMarket,
  totalCost: CostBreakdown,
  startTime: number
): AsyncGenerator<ServerEvent> {
  const { streamText: st, stepCountIs: sci } = await import('ai');
  const { searchNewsTool } = await import('./tools/search-news');
  const { calculateTool } = await import('./tools/calculate');
  const { createMarketDataTool } = await import('./tools/market-data');
  const { deepExtractTool } = await import('./tools/deep-extract');

  const openrouter = createOpenRouter({ apiKey: env.openRouterApiKey() });

  yield { type: 'status', status: 'thinking' };

  const collectedSources: ScoredSource[] = [];

  const coreMessages = messages.map(m => ({
    role: m.role === 'agent' ? 'assistant' as const : 'user' as const,
    content: m.content,
  }));
  coreMessages.push({ role: 'user', content: query });

  const result = st({
    model: openrouter(FLASH_MODEL),
    system: systemPrompt,
    messages: coreMessages,
    tools: {
      search_news: searchNewsTool,
      calculate: calculateTool,
      get_market_data: createMarketDataTool(market),
      deep_extract: deepExtractTool,
    },
    stopWhen: sci(8),
    temperature: 0.3,
    maxOutputTokens: 2500,
  });

  for await (const event of result.fullStream) {
    if (event.type === 'text-delta') {
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
      const output = (event as any).output;
      if (output && 'results' in output && Array.isArray(output.results)) {
        if (output.results[0]?.qualityScore !== undefined) {
          const offset = collectedSources.length;
          const renumbered = output.results.map((s: ScoredSource, i: number) => ({ ...s, id: offset + i + 1 }));
          collectedSources.push(...renumbered);
          yield { type: 'sources', sources: [...collectedSources] };
        }
        if ('searchCost' in output) totalCost.search += output.searchCost;
        if ('extractCost' in output) totalCost.extract += output.extractCost;
      }
    }
  }

  const usage = await result.usage;
  totalCost.llm += calculateLLMCost(
    { promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0 },
    FLASH_MODEL
  );
  totalCost.total = totalCost.llm + totalCost.search + totalCost.extract + totalCost.classification;

  yield {
    type: 'complete',
    tier: 'complex',
    cost: totalCost,
    latencyMs: Date.now() - startTime,
  };
}
