# Product Requirements Document: Agentic MarketChat System v3
## Adaptive Multi-Agent Architecture

**Project:** Maxwell V2 - ZapMarket  
**Feature:** Agentic MarketChat (Adaptive Market Expert System)  
**Status:** Draft for Review  
**Date:** February 2026  
**Version:** 3.2 - Optimized Models, Perplexity-Inspired Deep Research  
**Author:** AI Assistant + Product Team  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User-Centric Design Philosophy](#2-user-centric-design-philosophy)
3. [Model Selection Strategy](#3-model-selection-strategy)
4. [Context Feeding Architecture](#4-context-feeding-architecture)
5. [Query Complexity Spectrum](#5-query-complexity-spectrum)
6. [Adaptive Architecture](#6-adaptive-architecture)
7. [Agent Specifications](#7-agent-specifications)
8. [Tool Ecosystem](#8-tool-ecosystem)
9. [Deep Research Architecture](#9-deep-research-architecture)
10. [API Specifications](#10-api-specifications)
11. [Client Integration](#11-client-integration)
12. [Data Models](#12-data-models)
13. [Conversation Memory](#13-conversation-memory)
14. [Cost Tracking](#14-cost-tracking)
15. [User Experience Flows](#15-user-experience-flows)
16. [Implementation Phases](#16-implementation-phases)
17. [Cost Analysis](#17-cost-analysis)
18. [Testing Strategy](#18-testing-strategy)
19. [Success Metrics](#19-success-metrics)

---

## 1. Executive Summary

### 1.1 The Real Problem We're Solving

Users viewing prediction markets have questions that span a **spectrum of complexity**. They don't use technical jargon — they ask natural questions:

- **Trivial:** "When does this close?" → instant, zero cost
- **Simple:** "Is this a good bet?" → 1-2 seconds, $0.002
- **Moderate:** "Any recent news on this?" → 3-6 seconds, $0.015
- **Complex:** "Should I buy or sell? Break it down for me." → 8-15 seconds, $0.04
- **Research:** "Tell me everything about this market" → 20-30 seconds, $0.08

**The system must handle ALL of these gracefully**, adapting its approach based on query complexity, not forcing every query through a heavy multi-agent pipeline.

**Critical constraint:** Users already have the Maxwell report displayed in the center panel. MarketChat (left panel) is for quick Q&A, follow-ups, calculations, and deeper dives — NOT for re-running Maxwell.

### 1.2 Core Principle: Adaptive Complexity

```
User sends message
    │
    ├─► [CLIENT] Fast Path? ──────────┐
    │   (Regex pattern match)          │
    │   → Instant answer from          │
    │     market data in memory        │
    │   → 0ms network, $0             │
    │                                  │
    │   (No match? Hit the server)     │
    │                                  │
    ├─► [SERVER] Classify complexity   │
    │   (Gemini 3 Flash, ~100ms)       │
    │                                  │
    │   ├─► Simple? ───────────────────┤
    │   │   (Context only)             │
    │   │   → Single LLM call          │
    │   │   → 1-2s, $0.002            │
    │   │                              │
    │   ├─► Moderate? ─────────────────┤
    │   │   (Needs search/calc)        │
    │   │   → Main Agent + Tools       │
    │   │   → 3-6s, $0.015            │
    │   │                              │
    │   └─► Complex/Research? ─────────┘
    │       (Multi-factor analysis)
    │       → Planner + Multi-Agent
    │       → 8-30s, $0.03-0.08
    │
    └─► [CLIENT] Render SSE stream
```

### 1.3 What Makes This Different

| Traditional Chatbots | PRD v2 (Over-Engineered) | PRD v3 (This - Adaptive) |
|---------------------|-------------------------|-------------------------|
| Same process for all queries | Planner for every query | Routes by complexity |
| No memory | Semantic embeddings | Simple fact extraction |
| No source quality | 6 agents always | 1-2 agents, tools as needed |
| Stateless | Over-complex | Just right |
| Fast but dumb | Smart but slow | Smart AND fast |
| No market context | Context but re-runs pipeline | Uses existing Maxwell report as context |

### 1.4 Existing Infrastructure We Leverage

| Component | Location | What We Reuse |
|-----------|----------|---------------|
| Market data adapters | `/app/lib/markets/adapters/` | Polymarket + Kalshi unified API |
| Maxwell pipeline | `/app/lib/maxwell/` | Cached `MaxwellIntelligence` reports |
| Analysis cache | `/app/lib/markets/analysis-cache.ts` | `getCachedAnalysis()` for Maxwell reports |
| Search agent | `/app/lib/agent.ts` | `streamText` + `fullStream` pattern |
| Search tool | `/app/lib/tools.ts` | Tavily integration with `searchTool` |
| Chat store | `/app/store.ts` | Zustand + IndexedDB persistence |
| Response display | `/app/components/ResponseDisplay.tsx` | Streaming markdown + citations |
| Input interface | `/app/components/InputInterface.tsx` | Mode-aware input with suggestions |
| Market types | `/app/lib/markets/types.ts` | `UnifiedMarket`, `MarketOutcome` |
| Maxwell types | `/app/lib/maxwell/types.ts` | `MaxwellIntelligence`, `MarketContext` |

---

## 2. User-Centric Design Philosophy

### 2.1 The User's Mental Model

**Users don't know the system is called "Maxwell."** They see a chat panel next to market data. They think:

1. **"What's the price?"** (Trivial - look at data)
2. **"Is this a good bet?"** (Simple - summarize the analysis)
3. **"What do the experts think?"** (Simple - thesis from Maxwell report)
4. **"Any recent news?"** (Moderate - needs live search)
5. **"What's my expected value if I bet $500?"** (Moderate - calculation)
6. **"What are the risks I'm not seeing?"** (Complex - multi-factor)
7. **"Should I buy or sell? Break it down."** (Complex - decision support)
8. **"Tell me everything about this market"** (Research - deep dive)

**Key insight:** Users phrase questions naturally. They don't say "Do comprehensive research" — they say "Tell me everything" or "Deep dive on this" or "What am I missing?" The system must understand intent, not keywords.

### 2.2 User Experience Goals

| Priority | Goal | How We Achieve It |
|----------|------|-------------------|
| **P0** | Instant answers to data lookups | Client-side fast path (no network) |
| **P0** | No waiting for context-only questions | Single LLM call with market + Maxwell context |
| **P1** | Smart answers to complex questions | Adaptive agent with tool calling |
| **P1** | Transparency about what's happening | Status indicators (thinking → searching → synthesizing) |
| **P1** | Accurate citations | Source quality scoring + inline [1][2] citations |
| **P2** | Learn from conversation | Fact extraction after each turn |
| **P2** | Remember previous discussions | Per-market conversation persistence |

### 2.3 Anti-Goals (What We're NOT Building)

- **Not** a general-purpose AI (focused on prediction markets only)
- **Not** an autonomous trader (gives analysis, user decides)
- **Not** a Maxwell re-runner (uses cached reports as context, never re-runs the pipeline)
- **Not** a research paper generator (concise, actionable insights)
- **Not** a system that requires technical language ("comprehensive research", "investment thesis") — it understands natural speech

---

## 3. Model Selection Strategy

### 3.1 Design Principles

Model selection is driven by **arena benchmark rankings** first, then cost optimization. We pick the best-performing models that are affordable for each tier's traffic volume.

**Source of truth:** [arena.ai/leaderboard](https://arena.ai/leaderboard) (Jan 29, 2026 — 5.1M votes)

**Key findings from arena rankings:**
- **Gemini 3 Flash** is #1 in Search Arena, #3 in Text Arena, #6 in Code Arena — and costs only $0.50/$3.00. This is our workhorse.
- **Gemini 3 Pro** is #1 in Text Arena, #2 in Search Arena, #4 in Code Arena — the best overall model. We use it for complex/research only.
- **Grok 4.1 Fast** is #6 in Text Arena with $0.20/$0.50 pricing and 2M context — incredible budget option.
- **DeepSeek V3.2** is not in the top 10 of any arena. It was a bad pick. Replaced.

**Critical constraint from codebase:** OpenAI models (GPT-5.x) have tool schema serialization bugs with `@openrouter/ai-sdk-provider` (see `/app/lib/models.ts`). Claude Opus models send empty tool inputs. We avoid both for tool-calling tiers.

### 3.2 Model Stack (Arena-Ranked, Verified OpenRouter Pricing Feb 2026)

| Role | Model | OpenRouter ID | Input/1M | Output/1M | Context | Arena Rank | Why |
|------|-------|---------------|----------|-----------|---------|------------|-----|
| **Main Agent** | Gemini 3 Flash | `google/gemini-3-flash-preview` | $0.50 | $3.00 | 1M | **#1 Search, #3 Text, #6 Code** | Best search-grounded model in the world. Excellent tool calling. Built-in thinking mode. 1M context. |
| **Classifier** | Gemini 3 Flash | `google/gemini-3-flash-preview` | $0.50 | $3.00 | 1M | #3 Text | Same model as agent — no cold start, already loaded. Classification uses ~50 tokens output ($0.00015/call). |
| **Complex Agent** | Gemini 3 Pro | `google/gemini-3-pro-preview` | $2.00 | $12.00 | 1M | **#1 Text, #2 Search, #4 Code** | The #1 ranked model overall. Reserved for complex + research tiers (10% of queries). |
| **Extraction** | Gemini 3 Flash | `google/gemini-3-flash-preview` | $0.50 | $3.00 | 1M | #1 Search, #3 Text | Same model as agent — consolidates stack, no cold start. Slightly more than 2.5 Flash but not outdated. |
| **Research Synthesis** | Gemini 3 Pro | `google/gemini-3-pro-preview` | $2.00 | $12.00 | 1M | #1 Text | Best reasoning for final report generation. |
| **News Analyst** | Gemini 3 Flash | `google/gemini-3-flash-preview` | $0.50 | $3.00 | 1M | #1 Search | Best at search-grounded tasks. Perfect for iterative search refinement. |
| **Budget Fallback** | Grok 4.1 Fast | `x-ai/grok-4.1-fast` | $0.20 | $0.50 | 2M | #6 Text | Cheapest frontier model. 2M context. Web search at $0.50/M. |

### 3.3 Why Gemini 3 Flash as Main Agent (Not DeepSeek)

DeepSeek V3.2 ($0.25/$0.38) is cheaper, but Gemini 3 Flash ($0.50/$3.00) is the correct choice:

| Factor | DeepSeek V3.2 | Gemini 3 Flash | Winner |
|--------|--------------|----------------|--------|
| **Search Arena** | Not ranked | **#1** | Gemini 3 Flash |
| **Text Arena** | Not in top 10 | **#3** | Gemini 3 Flash |
| **Code Arena** | Not in top 10 | **#6** | Gemini 3 Flash |
| **Tool calling** | Supported | **Excellent** (Google native) | Gemini 3 Flash |
| **Context window** | 163K | **1M** | Gemini 3 Flash |
| **Thinking mode** | Via reasoning flag | **Built-in** (configurable levels) | Gemini 3 Flash |
| **Multimodal** | Text only | Text + image + file + audio + video | Gemini 3 Flash |
| **Cost (input)** | **$0.25/M** | $0.50/M | DeepSeek |
| **Cost (output)** | **$0.38/M** | $3.00/M | DeepSeek |

**Verdict:** Gemini 3 Flash is 2x more expensive on input but **8x more expensive on output**. However, it's the **#1 search model in the world** and our system is fundamentally a search-grounded chat. The quality difference justifies the cost — and at $0.50/$3.00, it's still very affordable for 90% of queries.

**DeepSeek V3.2 remains as a budget fallback** for cost-sensitive deployments or if Gemini is down.

### 3.4 Fallback Chain

```
Gemini 3 Flash (Main Agent + Classifier + News Analyst)
  └─► Fallback: Grok 4.1 Fast ($0.20/$0.50, 2M context)
      └─► Fallback: DeepSeek V3.2 ($0.25/$0.38, 163K context)

Gemini 3 Pro (Complex + Research Synthesis + Planner)
      └─► Fallback: Claude Haiku 4.5 ($1.00/$5.00, 200K context)
      └─► Fallback: Gemini 3 Flash ($0.50/$3.00)

Gemini 3 Flash (Extraction + Summarization)
  └─► Fallback: Grok 4.1 Fast ($0.20/$0.50)
      └─► Fallback: Kimi K2.5 Thinking (open-weight alternative)
```

### 3.5 Temperature & Token Settings by Task

| Task | Model | Temperature | Max Tokens | Reasoning |
|------|-------|-------------|------------|-----------|
| **Classification** | Gemini 3 Flash | 0.0 | 10 | Deterministic single-word output |
| **Simple Q&A** | Gemini 3 Flash | 0.3 | 1500 | Factual but conversational |
| **Tool-calling agent** | Gemini 3 Flash | 0.3 | 2000 | Balanced reasoning + tool selection |
| **Complex agent** | Gemini 3 Pro | 0.3 | 3000 | Strong reasoning with tools |
| **Fact extraction** | Gemini 3 Flash | 0.1 | 500 | Factual, structured JSON output |
| **Conversation summary** | Gemini 3 Flash | 0.2 | 200 | Concise, preserves key facts |
| **Research planning** | Gemini 3 Pro | 0.1 | 1500 | Structured, consistent plans |
| **Research synthesis** | Gemini 3 Pro | 0.4 | 4000 | Slightly creative for narrative flow |
| **Iterative search refinement** | Gemini 3 Flash | 0.2 | 800 | Focused query reformulation |

### 3.6 Cost Comparison vs Previous Stacks

| Role | v3.0 (Claude Sonnet 4) | v3.1 (DeepSeek V3.2) | v3.2 (Gemini 3 Flash) | vs v3.0 |
|------|----------------------|---------------------|---------------------|---------|
| Main Agent | $9.00/M | $0.32/M | $1.75/M | **81% cheaper** |
| Complex | $9.00/M | $5.63/M | $7.00/M | **22% cheaper** |
| Extraction | $1.75/M | $1.40/M | $1.40/M | **20% cheaper** |
| Classifier | $3.00/M | $3.00/M | $1.75/M | **42% cheaper** |

**Net result:** Slightly more expensive than DeepSeek stack, but dramatically better quality (arena #1 vs not ranked).

### 3.7 Models We Evaluated But Rejected

| Model | Arena Rank | Price | Status |
|-------|-----------|-------|--------|
| **Kimi K2.5 Thinking** | #5 Code | TBD | **Future candidate.** Strong code arena performance. Monitor OpenRouter availability and pricing. |
| **GLM 4.7** | #7 Code (MIT license) | TBD | **Future candidate.** Open-weight, MIT licensed. Monitor for OpenRouter availability. |
| **DeepSeek V3.2** | Not top 10 | $0.25/$0.38 | Budget fallback only. Cheap but not competitive on arena benchmarks. |
| **Grok 4.1 (thinking)** | #2 Text | $3/$12 | Expensive thinking variant. Non-thinking Grok 4.1 Fast ($0.20/$0.50) is our budget fallback instead. |
| **Perplexity Sonar** | N/A | $1/$1 | Has built-in search but we use Tavily. Would add complexity without clear benefit. |

---

## 4. Context Feeding Architecture

### 4.1 The Problem

MarketChat needs access to two data sources to answer questions intelligently:

1. **Market Data** (`UnifiedMarket`) — prices, outcomes, dates, volume, rules
2. **Maxwell Report** (`MaxwellIntelligence`) — verdict, thesis, risk assessment, outcomes analysis

Currently, `MarketChat` only receives `marketId: string`. The parent page (`/app/markets/[id]/page.tsx`) has both the market object and Maxwell intelligence, but doesn't pass them down.

### 4.2 Solution: Hybrid Context Assembly

**Client-side:** Pass `market` and `maxwellReport` as props for fast path matching.  
**Server-side:** The API endpoint fetches fresh data to ensure accuracy.

```typescript
// STEP 1: Update MarketChat props (client-side)
interface MarketChatProps {
  marketId: string;
  market: UnifiedMarket;                    // From parent page state
  maxwellReport?: MaxwellIntelligence;      // From useMaxwell().intelligence
}

// STEP 2: Parent page passes context down
// In /app/markets/[id]/page.tsx:
<MarketChat
  marketId={market.id}
  market={market}
  maxwellReport={maxwell.intelligence}
/>

// STEP 3: Server-side also fetches for accuracy
// In /api/market-chat/route.ts:
export async function POST(req: Request) {
  const { marketId, messages } = await req.json();

  // Server fetches fresh data (parallel)
  const [marketRes, cachedAnalysis] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_URL}/api/markets/${encodeURIComponent(marketId)}`),
    getCachedAnalysis(marketId),
  ]);

  const market = (await marketRes.json()).market as UnifiedMarket;
  const maxwellReport = cachedAnalysis?.intelligence ?? null;

  // ... proceed with tier detection and agent execution
}
```

**Why hybrid?**
- Client needs market + Maxwell for fast path (no network round-trip)
- Server needs them for LLM system prompt construction
- Client sends only `{ marketId, messages }` — lightweight payload (~1KB)
- Server fetches fresh data — no stale context risk

### 4.3 System Prompt Token Budget

The system prompt must include market context + Maxwell summary without blowing up tokens.

```typescript
// app/lib/market-chat/context-builder.ts

function buildMarketChatSystemPrompt(
  market: UnifiedMarket,
  maxwellReport: MaxwellIntelligence | null,
  conversationFacts: string[]
): string {
  // ~200 tokens: Market data
  const marketBlock = `
MARKET: ${market.title}
PLATFORM: ${market.platform}
TYPE: ${market.marketType}
STATUS: ${market.status}
OUTCOMES: ${market.outcomes.map(o => `${o.name}: ${(o.price * 100).toFixed(1)}%`).join(' | ')}
CLOSES: ${new Date(market.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
VOLUME: $${(market.volume / 1e6).toFixed(2)}M total | $${(market.volume24h / 1e3).toFixed(0)}K 24h
${market.liquidity ? `LIQUIDITY: $${(market.liquidity / 1e3).toFixed(0)}K` : ''}
${market.rules ? `RESOLUTION RULES: ${market.rules.slice(0, 500)}` : ''}
${market.resolutionSource ? `RESOLUTION SOURCE: ${market.resolutionSource}` : ''}
`.trim();

  // ~300 tokens: Maxwell summary (condensed, not full raw data)
  const maxwellBlock = maxwellReport ? `
ANALYSIS REPORT (pre-computed, do NOT re-run):
  VERDICT: ${maxwellReport.assessment.verdict} (${maxwellReport.assessment.confidence} confidence)
  HEADLINE: ${maxwellReport.assessment.headline}
  PRICE RANGE: ${maxwellReport.assessment.maxwellRange.low}%-${maxwellReport.assessment.maxwellRange.high}% (market: ${(maxwellReport.assessment.marketPrice * 100).toFixed(1)}%)
  FACTORS FOR: ${maxwellReport.thesis.factorsFor.slice(0, 3).map(f => f.point).join('; ')}
  FACTORS AGAINST: ${maxwellReport.thesis.factorsAgainst.slice(0, 3).map(f => f.point).join('; ')}
  KEY UNCERTAINTY: ${maxwellReport.thesis.keyUncertainty}
  NEXT CATALYST: ${maxwellReport.thesis.nextCatalyst.event}${maxwellReport.thesis.nextCatalyst.date ? ` (${maxwellReport.thesis.nextCatalyst.date})` : ''}
  RESOLUTION RISK: ${maxwellReport.resolutionRisk.level} — ${maxwellReport.resolutionRisk.factors.join(', ')}
  VERIFICATION: ${maxwellReport.verification.level} (${maxwellReport.verification.claimsVerified} claims verified)
${maxwellReport.outcomes.length > 1 ? `  OUTCOMES: ${maxwellReport.outcomes.map(o => `${o.name}: market ${(o.marketPrice*100).toFixed(0)}% → analysis ${o.maxwellRange.low}-${o.maxwellRange.high}% (${o.view})`).join(' | ')}` : ''}
`.trim() : 'ANALYSIS REPORT: Not available. User has not run analysis yet.';

  // ~50 tokens: Conversation facts (if any)
  const factsBlock = conversationFacts.length > 0
    ? `\nESTABLISHED FACTS FROM THIS CONVERSATION:\n${conversationFacts.map(f => `- ${f}`).join('\n')}`
    : '';

  // ~500 tokens: System instructions
  const instructions = `
You are a prediction market expert assistant. You help users understand and analyze prediction markets.

CONTEXT HIERARCHY (check in this order):
1. MARKET DATA above — for prices, dates, volume, rules
2. ANALYSIS REPORT above — for verdict, thesis, risks, outcomes
3. CONVERSATION HISTORY — for follow-up context
4. TOOLS (search, calculate) — ONLY when data above is insufficient

CRITICAL RULES:
- CHECK CONTEXT FIRST. Before calling any tool, verify the answer isn't already in the market data or analysis report above. Most questions can be answered without tools.
- If the user asks about "the analysis" or "what do you think" or "is this a good bet" — use the ANALYSIS REPORT, do NOT search.
- If the user asks about "latest news" or "what happened today" or "any updates" — use the search_news tool.
- If the user asks for calculations (EV, Kelly, probability) — use the calculate tool.
- NEVER say "Maxwell" or reference internal system names. Say "our analysis" or "the report."
- Answer directly, no preamble. Be concise but thorough.
- Cite search sources as [1], [2]. Cite the analysis report as [Analysis].
- Show calculations explicitly: "52% / 71% = 73.2%"
- If uncertain, say so clearly.
- Bold key numbers and verdicts.
- Use markdown formatting (headers, lists, bold).
`;

  return `${instructions}\n\n---\n\n${marketBlock}\n\n${maxwellBlock}${factsBlock}`;
}
```

**Estimated total: ~1,050 tokens** — well within budget for all models.

---

## 5. Query Complexity Spectrum

### 5.1 Realistic Query Examples by Tier

Users don't use technical keywords. Here's what they actually say:

| Tier | What Users Say | Why This Tier | Response Time | Cost |
|------|---------------|---------------|---------------|------|
| **Trivial** | "When does this close?" | Direct data lookup | 0ms (client) | $0 |
| **Trivial** | "What's the price?" | Direct data lookup | 0ms (client) | $0 |
| **Trivial** | "How much volume?" | Direct data lookup | 0ms (client) | $0 |
| **Trivial** | "What are the outcomes?" | Direct data lookup | 0ms (client) | $0 |
| **Simple** | "Is this a good bet?" | Summarize analysis report | 1-2s | $0.002 |
| **Simple** | "What do you think?" | Summarize analysis report | 1-2s | $0.002 |
| **Simple** | "Why is this underpriced?" | Explain verdict from report | 1-2s | $0.002 |
| **Simple** | "What are the main risks?" | Resolution risk from report | 1-2s | $0.002 |
| **Simple** | "Explain the thesis" | Thesis factors from report | 1-2s | $0.002 |
| **Moderate** | "Any recent news?" | Needs live Tavily search | 3-6s | $0.015 |
| **Moderate** | "What happened today?" | Needs live Tavily search | 3-6s | $0.015 |
| **Moderate** | "What's my EV if I bet $500?" | Needs calculation tool | 2-4s | $0.005 |
| **Moderate** | "How do these odds compare to last month?" | Needs search + context | 3-6s | $0.015 |
| **Moderate** | "What are experts saying?" | Needs search for opinions | 3-6s | $0.015 |
| **Complex** | "Should I buy or sell?" | Multi-factor decision | 8-15s | $0.04 |
| **Complex** | "Break this down for me" | Comprehensive analysis | 8-15s | $0.04 |
| **Complex** | "What am I missing?" | Risk + contrarian analysis | 8-15s | $0.04 |
| **Complex** | "Compare to similar markets" | Cross-market analysis | 8-15s | $0.04 |
| **Research** | "Tell me everything" | Deep investigation | 20-30s | $0.08 |
| **Research** | "Deep dive on this" | Full research pipeline | 20-30s | $0.08 |
| **Research** | "Give me an investment thesis" | Comprehensive + structured | 20-30s | $0.08 |

### 5.2 Trivial Queries (35% of traffic)

**Pattern:** Direct lookup from market context data. No LLM needed.  
**Execution:** Client-side only. Zero network latency.

```typescript
// app/lib/market-chat/fast-path.ts
// Runs in the BROWSER — no API call

interface FastPathResult {
  matched: boolean;
  response: string;
}

const FAST_PATTERNS: Array<{
  patterns: RegExp[];
  extract: (market: UnifiedMarket, report?: MaxwellIntelligence) => string;
}> = [
  {
    // Date/close queries
    patterns: [
      /when (does|will|is).*(close|end|resolve|expire)/i,
      /closing (date|time)/i,
      /deadline/i,
    ],
    extract: (m) => {
      const date = new Date(m.endDate);
      const now = new Date();
      const daysLeft = Math.ceil((date.getTime() - now.getTime()) / 86400000);
      return `This market closes **${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}** (${daysLeft > 0 ? `${daysLeft} days from now` : 'already closed'}).`;
    },
  },
  {
    // Price/odds queries
    patterns: [
      /\b(price|odds|chance|probability|trading at|current)\b/i,
      /how likely/i,
      /what.*(percent|%)/i,
    ],
    extract: (m) => {
      if (m.outcomes.length <= 2) {
        return `Current price: **${(m.yesPrice * 100).toFixed(1)}% Yes** / ${(m.noPrice * 100).toFixed(1)}% No`;
      }
      const sorted = [...m.outcomes].sort((a, b) => b.price - a.price);
      return `Current prices:\n${sorted.map((o, i) => `${i + 1}. **${o.name}:** ${(o.price * 100).toFixed(1)}%`).join('\n')}`;
    },
  },
  {
    // Volume queries
    patterns: [
      /\b(volume|traded|liquidity|money|how much)\b/i,
    ],
    extract: (m) => {
      const parts = [`**Total volume:** $${formatVolume(m.volume)}`];
      if (m.volume24h > 0) parts.push(`**24h volume:** $${formatVolume(m.volume24h)}`);
      if (m.liquidity) parts.push(`**Liquidity:** $${formatVolume(m.liquidity)}`);
      return parts.join(' | ');
    },
  },
  {
    // Market type queries
    patterns: [
      /what (type|kind) of market/i,
      /is this (binary|multi)/i,
    ],
    extract: (m) => `This is a **${m.marketType}** market on **${m.platform}** with ${m.outcomes.length} outcome${m.outcomes.length > 1 ? 's' : ''}.`,
  },
  {
    // Resolution rules queries
    patterns: [
      /resolution (criteria|rules|source)/i,
      /how does this resolve/i,
      /what determines/i,
    ],
    extract: (m) => {
      const parts = [];
      if (m.rules) parts.push(`**Resolution rules:** ${m.rules}`);
      if (m.resolutionSource) parts.push(`**Source:** ${m.resolutionSource}`);
      return parts.length > 0 ? parts.join('\n\n') : 'Resolution criteria not specified by the platform.';
    },
  },
  {
    // Outcome listing
    patterns: [
      /what are the outcomes/i,
      /list.*(outcomes|options|choices)/i,
    ],
    extract: (m) => {
      const sorted = [...m.outcomes].sort((a, b) => b.price - a.price);
      return `**Outcomes (${m.outcomes.length}):**\n${sorted.map((o, i) => `${i + 1}. ${o.name} — **${(o.price * 100).toFixed(1)}%**`).join('\n')}`;
    },
  },
];

export function checkFastPath(
  query: string,
  market: UnifiedMarket,
  maxwellReport?: MaxwellIntelligence | null
): FastPathResult {
  const normalized = query.toLowerCase().trim();

  // Check for compound queries — if user asks multiple things, don't fast-path
  const hasConjunction = /\b(and also|and what|and how|and when)\b/i.test(query);
  const hasMultipleQuestions = (query.match(/\?/g) || []).length > 1;
  if (hasConjunction || hasMultipleQuestions) {
    return { matched: false, response: '' };
  }

  for (const { patterns, extract } of FAST_PATTERNS) {
    if (patterns.some(p => p.test(normalized))) {
      return {
        matched: true,
        response: extract(market, maxwellReport ?? undefined),
      };
    }
  }

  return { matched: false, response: '' };
}

function formatVolume(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}
```

### 5.3 Simple Queries (25% of traffic)

**Pattern:** Answerable from market data + Maxwell report context. No tools needed.  
**Execution:** Server-side, single LLM call with `maxSteps: 1` (no tool calling).

The agent has the full market context and Maxwell report in its system prompt. It answers directly without calling any tools.

```typescript
// Server-side: single LLM call, no tools
const result = streamText({
  model: openrouter('google/gemini-3-flash-preview'),
  system: buildMarketChatSystemPrompt(market, maxwellReport, facts),
  messages: conversationHistory,
  // No tools — context-only answer
  maxTokens: 1500,
  temperature: 0.3,
});
// 1-2s response, ~$0.002 cost (Gemini 3 Flash — #1 Search Arena)
```

### 5.4 Moderate Queries (30% of traffic)

**Pattern:** Needs external data (search) or calculations. Agent uses tools.  
**Execution:** Server-side, `streamText` with tools and `stopWhen: stepCountIs(5)`.

```typescript
// Server-side: agent with tool calling
const result = streamText({
  model: openrouter('google/gemini-3-flash-preview'),
  system: buildMarketChatSystemPrompt(market, maxwellReport, facts),
  messages: conversationHistory,
  tools: {
    search_news: searchNewsTool,
    calculate: calculateTool,
    get_market_data: getMarketDataTool,
  },
  stopWhen: stepCountIs(5),
  temperature: 0.3,
  onStepFinish: ({ toolCalls, usage }) => {
    // Emit status events for UI
    // Track cost per step
  },
});
// 3-6s response, $0.005-0.012 cost (LLM) + $0.008-0.016 (Tavily)
```

### 5.5 Complex Queries (8% of traffic)

**Pattern:** Multi-factor analysis requiring coordination of search + calculation + synthesis.  
**Execution:** Server-side, agent with expanded tool set and higher step limit. Optionally escalates to Planner + Multi-Agent for the most complex queries.

```typescript
// Server-side: agent with more steps and all tools
// Complex tier uses Gemini 3 Pro — #1 Text Arena
const result = streamText({
  model: openrouter('google/gemini-3-pro-preview'),
  system: buildMarketChatSystemPrompt(market, maxwellReport, facts),
  messages: conversationHistory,
  tools: {
    search_news: searchNewsTool,
    calculate: calculateTool,
    get_market_data: getMarketDataTool,
    deep_extract: deepExtractTool, // Tavily Extract for key URLs
  },
  stopWhen: stepCountIs(10),
  temperature: 0.3,
});
// 8-15s response, $0.02-0.04 cost
```

### 5.6 Research Queries (2% of traffic)

**Pattern:** Deep investigation. User wants comprehensive analysis.  
**Execution:** Planner Agent creates execution plan → parallel specialist execution → Synthesizer combines.

```typescript
// Server-side: Planner + Multi-Agent
const plan = await createResearchPlan(query, market, maxwellReport);
const results = await executeResearchPlan(plan); // Parallel agents
const synthesis = await synthesizeResearch(results, query);
// 20-30s response, $0.05-0.10 cost
// Show progress indicators throughout
```

---

## 6. Adaptive Architecture

### 6.1 Full System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                                  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  MarketChat Component                                        │   │
│  │  Props: { marketId, market, maxwellReport }                  │   │
│  │                                                              │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │   │
│  │  │  Fast Path      │  │  useMarketChat │  │ Conversation  │  │   │
│  │  │  (client regex) │  │  (SSE hook)    │  │ State         │  │   │
│  │  │  0ms, $0        │  │  manages stream│  │ (Zustand)     │  │   │
│  │  └────────────────┘  └────────────────┘  └───────────────┘  │   │
│  │                                                              │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │  InputInterface (mode="maxwell", hideSuggestions)       │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │  ResponseDisplay (streaming markdown + citations)       │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              │ POST /api/market-chat                │
│                              │ { marketId, messages }               │
│                              ▼                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                    SERVER (Next.js API Route)                        │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  /api/market-chat/route.ts                                   │   │
│  │                                                              │   │
│  │  1. Fetch market data (reuse adapters, 5-min server cache)   │   │
│  │  2. Fetch Maxwell report (getCachedAnalysis from IndexedDB)  │   │
│  │  3. Classify complexity (Gemini 3 Flash, ~100ms, $0.00015)   │   │
│  │  4. Route to appropriate tier handler                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│        ┌─────────────────────┼─────────────────────┐                │
│        ▼                     ▼                     ▼                │
│   ┌──────────┐         ┌──────────┐         ┌───────────┐          │
│   │ SIMPLE   │         │ MODERATE │         │ COMPLEX/  │          │
│   │          │         │          │         │ RESEARCH  │          │
│   │ streamText│         │ streamText│         │           │          │
│   │ no tools │         │ + tools  │         │ Planner + │          │
│   │ steps: 1 │         │ steps: 5 │         │ Agents    │          │
│   │ $0.002   │         │ $0.015   │         │ $0.04-0.08│          │
│   └──────────┘         └──────────┘         └───────────┘          │
│                              │                                      │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  TOOLS                                                       │  │
│   │  search_news: Tavily API (basic/advanced, news/general)      │  │
│   │  calculate: EV, Kelly, implied probability (deterministic)   │  │
│   │  get_market_data: Live prices via Polymarket/Kalshi adapters │  │
  │   │  deep_extract: Tavily Extract (Tier 3 only, top 3 URLs)      │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                         SSE Stream                                  │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
                    Client renders streaming response
```

### 6.2 Complexity Detection: Hybrid Approach

**The old approach (keyword regex) is too brittle.** "What's the latest Maxwell report?" contains "latest" but doesn't need search. "Is this a good bet?" has no keywords but needs the analysis report.

**New approach: Fast Path (client) + LLM Classifier (server)**

```typescript
// STEP 1: Client-side fast path (instant, $0)
// See Section 4.2 for full implementation
const fastResult = checkFastPath(query, market, maxwellReport);
if (fastResult.matched) {
  // Render immediately, no API call
  return;
}

// STEP 2: Server-side LLM classification (Gemini 3 Flash, ~100ms, $0.00015)
// app/lib/market-chat/classifier.ts

import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'research';

async function classifyComplexity(
  query: string,
  marketTitle: string,
  hasMaxwellReport: boolean,
  recentHistory: Array<{ role: string; content: string }>
): Promise<ComplexityLevel> {
  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! });

  const historyContext = recentHistory.length > 0
    ? `\nRecent conversation:\n${recentHistory.slice(-4).map(m => `${m.role}: ${m.content.slice(0, 100)}`).join('\n')}`
    : '';

  // Use same model as main agent (Gemini 3 Flash) — no cold start, already loaded
  const { text } = await generateText({
    model: openrouter('google/gemini-3-flash-preview'),
    prompt: `Classify this prediction market chat query. Market: "${marketTitle}". Analysis report: ${hasMaxwellReport ? 'available' : 'not available'}.${historyContext}

Query: "${query}"

Rules:
- SIMPLE: Can be answered from market data or analysis report alone (prices, verdict, thesis, risks, outcomes, "is this a good bet", "what do you think", "explain this")
- MODERATE: Needs live web search OR mathematical calculation ("latest news", "what happened today", "calculate my EV", "what are experts saying", "compare odds")
- COMPLEX: Requires multiple searches + calculations + synthesis ("should I buy or sell", "break this down", "what am I missing", "full risk assessment")
- RESEARCH: User wants comprehensive deep-dive ("tell me everything", "deep dive", "investment thesis", "analyze every factor")

If this is a follow-up to the conversation, consider what was discussed before.

Respond with ONE word: SIMPLE, MODERATE, COMPLEX, or RESEARCH`,
    maxTokens: 10,
    temperature: 0,
  });

  const normalized = text.trim().toUpperCase();
  const validLevels: Record<string, ComplexityLevel> = {
    'SIMPLE': 'simple',
    'MODERATE': 'moderate',
    'COMPLEX': 'complex',
    'RESEARCH': 'research',
  };

  return validLevels[normalized] || 'simple'; // Default to simple
}
```

**Why Gemini 3 Flash for classification?**
- Same model as the main agent — no cold start, already warm in the provider
- ~100ms latency for a 10-token classification response
- ~$0.00015 per classification (even cheaper than Haiku — 50 tokens input × $0.50/M)
- **#3 in Text Arena** — understands natural language intent, not just keywords
- Handles follow-up context ("What about the other outcome?" → inherits previous complexity)

### 6.3 Escalation Logic

```typescript
// app/lib/market-chat/router.ts

async function handleMarketChatQuery(
  query: string,
  marketId: string,
  messages: ChatMessage[]
): AsyncGenerator<ServerEvent> {
  // 1. Fetch context (parallel)
  const [market, cachedAnalysis] = await Promise.all([
    fetchMarketById(marketId),
    getCachedAnalysis(marketId),
  ]);
  const maxwellReport = cachedAnalysis?.intelligence ?? null;

  // 2. Classify complexity
  const complexity = await classifyComplexity(
    query,
    market.title,
    !!maxwellReport,
    messages.slice(-4).map(m => ({ role: m.role, content: m.content }))
  );

  // 3. Build system prompt
  const facts = await getConversationFacts(marketId);
  const systemPrompt = buildMarketChatSystemPrompt(market, maxwellReport, facts);

  // 4. Route to tier
  switch (complexity) {
    case 'simple':
      yield* handleSimple(query, systemPrompt, messages);
      break;
    case 'moderate':
      yield* handleModerate(query, systemPrompt, messages, market);
      break;
    case 'complex':
      yield* handleComplex(query, systemPrompt, messages, market, maxwellReport);
      break;
    case 'research':
      yield* handleResearch(query, systemPrompt, messages, market, maxwellReport);
      break;
  }
}

async function* handleSimple(
  query: string,
  systemPrompt: string,
  messages: ChatMessage[]
): AsyncGenerator<ServerEvent> {
  yield { type: 'status', status: 'thinking' };

  const result = streamText({
    model: openrouter('google/gemini-3-flash-preview'),
    system: systemPrompt,
    messages: toCoreMessages(messages, query),
    maxTokens: 1500,
    temperature: 0.3,
  });

  for await (const chunk of result.textStream) {
    yield { type: 'chunk', content: chunk };
  }

  const usage = await result.usage;
  yield {
    type: 'complete',
    tier: 'simple',
    cost: calculateLLMCost(usage, 'google/gemini-3-flash-preview'),
    latencyMs: Date.now() - startTime,
  };
}

async function* handleModerate(
  query: string,
  systemPrompt: string,
  messages: ChatMessage[],
  market: UnifiedMarket
): AsyncGenerator<ServerEvent> {
  yield { type: 'status', status: 'thinking' };

  const result = streamText({
    model: openrouter('google/gemini-3-flash-preview'),
    system: systemPrompt,
    messages: toCoreMessages(messages, query),
    tools: {
      search_news: searchNewsTool,
      calculate: calculateTool,
      get_market_data: createMarketDataTool(market),
    },
    stopWhen: stepCountIs(5),
    temperature: 0.3,
    onStepFinish: ({ toolCalls, usage }) => {
      // Emit tool status for UI
    },
  });

  const collectedSources: Source[] = [];

  for await (const event of result.fullStream) {
    if (event.type === 'text-delta') {
      yield { type: 'chunk', content: event.text };
    } else if (event.type === 'tool-call') {
      yield { type: 'status', status: `searching`, tool: event.toolName };
    } else if (event.type === 'tool-result') {
      // Collect sources from search results
      const output = (event as any).output;
      if (output?.results) {
        collectedSources.push(...output.results);
      }
    }
  }

  const usage = await result.usage;
  yield {
    type: 'complete',
    tier: 'moderate',
    sources: collectedSources,
    cost: calculateLLMCost(usage, 'google/gemini-3-flash-preview'),
    latencyMs: Date.now() - startTime,
  };
}
```

---

## 7. Agent Specifications

### 7.1 Main Agent (Tier 2 — Simple + Moderate)

**Model:** Gemini 3 Flash (`google/gemini-3-flash-preview`) via OpenRouter  
**Why this model:** **#1 in Search Arena**, #3 in Text Arena, #6 in Code Arena. The best search-grounded model available. Excellent tool calling (Google-native), built-in thinking mode, 1M context window, multimodal. At $0.50/$3.00 per 1M tokens it's affordable for 90% of queries.  
**Fallback:** Grok 4.1 Fast (`x-ai/grok-4.1-fast`) at $0.20/$0.50 — #6 Text Arena, 2M context  
**Role:** Primary interface for ~55% of queries  
**Temperature:** 0.3 (factual but conversational)  
**Max Tokens:** 2000  
**Max Steps:** 1 (simple) or 5 (moderate)

**System Prompt:** See Section 4.3 for full `buildMarketChatSystemPrompt()`.

**Key behaviors:**
- Checks market data and Maxwell report BEFORE calling tools
- Uses `search_news` only when live data is needed
- Uses `calculate` for EV, Kelly, probability math
- Cites sources as [1], [2] and analysis as [Analysis]
- Never mentions "Maxwell" — says "our analysis" or "the report"

**When to escalate to Complex/Research:**
- LLM classifier detects complex or research intent
- This is determined BEFORE the agent runs, not during

### 7.2 Planner Agent (Tier 3 — Complex + Research)

**Model:** Gemini 3 Pro (`google/gemini-3-pro-preview`) via OpenRouter  
**Why this model:** **#1 in Text Arena**, #2 in Search Arena, #4 in Code Arena. The highest-ranked model overall. Excellent structured output generation, 1M context, strong reasoning. $2.00/$12.00 per 1M tokens — used only for 10% of queries so cost is justified.  
**Role:** Creates execution plans for multi-factor queries  
**Temperature:** 0.1 (low for consistent, structured plan generation)  
**Max Tokens:** 1500

**Invoked when:** Classifier returns `complex` or `research`.

```typescript
// app/lib/market-chat/planner.ts

interface ResearchPlan {
  reasoning: string;
  subtasks: Array<{
    id: string;
    type: 'search' | 'calculate' | 'extract' | 'synthesize';
    description: string;
    params: Record<string, any>;
    dependsOn: string[];
  }>;
  parallelGroups: string[][]; // Tasks that can run in parallel
  estimatedTimeSeconds: number;
}

async function createResearchPlan(
  query: string,
  market: UnifiedMarket,
  maxwellReport: MaxwellIntelligence | null
): Promise<ResearchPlan> {
  const { object: plan } = await generateObject({
    model: openrouter('google/gemini-3-pro-preview'),
    schema: researchPlanSchema, // Zod schema
    prompt: `Create a research plan for this prediction market query.

MARKET: ${market.title}
ANALYSIS AVAILABLE: ${!!maxwellReport}
USER QUERY: "${query}"

Break this into subtasks. Available task types:
- search: Tavily web search (specify query, topic, depth, timeRange)
- calculate: Math operations (specify operation, inputs)
- extract: Deep content extraction from specific URLs (use sparingly, max 3 URLs)
- synthesize: Combine results into final answer

Rules:
- Maximum 5 subtasks
- Group independent tasks for parallel execution
- Always end with a synthesize task
- Only use extract for high-value sources (major news outlets, research papers)`,
    temperature: 0.1,
  });

  return plan;
}
```

### 7.3 News Analyst Agent (Tier 3 only)

**Model:** Gemini 3 Flash (`google/gemini-3-flash-preview`) via OpenRouter  
**Why this model:** **#1 in Search Arena** — literally the best search-grounded model available. $0.50/$3.00, 1M context, built-in thinking mode. Perfect for iterative search refinement.  
**Role:** Executes search subtasks with iterative refinement  
**Temperature:** 0.2 (low for factual search, slightly above 0 for query reformulation creativity)

**Capabilities:**
- Tavily search with smart parameter selection
- Source quality scoring (see Section 7.3)
- **Perplexity-inspired iterative refinement:** if first search is insufficient, analyzes gaps, reformulates query, and searches again (max 3 iterations with confidence tracking)
- Cross-validates claims across multiple sources before returning
- Returns scored, ranked results with snippets

### 7.4 Synthesizer Agent (Tier 3 only)

**Model:** Gemini 3 Pro (`google/gemini-3-pro-preview`) via OpenRouter  
**Why this model:** **#1 Text Arena** — best reasoning model available. 1M context handles all gathered evidence. Excellent at structured report generation with citations.  
**Role:** Combines all subtask outputs into a coherent, cited response  
**Temperature:** 0.3

**Only invoked as the final step of a research plan.**

---

## 8. Tool Ecosystem

### 8.1 search_news Tool

**Available in:** Tier 2 (Moderate), Tier 3 (Complex/Research)  
**Backend:** Tavily Search API  
**Cost:** 1 credit basic ($0.008), 2 credits advanced ($0.016)

```typescript
// app/lib/market-chat/tools/search-news.ts
import { tool } from 'ai';
import { z } from 'zod';

export const searchNewsTool = tool({
  description: 'Search the web for current news and developments. Use for recent events, expert opinions, or data not in the market context. Do NOT use if the answer is already in the market data or analysis report.',
  inputSchema: z.object({
    query: z.string()
      .max(400)
      .describe('Concise search query. Use keywords, not full sentences. Under 400 chars.'),
    topic: z.enum(['general', 'news'])
      .default('general')
      .describe('Use "news" for recent events, politics, sports. Use "general" for background research, definitions, historical data.'),
    depth: z.enum(['basic', 'advanced'])
      .default('basic')
      .describe('Use "advanced" for detailed analysis or when basic returns insufficient results. Costs 2x.'),
    days: z.number()
      .optional()
      .describe('How many days back to search. 1 = today, 7 = this week, 30 = this month. Omit for no time filter.'),
    maxResults: z.number()
      .default(5)
      .describe('Number of results. 3-5 for quick lookups, 8-10 for comprehensive research.'),
  }),
  execute: async ({ query, topic, depth, days, maxResults }) => {
    // Map days to Tavily time_range
    let time_range: string | undefined;
    if (days) {
      if (days <= 1) time_range = 'day';
      else if (days <= 7) time_range = 'week';
      else if (days <= 30) time_range = 'month';
      else time_range = 'year';
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: maxResults,
        search_depth: depth,
        topic,
        time_range,
        include_answer: true,
        include_raw_content: depth === 'advanced',
        chunks_per_source: depth === 'advanced' ? 3 : undefined,
      }),
    });

    if (!response.ok) {
      return { error: `Search failed: ${response.status}`, results: [] };
    }

    const data = await response.json();

    // Score and rank results
    const scoredResults = (data.results || []).map((r: any, i: number) => {
      const quality = scoreSourceQuality(r.url);
      const recency = r.published_date ? scoreRecency(r.published_date) : 0.5;
      return {
        id: i + 1,
        title: r.title,
        url: r.url,
        snippet: r.content,
        score: r.score,
        qualityScore: quality,
        recencyScore: recency,
        adjustedScore: (r.score || 0.5) * quality * recency,
        publishedDate: r.published_date,
      };
    }).sort((a: any, b: any) => b.adjustedScore - a.adjustedScore);

    return {
      results: scoredResults,
      tavilyAnswer: data.answer,
      searchCost: depth === 'advanced' ? 0.016 : 0.008,
    };
  },
});
```

### 8.2 calculate Tool

**Available in:** All tiers (Tier 2 + Tier 3)  
**Backend:** Deterministic math functions  
**Cost:** $0

```typescript
// app/lib/market-chat/tools/calculate.ts
import { tool } from 'ai';
import { z } from 'zod';

export const calculateTool = tool({
  description: 'Perform prediction market calculations: expected value (EV), Kelly criterion position sizing, implied probability conversions, and outcome comparisons.',
  inputSchema: z.object({
    operation: z.enum(['ev', 'kelly', 'implied_probability', 'compare_outcomes', 'payout'])
      .describe('Type of calculation to perform'),
    inputs: z.record(z.number())
      .describe('Calculation inputs as key-value pairs. For EV: {userProb, marketPrice, positionSize}. For Kelly: {userProb, marketPrice, bankroll}. For implied_probability: {price}. For payout: {positionSize, marketPrice}.'),
  }),
  execute: async ({ operation, inputs }) => {
    switch (operation) {
      case 'ev': {
        const { userProb, marketPrice, positionSize } = inputs;
        const payout = positionSize / marketPrice;
        const winProfit = payout - positionSize;
        const ev = (userProb * winProfit) - ((1 - userProb) * positionSize);
        const roi = (ev / positionSize) * 100;
        const edge = userProb - marketPrice;
        return {
          expectedValue: Math.round(ev * 100) / 100,
          roi: Math.round(roi * 10) / 10,
          edge: Math.round(edge * 1000) / 10,
          payout: Math.round(payout * 100) / 100,
          winProfit: Math.round(winProfit * 100) / 100,
          interpretation: ev > 0 ? 'Positive EV — edge exists' : 'Negative EV — no edge',
        };
      }
      case 'kelly': {
        const { userProb, marketPrice, bankroll } = inputs;
        const b = (1 - marketPrice) / marketPrice; // Odds
        const kelly = (b * userProb - (1 - userProb)) / b;
        const fullKellyAmount = kelly * (bankroll || 1000);
        const halfKellyAmount = fullKellyAmount * 0.5;
        const quarterKellyAmount = fullKellyAmount * 0.25;
        return {
          fullKelly: Math.round(kelly * 1000) / 10, // percentage
          halfKelly: Math.round(kelly * 500) / 10,
          quarterKelly: Math.round(kelly * 250) / 10,
          fullKellyAmount: Math.round(fullKellyAmount * 100) / 100,
          halfKellyAmount: Math.round(halfKellyAmount * 100) / 100,
          quarterKellyAmount: Math.round(quarterKellyAmount * 100) / 100,
          recommendation: 'Half-Kelly is recommended for most traders to manage variance.',
        };
      }
      case 'implied_probability': {
        const { price } = inputs;
        return {
          impliedProbability: Math.round(price * 1000) / 10,
          decimalOdds: Math.round((1 / price) * 100) / 100,
          americanOdds: price >= 0.5
            ? Math.round(-(price / (1 - price)) * 100)
            : Math.round(((1 - price) / price) * 100),
        };
      }
      case 'payout': {
        const { positionSize, marketPrice } = inputs;
        const payout = positionSize / marketPrice;
        const profit = payout - positionSize;
        return {
          payout: Math.round(payout * 100) / 100,
          profit: Math.round(profit * 100) / 100,
          returnMultiple: Math.round((1 / marketPrice) * 100) / 100,
        };
      }
      case 'compare_outcomes': {
        // Compare all outcomes by edge
        const outcomes = Object.entries(inputs).map(([name, price]) => ({
          name,
          price,
          impliedProb: Math.round(price * 1000) / 10,
        }));
        const sorted = outcomes.sort((a, b) => a.price - b.price);
        return {
          outcomes: sorted,
          bestValue: sorted[0], // Lowest price = highest potential return
          totalImplied: Math.round(outcomes.reduce((s, o) => s + o.price, 0) * 1000) / 10,
          overround: Math.round((outcomes.reduce((s, o) => s + o.price, 0) - 1) * 1000) / 10,
        };
      }
      default:
        return { error: `Unknown operation: ${operation}` };
    }
  },
});
```

### 8.3 get_market_data Tool

**Available in:** Tier 2 (Moderate), Tier 3 (Complex/Research)  
**Backend:** Existing Polymarket/Kalshi adapters  
**Cost:** $0

```typescript
// app/lib/market-chat/tools/market-data.ts
import { tool } from 'ai';
import { z } from 'zod';

// Factory function — creates tool pre-bound to current market
export function createMarketDataTool(currentMarket: UnifiedMarket) {
  return tool({
    description: 'Fetch live market data including current prices, related markets, and price history. Use when the user asks about price changes, related markets, or needs fresh data.',
    inputSchema: z.object({
      action: z.enum(['refresh_prices', 'related_markets', 'price_history'])
        .describe('What data to fetch'),
      period: z.enum(['1d', '7d', '30d', 'all'])
        .optional()
        .describe('Time period for price history'),
    }),
    execute: async ({ action, period }) => {
      switch (action) {
        case 'refresh_prices': {
          // Fetch fresh prices from platform API
          const fresh = await fetchMarketById(currentMarket.id);
          return {
            outcomes: fresh.outcomes.map(o => ({
              name: o.name,
              price: (o.price * 100).toFixed(1) + '%',
            })),
            volume24h: fresh.volume24h,
            lastUpdated: new Date().toISOString(),
          };
        }
        case 'related_markets': {
          if (!currentMarket.eventId) {
            return { relatedMarkets: [], note: 'No related markets found for this event.' };
          }
          const related = await fetchRelatedMarkets(currentMarket.eventId);
          return {
            relatedMarkets: related.slice(0, 5).map(m => ({
              title: m.title,
              price: (m.yesPrice * 100).toFixed(1) + '%',
              volume: formatVolume(m.volume),
              platform: m.platform,
            })),
          };
        }
        case 'price_history': {
          const history = await fetchPriceHistory(currentMarket.id, period || '7d');
          return {
            period,
            dataPoints: history.length,
            latest: history[history.length - 1],
            earliest: history[0],
            change: history.length >= 2
              ? ((history[history.length - 1].price - history[0].price) * 100).toFixed(1) + '%'
              : 'N/A',
          };
        }
      }
    },
  });
}
```

### 8.4 deep_extract Tool (Tier 3 Only)

**Available in:** Tier 3 (Complex/Research) only  
**Backend:** Tavily Extract API (preferred) or Firecrawl  
**Cost:** ~$0.005 per URL

```typescript
// app/lib/market-chat/tools/deep-extract.ts
import { tool } from 'ai';
import { z } from 'zod';

export const deepExtractTool = tool({
  description: 'Extract full content from specific URLs for deep analysis. Use sparingly — only for high-quality sources that need full-text extraction. Maximum 3 URLs per call.',
  inputSchema: z.object({
    urls: z.array(z.string().url()).max(3)
      .describe('URLs to extract full content from. Only use for high-quality sources (major news outlets, research papers, official data).'),
    query: z.string()
      .optional()
      .describe('Optional query to re-rank extracted content by relevance.'),
  }),
  execute: async ({ urls, query }) => {
    // Use Tavily Extract API (preferred — already in our stack)
    const response = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        urls,
        query,
        extract_depth: 'advanced',
        format: 'markdown',
        chunks_per_source: 3,
      }),
    });

    if (!response.ok) {
      return { error: `Extract failed: ${response.status}`, results: [] };
    }

    const data = await response.json();
    return {
      results: (data.results || []).map((r: any) => ({
        url: r.url,
        content: r.raw_content?.slice(0, 5000) || r.content, // Truncate to 5K chars
        title: r.title,
      })),
      extractCost: urls.length * 0.005,
    };
  },
});
```

**Firecrawl vs Tavily Extract decision:**

| Factor | Tavily Extract | Firecrawl |
|--------|---------------|-----------|
| Already in our stack | Yes | No (new dependency) |
| Cost per page | ~$0.004 | ~$0.005 |
| Quality (F1 score) | 0.494 | 0.638 |
| Latency (P50) | 1638ms | 1012ms |
| Structured extraction | No | Yes (JSON schema) |

**Decision:** Start with Tavily Extract (already integrated, simpler). Add Firecrawl later if extraction quality is insufficient for Tier 3 research queries. Firecrawl's structured extraction (JSON schema output) would be valuable for extracting specific data points from financial pages.

### 8.5 Source Quality Scoring

```typescript
// app/lib/market-chat/source-quality.ts

// Domain authority scores for prediction market context
const SOURCE_QUALITY: Record<string, number> = {
  // Tier 1: Gold standard — polling, data, wire services (0.90-0.98)
  'fivethirtyeight.com': 0.98,
  'natesilver.net': 0.97,
  'realclearpolitics.com': 0.95,
  'reuters.com': 0.95,
  'apnews.com': 0.95,
  'federalreserve.gov': 0.98,
  'bls.gov': 0.98,
  'bea.gov': 0.98,
  'sec.gov': 0.97,

  // Tier 2: Major outlets (0.80-0.89)
  'bloomberg.com': 0.92,
  'wsj.com': 0.90,
  'ft.com': 0.90,
  'economist.com': 0.90,
  'nytimes.com': 0.88,
  'washingtonpost.com': 0.87,
  'cnn.com': 0.85,
  'bbc.com': 0.88,
  'foxnews.com': 0.82,
  'politico.com': 0.85,
  'quinnipiac.edu': 0.92,

  // Tier 3: Acceptable (0.65-0.79)
  'axios.com': 0.78,
  'thehill.com': 0.75,
  'cnbc.com': 0.80,
  'marketwatch.com': 0.78,
  'yahoo.com': 0.70,
  'espn.com': 0.80, // For sports markets
  'sports.yahoo.com': 0.78,

  // Tier 4: Lower weight (0.30-0.64)
  'twitter.com': 0.40,
  'x.com': 0.40,
  'reddit.com': 0.35,
  'substack.com': 0.50,
  'medium.com': 0.45,
  'wikipedia.org': 0.60, // Good for background, not for current events
};

export function scoreSourceQuality(url: string): number {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '');
    return SOURCE_QUALITY[domain] || 0.50; // Default for unknown domains
  } catch {
    return 0.30;
  }
}

export function scoreRecency(publishedDate: string): number {
  const pubDate = new Date(publishedDate);
  const now = new Date();
  const daysOld = (now.getTime() - pubDate.getTime()) / 86400000;

  if (daysOld < 1) return 1.0;
  if (daysOld < 3) return 0.95;
  if (daysOld < 7) return 0.85;
  if (daysOld < 14) return 0.75;
  if (daysOld < 30) return 0.60;
  if (daysOld < 90) return 0.40;
  return 0.25;
}

export function getSourceTier(score: number): 'tier1' | 'tier2' | 'tier3' | 'tier4' {
  if (score >= 0.90) return 'tier1';
  if (score >= 0.80) return 'tier2';
  if (score >= 0.65) return 'tier3';
  return 'tier4';
}
```

---

## 9. Deep Research Architecture (Tier 3 — Research Queries)

### 9.1 Inspiration: How Perplexity Deep Research Works

Perplexity's Deep Research achieves 93.9% accuracy on SimpleQA by using a **Test-Time Compute (TTC) framework** — it spends 2-4 minutes doing what would take a human expert hours:

1. **Research with reasoning:** Iteratively searches, reads documents, and reasons about what to do next, refining its research plan as it learns more
2. **Multi-pass search:** 3-5 sequential search iterations with query refinement between each pass
3. **Cross-source validation:** Verifies claims across multiple sources before synthesis
4. **Confidence tracking:** Monitors confidence levels to determine when to stop searching
5. **Structured output:** Executive summaries, key insights, timelines, actionable recommendations

**Key architectural insight:** Perplexity doesn't just search once — it searches, analyzes gaps in its knowledge, reformulates queries, and searches again. This iterative refinement is what separates deep research from shallow search.

### 9.2 Our Adaptation: Iterative Research Pipeline

We adapt Perplexity's approach for prediction markets, optimized for our Tavily + Vercel AI SDK stack:

```
User Query ("Tell me everything about this market")
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  STEP 1: Research Planning (Gemini 3 Pro)             │
│  - Decompose query into 3-5 research angles          │
│  - Identify what we already know (Maxwell report)    │
│  - Identify knowledge gaps                           │
│  - Create parallel search plan                       │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  STEP 2: Parallel Search — Iteration 1               │
│  (Gemini 3 Flash × N parallel searches)              │
│                                                      │
│  Search 1: Latest news on topic (Tavily, news, 7d)   │
│  Search 2: Expert analysis/opinions (Tavily, general) │
│  Search 3: Historical comparisons (Tavily, general)   │
│  Search 4: Contrarian viewpoints (Tavily, general)    │
│                                                      │
│  → Score sources, aggregate evidence                  │
│  → Assess confidence: sufficient? (threshold: 0.80)   │
└─────────────────────────────────────────────────────┘
    │
    ├─► Confidence ≥ 0.80? → Skip to Step 4
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  STEP 3: Gap Analysis + Iteration 2                  │
│  (Gemini 3 Flash)                                    │
│                                                      │
│  - Analyze what's missing from iteration 1           │
│  - Reformulate queries to fill gaps                  │
│  - Search again with refined queries                 │
│  - Deep extract top 3 URLs (Tavily Extract)          │
│                                                      │
│  → Re-assess confidence                              │
│  → Max 3 total iterations                            │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  STEP 4: Cross-Validation                            │
│  (Gemini 3 Flash)                                    │
│                                                      │
│  - Check key claims against multiple sources         │
│  - Flag contradictions                               │
│  - Score source agreement                            │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  STEP 5: Synthesis (Gemini 3 Pro)                    │
│                                                      │
│  Combine all evidence into structured report:        │
│  - Executive summary                                 │
│  - Key findings with citations [1][2][3]             │
│  - Probability assessment with confidence            │
│  - Risk factors                                      │
│  - Actionable recommendation                         │
│  - Sources ranked by quality tier                    │
└─────────────────────────────────────────────────────┘
```

### 9.3 Implementation

```typescript
// app/lib/market-chat/deep-research.ts

interface ResearchState {
  query: string;
  iteration: number;
  maxIterations: number;
  evidence: GatheredEvidence[];
  confidence: number;
  gaps: string[];
  searchQueries: string[];
}

interface GatheredEvidence {
  claim: string;
  sources: ScoredSource[];
  confidence: number;
  agreementScore: number; // How many sources agree
}

async function* runDeepResearch(
  query: string,
  market: UnifiedMarket,
  maxwellReport: MaxwellIntelligence | null
): AsyncGenerator<ServerEvent> {
  const state: ResearchState = {
    query,
    iteration: 0,
    maxIterations: 3,
    evidence: [],
    confidence: 0,
    gaps: [],
    searchQueries: [],
  };

  // STEP 1: Plan
  yield { type: 'status', status: 'planning', estimatedTime: '20-30 seconds' };

  const plan = await createResearchPlan(query, market, maxwellReport);
  yield { type: 'status', status: 'researching', progress: `Iteration 1/${state.maxIterations}` };

  // STEP 2-3: Iterative search
  while (state.iteration < state.maxIterations && state.confidence < 0.80) {
    state.iteration++;

    // Parallel searches
    const searchPromises = plan.subtasks
      .filter(t => t.type === 'search')
      .map(task => executeSearch(task.params));

    const searchResults = await Promise.allSettled(searchPromises);
    const newEvidence = aggregateEvidence(searchResults);
    state.evidence.push(...newEvidence);

    // Assess confidence
    state.confidence = assessConfidence(state.evidence);

    yield {
      type: 'status',
      status: 'researching',
      progress: `Iteration ${state.iteration}/${state.maxIterations} — confidence: ${Math.round(state.confidence * 100)}%`,
    };

    if (state.confidence >= 0.80) break;

    // Gap analysis + query refinement
    const gaps = await identifyGaps(state.evidence, query, market);
    state.gaps = gaps;

    // Refine search queries for next iteration
    const refinedQueries = await refineSearchQueries(gaps, state.searchQueries);
    plan.subtasks = refinedQueries.map(q => ({
      id: `search-${state.iteration}-${q.slice(0, 20)}`,
      type: 'search' as const,
      description: q,
      params: { query: q, depth: 'advanced', days: 7, maxResults: 8 },
      dependsOn: [],
    }));
  }

  // STEP 4: Cross-validation
  yield { type: 'status', status: 'validating' };
  const validated = await crossValidateEvidence(state.evidence);

  // STEP 5: Synthesis
  yield { type: 'status', status: 'synthesizing' };
  const report = await synthesizeResearchReport(
    query, market, maxwellReport, validated
  );

  // Stream the report
  for (const chunk of splitIntoChunks(report.content)) {
    yield { type: 'chunk', content: chunk };
  }

  yield {
    type: 'sources',
    sources: report.sources,
  };

  yield {
    type: 'complete',
    tier: 'research',
    cost: report.totalCost,
    latencyMs: Date.now() - startTime,
  };
}

// Confidence assessment based on evidence quality
function assessConfidence(evidence: GatheredEvidence[]): number {
  if (evidence.length === 0) return 0;

  const avgSourceQuality = evidence.reduce((sum, e) =>
    sum + e.sources.reduce((s, src) => s + src.qualityScore, 0) / e.sources.length, 0
  ) / evidence.length;

  const avgAgreement = evidence.reduce((sum, e) => sum + e.agreementScore, 0) / evidence.length;
  const coverageFactor = Math.min(1, evidence.length / 8); // Need ~8 evidence points

  return (avgSourceQuality * 0.3) + (avgAgreement * 0.4) + (coverageFactor * 0.3);
}

// Gap identification using LLM
async function identifyGaps(
  evidence: GatheredEvidence[],
  originalQuery: string,
  market: UnifiedMarket
): Promise<string[]> {
  const { text } = await generateText({
    model: openrouter('google/gemini-3-flash-preview'),
    prompt: `Given this research evidence for the query "${originalQuery}" about market "${market.title}":

Evidence gathered so far:
${evidence.map(e => `- ${e.claim} (confidence: ${e.confidence}, sources: ${e.sources.length})`).join('\n')}

What key information is MISSING? What gaps need to be filled?
Return as JSON array of strings: ["gap 1", "gap 2", ...]`,
    maxTokens: 500,
    temperature: 0.2,
  });

  try { return JSON.parse(text); } catch { return []; }
}

// Query refinement for next iteration
async function refineSearchQueries(
  gaps: string[],
  previousQueries: string[]
): Promise<string[]> {
  const { text } = await generateText({
    model: openrouter('google/gemini-3-flash-preview'),
    prompt: `Generate 2-4 specific search queries to fill these knowledge gaps:

Gaps: ${gaps.join('; ')}
Previous queries (avoid repeating): ${previousQueries.join('; ')}

Return as JSON array of concise search query strings (under 100 chars each).`,
    maxTokens: 300,
    temperature: 0.3,
  });

  try { return JSON.parse(text); } catch { return gaps; }
}
```

### 9.4 Research Report Structure

The synthesizer produces a structured report following Perplexity's format:

```markdown
## Research Report: [Market Title]

### Executive Summary
[2-3 sentence overview with key finding and recommendation]

### Key Findings
1. **[Finding 1]** — [Evidence with citations [1][2]]
2. **[Finding 2]** — [Evidence with citations [3]]
3. **[Finding 3]** — [Evidence with citations [4][5]]

### Probability Assessment
- **Market price:** X%
- **Our estimate:** Y-Z% (based on [methodology])
- **Confidence:** HIGH/MEDIUM/LOW
- **Edge:** +/-N%

### Risk Factors
- [Risk 1 with severity]
- [Risk 2 with severity]

### Recommendation
[BUY/SELL/HOLD with position sizing guidance]

### Sources (ranked by quality)
[1] [Title] — [Domain] (Tier 1) — [Published date]
[2] [Title] — [Domain] (Tier 2) — [Published date]
...
```

### 9.5 Research Tier Cost Budget

| Step | Model | Est. Tokens | Cost |
|------|-------|-------------|------|
| Planning | Gemini 3 Pro | ~2K in, ~1K out | $0.016 |
| Search iteration 1 (4 queries) | Tavily basic × 4 | — | $0.032 |
| Gap analysis | Gemini 3 Flash | ~1K in, ~500 out | $0.002 |
| Search iteration 2 (3 queries) | Tavily advanced × 3 | — | $0.048 |
| Deep extract (3 URLs) | Tavily Extract | — | $0.012 |
| Cross-validation | Gemini 3 Flash | ~3K in, ~500 out | $0.003 |
| Synthesis | Gemini 3 Pro | ~5K in, ~3K out | $0.046 |
| **Total** | | | **~$0.159** |

This is more expensive than the original $0.08 estimate but delivers Perplexity-level research quality using the **#1 ranked models**. For the 2% of queries that hit this tier, the quality justification is clear.

---

## 10. API Specifications

### 10.1 Single Endpoint: `POST /api/market-chat`

**Request (lightweight — no market data in payload):**
```typescript
interface MarketChatRequest {
  marketId: string;
  messages: Array<{
    role: 'user' | 'agent';
    content: string;
  }>;
}
```

**Response:** Server-Sent Events (SSE)

**Event Types:**

```typescript
type ServerEvent =
  | { type: 'status'; status: string; tool?: string }
  | { type: 'chunk'; content: string }
  | { type: 'sources'; sources: ScoredSource[] }
  | { type: 'complete'; tier: string; cost: CostBreakdown; latencyMs: number }
  | { type: 'error'; message: string; code: string };
```

### 10.2 SSE Event Examples

**Simple query (context-only):**
```
data: {"type":"status","status":"thinking"}
data: {"type":"chunk","content":"Based on our analysis, this market is "}
data: {"type":"chunk","content":"**UNDERPRICED** at 48%. "}
data: {"type":"chunk","content":"The estimated fair value is 52-58% [Analysis]."}
data: {"type":"complete","tier":"simple","cost":{"llm":0.002,"search":0,"total":0.002},"latencyMs":1400}
```

**Moderate query (with search):**
```
data: {"type":"status","status":"thinking"}
data: {"type":"status","status":"searching","tool":"search_news"}
data: {"type":"chunk","content":"Here's what's happening:\n\n"}
data: {"type":"chunk","content":"**Latest polling** [1] shows a 3-point shift..."}
data: {"type":"sources","sources":[{"id":1,"title":"Quinnipiac Poll","url":"...","quality":"tier1"}]}
data: {"type":"complete","tier":"moderate","cost":{"llm":0.008,"search":0.008,"total":0.016},"latencyMs":4200}
```

**Complex query (multi-step):**
```
data: {"type":"status","status":"planning","estimatedTime":"10-15 seconds"}
data: {"type":"status","status":"searching","tool":"search_news"}
data: {"type":"status","status":"calculating","tool":"calculate"}
data: {"type":"status","status":"synthesizing"}
data: {"type":"chunk","content":"## Recommendation: BUY (Moderate Conviction)\n\n"}
data: {"type":"chunk","content":"### Key Factors\n1. **Analysis verdict:** UNDERPRICED..."}
data: {"type":"sources","sources":[...]}
data: {"type":"complete","tier":"complex","cost":{"llm":0.025,"search":0.016,"total":0.041},"latencyMs":12800}
```

### 10.3 API Route Implementation

```typescript
// app/api/market-chat/route.ts
import { NextRequest } from 'next/server';

export const maxDuration = 60; // Vercel serverless timeout

export async function POST(req: NextRequest) {
  const { marketId, messages } = await req.json();

  // Validate
  if (!marketId || !messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const emit = (event: ServerEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        for await (const event of handleMarketChatQuery(
          messages[messages.length - 1].content, // Latest user message
          marketId,
          messages
        )) {
          emit(event);
        }
      } catch (error) {
        emit({ type: 'error', message: String(error), code: 'INTERNAL_ERROR' });
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

---

## 11. Client Integration

### 9.1 useMarketChat Hook

```typescript
// app/hooks/use-market-chat.ts
import { useState, useCallback, useRef } from 'react';
import type { UnifiedMarket } from '../lib/markets/types';
import type { MaxwellIntelligence } from '../lib/maxwell/types';

interface MarketChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  tier?: 'fast' | 'simple' | 'moderate' | 'complex' | 'research';
  sources?: ScoredSource[];
  cost?: CostBreakdown;
  latencyMs?: number;
}

type ChatStatus = 'idle' | 'thinking' | 'searching' | 'calculating' | 'synthesizing';

interface UseMarketChatReturn {
  messages: MarketChatMessage[];
  status: ChatStatus;
  currentTool: string | null;
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
}

export function useMarketChat(
  marketId: string,
  market: UnifiedMarket,
  maxwellReport?: MaxwellIntelligence | null
): UseMarketChatReturn {
  const [messages, setMessages] = useState<MarketChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    // 1. Try client-side fast path first
    const fastResult = checkFastPath(content, market, maxwellReport);
    if (fastResult.matched) {
      const userMsg: MarketChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      const agentMsg: MarketChatMessage = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: fastResult.response,
        timestamp: Date.now(),
        tier: 'fast',
        latencyMs: 0,
        cost: { llm: 0, search: 0, total: 0 },
      };
      setMessages(prev => [...prev, userMsg, agentMsg]);
      return;
    }

    // 2. Add user message
    const userMsg: MarketChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setStatus('thinking');

    // 3. Create agent message placeholder
    const agentMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: agentMsgId,
      role: 'agent',
      content: '',
      timestamp: Date.now(),
    }]);

    // 4. Stream from server
    try {
      abortRef.current = new AbortController();
      const response = await fetch('/api/market-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId,
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortRef.current.signal,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;

          const event = JSON.parse(line.slice(6));

          switch (event.type) {
            case 'status':
              setStatus(event.status as ChatStatus);
              if (event.tool) setCurrentTool(event.tool);
              break;
            case 'chunk':
              setMessages(prev => prev.map(m =>
                m.id === agentMsgId
                  ? { ...m, content: m.content + event.content }
                  : m
              ));
              break;
            case 'sources':
              setMessages(prev => prev.map(m =>
                m.id === agentMsgId
                  ? { ...m, sources: event.sources }
                  : m
              ));
              break;
            case 'complete':
              setMessages(prev => prev.map(m =>
                m.id === agentMsgId
                  ? { ...m, tier: event.tier, cost: event.cost, latencyMs: event.latencyMs }
                  : m
              ));
              break;
            case 'error':
              setMessages(prev => prev.map(m =>
                m.id === agentMsgId
                  ? { ...m, content: `Error: ${event.message}` }
                  : m
              ));
              break;
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === agentMsgId
            ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
            : m
        ));
      }
    } finally {
      setIsLoading(false);
      setStatus('idle');
      setCurrentTool(null);
    }
  }, [marketId, market, maxwellReport, messages]);

  return { messages, status, currentTool, sendMessage, isLoading };
}
```

### 9.2 Updated MarketChat Component

```typescript
// app/components/maxwell/MarketChat.tsx
'use client';

import { useMarketChat } from '../../hooks/use-market-chat';
import type { UnifiedMarket } from '../../lib/markets/types';
import type { MaxwellIntelligence } from '../../lib/maxwell/types';
import InputInterface from '../InputInterface';
import ResponseDisplay from '../ResponseDisplay';

interface MarketChatProps {
  marketId: string;
  market: UnifiedMarket;
  maxwellReport?: MaxwellIntelligence | null;
}

export function MarketChat({ marketId, market, maxwellReport }: MarketChatProps) {
  const { messages, status, sendMessage, isLoading } = useMarketChat(
    marketId,
    market,
    maxwellReport
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <ResponseDisplay
            key={msg.id}
            message={{
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
              sources: msg.sources?.map(s => ({
                title: s.title,
                url: s.url,
                content: s.snippet,
                score: s.adjustedScore,
              })),
            }}
            status={msg.role === 'agent' && isLoading ? status : 'relaxed'}
          />
        ))}
      </div>

      <div className="p-4 border-t border-[#2A2A2A]">
        <InputInterface
          state={isLoading ? 'thinking' : 'relaxed'}
          hasMessages={messages.length > 0}
          onQuery={(query) => sendMessage(query)}
          mode="maxwell"
          hideSuggestions
        />
      </div>
    </div>
  );
}
```

### 9.3 Parent Page Integration

```typescript
// In /app/markets/[id]/page.tsx — update the MarketChat usage:
<MarketChat
  marketId={market.id}
  market={market}
  maxwellReport={maxwell.intelligence}
/>
```

---

## 12. Data Models

### 10.1 Core Types

```typescript
// app/lib/market-chat/types.ts

// Chat message with full metadata
interface MarketChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  tier?: 'fast' | 'simple' | 'moderate' | 'complex' | 'research';
  sources?: ScoredSource[];
  cost?: CostBreakdown;
  latencyMs?: number;
  toolsUsed?: string[];
}

// Source with quality scoring
interface ScoredSource {
  id: number;
  title: string;
  url: string;
  snippet: string;
  score: number;           // Tavily relevance score
  qualityScore: number;    // Domain authority (0-1)
  recencyScore: number;    // Freshness (0-1)
  adjustedScore: number;   // Combined score
  qualityTier: 'tier1' | 'tier2' | 'tier3' | 'tier4';
  publishedDate?: string;
}

// Cost breakdown per query
interface CostBreakdown {
  llm: number;         // LLM token costs
  search: number;      // Tavily API costs
  extract: number;     // Deep extraction costs (Tier 3)
  classification: number; // Gemini 3 Flash classifier cost
  total: number;
}

// Server-sent event types
type ServerEvent =
  | { type: 'status'; status: string; tool?: string; estimatedTime?: string }
  | { type: 'chunk'; content: string }
  | { type: 'sources'; sources: ScoredSource[] }
  | { type: 'complete'; tier: string; cost: CostBreakdown; latencyMs: number }
  | { type: 'error'; message: string; code: string };

// Complexity levels
type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'research';
```

---

## 13. Conversation Memory

### 11.1 Per-Market Conversation Storage

Conversations are scoped to markets, not global sessions. Each market has its own conversation history.

```typescript
// Extend existing Zustand store or create dedicated market chat store

interface MarketChatStore {
  // Key: marketId → conversation
  conversations: Record<string, {
    messages: MarketChatMessage[];
    facts: ExtractedFact[];
    lastAccessed: number;
  }>;

  // Actions
  addMessage: (marketId: string, message: MarketChatMessage) => void;
  getConversation: (marketId: string) => MarketChatMessage[];
  addFacts: (marketId: string, facts: ExtractedFact[]) => void;
  getFacts: (marketId: string) => ExtractedFact[];
  clearConversation: (marketId: string) => void;
}
```

### 11.2 Fact Extraction

After each agent response, extract key facts for future context. This runs asynchronously — it does NOT block the response.

```typescript
// app/lib/market-chat/memory.ts

interface ExtractedFact {
  content: string;           // "Harris leads by 4 points in latest Quinnipiac poll"
  source: 'search' | 'calculation' | 'analysis';
  confidence: 'high' | 'medium' | 'low';
  timestamp: number;
}

// Extract facts from agent response (async, non-blocking)
async function extractFacts(agentResponse: string): Promise<ExtractedFact[]> {
  const { text } = await generateText({
    model: openrouter('google/gemini-3-flash-preview'),  // Same model as agent — no cold start
    prompt: `Extract 1-5 key facts from this prediction market analysis response. Only include concrete, verifiable facts — not opinions or hedged statements.

Response: "${agentResponse.slice(0, 2000)}"

Return as JSON array: [{"content": "fact text", "source": "search|calculation|analysis", "confidence": "high|medium|low"}]`,
    maxTokens: 500,
    temperature: 0.1,
  });

  try {
    const facts = JSON.parse(text);
    return facts.map((f: any) => ({
      ...f,
      timestamp: Date.now(),
    }));
  } catch {
    return [];
  }
}
```

### 11.3 Conversation History Management

When conversation history exceeds 10 messages, summarize older messages to manage token budget.

```typescript
async function getConversationContext(
  messages: MarketChatMessage[],
  facts: ExtractedFact[]
): Promise<{ history: CoreMessage[]; factsBlock: string }> {
  // If short conversation, use full history
  if (messages.length <= 10) {
    return {
      history: messages.map(m => ({
        role: m.role === 'agent' ? 'assistant' : 'user',
        content: m.content,
      })),
      factsBlock: facts.map(f => f.content).join('\n'),
    };
  }

  // Summarize older messages, keep last 6
  const olderMessages = messages.slice(0, -6);
  const recentMessages = messages.slice(-6);

  const { text: summary } = await generateText({
    model: openrouter('google/gemini-3-flash-preview'),  // Same model as agent — no cold start
    prompt: `Summarize this conversation in 2-3 sentences, preserving key decisions and data points:

${olderMessages.map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n')}`,
    maxTokens: 200,
    temperature: 0,
  });

  return {
    history: [
      { role: 'system', content: `Previous conversation summary: ${summary}` },
      ...recentMessages.map(m => ({
        role: m.role === 'agent' ? 'assistant' as const : 'user' as const,
        content: m.content,
      })),
    ],
    factsBlock: facts
      .filter(f => Date.now() - f.timestamp < 30 * 60 * 1000) // 30-min TTL
      .map(f => f.content)
      .join('\n'),
  };
}
```

---

## 14. Cost Tracking

### 12.1 LLM Cost Calculation

```typescript
// app/lib/market-chat/costs.ts

// Prices per 1M tokens (OpenRouter pricing, Feb 2026)
// Verified OpenRouter pricing (Feb 2026) — per 1M tokens
// Models selected based on arena.ai leaderboard rankings (Jan 29, 2026)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // PRIMARY STACK (arena-ranked)
  'google/gemini-3-flash-preview':   { input: 0.50,  output: 3.00  },  // Main Agent + Classifier + News Analyst (#1 Search, #3 Text)
  'google/gemini-3-pro-preview':     { input: 2.00,  output: 12.00 },  // Complex + Planner + Synthesizer (#1 Text, #2 Search)

  // FALLBACK CHAIN
  'x-ai/grok-4.1-fast':             { input: 0.20,  output: 0.50  },  // Budget fallback (#6 Text, 2M context!)
  'deepseek/deepseek-v3.2':         { input: 0.25,  output: 0.38  },  // Budget fallback (cheapest frontier)
  'anthropic/claude-haiku-4.5':      { input: 1.00,  output: 5.00  },  // Fallback for Gemini 3 Pro
};

export function calculateLLMCost(
  usage: { promptTokens: number; completionTokens: number },
  modelId: string
): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return 0;

  const inputCost = (usage.promptTokens * pricing.input) / 1_000_000;
  const outputCost = (usage.completionTokens * pricing.output) / 1_000_000;
  return inputCost + outputCost;
}

// Tavily costs
const TAVILY_COSTS = {
  search_basic: 0.008,    // 1 credit
  search_advanced: 0.016,  // 2 credits
  extract_basic: 0.004,    // 1 credit per 5 pages
  extract_advanced: 0.008, // 2 credits per 5 pages
};
```

### 12.2 Per-Message Cost Tracking

Cost is tracked in the `onStepFinish` callback and accumulated across all steps:

```typescript
let totalCost: CostBreakdown = { llm: 0, search: 0, extract: 0, classification: 0, total: 0 };

// Classification cost
totalCost.classification = 0.00015; // Gemini 3 Flash classifier

// LLM cost (per step)
onStepFinish: ({ usage }) => {
  totalCost.llm += calculateLLMCost(usage, modelId);
};

// Search cost (per tool call)
// Tracked inside tool execute functions

// Final cost attached to complete event
yield {
  type: 'complete',
  cost: { ...totalCost, total: totalCost.llm + totalCost.search + totalCost.extract + totalCost.classification },
};
```

---

## 15. User Experience Flows

### 13.1 Flow: Trivial Query (Client-Side Fast Path)

**User:** "When does this close?"

```
1. [CLIENT] checkFastPath() matches /when.*close/
2. [CLIENT] Extracts endDate from market object
3. [CLIENT] Renders: "This market closes **Tuesday, March 15, 2026** (38 days from now)."
4. Total time: 0ms network, ~5ms render
5. Cost: $0
```

### 13.2 Flow: Simple Query (Context-Only LLM)

**User:** "Is this a good bet?"

```
1. [CLIENT] Fast path: no match
2. [SERVER] Classify: SIMPLE (answerable from analysis report)
3. [SERVER] streamText with market + Maxwell context, no tools
4. [SERVER] Streams: "Based on our analysis, this market is **UNDERPRICED** at 48%.
   The estimated fair value is 52-58%, giving you a potential **4-10% edge** [Analysis].
   
   Key factors supporting this:
   - Recent polling shows momentum (+3 points in 2 weeks)
   - Historical patterns favor the current trajectory
   
   However, note the **MEDIUM** resolution risk due to..."
5. Total time: ~1.5s
6. Cost: $0.002 (LLM only)
```

### 13.3 Flow: Moderate Query (Agent + Tools)

**User:** "Any recent news on this?"

```
1. [CLIENT] Fast path: no match
2. [SERVER] Classify: MODERATE (needs live search)
3. [SERVER] Status: "thinking"
4. [SERVER] Agent calls search_news({query: "...", topic: "news", days: 3})
5. [SERVER] Status: "searching"
6. [SERVER] Tavily returns 5 results, scored and ranked
7. [SERVER] Agent synthesizes with citations
8. [SERVER] Streams: "Here's what's happened in the last few days:

   **Key developments:**
   - [1] New Quinnipiac poll shows Harris +4 nationally (published yesterday)
   - [2] Swing state polling tightening in PA and MI
   - [3] Economic indicators mixed — jobs report beat expectations
   
   This aligns with our analysis that the market remains underpriced [Analysis]."
9. [SERVER] Sources attached
10. Total time: ~4s
11. Cost: $0.016 ($0.008 LLM + $0.008 Tavily)
```

### 13.4 Flow: Complex Query (Multi-Step Agent)

**User:** "Should I buy or sell? Break it down for me."

```
1. [CLIENT] Fast path: no match
2. [SERVER] Classify: COMPLEX
3. [SERVER] Status: "thinking"
4. [SERVER] Agent step 1: search_news for latest developments
5. [SERVER] Status: "searching"
6. [SERVER] Agent step 2: calculate EV and Kelly
7. [SERVER] Status: "calculating"
8. [SERVER] Agent step 3: get_market_data for related markets
9. [SERVER] Agent step 4: synthesize all data
10. [SERVER] Streams:
    "## Recommendation: **BUY** (Moderate Conviction)

    ### The Numbers
    - **Market price:** 48% | **Fair value:** 52-58% [Analysis]
    - **Edge:** 4-10% | **EV on $500:** +$42-$104
    - **Half-Kelly size:** $320 on a $5,000 bankroll

    ### Supporting Evidence
    1. **Polling momentum** [1]: +3 points in 2 weeks
    2. **Historical pattern** [2]: Similar markets resolved 65% in this direction
    3. **Analysis verdict:** UNDERPRICED with HIGH confidence [Analysis]

    ### Risks
    - Electoral college dynamics could diverge from national polls
    - Late-breaking events (October surprise factor)
    - Resolution risk: MEDIUM [Analysis]

    ### Bottom Line
    Edge exists. Half-Kelly position recommended to manage variance."
11. Total time: ~12s
12. Cost: $0.041 ($0.025 LLM + $0.016 Tavily)
```

### 13.5 Flow: Follow-Up Query

**User (after previous complex query):** "What about the other outcome?"

```
1. [CLIENT] Fast path: no match (needs conversation context)
2. [SERVER] Classify: SIMPLE (follow-up, context-only)
3. [SERVER] Conversation history includes previous exchange
4. [SERVER] Agent answers from context + Maxwell outcomes data
5. [SERVER] Streams: "The **No** outcome is trading at **52%**.

   Our analysis rates it as **OVERPRICED** — fair value is 42-48%.
   
   If you believe the No side, the edge is smaller (4-10%) and the
   risk/reward is less favorable than the Yes side."
6. Total time: ~1.5s
7. Cost: $0.002
```

---

## 16. Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Client-side fast path + Server-side simple/moderate agent

**Tasks:**
- [ ] Create `/app/lib/market-chat/` directory structure
- [ ] Implement `fast-path.ts` (client-side pattern matching)
- [ ] Implement `context-builder.ts` (system prompt construction)
- [ ] Implement `classifier.ts` (Gemini 3 Flash complexity detection)
- [ ] Implement `router.ts` (tier routing logic)
- [ ] Create `/api/market-chat/route.ts` (SSE endpoint)
- [ ] Implement `search-news` tool (reuse existing Tavily integration)
- [ ] Implement `fetchRelatedMarkets()` using existing Polymarket/Kalshi adapters
- [ ] Implement `fetchPriceHistory()` using existing Polymarket/Kalshi adapters
- [ ] Implement `calculate` tool (deterministic math)
- [ ] Implement `get_market_data` tool (with fetchRelatedMarkets + fetchPriceHistory)
- [ ] Create `useMarketChat` hook (SSE consumption)
- [ ] Update `MarketChat` component (accept market + maxwellReport props)
- [ ] Update `page.tsx` to pass market + maxwellReport to MarketChat
- [ ] Wire up `ResponseDisplay` for streaming

**Success Criteria:**
- Fast path handles "when does this close?" in 0ms
- Simple queries answered in < 2s
- Moderate queries (with search) answered in < 6s
- SSE streaming works end-to-end

### Phase 2: Intelligence (Week 2)
**Goal:** Source quality scoring + conversation memory + cost tracking

**Tasks:**
- [ ] Implement `source-quality.ts` (domain scoring + recency)
- [ ] Implement `memory.ts` (fact extraction after each turn)
- [ ] Implement `costs.ts` (per-query cost tracking)
- [ ] Create market-scoped conversation storage (Zustand + IndexedDB)
- [ ] Implement conversation summarization (for long conversations)
- [ ] Add cost metadata to SSE complete events
- [ ] Add source quality tiers to search results display

**Success Criteria:**
- Sources ranked by quality in responses
- Facts extracted and used in subsequent queries
- Cost tracked per message
- Conversations persist per market

### Phase 3: Multi-Agent (Week 3)
**Goal:** Tier 3 for complex + research queries

**Tasks:**
- [ ] Implement `planner.ts` (research plan creation)
- [ ] Implement `news-analyst.ts` (iterative search agent)
- [ ] Implement `synthesizer.ts` (multi-source synthesis)
- [ ] Implement `deep-extract` tool (Tavily Extract API)
- [ ] Implement `get_market_data` tool (live prices + related markets)
- [ ] Wire up escalation from Tier 2 → Tier 3
- [ ] Add progress indicators for multi-step research

**Success Criteria:**
- Complex queries produce coherent multi-factor analysis
- Research queries show progress indicators
- Escalation logic works correctly
- Deep extraction adds value for research queries

### Phase 4: Polish (Week 4)
**Goal:** Production ready

**Tasks:**
- [ ] Error handling (network failures, API errors, timeouts)
- [ ] Rate limiting (per-user, per-market)
- [ ] Abort/cancel support (user navigates away)
- [ ] Loading states and empty states
- [ ] Edge cases (empty market data, no Maxwell report, resolved markets)
- [ ] Performance optimization (response caching for repeated queries)
- [ ] Analytics integration (tier distribution, cost tracking, latency)

**Success Criteria:**
- 99% uptime
- Graceful error handling for all failure modes
- Clean abort on navigation
- All edge cases handled

**Total Timeline: 4 weeks**

---

## 17. Cost Analysis

### 15.1 Per-Query Cost Breakdown (Arena-Ranked Model Stack)

| Tier | Model Used | LLM Cost | Search Cost | Classification | Total | Latency |
|------|-----------|----------|-------------|----------------|-------|---------|
| **Fast Path** | None (client-side) | $0 | $0 | $0 | **$0** | 0ms |
| **Simple** | Gemini 3 Flash | $0.002 | $0 | $0.00015 | **$0.0022** | 1-2s |
| **Moderate** | Gemini 3 Flash | $0.005 | $0.008-0.016 | $0.00015 | **$0.013-0.021** | 3-6s |
| **Complex** | Gemini 3 Pro | $0.020 | $0.016-0.032 | $0.00015 | **$0.036-0.052** | 8-15s |
| **Research** | Gemini 3 Pro + Flash | $0.067 | $0.080-0.092 | $0.00015 | **$0.147-0.159** | 20-30s |

**Key tradeoff vs DeepSeek stack:** Simple queries cost $0.002 instead of $0.0005, but we're using the **#1 Search Arena model** instead of an unranked model. Quality >> marginal cost savings.

### 15.2 Blended Cost

Assuming traffic distribution:
- 35% Fast Path: $0
- 25% Simple: $0.0022
- 30% Moderate: $0.017
- 8% Complex: $0.044
- 2% Research: $0.153

**Blended average: $0.0094 per query**

### 15.3 Monthly Projection

| Users | Queries/User/Month | Cost/Query | Monthly Cost |
|-------|-------------------|------------|--------------|
| 100 | 20 | $0.0094 | **$188** |
| 1,000 | 20 | $0.0094 | **$1,880** |
| 5,000 | 20 | $0.0094 | **$9,400** |
| 10,000 | 20 | $0.0094 | **$18,800** |

**Note:** If cost becomes a concern at scale, swap Main Agent to Grok 4.1 Fast ($0.20/$0.50) for a ~60% cost reduction with minimal quality loss (#6 Text Arena).

---

## 18. Testing Strategy

### 16.1 Test Categories

**Fast Path Tests (unit):**
- All pattern types match correctly
- Compound queries are NOT fast-pathed
- Edge cases: empty market data, missing fields
- Response formatting is correct

**Classifier Tests (integration):**
- Realistic queries classified to correct tier (see table in Section 4.1)
- Follow-up queries inherit appropriate complexity
- Ambiguous queries default to simple (not complex)

**Agent Tests (integration):**
- Simple: answers from context without calling tools
- Moderate: calls appropriate tools, cites sources
- Complex: multi-step tool usage produces coherent output
- Research: planner creates valid plans, execution completes

**SSE Tests (e2e):**
- Events stream in correct order
- Client hook correctly parses all event types
- Abort/cancel works cleanly
- Error events are handled gracefully

### 16.2 Realistic Test Query Suite

```typescript
const testQueries = [
  // Fast path
  { query: "When does this close?", expectedTier: 'fast' },
  { query: "What's the price?", expectedTier: 'fast' },
  { query: "How much volume?", expectedTier: 'fast' },
  { query: "What are the outcomes?", expectedTier: 'fast' },

  // Simple
  { query: "Is this a good bet?", expectedTier: 'simple' },
  { query: "What do you think?", expectedTier: 'simple' },
  { query: "Why is this underpriced?", expectedTier: 'simple' },
  { query: "What are the main risks?", expectedTier: 'simple' },
  { query: "Explain the thesis", expectedTier: 'simple' },
  { query: "What's the verdict?", expectedTier: 'simple' },

  // Moderate
  { query: "Any recent news?", expectedTier: 'moderate' },
  { query: "What happened today?", expectedTier: 'moderate' },
  { query: "What's my EV if I bet $500?", expectedTier: 'moderate' },
  { query: "What are experts saying?", expectedTier: 'moderate' },
  { query: "How do these odds compare?", expectedTier: 'moderate' },

  // Complex
  { query: "Should I buy or sell?", expectedTier: 'complex' },
  { query: "Break this down for me", expectedTier: 'complex' },
  { query: "What am I missing?", expectedTier: 'complex' },
  { query: "Full risk assessment", expectedTier: 'complex' },

  // Research
  { query: "Tell me everything", expectedTier: 'research' },
  { query: "Deep dive on this", expectedTier: 'research' },
  { query: "Give me an investment thesis", expectedTier: 'research' },
];
```

---

## 19. Success Metrics

### 17.1 Tier Distribution Targets

| Tier | Target % | Why |
|------|----------|-----|
| Fast Path | 35% | Instant answers to data lookups |
| Simple | 25% | Context-only answers from analysis report |
| Moderate | 30% | Smart answers with search/calculation |
| Complex | 8% | Multi-factor analysis when needed |
| Research | 2% | Deep investigation on demand |

### 17.2 Quality Metrics

- **Response Quality:** > 4.0/5.0 user rating
- **Source Quality:** > 85% Tier 1/2 citations in search results
- **Correct Tiering:** > 85% queries routed to correct tier
- **Context Utilization:** > 90% of simple queries answered WITHOUT tool calls
- **User Satisfaction:** > 80% thumbs up rate

### 17.3 Performance Metrics

- **Fast Path Latency:** < 10ms (client-side)
- **Simple P50 Latency:** < 2s
- **Moderate P50 Latency:** < 5s
- **Complex P50 Latency:** < 12s
- **P95 Latency (all):** < 15s
- **Cost per Query:** < $0.01 blended average

### 17.4 Reliability Metrics

- **Uptime:** 99.5%
- **Error Rate:** < 2%
- **Graceful Degradation:** If Tavily is down, simple/context queries still work
- **Abort Success:** 100% clean abort on navigation

---

## Summary: The v3.2 Philosophy

**v1:** Tool-calling chatbot  
**v2:** Over-engineered multi-agent for every query  
**v3:** Adaptive system that matches complexity to approach  
**v3.1:** v3 with every gap filled — context feeding, hybrid classification, client-side fast path, full tool definitions, streaming UX, conversation memory, cost tracking  
**v3.2 (this):** v3.1 with arena-ranked model stack and Perplexity-inspired deep research

**Key improvements in v3.2:**
- **Arena-ranked model stack:** Models selected based on arena.ai leaderboard (5.1M votes, Jan 2026):
  - **Gemini 3 Flash** as main agent — **#1 Search Arena**, #3 Text, #6 Code ($0.50/$3.00)
  - **Gemini 3 Pro** for complex/research — **#1 Text Arena**, #2 Search, #4 Code ($2.00/$12.00)
  - **Grok 4.1 Fast** as budget fallback — #6 Text, $0.20/$0.50, 2M context
- **Perplexity-inspired deep research:** Iterative search with gap analysis, confidence tracking (0.80 threshold), cross-validation, and structured report synthesis
- **Verified OpenRouter pricing:** All model costs verified against live API data (Feb 2026)
- **Model fallback chains:** Gemini 3 Flash → Grok 4.1 Fast → DeepSeek V3.2
- **Rejected models documented:** DeepSeek V3.2 (not arena-ranked), GPT-5.x (tool bugs), Opus 4.5 (tool bugs)

**All previous v3.1 improvements retained:**
- Client-side fast path (truly 0ms)
- LLM-based classification (Gemini 3 Flash, same model as agent — no cold start)
- Server-side context fetching (lightweight payloads)
- Full system prompt with token budget (~1,050 tokens)
- Complete Vercel AI SDK `tool()` definitions
- Tavily Extract for deep content extraction
- Per-market conversation memory with fact extraction
- Cost tracking per message with breakdown
- Realistic user query examples
- `useMarketChat` hook with SSE consumption

**Ships in 4 weeks.**  
**Costs ~$0.0094 per query blended.**  
**Uses the #1 Search Arena model for 90% of queries.**  
**Research tier delivers Perplexity-level depth for $0.16/query.**  
**Handles everything from "What's the price?" to "Tell me everything."**

---
