# Maxwell Configurable Parameters

> All tweakable values in one place.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | ✅ Yes | - | API key for OpenRouter model access |
| `TAVILY_API_KEY` | ✅ Yes | - | API key for Tavily web search |

**Location:** `.env.local` (not committed to git)

---

## Agent Configuration

**File:** `app/lib/agent.ts`

| Parameter | Current Value | Description |
|-----------|---------------|-------------|
| `stopWhen` | `stepCountIs(5)` | Max steps in agent loop |

```typescript
// Increase for more complex multi-tool workflows
stopWhen: stepCountIs(5)
```

---

## Model Configuration

**File:** `app/lib/models.ts`

| Parameter | Current Value | Description |
|-----------|---------------|-------------|
| `DEFAULT_MODEL` | `google/gemini-3-flash-preview` | Default model when none specified |

### Available Models

| Model ID | Context Window | Tier |
|----------|----------------|------|
| `google/gemini-3-flash-preview` | 1,000,000 | default |
| `google/gemini-3-pro-preview` | 1,000,000 | standard |
| `anthropic/claude-haiku-4.5` | 200,000 | standard |
| `anthropic/claude-sonnet-4.5` | 200,000 | standard |

---

## Search Tool Configuration

**File:** `app/lib/tools.ts`

### Tavily API Parameters

| Parameter | Current Value | Options |
|-----------|---------------|---------|
| `max_results` | `5` | 1-10 |
| `search_depth` | `basic` | `basic`, `advanced` |
| `include_answer` | `true` | `true`, `false` |

```typescript
body: JSON.stringify({
    api_key: env.tavilyApiKey(),
    query: searchQuery,
    max_results: 5,           // ← Tweak this
    search_depth: 'basic',    // ← Or 'advanced' for deeper search
    include_answer: true,     // ← Pre-summarized answer
}),
```

---

## System Prompt

**File:** `app/lib/prompts.ts`

The system prompt controls:
- When to search vs answer directly
- Citation format (`[1]`, `[2]`)
- Response style

**To modify:** Edit `SYSTEM_PROMPT` constant.

---

## API Configuration

**File:** `app/api/chat/route.ts`

| Parameter | Current Value | Description |
|-----------|---------------|-------------|
| `maxDuration` | `60` | Vercel serverless timeout (seconds) |

```typescript
export const maxDuration = 60;
```

---

## OpenRouter Provider

**File:** `app/lib/agent.ts`

```typescript
const openrouter = createOpenRouter({
    apiKey: env.openRouterApiKey(),
});
```

Additional options available:
```typescript
const openrouter = createOpenRouter({
    apiKey: env.openRouterApiKey(),
    baseURL: 'https://openrouter.ai/api/v1',  // Default
    headers: {
        'HTTP-Referer': 'https://your-site.com',  // Optional: attribution
        'X-Title': 'Your App Name',               // Optional: dashboard label
    },
});
```

---

## Streaming Configuration

**File:** `app/lib/agent.ts`

The `streamText()` function accepts additional options:

```typescript
streamText({
    model,
    messages,
    tools,
    stopWhen: stepCountIs(5),
    
    // Optional parameters:
    temperature: 0.7,        // Creativity (0-2)
    topP: 1,                 // Nucleus sampling
    maxTokens: 4096,         // Max output tokens
    abortSignal: signal,     // For request cancellation
})
```

---

## Quick Reference

### To make responses more creative:
```typescript
// In agent.ts streamText call
temperature: 1.0,  // Default is ~0.7
```

### To get more search results:
```typescript
// In tools.ts executeSearch
max_results: 10,  // Default is 5
```

### To enable deeper search:
```typescript
// In tools.ts executeSearch
search_depth: 'advanced',  // Default is 'basic'
```

### To change default model:
```typescript
// In models.ts
export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';
```
