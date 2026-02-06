import { tool } from 'ai';
import { z } from 'zod';
import { env } from '../../env';
import type { ScoredSource } from '../types';
import { scoreSourceQuality, scoreRecency, getSourceTier } from '../source-quality';

export interface SearchNewsResult {
  results: ScoredSource[];
  tavilyAnswer?: string;
  searchCost: number;
}

export const searchNewsTool = tool({
  description: 'Search the web for current news and developments. Use for recent events, expert opinions, or data not in the market context. Do NOT use if the answer is already in the market data or analysis report.',
  inputSchema: z.object({
    query: z.string()
      .max(400)
      .describe('Concise search query. Use keywords, not full sentences. Under 400 chars.'),
    topic: z.enum(['general', 'news'])
      .default('general')
      .describe('Use "news" for recent events, politics, sports. Use "general" for background research.'),
    depth: z.enum(['basic', 'advanced'])
      .default('basic')
      .describe('Use "advanced" for detailed analysis or when basic returns insufficient results. Costs 2x.'),
    days: z.number()
      .optional()
      .describe('How many days back to search. 1 = today, 7 = this week, 30 = this month.'),
    maxResults: z.number()
      .default(5)
      .describe('Number of results. 3-5 for quick lookups, 8-10 for comprehensive research.'),
  }),
  execute: async ({ query, topic, depth, days, maxResults }): Promise<SearchNewsResult> => {
    let time_range: string | undefined;
    if (days) {
      if (days <= 1) time_range = 'day';
      else if (days <= 7) time_range = 'week';
      else if (days <= 30) time_range = 'month';
      else time_range = 'year';
    }

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
      return { results: [], searchCost: depth === 'advanced' ? 0.016 : 0.008 };
    }

    const data = await response.json();

    const scoredResults: ScoredSource[] = (data.results || []).map((r: any, i: number) => {
      const quality = scoreSourceQuality(r.url);
      const recency = r.published_date ? scoreRecency(r.published_date) : 0.5;
      const adjusted = (r.score || 0.5) * quality * recency;
      return {
        id: i + 1,
        title: r.title,
        url: r.url,
        snippet: r.content,
        score: r.score || 0.5,
        qualityScore: quality,
        recencyScore: recency,
        adjustedScore: adjusted,
        qualityTier: getSourceTier(quality),
        publishedDate: r.published_date,
      };
    }).sort((a: ScoredSource, b: ScoredSource) => b.adjustedScore - a.adjustedScore);

    return {
      results: scoredResults,
      tavilyAnswer: data.answer,
      searchCost: depth === 'advanced' ? 0.016 : 0.008,
    };
  },
});
