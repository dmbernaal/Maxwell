/**
 * Model Configuration
 * 
 * Central registry for all available LLM models.
 * Model IDs must match OpenRouter's exact naming convention.
 * 
 * @see https://openrouter.ai/models for full model list
 * 
 * Known Issues:
 * - OpenAI models (gpt-5.x) have tool schema serialization issues with
 *   @openrouter/ai-sdk-provider. The provider sends 'type: None' which
 *   OpenAI rejects. This is a provider-level bug.
 * - Claude Opus 4.5 sends empty tool inputs {}. Provider-level bug.
 */

export interface ModelConfig {
    /** OpenRouter model ID (must be exact) */
    id: string;
    /** Display name for UI */
    name: string;
    /** Maximum context window in tokens */
    contextWindow: number;
    /** Short description for model selector */
    description: string;
    /** Pricing/capability tier */
    tier: 'default' | 'standard' | 'premium';
    /** Provider family for tool schema compatibility */
    provider: 'google' | 'anthropic' | 'openai';
    /** Whether tools work with this model via OpenRouter */
    toolsSupported: boolean;
}

/**
 * Available models for the search agent
 * 
 * Only models with toolsSupported: true are shown in the UI.
 */
export const AVAILABLE_MODELS: ModelConfig[] = [
    // === Google Models (✅ Tools work) ===
    {
        id: 'google/gemini-3-flash-preview',
        name: 'Gemini 3 Flash',
        contextWindow: 1_000_000,
        description: 'Fast, multimodal, 1M context. Default.',
        tier: 'default',
        provider: 'google',
        toolsSupported: true,
    },
    {
        id: 'google/gemini-3-pro-preview',
        name: 'Gemini 3 Pro',
        contextWindow: 1_000_000,
        description: 'Advanced reasoning, 1M context.',
        tier: 'standard',
        provider: 'google',
        toolsSupported: true,
    },

    // === Anthropic Models (✅ Tools work for Haiku/Sonnet) ===
    {
        id: 'anthropic/claude-haiku-4.5',
        name: 'Claude Haiku 4.5',
        contextWindow: 200_000,
        description: 'Fast and efficient for quick tasks.',
        tier: 'standard',
        provider: 'anthropic',
        toolsSupported: true,
    },
    {
        id: 'anthropic/claude-sonnet-4.5',
        name: 'Claude Sonnet 4.5',
        contextWindow: 200_000,
        description: 'Balanced performance and cost.',
        tier: 'standard',
        provider: 'anthropic',
        toolsSupported: true,
    },

    // === OpenAI Models (❌ Tools broken - provider bug) ===
    // Uncomment when @openrouter/ai-sdk-provider fixes tool schema serialization
    // {
    //     id: 'openai/gpt-5.2',
    //     name: 'GPT-5.2',
    //     contextWindow: 400_000,
    //     description: 'OpenAI flagship reasoning model.',
    //     tier: 'premium',
    //     provider: 'openai',
    //     toolsSupported: false,
    // },
];

/** Default model used when none specified */
export const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

/**
 * Get all models that support tool calling
 * Used for the model selector in the UI
 */
export function getAvailableModels(): ModelConfig[] {
    return AVAILABLE_MODELS.filter(m => m.toolsSupported);
}

/**
 * Get model configuration by ID
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
    return AVAILABLE_MODELS.find(m => m.id === modelId);
}

/**
 * Check if a model ID is valid and supports tools
 */
export function isValidModel(modelId: string): boolean {
    const model = getModelConfig(modelId);
    return model !== undefined && model.toolsSupported;
}

/**
 * Get the provider for a model ID
 * Used for selecting appropriate tool schemas
 */
export function getModelProvider(modelId: string): ModelConfig['provider'] | undefined {
    return getModelConfig(modelId)?.provider;
}

/**
 * Get models grouped by provider (only tool-supported models)
 * Useful for UI model selector with categories
 */
export function getModelsByProvider(): Record<string, ModelConfig[]> {
    const supported = getAvailableModels();
    return {
        google: supported.filter(m => m.provider === 'google'),
        anthropic: supported.filter(m => m.provider === 'anthropic'),
        openai: supported.filter(m => m.provider === 'openai'),
    };
}
