import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '../env';
import type { MarketChatMessage } from './types';
import type { ExtractedFact } from './memory';
import type { ModelMessage } from 'ai';

const MAIN_MODEL = 'google/gemini-3-flash-preview';
const HISTORY_THRESHOLD = 10;

export async function getConversationContext(
  messages: MarketChatMessage[],
  facts: ExtractedFact[]
): Promise<{ history: ModelMessage[]; factsBlock: string }> {
  const activeFacts = facts
    .filter(f => Date.now() - f.timestamp < 30 * 60 * 1000)
    .map(f => f.content)
    .join('\n');

  if (messages.length <= HISTORY_THRESHOLD) {
    return {
      history: messages.map(m => ({
        role: m.role === 'agent' ? 'assistant' as const : 'user' as const,
        content: m.content,
      })),
      factsBlock: activeFacts,
    };
  }

  const olderMessages = messages.slice(0, -6);
  const recentMessages = messages.slice(-6);

  let summary: string;
  try {
    const openrouter = createOpenRouter({ apiKey: env.openRouterApiKey() });
    const result = await generateText({
      model: openrouter(MAIN_MODEL),
      prompt: `Summarize this conversation in 2-3 sentences, preserving key decisions and data points:

${olderMessages.map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n')}`,
      maxOutputTokens: 200,
      temperature: 0,
    });
    summary = result.text;
  } catch {
    summary = olderMessages
      .filter(m => m.role === 'agent')
      .slice(-2)
      .map(m => m.content.slice(0, 100))
      .join(' ');
  }

  return {
    history: [
      { role: 'system' as const, content: `Previous conversation summary: ${summary}` },
      ...recentMessages.map(m => ({
        role: m.role === 'agent' ? 'assistant' as const : 'user' as const,
        content: m.content,
      })),
    ],
    factsBlock: activeFacts,
  };
}
