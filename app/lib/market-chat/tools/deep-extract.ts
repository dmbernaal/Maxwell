import { tool } from 'ai';
import { z } from 'zod';
import { env } from '../../env';

export interface DeepExtractResult {
  results: Array<{
    url: string;
    content: string;
    title?: string;
  }>;
  extractCost: number;
}

export const deepExtractTool = tool({
  description: 'Extract full content from specific URLs for deep analysis. Use sparingly — only for high-quality sources that need full-text extraction. Maximum 3 URLs per call.',
  inputSchema: z.object({
    urls: z.array(z.string().url()).max(3)
      .describe('URLs to extract full content from. Only use for high-quality sources (major news outlets, research papers, official data).'),
    query: z.string()
      .optional()
      .describe('Optional query to re-rank extracted content by relevance.'),
  }),
  execute: async ({ urls, query }): Promise<DeepExtractResult> => {
    try {
      const response = await fetch('https://api.tavily.com/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: env.tavilyApiKey(),
          urls,
          query,
          extract_depth: 'advanced',
          format: 'markdown',
          chunks_per_source: 3,
        }),
      });

      if (!response.ok) {
        return { results: [], extractCost: urls.length * 0.005 };
      }

      const data = await response.json();
      return {
        results: (data.results || []).map((r: any) => ({
          url: r.url,
          content: (r.raw_content || r.content || '').slice(0, 5000),
          title: r.title,
        })),
        extractCost: urls.length * 0.005,
      };
    } catch {
      return { results: [], extractCost: urls.length * 0.005 };
    }
  },
});
