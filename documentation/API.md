# Maxwell API Reference

> HTTP endpoints and their usage.

## Endpoints Overview

| Endpoint | Purpose | Method | Response Type |
|----------|---------|--------|---------------|
| `/api/chat` | Standard search chat | POST | Text stream |
| `/api/maxwell/decompose` | Query decomposition | POST | JSON |
| `/api/maxwell/search` | Search + pre-embed | POST | JSON |
| `/api/maxwell/synthesize` | Answer synthesis | POST | SSE stream |
| `/api/maxwell/verify` | Claim verification | POST | SSE stream |
| `/api/maxwell/adjudicate` | Final verdict | POST | SSE stream |
| `/api/maxwell` | Legacy monolithic (local dev) | POST | SSE stream |

---

## Standard Chat

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

---

## Maxwell Multi-Endpoint API

The Maxwell pipeline is split into 5 independent endpoints for Vercel serverless compatibility. Each has its own timeout budget.

### POST `/api/maxwell/decompose`

**Purpose:** Break query into sub-queries and assess complexity.

**Timeout:** 30 seconds

**Request:**
```json
{
  "query": "What's the current state of nuclear fusion?"
}
```

**Response:**
```json
{
  "subQueries": [
    {
      "id": "q1",
      "query": "latest nuclear fusion breakthroughs 2024",
      "topic": "news",
      "depth": "advanced",
      "days": 7,
      "purpose": "Find recent developments"
    }
  ],
  "config": {
    "synthesisModel": "google/gemini-3-flash-preview",
    "resultsPerQuery": 5,
    "maxClaimsToVerify": 30,
    "verificationConcurrency": 6
  },
  "complexity": "standard",
  "complexityReasoning": "Multi-faceted scientific question requiring recent data",
  "durationMs": 2100
}
```

---

### POST `/api/maxwell/search`

**Purpose:** Execute parallel searches and pre-embed passages.

**Timeout:** 60 seconds

**Request:**
```json
{
  "subQueries": [...],
  "config": {
    "resultsPerQuery": 5
  }
}
```

**Response:**
```json
{
  "sources": [
    {
      "id": "s1",
      "title": "LLNL Achieves Fusion Ignition",
      "url": "https://...",
      "snippet": "...",
      "queryId": "q1",
      "score": 0.92
    }
  ],
  "searchMetadata": [
    {
      "queryId": "q1",
      "query": "latest nuclear fusion breakthroughs 2024",
      "resultsCount": 5,
      "durationMs": 850,
      "status": "success"
    }
  ],
  "preparedEvidence": {
    "passages": [
      {
        "text": "...",
        "sourceIndex": 0,
        "sourceId": "s1",
        "startIndex": 0,
        "endIndex": 150
      }
    ],
    "embeddings": ["base64-encoded-float32-array", ...]
  },
  "durationMs": 2500
}
```

**Note:** `preparedEvidence.embeddings` contains base64-encoded Float32Arrays. Pass this directly to `/verify`.

---

### POST `/api/maxwell/synthesize`

**Purpose:** Generate answer with citations (streaming).

**Timeout:** 30 seconds

**Request:**
```json
{
  "query": "What's the current state of nuclear fusion?",
  "sources": [...],
  "config": {
    "synthesisModel": "google/gemini-3-flash-preview"
  }
}
```

**Response:** Server-Sent Events (SSE)

```
data: {"type":"synthesis-chunk","content":"The "}
data: {"type":"synthesis-chunk","content":"National "}
data: {"type":"synthesis-chunk","content":"Ignition "}
...
data: {"type":"synthesis-complete","answer":"The National Ignition Facility...","sourcesUsed":["s1","s2","s3"],"durationMs":4800}
data: [DONE]
```

---

### POST `/api/maxwell/verify`

**Purpose:** Multi-signal claim verification (streaming).

**Timeout:** 60 seconds

**Request:**
```json
{
  "answer": "The National Ignition Facility achieved...",
  "sources": [...],
  "preparedEvidence": {
    "passages": [...],
    "embeddings": [...]
  },
  "config": {
    "maxClaimsToVerify": 30,
    "verificationConcurrency": 6
  }
}
```

**Response:** Server-Sent Events (SSE)

```
data: {"type":"verification-start","claimsCount":5}
data: {"type":"claim-verified","claim":{"id":"c1","text":"...","confidence":0.95,"entailment":"SUPPORTED",...},"current":1,"total":5}
data: {"type":"claim-verified","claim":{"id":"c2",...},"current":2,"total":5}
...
data: {"type":"verification-complete","verification":{"claims":[...],"summary":{"totalClaims":5,"supported":4,...}},"durationMs":7800}
data: [DONE]
```

---

### POST `/api/maxwell/adjudicate`

**Purpose:** Generate final verdict based on verification (streaming).

**Timeout:** 30 seconds

**Request:**
```json
{
  "query": "What's the current state of nuclear fusion?",
  "answer": "The National Ignition Facility achieved...",
  "verification": {
    "claims": [...],
    "summary": {...}
  }
}
```

**Response:** Server-Sent Events (SSE)

```
data: {"type":"adjudication-chunk","content":"Based "}
data: {"type":"adjudication-chunk","content":"on "}
data: {"type":"adjudication-chunk","content":"verified "}
...
data: {"type":"adjudication-complete","durationMs":4400}
data: [DONE]
```

---

### POST `/api/maxwell` (Legacy)

**Purpose:** Monolithic endpoint for local development (no timeout constraints).

**Timeout:** 60 seconds

**Request:**
```json
{
  "query": "What's the current state of nuclear fusion?"
}
```

**Response:** Server-Sent Events (SSE)

```
data: {"type":"phase-start","phase":"decomposition"}
data: {"type":"phase-complete","phase":"decomposition","data":{...}}
data: {"type":"phase-start","phase":"search"}
data: {"type":"phase-complete","phase":"search","data":{...}}
data: {"type":"synthesis-chunk","content":"The "}
...
data: {"type":"verification-progress","data":{"current":1,"total":5,...}}
...
data: {"type":"complete","data":{...}}
data: [DONE]
```

---

## Testing Maxwell Endpoints

### Quick Decompose Test

```bash
curl -X POST http://localhost:3000/api/maxwell/decompose \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the capital of France?"}'
```

### Full Pipeline Test (with jq)

```bash
# 1. Decompose
DECOMPOSE=$(curl -s -X POST http://localhost:3000/api/maxwell/decompose \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the capital of France?"}')

echo "Decomposition complete: $(echo $DECOMPOSE | jq -r '.complexity')"

# 2. Search (requires subQueries and config from step 1)
# ...continue with subsequent endpoints
```

### Health Check

```bash
curl http://localhost:3000/api/maxwell
# Returns: {"status":"ok","timestamp":"..."}
```
