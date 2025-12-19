# Maxwell Configurable Parameters

> All tunable values in the system.

## Environment Variables

### Required

| Variable | Purpose | Example |
|----------|---------|---------|
| `OPENROUTER_API_KEY` | API key for OpenRouter | `sk-or-v1-...` |
| `TAVILY_API_KEY` | API key for Tavily Search | `tvly-...` |

### Location

File: `.env.local` (not committed)

Template: `env.sample`

```bash
# Copy and edit
cp env.sample .env.local
```

---

## Model Configuration

### File: `app/lib/models.ts`

### DEFAULT_MODEL

```typescript
export const DEFAULT_MODEL = 'google/gemini-3-flash-preview';
```

### AVAILABLE_MODELS

```typescript
export const AVAILABLE_MODELS = [
    {
        id: 'google/gemini-3-flash-preview',
        name: 'Gemini 3 Flash',
        provider: 'google',
        enabled: true,
        toolsSupported: true,
    },
    {
        id: 'google/gemini-3-pro-preview',
        name: 'Gemini 3 Pro',
        provider: 'google',
        enabled: true,
        toolsSupported: true,
    },
    {
        id: 'anthropic/claude-haiku-4.5',
        name: 'Claude Haiku 4.5',
        provider: 'anthropic',
        enabled: true,
        toolsSupported: true,
    },
    {
        id: 'anthropic/claude-sonnet-4.5',
        name: 'Claude Sonnet 4.5',
        provider: 'anthropic',
        enabled: true,
        toolsSupported: true,
    },
    // Disabled models (tool calling issues)
    // 'anthropic/claude-opus-4.5' - Empty tool inputs
    // 'openai/gpt-4o' - JSON schema serialization
];
```

---

## Agent Settings

### File: `app/lib/agent.ts`

### Max Steps

```typescript
stopWhen: stepCountIs(5)  // Maximum tool call loops
```

Change this to allow more search iterations.

---

## Search Tool Settings

### File: `app/lib/tools.ts`

### Search Parameters

```typescript
{
    api_key: env.tavilyApiKey(),
    query: searchQuery,
    max_results: 5,           // Number of sources
    search_depth: 'basic',    // 'basic' or 'advanced'
    include_answer: true,     // Tavily's pre-generated answer
}
```

| Parameter | Value | Notes |
|-----------|-------|-------|
| `max_results` | 5 | Increase for more sources |
| `search_depth` | `'basic'` | `'advanced'` costs 2 credits |
| `include_answer` | `true` | Provides quick answer |

### Advanced Options (not currently used)

```typescript
{
    topic: 'general',         // or 'news', 'finance'
    time_range: 'day',        // 'day', 'week', 'month', 'year'
    include_raw_content: true, // Full page content
    include_images: true,      // Image URLs
    include_domains: [],       // Whitelist
    exclude_domains: [],       // Blacklist
}
```

---

## System Prompt

### File: `app/lib/prompts.ts`

```typescript
export const SYSTEM_PROMPT = `You are a helpful search assistant...`;
```

Key instructions in prompt:
- Use search for real-time data
- Add citations as `[1]`, `[2]`
- Be concise and accurate

---

## API Settings

### File: `app/api/chat/route.ts`

### Request Timeout

```typescript
export const maxDuration = 60;  // Vercel timeout in seconds
```

### Sources Delimiter

```typescript
const SOURCES_DELIMITER = '\n\n---SOURCES_JSON---\n';
```

---

## Frontend Settings

### File: `app/hooks/use-chat-api.ts`

### Sources Delimiter (must match backend)

```typescript
const SOURCES_DELIMITER = '\n\n---SOURCES_JSON---\n';
```

### Update Frequency

```typescript
// Update UI every N chunks for performance
if (updateCount % 3 === 0) {
    updateMessage(agentMessageId, displayText, undefined, sessionId);
}
```

---

## Store Settings

### File: `app/store.ts`

### Persistence Key

```typescript
persist(
    // ...
    {
        name: 'maxwell-chat-storage',  // localStorage key
        storage: createJSONStorage(() => localStorage),
    }
)
```

---

## UI Animation Timings

### File: `app/page.tsx`

```typescript
const spacerVariants = {
    relaxed: { height: '30vh' },
    active: { height: '150px' }
};
```

### File: `app/components/ResponseDisplay.tsx`

```typescript
const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.01,
            delayChildren: 0.2
        }
    }
};
```

---

## Quick Reference

| What to Change | File | Variable |
|----------------|------|----------|
| Default model | `models.ts` | `DEFAULT_MODEL` |
| Available models | `models.ts` | `AVAILABLE_MODELS` |
| Search results count | `tools.ts` | `max_results` |
| Search depth | `tools.ts` | `search_depth` |
| Max steps | `agent.ts` | `stepCountIs(N)` |
| System prompt | `prompts.ts` | `SYSTEM_PROMPT` |
| API timeout | `route.ts` | `maxDuration` |
| Storage key | `store.ts` | `name` |
