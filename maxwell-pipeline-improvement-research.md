# Maxwell Pipeline Improvement Research

> Comprehensive research into Tavily capabilities, Perplexity API, alternative search APIs, and prediction market data sources — with specific recommendations for the Maxwell intelligence pipeline.
>
> Generated: 2026-02-06

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State: What We're Using vs What's Available](#2-current-state)
3. [Tavily: Untapped Capabilities](#3-tavily-untapped-capabilities)
4. [Perplexity API: A Complementary Layer](#4-perplexity-api)
5. [Alternative Search APIs](#5-alternative-search-apis)
6. [Prediction Market Data Sources](#6-prediction-market-data-sources)
7. [DRACO Benchmark: What It Means For Us](#7-draco-benchmark)
8. [Recommended Pipeline Architecture](#8-recommended-pipeline-architecture)
9. [Cost Analysis](#9-cost-analysis)
10. [Implementation Priorities](#10-implementation-priorities)

---

## 1. Executive Summary

### The Big Picture

Maxwell currently uses **~30% of Tavily's capabilities** — just the Search endpoint with 7 of 19+ available parameters. We're missing entire API endpoints (Extract, Crawl, Map, Research), advanced search features (`finance` topic, `exclude_domains`, `chunks_per_source`), and complementary services (Perplexity for verification, Exa for semantic depth).

### Key Findings

| Finding | Impact | Complexity |
|---------|--------|------------|
| We're not using Tavily's `finance` topic | Better financial source ranking | Trivial — 1 line change |
| We're not using `exclude_domains` | No spam/low-quality filtering | Low — add to decomposer schema |
| Tavily Extract API exists | Could deepen source content after search | Medium — new phase between Search and Synthesize |
| Tavily Research API exists | Could replace our entire Decompose→Search→Synthesize chain for some queries | Medium — but high cost per query |
| Perplexity Sonar API could serve as verification layer | Independent second-opinion on claims | Medium — new verification signal |
| Perplexity Deep Research could handle complex queries | ~$1/query but 89.4% accuracy on Law, 82.4% on Academic | High cost, high quality |
| Exa offers semantic neural search | Finds niche/expert sources Tavily misses | Medium — additional search provider |
| We have no domain quality filtering | Spam and content farms pollute results | Low — add exclude_domains list |
| No content-based deduplication | Different URLs, same content | Medium — similarity check on snippets |
| No exponential backoff on retries | Fragile error handling | Low — standard pattern |

### The Thesis

**Don't replace the pipeline — augment it.** Maxwell's 6-phase architecture (Decompose → Search → Synthesize → Verify → Adjudicate → Present) is sound. The improvements should be:

1. **Use Tavily more fully** — `finance` topic, `exclude_domains`, Extract API
2. **Add Perplexity as a verification signal** — independent search-grounded check
3. **Consider Exa for semantic search** — finds expert analysis Tavily misses
4. **Don't add complexity for complexity's sake** — every new API call adds latency and cost

---

## 2. Current State: What We're Using vs What's Available

### Tavily Parameters: Used vs Available

| Parameter | Status | Notes |
|-----------|--------|-------|
| `query` | ✅ Used | Core functionality |
| `max_results` | ✅ Used | 4-8 based on complexity |
| `search_depth` | ✅ Used | basic/advanced |
| `topic` | ⚠️ Partial | Only `general`/`news` — **missing `finance`** |
| `time_range` | ✅ Used | Mapped from `days` field |
| `include_domains` | ✅ Used | Optional per sub-query |
| `include_raw_content` | ✅ Used | Smart conditional (fact lookups only) |
| `include_answer` | ✅ Set | **Hardcoded to `false`** |
| `chunks_per_source` | ❌ Not used | Could control snippet length in advanced mode |
| `start_date` / `end_date` | ❌ Not used | More precise than `time_range` |
| `exclude_domains` | ❌ Not used | **Major gap** — no spam filtering |
| `country` | ❌ Not used | Could geo-prioritize for local events |
| `auto_parameters` | ❌ Not used | Let Tavily optimize automatically |
| `include_images` | ❌ Not used | N/A for our text pipeline |
| `include_favicon` | ❌ Not used | Could enhance source UI |
| `include_usage` | ❌ Not used | Could track credit consumption |

### Tavily Endpoints: Used vs Available

| Endpoint | Status | What It Does |
|----------|--------|-------------|
| **Search** | ✅ Used | Discover sources for a query |
| **Extract** | ❌ Not used | Pull full content from known URLs (1-20 URLs per call) |
| **Crawl** | ❌ Not used | Graph-based site traversal with extraction |
| **Map** | ❌ Not used | Discover site structure (URLs only, faster than crawl) |
| **Research** | ❌ Not used | Automated multi-step research agent (4-250 credits) |
| **Usage** | ❌ Not used | Monitor API credit consumption |

### Current Error Handling Gaps

- ❌ No exponential backoff for retries
- ❌ No retry on 429 (rate limit) or 500 (server error)
- ❌ No request timeout handling
- ❌ No circuit breaker for repeated failures
- ❌ No content-based deduplication (only URL-based)
- ❌ No score-based filtering (all results kept regardless of relevance)

---

## 3. Tavily: Untapped Capabilities

### 3.1 The `finance` Topic

Tavily has a dedicated `finance` topic that optimizes search results for financial content. We only use `general` and `news`.

**Impact for Maxwell:** Prediction markets are fundamentally financial instruments. Using `topic: 'finance'` for market-related queries would improve source relevance for earnings, economic data, regulatory decisions, and price movements.

**Implementation:** Add `'finance'` to the `topic` enum in `SubQuerySchema` and update the decomposition prompt to instruct the LLM to use it for financial/market queries.

### 3.2 The Extract API

**What it does:** Given 1-20 URLs, Extract returns clean, full content from those pages. Supports `query` parameter for relevance-ranked chunks and `extract_depth` (basic/advanced).

**How it could help Maxwell:**

```
Current:  Search → (snippets) → Synthesize
Enhanced: Search → Extract (top URLs) → (full content) → Synthesize
```

After Search returns 15-20 sources with snippets, we could Extract full content from the top 5-7 most relevant URLs. This gives the synthesis LLM much richer context than search snippets alone.

**Cost:** 1 credit per 5 successful extractions (basic) or 2 credits per 5 (advanced). Extracting 5 URLs = 1 credit. Very cheap.

**Tradeoff:** Adds ~2-5 seconds latency. Worth it for `standard` and `deep_research` complexity levels. Skip for `simple`.

### 3.3 The `exclude_domains` Parameter

**The gap:** We have no way to filter out spam, content farms, or low-quality sources. Every Tavily result is treated equally.

**Recommended blocklist for prediction markets:**
```
exclude_domains: [
  // Content farms / clickbait
  "buzzfeed.com", "huffpost.com", "dailymail.co.uk",
  // SEO spam
  "medium.com",  // Too many low-quality prediction hot-takes
  // Paywalled (content won't extract well)
  "wsj.com", "ft.com", "bloomberg.com/news",
  // Social media (unreliable for factual claims)
  "reddit.com", "twitter.com", "x.com"
]
```

**Implementation:** Add as a global config + allow per-query overrides in the decomposer.

### 3.4 The `chunks_per_source` Parameter

When using `search_depth: 'advanced'`, Tavily can return 1-3 focused chunks per source instead of one long snippet. This gives better control over context length and relevance.

**Impact:** More focused content per source → better synthesis quality → fewer irrelevant passages in verification.

### 3.5 The Research API

**What it does:** Tavily's Research API is an automated multi-step research agent. You give it a question, it performs multiple searches, analyzes sources, and generates a comprehensive report with citations.

**Models:** `mini` (4-110 credits), `pro` (15-250 credits), `auto`

**Features:**
- Streaming support for real-time progress
- Structured output via JSON Schema
- Multiple citation formats
- Automatic query decomposition

**Should we use it?** This is essentially what Maxwell already does manually (Decompose → Search → Synthesize). Using Tavily Research would:
- **Pro:** Simplify our pipeline, reduce code complexity
- **Con:** Less control over search strategy, higher cost per query, can't customize prompts

**Verdict:** Don't replace our pipeline with it. But consider using it as a **fallback** or **second opinion** for high-value queries where our pipeline produces low-confidence results.

### 3.6 The Crawl and Map APIs

**Crawl:** Graph-based website traversal. Discovers and extracts content from a starting URL, following links up to N levels deep.

**Map:** Like Crawl but returns URLs only (no content extraction). Faster and cheaper.

**Use cases for Maxwell:**
- **Crawl Polymarket/Kalshi** to discover new markets and extract resolution criteria
- **Map news sites** to find all articles about a specific topic
- **Crawl company investor relations pages** for earnings data

**Verdict:** Not needed for the core intelligence pipeline. Could be valuable for a future "market discovery" or "continuous monitoring" feature.

---

## 4. Perplexity API: A Complementary Layer

### 4.1 Model Lineup

| Model | Context | Input $/1M | Output $/1M | Request Fee/1K | Best For |
|-------|---------|-----------|-------------|----------------|----------|
| `sonar` | 128K | $1 | $1 | $5-12 | Lightweight, fast searches |
| `sonar-pro` | 200K | $3 | $15 | $6-14 | Advanced search, complex reasoning |
| `sonar-reasoning` | 128K | $2 | $8 | $6-14 | Fast reasoning with search |
| `sonar-reasoning-pro` | 128K | $2 | $8 | $6-14 | Chain-of-Thought reasoning |
| `sonar-deep-research` | 128K | $2 | $8 | $14-22 | Expert-level multi-step research |

Request fees vary by search context size: Low/Medium/High.

### 4.2 What Makes Perplexity Different

Perplexity combines **search + LLM synthesis in a single API call**. When you call `sonar-pro`, it:
1. Searches the web in real-time
2. Retrieves and ranks relevant passages
3. Generates a grounded response with citations
4. Returns source URLs and supporting excerpts

This is fundamentally different from our Tavily approach where we:
1. Search (Tavily) → get raw results
2. Synthesize (Claude/Gemini) → generate answer with citations
3. Verify (Gemini) → check claims against evidence
4. Adjudicate (Gemini) → reconstruct based on verified facts

### 4.3 DRACO Benchmark Results

Perplexity released the DRACO benchmark on Feb 4, 2026 — a 100-task evaluation across 10 domains with ~40 criteria per task, grounded in real user queries.

**Key results:**
- **Perplexity Deep Research** achieved highest pass rates across ALL domains
- **Law:** 89.4% pass rate
- **Academic:** 82.4% pass rate
- **Lowest latency:** 459.6 seconds (vs 592-1808s for competitors)
- Led in 3 of 4 dimensions: Factual Accuracy, Breadth/Depth, Citation Quality
- Only dimension where others matched: Presentation Quality

**What this means for Maxwell:** Perplexity's search-grounded synthesis is genuinely high quality, especially for factual accuracy and citations — exactly what we need for prediction market intelligence.

### 4.4 How Perplexity Could Fit Into Maxwell

**Option A: Verification Signal (Recommended)**

Add Perplexity as an independent verification signal alongside our existing NLI-based verification:

```
Current Verification:
  Claim → Embed → Find best passage → NLI entailment check → Confidence

Enhanced Verification:
  Claim → Embed → Find best passage → NLI entailment check → Confidence
  Claim → Perplexity Sonar → Independent search-grounded check → Cross-validate
```

Use `sonar` (cheapest) to fact-check specific claims. If Perplexity's search-grounded response contradicts our synthesis, flag it for adjudication.

**Cost:** ~$0.006 per claim check. For 30 claims = ~$0.18 per analysis.

**Option B: Synthesis Second Opinion**

After our Tavily-based synthesis, run the same query through `sonar-pro` and compare outputs. If they diverge significantly, the adjudicator gets both perspectives.

**Cost:** ~$0.02-0.05 per query.

**Option C: Deep Research for High-Value Queries**

For `deep_research` complexity queries, use `sonar-deep-research` instead of (or alongside) our pipeline.

**Cost:** ~$0.50-1.20 per query. Expensive but thorough.
**Latency:** ~460 seconds (7.5 minutes). Too slow for real-time but fine for background research.

**Option D: Replace Decompose + Search + Synthesize (Not Recommended)**

Could replace our first 3 phases with a single Perplexity call. But this sacrifices:
- Control over search strategy
- Custom decomposition for prediction markets
- Source-level verification pipeline
- Streaming progress updates per phase

### 4.5 Perplexity MCP Server

Perplexity has an official MCP server with 6 specialized search functions:
1. `perplexity_search` — General web search
2. `perplexity_academic_search` — Academic sources
3. `perplexity_financial_search` — Financial data, SEC filings
4. `perplexity_news_search` — Current events
5. `perplexity_reason` — Reasoning with search
6. `perplexity_research` — Deep research

**`perplexity_financial_search`** is particularly interesting for prediction markets — it's optimized for financial data and SEC filings.

### 4.6 Structured Output Support

Perplexity supports JSON Schema via `response_format` parameter (works with `sonar` and `sonar-pro`, NOT with reasoning models). This means we could get structured prediction market analysis directly:

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "schema": {
        "type": "object",
        "properties": {
          "probability_estimate": { "type": "number" },
          "key_factors": { "type": "array" },
          "contrarian_signals": { "type": "array" },
          "confidence": { "type": "string" }
        }
      }
    }
  }
}
```

---

## 5. Alternative Search APIs

### 5.1 Comparison Matrix

| API | Source Quality | Freshness | Pricing | Unique Value for Maxwell |
|-----|--------------|-----------|---------|--------------------------|
| **Tavily** (current) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $0.008/credit | AI-optimized results, Extract/Crawl/Research endpoints |
| **Exa** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $5/1k queries | Semantic neural search, finds niche expert sources |
| **Serper** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $0.002-0.005/query | Direct Google access, fastest (1-2s) |
| **Brave Search** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $3-5/1k queries | Independent index, finds contrarian sources |
| **You.com** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $6.25-8/1k | RAG-optimized, proven accuracy benchmarks |
| **SerpAPI** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $10+/1k | 20+ search engines, Finance API |
| **Jina AI Reader** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Token-metered | URL→Markdown extraction, ReaderLM-v2 |
| **Firecrawl** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $16/mo (3k pages) | JS-rendered scraping, agent mode |

### 5.2 Exa: The Most Interesting Alternative

**Why Exa stands out:**
- **Semantic neural search** — built its own index with fine-tuned embeddings, not a Google wrapper
- **Content keyword filtering** — ensures keywords exist in actual page content, not just titles
- **Higher limits** — up to 1,200 domain filters (vs Tavily's 300), up to 100 results (vs 20)
- **Sub-500ms latency** for Fast mode
- **73% SimpleQA score** — competitive with Tavily's 93.3%

**How it could help Maxwell:**
- Finds niche prediction market analysis that Google/Tavily miss
- Semantic search is better at finding contrarian signals and expert commentary
- Content keyword filtering ensures source relevance

**Verdict:** Worth adding as a secondary search provider for `factor_for`, `factor_against`, and `contrarian` sub-queries. Not a replacement for Tavily.

### 5.3 Multi-Source Search Fusion

Research shows combining 2-3 search APIs gives **30-50% better coverage** than any single API. The recommended fusion technique is **Reciprocal Rank Fusion (RRF)**:

```
RRF(d) = Σ(r ∈ R) 1 / (k + rank_r(d))
```

Where `k` is typically 60. RRF is:
- Simple to implement
- Doesn't require score normalization across APIs
- Proven effective in information retrieval research
- No training data needed

**For Maxwell:** Run the same sub-query through Tavily + Exa, merge results with RRF, deduplicate, then proceed to synthesis. This gives broader source coverage without adding much complexity.

### 5.4 APIs NOT Worth Adding

| API | Why Not |
|-----|---------|
| **Google Custom Search** | Closed to new customers, retiring Jan 2027 |
| **Bing Search API** | Retired August 2025 |
| **SerpAPI** | Too expensive ($10+/1k) for marginal benefit over Tavily |
| **Firecrawl** | Useful for scraping but not for search — Tavily Extract covers our needs |

---

## 6. Prediction Market Data Sources

### 6.1 Platform APIs We Should Be Using

| Platform | API Quality | Key Data | Status in Maxwell |
|----------|-----------|----------|-------------------|
| **Polymarket CLOB** | ⭐⭐⭐⭐⭐ | Prices, order books, volume, resolution criteria | ⚠️ Partially used (market context) |
| **Kalshi** | ⭐⭐⭐⭐ | Prices, metadata, FIX protocol | ⚠️ Partially used (market context) |
| **Manifold Markets** | ⭐⭐⭐ | Play money, good for research | ❌ Not used |
| **Metaculus** | ⭐⭐⭐ | Community forecasts, calibration data | ❌ Not used |
| **Polymarket Subgraph** | ⭐⭐⭐⭐ | On-chain data, wallet activity | ❌ Not used |

### 6.2 Cross-Platform Aggregators

| Service | What It Does | Potential Value |
|---------|-------------|-----------------|
| **FinFeedAPI** | Aggregates Polymarket, Kalshi, Manifold, Myriad | Single integration for multi-platform data |
| **Oddpool** | Cross-venue odds comparison | Arbitrage detection, spread tracking |
| **PredictPedia** | Aggregator and wiki | Compare real-time odds |

### 6.3 Calibration Data

**KalshiBench** (2025): 300 prediction market questions from Kalshi with verifiable outcomes. Key finding: **universal overconfidence in frontier LLMs** — calibration and accuracy are decoupled. Extended reasoning doesn't reliably improve uncertainty quantification.

**Metaculus calibration data**: Historical prediction accuracy tracking. Could be used to calibrate Maxwell's probability estimates.

**Implication for Maxwell:** Our `maxwellRange` probability estimates should be validated against historical calibration data. If frontier LLMs are systematically overconfident, our ranges may be too narrow.

### 6.4 Superforecasting Techniques

Research on superforecasters shows they:
1. **Decompose** questions into sub-questions (we do this ✅)
2. **Use multiple sources** with different perspectives (we could do better)
3. **Update incrementally** based on new information (we don't do this)
4. **Track calibration** over time (we don't do this)
5. **Consider base rates** before adjusting (our prompts don't emphasize this)

**Implication:** Our decomposition prompt should instruct the LLM to consider base rates and reference classes. Our probability estimates should be calibrated against historical prediction market accuracy.

---

## 7. DRACO Benchmark: What It Means For Us

### 7.1 The Benchmark

DRACO (Deep Research Accuracy, Completeness, and Objectivity) was released Feb 4, 2026 by Perplexity. It evaluates deep research agents on 100 tasks across 10 domains with ~40 expert-crafted criteria per task.

### 7.2 Key Takeaways for Maxwell

**1. Factual accuracy is ~50% of evaluation criteria.**
Our verification pipeline (claim extraction → NLI entailment → numeric consistency) directly addresses this. But we could strengthen it with Perplexity as an independent verification signal.

**2. Citation quality matters enormously.**
DRACO penalizes unsupported claims. Our citation system (source [n] references) is solid, but we should ensure every factual claim in the final output has a citation.

**3. Breadth AND depth matter.**
Our decomposition into 3-7 sub-queries provides breadth. Adding Tavily Extract for top sources would provide depth. The combination should score well on this dimension.

**4. Latency is not the enemy of quality.**
Perplexity achieved BOTH lowest latency (459.6s) and highest quality. This suggests our pipeline's sequential phases aren't inherently a problem — the key is optimizing each phase, not parallelizing everything.

**5. Vertical integration wins.**
Perplexity's advantage comes from owning the full stack (search + browser + code execution + LLM). Maxwell's advantage is similar — we own the full pipeline and can optimize each phase for prediction markets specifically.

---

## 8. Recommended Pipeline Architecture

### 8.1 Current Pipeline

```
Decompose → Search → Synthesize → Verify → Adjudicate → Present
```

### 8.2 Proposed Enhanced Pipeline

```
Decompose → Search → [Extract] → Synthesize → Verify → Adjudicate → Present
                ↑                                  ↑
           Tavily + Exa                    + Perplexity signal
           (RRF fusion)                    (independent check)
```

### 8.3 Phase-by-Phase Changes

#### Phase 1: Decompose (Enhanced)

**Changes:**
- Add `'finance'` to topic enum
- Add `exclude_domains` to sub-query schema
- Add `category` field for prediction market queries (already exists but underutilized)
- Update prompt to emphasize base rates and reference classes
- Add `chunks_per_source` guidance

**Effort:** Low. Prompt and schema changes only.

#### Phase 2: Search (Enhanced)

**Changes:**
- Use `topic: 'finance'` for financial sub-queries
- Add global `exclude_domains` blocklist
- Add `chunks_per_source: 3` for advanced depth
- Consider adding Exa as secondary search provider for `contrarian` and `factor_*` categories
- Implement RRF fusion if using multiple providers
- Add exponential backoff for retries
- Add score-based filtering (drop results below 0.3 relevance)
- Track `include_usage` for cost monitoring

**Effort:** Medium. New search provider integration + fusion logic.

#### Phase 2.5: Extract (NEW — Optional)

**When:** Only for `standard` and `deep_research` complexity.

**What:** After Search returns sources, Extract full content from top 5-7 URLs using Tavily Extract API with `query` parameter for relevance-ranked chunks.

**Why:** Search snippets are 200-500 words. Extract gives us 2,000-15,000 words per source. Richer context → better synthesis.

**Cost:** 1-2 credits for 5 URLs. Negligible.

**Latency:** +2-5 seconds.

**Effort:** Low-Medium. New API call + source content merging.

#### Phase 3: Synthesize (Minor Enhancement)

**Changes:**
- Feed extracted full content (when available) instead of search snippets
- No other changes needed — our prompts are already well-tuned

**Effort:** Low. Pass richer content to existing prompts.

#### Phase 4: Verify (Enhanced)

**Changes:**
- Add Perplexity Sonar as independent verification signal
- For each high-importance claim, query `sonar` with the claim text
- If Perplexity's search-grounded response contradicts our NLI verdict, flag for adjudication
- Weight: NLI entailment (primary) + Perplexity cross-check (secondary)

**Cost:** ~$0.006 per claim. For 10 high-importance claims = ~$0.06.

**Effort:** Medium. New API integration + signal aggregation logic.

#### Phase 5: Adjudicate (Minor Enhancement)

**Changes:**
- Include Perplexity cross-check results in the adjudicator's input
- Add "CROSS-VALIDATED" / "DISPUTED BY INDEPENDENT CHECK" labels

**Effort:** Low. Prompt changes only.

#### Phase 6: Present (No Changes)

The presenter already transforms whatever the pipeline produces into structured `MaxwellIntelligence`. No changes needed.

### 8.4 What We're NOT Doing (And Why)

| Idea | Why Not |
|------|---------|
| Replace pipeline with Perplexity Deep Research | Loses control, custom prompts, streaming, prediction market specialization |
| Add Tavily Crawl/Map | Not needed for core pipeline; future feature for market discovery |
| Add 3+ search providers | Diminishing returns, increased complexity and cost |
| Use Tavily MCP server | MCP is for agent-to-tool communication; we call APIs directly which is simpler |
| Use Tavily `include_answer` | We generate our own synthesis with custom prompts; Tavily's answer would be uncited and generic |
| Add Firecrawl | Tavily Extract covers our URL content extraction needs |

---

## 9. Cost Analysis

### 9.1 Current Cost Per Analysis

| Phase | Service | Cost |
|-------|---------|------|
| Decompose | Gemini Flash | ~$0.001 |
| Search | Tavily (5 queries × basic) | 5 credits = ~$0.04 |
| Synthesize | Claude Sonnet 4.5 | ~$0.03-0.10 |
| Verify (claims) | Gemini Flash (30 claims) | ~$0.01 |
| Verify (embeddings) | Gemini Embedding | ~$0.005 |
| Adjudicate | Gemini Flash | ~$0.005 |
| Present | Gemini Flash | ~$0.005 |
| **Total** | | **~$0.10-0.17** |

### 9.2 Enhanced Cost Per Analysis

| Phase | Service | Cost | Delta |
|-------|---------|------|-------|
| Decompose | Gemini Flash | ~$0.001 | — |
| Search | Tavily (5 queries × advanced) | 10 credits = ~$0.08 | +$0.04 |
| Search (Exa) | Exa (3 queries) | ~$0.015 | +$0.015 |
| Extract | Tavily Extract (5 URLs) | 1 credit = ~$0.008 | +$0.008 |
| Synthesize | Claude Sonnet 4.5 | ~$0.05-0.12 | — |
| Verify (NLI) | Gemini Flash (30 claims) | ~$0.01 | — |
| Verify (Perplexity) | Sonar (10 claims) | ~$0.06 | +$0.06 |
| Verify (embeddings) | Gemini Embedding | ~$0.005 | — |
| Adjudicate | Gemini Flash | ~$0.005 | — |
| Present | Gemini Flash | ~$0.005 | — |
| **Total** | | **~$0.22-0.31** | **+$0.12-0.14** |

**Cost increase: ~80% more per analysis, from ~$0.15 to ~$0.27 average.**

This is still very cheap. At 1,000 analyses/month = ~$270/month for significantly better quality.

### 9.3 Deep Research Mode Cost

For `deep_research` complexity with Perplexity Deep Research as supplementary:

| Addition | Cost |
|----------|------|
| Perplexity Deep Research | ~$0.80-1.20 |
| **Total with deep research** | **~$1.00-1.50** |

Use sparingly — only for high-value, complex queries.

---

## 10. Implementation Priorities

### Tier 1: Quick Wins (Days, Not Weeks)

These are low-effort, high-impact changes that improve quality immediately:

| # | Change | Files | Effort |
|---|--------|-------|--------|
| 1 | Add `topic: 'finance'` to decomposer schema + prompt | `decomposer.ts`, `prompts.ts` | 1 hour |
| 2 | Add `exclude_domains` global blocklist | `searcher.ts`, `constants.ts` | 1 hour |
| 3 | Add `chunks_per_source: 3` for advanced searches | `searcher.ts` | 30 min |
| 4 | Add exponential backoff for Tavily retries | `searcher.ts` | 2 hours |
| 5 | Add score-based filtering (drop results < 0.3) | `searcher.ts` | 1 hour |
| 6 | Add content-based deduplication (cosine similarity on snippets) | `searcher.ts` | 3 hours |
| 7 | Update decomposition prompt: base rates, reference classes | `prompts.ts` | 1 hour |

**Total: ~1-2 days of work.**

### Tier 2: Medium Impact (1-2 Weeks)

| # | Change | Files | Effort |
|---|--------|-------|--------|
| 8 | Add Tavily Extract phase between Search and Synthesize | New: `extractor.ts`, API route | 2-3 days |
| 9 | Add Exa as secondary search provider | New: `exa-searcher.ts` | 2-3 days |
| 10 | Implement RRF fusion for multi-provider results | `searcher.ts` | 1 day |
| 11 | Add Perplexity Sonar as verification signal | `verifier.ts`, new API integration | 2-3 days |
| 12 | Add `include_usage` tracking + cost monitoring | `searcher.ts`, dashboard | 1 day |

**Total: ~1-2 weeks of work.**

### Tier 3: Strategic (Future Consideration)

| # | Change | Notes |
|---|--------|-------|
| 13 | Perplexity Deep Research for `deep_research` complexity | High cost, high quality fallback |
| 14 | Calibration tracking against historical market outcomes | Requires outcome data collection |
| 15 | Manifold/Metaculus as supplementary prediction data | Additional market context |
| 16 | Cross-platform aggregator integration (FinFeedAPI/Oddpool) | Better arbitrage detection |
| 17 | Tavily Crawl for market discovery/monitoring | New feature, not core pipeline |

---

## Appendix A: Tavily API Quick Reference

### Search
```
POST https://api.tavily.com/search
{
  query, max_results, search_depth, topic, time_range,
  start_date, end_date, include_domains, exclude_domains,
  include_answer, include_raw_content, include_images,
  chunks_per_source, country, auto_parameters, include_usage
}
```

### Extract
```
POST https://api.tavily.com/extract
{
  urls (1-20), query, chunks_per_source (1-5),
  extract_depth, format, timeout, include_usage
}
```

### Crawl
```
POST https://api.tavily.com/crawl
{
  url, instructions, max_depth (1-5), max_breadth (1-500),
  limit, select_paths, exclude_paths, extract_depth,
  format, timeout, include_usage
}
```

### Map
```
POST https://api.tavily.com/map
{
  url, instructions, max_depth (1-5), max_breadth (1-500),
  limit, select_paths, exclude_paths, timeout, include_usage
}
```

### Research
```
POST https://api.tavily.com/research
{
  input, model (mini/pro/auto), stream,
  output_schema, citation_format
}
```

## Appendix B: Perplexity API Quick Reference

### Chat Completions (OpenAI-compatible)
```
POST https://api.perplexity.ai/chat/completions
{
  model: "sonar" | "sonar-pro" | "sonar-reasoning" | "sonar-reasoning-pro" | "sonar-deep-research",
  messages: [...],
  stream: boolean,
  response_format: { type: "json_schema", json_schema: { schema: {...} } }
}
```

### Response includes:
- `choices[].message.content` — The answer
- `citations` — Array of source URLs
- `usage` — Token breakdown (prompt, completion, citation, reasoning, search queries)

### MCP Server
```bash
npm install @perplexity-ai/perplexity_mcp
```
Tools: `perplexity_search`, `perplexity_financial_search`, `perplexity_news_search`, `perplexity_academic_search`, `perplexity_reason`, `perplexity_research`

## Appendix C: Exa API Quick Reference

### Search
```
POST https://api.exa.ai/search
{
  query, num_results (up to 100), type: "auto" | "keyword" | "neural",
  include_domains (up to 1,200), exclude_domains,
  start_published_date, end_published_date,
  contents: { text: true, highlights: true }
}
```

### Answer (Structured Output)
```
POST https://api.exa.ai/answer
{
  query, text: true,
  response_format: { type: "json_schema", json_schema: {...} }
}
```

## Appendix D: Key Research Sources

1. Tavily Documentation: https://docs.tavily.com
2. Tavily API Reference: https://docs.tavily.com/documentation/api-reference
3. Perplexity API Documentation: https://docs.perplexity.ai
4. DRACO Benchmark: https://research.perplexity.ai/articles/evaluating-deep-research-performance-in-the-wild-with-the-draco-benchmark
5. DRACO Dataset (HuggingFace): https://hf.co/datasets/perplexity-ai/draco
6. DRACO Technical Report: https://r2cdn.perplexity.ai/pplx-draco.pdf
7. Exa API: https://exa.ai
8. KalshiBench Paper (2025): LLM calibration on prediction markets
9. Polymarket CLOB API: https://docs.polymarket.com
10. Kalshi API: https://trading-api.readme.io
11. Tavily MCP Server: https://github.com/tavily-ai/tavily-mcp
12. Perplexity MCP Server: https://docs.perplexity.ai/guides/mcp-server
13. Tavily AI SDK Integration: https://www.npmjs.com/package/@tavily/ai-sdk
