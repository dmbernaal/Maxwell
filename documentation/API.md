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

Response is a **text stream** with sources appended at the end.

**Format:**
```
[Streamed text response with citations like [1], [2]]

---SOURCES_JSON---
[{"title":"...","url":"...","content":"...","score":0.89}]
```

**Example:**
```
The current price of Bitcoin is approximately $88,429 [1].

Prices vary across exchanges:
*   **CoinDesk:** $88,428.96 [2]
*   **Kraken:** $88,320.00 [1]

---SOURCES_JSON---
[{"title":"Kraken - Bitcoin Price","url":"https://www.kraken.com/prices/bitcoin","content":"...","score":0.91},{"title":"CoinDesk BTC","url":"https://www.coindesk.com/price/bitcoin/","content":"...","score":0.88}]
```

### Sources Delimiter

The delimiter `---SOURCES_JSON---` separates the text response from the sources JSON array.

**Frontend Parsing:**
```typescript
const SOURCES_DELIMITER = '\n\n---SOURCES_JSON---\n';
const [content, sourcesJson] = text.split(SOURCES_DELIMITER);
const sources = JSON.parse(sourcesJson);
```

### Source Object

Each source in the array has:

```typescript
interface Source {
    title: string;    // Page title
    url: string;      // Source URL
    content: string;  // Snippet from page
    score?: number;   // Relevance score (0-1)
}
```

---

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

The response streams in real-time:

1. **Tool Invocation:** Brief pause while search executes (~1-2s)
2. **Text Generation:** Response streams token by token
3. **Sources:** JSON appended after text completes
4. **Completion:** Stream closes

### Detecting Stream End

```javascript
const response = await fetch('/api/chat', { ... });
const reader = response.body.getReader();
const decoder = new TextDecoder();
let fullText = '';

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
}

// Parse sources
const [content, sourcesJson] = fullText.split('\n\n---SOURCES_JSON---\n');
const sources = sourcesJson ? JSON.parse(sourcesJson) : [];
```

---

## Testing

### Health Check (No Search)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

Expected: Quick greeting without sources.

### Search Execution Check

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is the weather in Tokyo?"}]}'
```

Expected:
- Response with citations `[1]`, `[2]`
- `---SOURCES_JSON---` delimiter
- JSON array of sources

### Verify Sources Present

```bash
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is the price of gold?"}]}' \
  | grep "SOURCES_JSON"
```

Expected: Should find the delimiter in output.
