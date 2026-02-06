import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { env } from '../env';
import type { UnifiedMarket } from '../markets/types';
import type { MaxwellIntelligence } from '../maxwell/types';

const PRO_MODEL = 'google/gemini-3-pro-preview';

const subtaskSchema = z.object({
  id: z.string(),
  type: z.enum(['search', 'calculate', 'extract', 'synthesize']),
  description: z.string(),
  params: z.record(z.any()),
  dependsOn: z.array(z.string()),
});

export const researchPlanSchema = z.object({
  reasoning: z.string(),
  subtasks: z.array(subtaskSchema).min(1).max(7),
  estimatedTimeSeconds: z.number(),
});

export type ResearchPlan = z.infer<typeof researchPlanSchema>;

export async function createResearchPlan(
  query: string,
  market: UnifiedMarket,
  maxwellReport: MaxwellIntelligence | null
): Promise<ResearchPlan> {
  const openrouter = createOpenRouter({ apiKey: env.openRouterApiKey() });

  const { object: plan } = await generateObject({
    model: openrouter(PRO_MODEL),
    schema: researchPlanSchema,
    prompt: `Create a research plan for this prediction market query.

MARKET: ${market.title}
PLATFORM: ${market.platform}
CURRENT PRICE: ${(market.yesPrice * 100).toFixed(1)}%
CLOSES: ${new Date(market.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
ANALYSIS AVAILABLE: ${!!maxwellReport}${maxwellReport ? ` (verdict: ${maxwellReport.assessment.verdict}, confidence: ${maxwellReport.assessment.confidence})` : ''}

USER QUERY: "${query}"

Break this into subtasks. Available task types:
- search: Tavily web search (params: query, topic, depth, days, maxResults)
- calculate: Math operations (params: operation, inputs)
- extract: Deep content extraction from specific URLs (use sparingly, max 3 URLs)
- synthesize: Combine results into final answer (always last)

Rules:
- Maximum 7 subtasks
- Group independent tasks for parallel execution (same dependsOn=[])
- Always end with a synthesize task that depends on all prior tasks
- Only use extract for high-value sources found during search
- For "search" params: query (string), topic ("general"|"news"), depth ("basic"|"advanced"), days (number), maxResults (number)`,
    temperature: 0.1,
  });

  return plan;
}
