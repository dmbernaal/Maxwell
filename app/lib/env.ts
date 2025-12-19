/**
 * Environment variable validation
 * Fails fast with clear error messages if required vars are missing
 */

function getEnvVar(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(
            `Missing required environment variable: ${key}. ` +
            `Please add it to your .env.local file.`
        );
    }
    return value;
}

export const env = {
    // Lazily evaluated to avoid errors during build
    tavilyApiKey: () => getEnvVar('TAVILY_API_KEY'),
    openRouterApiKey: () => getEnvVar('OPENROUTER_API_KEY'),
    // Uncomment if using Anthropic:
    // anthropicApiKey: () => getEnvVar('ANTHROPIC_API_KEY'),
} as const;
