import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '../env';

const MAIN_MODEL = 'google/gemini-3-flash-preview';

export interface ExtractedFact {
  content: string;
  source: 'search' | 'calculation' | 'analysis';
  confidence: 'high' | 'medium' | 'low';
  timestamp: number;
}

export async function extractFacts(agentResponse: string): Promise<ExtractedFact[]> {
  if (agentResponse.length < 50) return [];

  try {
    const openrouter = createOpenRouter({ apiKey: env.openRouterApiKey() });

    const { text } = await generateText({
      model: openrouter(MAIN_MODEL),
      prompt: `Extract 1-5 key facts from this prediction market analysis response. Only include concrete, verifiable facts — not opinions or hedged statements.

Response: "${agentResponse.slice(0, 2000)}"

Return as JSON array: [{"content": "fact text", "source": "search|calculation|analysis", "confidence": "high|medium|low"}]`,
      maxOutputTokens: 500,
      temperature: 0.1,
    });

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const facts = JSON.parse(cleaned);

    if (!Array.isArray(facts)) return [];

    return facts
      .filter((f: any) => f?.content && typeof f.content === 'string')
      .slice(0, 5)
      .map((f: any) => ({
        content: f.content,
        source: ['search', 'calculation', 'analysis'].includes(f.source) ? f.source : 'analysis',
        confidence: ['high', 'medium', 'low'].includes(f.confidence) ? f.confidence : 'medium',
        timestamp: Date.now(),
      }));
  } catch {
    return [];
  }
}

const FACT_TTL_MS = 30 * 60 * 1000;

export function filterActiveFacts(facts: ExtractedFact[]): ExtractedFact[] {
  const cutoff = Date.now() - FACT_TTL_MS;
  return facts.filter(f => f.timestamp > cutoff);
}
