/**
 * Maxwell Environment Configuration
 *
 * Validates and exports environment variables with fail-fast pattern.
 * Any missing required variable throws immediately to prevent silent failures.
 *
 * @module maxwell/env
 */

/**
 * Environment configuration interface for Maxwell.
 * Note: We use OpenRouter for embeddings, so no OPENAI_API_KEY needed.
 */
export interface MaxwellEnvConfig {
    OPENROUTER_API_KEY: string;
    TAVILY_API_KEY: string;
}

/**
 * Validates that a required environment variable exists.
 * @throws Error if the variable is missing
 */
function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `❌ FATAL ERROR: Missing required environment variable: ${name}.\n` +
            `Please add it to your .env.local file.`
        );
    }
    return value;
}

/**
 * Get validated Maxwell environment configuration.
 * Call this once at startup to fail fast on missing config.
 *
 * @throws Error if called on client side or if env vars are missing
 */
export function getMaxwellEnvConfig(): MaxwellEnvConfig {
    // Only validate on server side
    if (typeof window !== 'undefined') {
        throw new Error('getMaxwellEnvConfig should only be called on the server');
    }

    return {
        OPENROUTER_API_KEY: requireEnv('OPENROUTER_API_KEY'),
        TAVILY_API_KEY: requireEnv('TAVILY_API_KEY'),
    };
}

/**
 * Validates Maxwell environment on module load (server-side only).
 * This ensures we fail fast if config is missing.
 */
export function validateMaxwellEnv(): void {
    if (typeof window !== 'undefined') {
        return;
    }

    // This will throw if any key is missing
    getMaxwellEnvConfig();
}
