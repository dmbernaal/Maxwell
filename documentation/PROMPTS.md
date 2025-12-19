# Maxwell System Prompts

> Guide to the agent's instructions and behavior.

## Main System Prompt

### Location

`app/lib/prompts.ts`

### Current Prompt

```typescript
export const SYSTEM_PROMPT = `You are a helpful search assistant that provides accurate, well-sourced answers.

## Instructions

1. **Always search for current information** when the user asks about:
   - Current events, news, or recent developments
   - Prices (stocks, crypto, commodities)
   - Weather
   - Sports scores or results
   - Any data that changes frequently

2. **Use citations** in your responses:
   - Reference sources using [1], [2], etc.
   - Match the number to the order of search results
   - Place citations immediately after the relevant statement

3. **Be concise but thorough**:
   - Provide direct answers first
   - Add relevant context and details
   - Format with markdown for readability

4. **Handle uncertainty honestly**:
   - If search results conflict, mention the discrepancy
   - If data might be outdated, note when it was current
   - Don't make claims beyond what sources support

## Citation Format

Correct: "Bitcoin is currently trading at $88,429 [1]."
Correct: "The price varies by exchange: $88,320 [1], $88,429 [2]."
Incorrect: "Bitcoin is at $88,429." (missing citation)
`;
```

---

## Prompt Design Principles

### 1. Search Trigger

The prompt tells the LLM when to search:

```
when the user asks about:
- Current events, news
- Prices
- Weather
- Sports scores
- Any data that changes frequently
```

### 2. Citation Format

Ensures consistent citation style:

```
Reference sources using [1], [2], etc.
Match the number to the order of search results
```

### 3. Behavior Guidelines

Sets expectations for response quality:

```
- Be concise but thorough
- Provide direct answers first
- Handle uncertainty honestly
```

---

## Citation System

### How It Works

1. **Search returns results** in order (most relevant first)
2. **LLM writes** `[1]`, `[2]` matching result order
3. **Frontend parses** and makes citations clickable
4. **Sources panel** displays the full list

### Citation to Source Mapping

```
Text: "Bitcoin is $88,429 [1] or $88,320 [2]."

Sources Array:
[0] → [1] in text → "CoinDesk - Bitcoin Price"
[1] → [2] in text → "Kraken - BTC/USD"
```

### Frontend Processing

```typescript
// ResponseDisplay.tsx
function processCitations(content: string, sources: Source[]): string {
    return content.replace(/\[(\d+)\]/g, (match, num) => {
        const index = parseInt(num, 10) - 1;
        const source = sources[index];
        if (source?.url) {
            return `[^${num}^](${source.url})`;
        }
        return `^${num}^`;
    });
}
```

---

## Modifying the Prompt

### When to Modify

- Change response style or tone
- Add new search trigger conditions
- Modify citation format
- Add domain-specific instructions

### How to Modify

1. Edit `app/lib/prompts.ts`
2. Test with various queries
3. Check citations still work
4. Update this documentation

### Example: Adding Finance Focus

```typescript
export const SYSTEM_PROMPT = `You are a finance-focused search assistant...

When discussing financial data:
- Always note the timestamp of price data
- Mention 24h change when available
- Include market cap for crypto/stocks
...
`;
```

---

## Tool Instructions

Tools are implicitly available to the LLM. The system prompt guides when to use them.

### Search Tool Behavior

The search tool automatically executes when the LLM decides to search. The prompt guides this decision:

```
Always search for current information when the user asks about:
- Current events, news, or recent developments
- Prices (stocks, crypto, commodities)
```

The LLM sees the tool description:

```typescript
// tools.ts
description: 'Search the web for current information, news, prices, weather, and facts that require real-time data'
```

---

## Testing Prompts

### Basic Test Cases

| Query | Expected Behavior |
|-------|-------------------|
| "What is 2+2?" | No search, direct answer |
| "What is the price of Bitcoin?" | Search, citations, sources |
| "Tell me about Einstein" | May search, factual response |
| "What's the weather in Tokyo?" | Search, current conditions |

### Citation Test

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is the price of gold?"}]}'
```

Check response contains:
- `[1]`, `[2]` citations
- `---SOURCES_JSON---` delimiter
- Parseable JSON sources

---

## Prompt Versions

Keep track of significant prompt changes:

| Date | Change | Reason |
|------|--------|--------|
| 2024-12-19 | Initial prompt | Base behavior |

---

## Common Issues

### LLM Not Searching

**Symptom:** Answer without citations for current data

**Fix:** Make search triggers more explicit in prompt:
```
ALWAYS search for: prices, weather, news, current events
```

### Wrong Citation Numbers

**Symptom:** `[3]` when only 2 sources

**Fix:** Clarify in prompt:
```
Only cite sources that exist in search results
Maximum citation number = number of results
```

### Verbose Responses

**Symptom:** Overly long answers

**Fix:** Add conciseness instruction:
```
Keep responses under 200 words unless more detail is needed
Lead with the direct answer
```
