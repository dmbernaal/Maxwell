const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'google/gemini-3-flash-preview': { input: 0.50, output: 3.00 },
  'google/gemini-3-pro-preview': { input: 2.00, output: 12.00 },
  'x-ai/grok-4.1-fast': { input: 0.20, output: 0.50 },
  'deepseek/deepseek-v3.2': { input: 0.25, output: 0.38 },
  'anthropic/claude-haiku-4.5': { input: 1.00, output: 5.00 },
};

export function calculateLLMCost(
  usage: { promptTokens: number; completionTokens: number },
  modelId: string
): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return 0;

  const inputCost = (usage.promptTokens * pricing.input) / 1_000_000;
  const outputCost = (usage.completionTokens * pricing.output) / 1_000_000;
  return inputCost + outputCost;
}

// Tavily costs per API call
export const TAVILY_COST_BASIC = 0.008;
export const TAVILY_COST_ADVANCED = 0.016;
