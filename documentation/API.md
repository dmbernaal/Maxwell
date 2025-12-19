# Maxwell API Reference

> HTTP endpoints and their usage.

## Endpoints

### POST `/api/chat`

Main chat endpoint for interacting with the search agent.

---

## Request

### Headers

| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |

### Body

```typescript
{
    "messages": [
        {
            "role": "user" | "assistant",
            "content": "string"
        }
    ],
    "model": "string"  // Optional
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | Array | Yes | Conversation history |
| `messages[].role` | `"user"` \| `"assistant"` | Yes | Message sender |
| `messages[].content` | string | Yes | Message text |
| `model` | string | No | Model ID (defaults to `google/gemini-3-flash-preview`) |

### Example Request

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is the current price of Bitcoin?"}
    ],
    "model": "anthropic/claude-sonnet-4.5"
  }'
```

---

## Response

### Success (200)

**Content-Type:** `text/plain; charset=utf-8`

Response is a **text stream** (SSE format).

```
The current price of Bitcoin is approximately $85,400 [1].

Bitcoin has seen a slight decline of about 1% in the last 24 hours [2].

Sources:
[1] CoinMarketCap - https://coinmarketcap.com
[2] CoinGecko - https://coingecko.com
```

### Error (400)

Invalid request format.

```json
{
    "error": "Invalid request: non-empty messages array required"
}
```

### Error (500)

Server error.

```json
{
    "error": "Error description here"
}
```

---

## Available Models

Use these exact IDs in the `model` field:

| Model ID | Provider | Notes |
|----------|----------|-------|
| `google/gemini-3-flash-preview` | Google | ✅ Default, fastest |
| `google/gemini-3-pro-preview` | Google | Better reasoning |
| `anthropic/claude-haiku-4.5` | Anthropic | Fast, efficient |
| `anthropic/claude-sonnet-4.5` | Anthropic | Balanced |

---

## Streaming Behavior

The response is streamed in real-time:

1. **Tool Invocation:** When the agent calls search, there may be a brief pause
2. **Text Generation:** Response text streams token by token
3. **Completion:** Stream ends when generation is complete

### Detecting Stream End

The stream will close naturally when complete. In JavaScript:

```javascript
const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const text = decoder.decode(value);
    console.log(text);
}
```

---

## Rate Limits

Rate limits are enforced by OpenRouter, not this API.

| Tier | Requests/min | Notes |
|------|-------------|-------|
| Free | 10-20 | Varies by model |
| Paid | 60+ | Based on plan |

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing required environment variable` | API keys not set | Set `OPENROUTER_API_KEY` and `TAVILY_API_KEY` |
| `Provider returned error` | OpenRouter/model issue | Check model ID, try different model |
| `Search API error: 422` | Invalid Tavily request | Check query isn't empty |

### Retry Logic

The API does NOT implement retries. Client should handle:

```javascript
async function chatWithRetry(messages, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fetch('/api/chat', { ... });
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
}
```

---

## Testing

### Health Check

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

Expected: Quick response without tool call.

### Tool Execution Check

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is the weather in New York?"}]}'
```

Expected: Response with citations `[1]`, `[2]`, etc.
