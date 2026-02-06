import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '../env';
import type { ComplexityLevel } from './types';
import { withRetry } from './resilience';

const openrouter = createOpenRouter({ apiKey: env.openRouterApiKey() });

export async function classifyComplexity(
  query: string,
  marketTitle: string,
  hasMaxwellReport: boolean,
  recentHistory: Array<{ role: string; content: string }>
): Promise<ComplexityLevel> {
  const historyContext = recentHistory.length > 0
    ? `\nRecent conversation:\n${recentHistory.slice(-4).map(m => `${m.role}: ${m.content.slice(0, 100)}`).join('\n')}`
    : '';

  try {
    const result = await withRetry(
      () => generateText({
        model: openrouter('google/gemini-3-flash-preview'),
        prompt: `Classify this prediction market chat query. Market: "${marketTitle}". Analysis report: ${hasMaxwellReport ? 'available' : 'not available'}.${historyContext}

Query: "${query}"

Rules:
- SIMPLE: Can be answered from market data or analysis report alone (prices, verdict, thesis, risks, outcomes, "is this a good bet", "what do you think", "explain this")
- MODERATE: Needs live web search OR mathematical calculation ("latest news", "what happened today", "calculate my EV", "what are experts saying", "compare odds")
- COMPLEX: Requires multiple searches + calculations + synthesis ("should I buy or sell", "break this down", "what am I missing", "full risk assessment")
- RESEARCH: User wants comprehensive deep-dive ("tell me everything", "deep dive", "investment thesis", "analyze every factor")

If this is a follow-up to the conversation, consider what was discussed before.

Respond with ONE word: SIMPLE, MODERATE, COMPLEX, or RESEARCH`,
        maxOutputTokens: 10,
        temperature: 0,
      }),
      2,
      300,
    );

    const normalized = result.text.trim().toUpperCase();
    const validLevels: Record<string, ComplexityLevel> = {
      'SIMPLE': 'simple',
      'MODERATE': 'moderate',
      'COMPLEX': 'complex',
      'RESEARCH': 'research',
    };

    return validLevels[normalized] || 'simple';
  } catch {
    return 'simple';
  }
}
