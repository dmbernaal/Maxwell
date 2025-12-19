# Maxwell Prompt Engineering

> System prompts and guidance for LLM behavior.

## Current System Prompt

**Location:** `app/lib/prompts.ts`

```typescript
export const SYSTEM_PROMPT = `You are a helpful search assistant that provides accurate, well-sourced answers.

## When to Search
- DO search for: current events, recent news, real-time data (prices, weather, sports scores), specific facts that need verification
- Do NOT search for: basic math, general knowledge, opinions, creative writing

## Citation Format
- ALWAYS cite sources using bracketed numbers: [1], [2], [3]
- Place citations IMMEDIATELY after the relevant claim
- Example: "Bitcoin is currently trading at $X [1]."

## Response Guidelines
- Lead with a direct answer to the question
- Be concise but thorough`;
```

---

## Prompt Design Principles

### 1. Clear Role Definition
Tell the model exactly what it is:
```
You are a helpful search assistant that provides accurate, well-sourced answers.
```

### 2. Decision Criteria
Guide when to use tools:
```
DO search for: current events, real-time data...
Do NOT search for: basic math, general knowledge...
```

### 3. Output Format
Specify exact formatting:
```
ALWAYS cite sources using bracketed numbers: [1], [2], [3]
```

### 4. Behavior Guidelines
Shape response style:
```
Lead with a direct answer
Be concise but thorough
```

---

## Citation System

### How It Works

1. **Tavily returns sources** with title, URL, content
2. **LLM references sources** using `[1]`, `[2]`
3. **Frontend parses** citations and creates links

### Expected Output Format

```
The current price of Bitcoin is approximately $85,400 [1]. 

It has declined about 1% in the last 24 hours [2], down from 
a high of $91,000 last week [3].
```

### What to Avoid

```
❌ In-text URLs: "According to CoinMarketCap (https://...)"
❌ Footnote style: "Bitcoin is $85,400¹"
❌ No citations: "Bitcoin is around $85,000"
```

---

## Modifying the Prompt

### To Make Responses Longer

Add:
```
## Response Length
Provide detailed explanations with multiple paragraphs.
Include relevant context and background information.
```

### To Make Responses Shorter

Modify:
```
## Response Guidelines
- Answer in 2-3 sentences maximum
- Only include the most essential information
```

### To Change Citation Style

Modify the citation format section:
```
## Citation Format
- Use superscript numbers: ¹ ² ³
- Place at end of sentences: "fact here.¹"
```

### To Add Specific Behaviors

```
## Special Instructions
- When discussing prices, always mention the source's timestamp
- For weather queries, include both current conditions and forecast
- Never speculate about future events
```

---

## Tool Integration

The prompt should guide tool usage implicitly. The model sees:

1. **System prompt** (our instructions)
2. **Tool definitions** (from `tools.ts`)
3. **User messages**

The model decides to call tools based on:
- The user's question
- The "When to Search" guidelines
- Tool availability and descriptions

---

## Prompt Testing

### Test Prompts

Use these to verify prompt behavior:

**Should trigger search:**
- "What is the current price of Bitcoin?"
- "What's the weather in New York?"
- "Who won the game last night?"

**Should NOT trigger search:**
- "What is 2 + 2?"
- "Write me a poem about cats"
- "Explain how photosynthesis works"

### Debugging

If the model behaves unexpectedly:

1. Check server logs for `[Search]` entries
2. Verify tool is being called
3. Check if prompt wording is ambiguous
4. Test with different models (Gemini vs Claude)

---

## Future Enhancements

### Context-Aware Prompting
```typescript
// Dynamic prompt based on query type
function getPrompt(query: string) {
    if (isPriceQuery(query)) return PRICE_PROMPT;
    if (isWeatherQuery(query)) return WEATHER_PROMPT;
    return DEFAULT_PROMPT;
}
```

### Multi-Language Support
```
## Language
Respond in the same language as the user's query.
If the query is in Spanish, respond in Spanish.
```

### Confidence Levels
```
## Confidence
- If information may be outdated, indicate uncertainty
- Use phrases like "as of [date]" when citing time-sensitive data
```
