# Maxwell Trader Intelligence Revamp

> **Status**: Planning  
> **Author**: Maxwell Team  
> **Created**: January 2026  
> **Last Updated**: January 2026

---

## Executive Summary

Maxwell currently produces prose-based research outputs that overwhelm traders with information. This revamp transforms Maxwell into a **structured intelligence platform** that delivers exactly what prediction market traders need: fast, verified, actionable intelligence without telling them what to bet on.

### The Core Insight

> **"Prediction market traders are information arbitrageurs who want to make their own decisions with superior data, not be told what to bet on."**

Only 16.8% of Polymarket wallets show net gains. The top 0.04% capture 70% of profits. Maxwell should serve the sophisticated minority who treat trading as a research discipline.

### The Transformation

| Current State               | Future State                                           |
| --------------------------- | ------------------------------------------------------ |
| Prose output dumped to UI   | Structured `MaxwellIntelligence` JSON                  |
| Generic research query      | Market-aware decomposition                             |
| "UNLIKELY 65%" verdict      | "UNDERPRICED/OVERPRICED/FAIR" assessment               |
| 4 separate cards (overload) | Multiple focused cards filling the space appropriately |
| No resolution risk analysis | AI-powered resolution risk scoring                     |
| Single outcome focus        | Top N outcome comparative analysis                     |

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Research Summary](#2-research-summary)
   - 2.5 [Design Philosophy: The $200/Month Standard](#25-design-philosophy-the-200month-standard)
3. [Architecture Overview](#3-architecture-overview)
4. [Type Definitions](#4-type-definitions)
5. [Phase 1: Market-Aware Decomposition](#5-phase-1-market-aware-decomposition)
6. [Phase 3: Structured Synthesis](#6-phase-3-structured-synthesis)
7. [Phase 4: Resolution Risk Scoring](#7-phase-4-resolution-risk-scoring)
8. [Phase 6: The Presenter](#8-phase-6-the-presenter)
9. [API Specification](#9-api-specification)
10. [UI Specification](#10-ui-specification)
    - 10.5 [Visual Design Language: Terminal Intelligence](#105-visual-design-language-terminal-intelligence)
11. [Implementation Plan](#11-implementation-plan)
12. [Success Metrics](#12-success-metrics)
13. [Appendix: Research Findings](#13-appendix-research-findings)

---

## 1. Problem Statement

### Current User Experience

When a trader views a market and runs Maxwell analysis, they see:

```
┌─────────────────────────────────────────────────────────────────┐
│ MAXWELL VERDICT                                                  │
│ UNLIKELY 65%                                                     │
│ Unfavorable conditions                                           │
│ [Wall of text summary paragraph...]                              │
├─────────────────────────────────────────────────────────────────┤
│ VERIFIED ANALYSIS                                                │
│ 19/63 sentences verified • Coverage: 30%                        │
│ ● HIGH ● MEDIUM ● LOW                                           │
│ [Raw markdown with orange heatmap highlights everywhere...]     │
├─────────────────────────────────────────────────────────────────┤
│ CLAIM VERIFICATION (20)                                         │
│ 9 verified  11 uncertain                                        │
│ [20 expandable claim items...]                                  │
├─────────────────────────────────────────────────────────────────┤
│ SOURCES (30)                                                    │
│ [30 source cards in a grid...]                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Problems Identified

1. **Information Overload**: Four separate cards, 20+ claims visible, 30+ sources
2. **Wrong Format**: Prose output when traders want structured factors
3. **Contradictory Signals**: Verdict says "UNLIKELY" but analysis says "LIKELY YES"
4. **Debug Info Leaking**: "19/63 sentences verified" is internal metrics, not user value
5. **No Market Context**: Maxwell doesn't know it's analyzing a tradeable market
6. **Binary Thinking**: "YES/NO" framing when many markets are multi-outcome
7. **No Resolution Risk**: The #1 trader pain point is completely unaddressed

### Desired User Experience

The market detail page has significant vertical space below the outcomes list. Following Linear and Raycast's design philosophy, we use a **unified intelligence panel** with flowing sections — not stacked cards with heavy borders.

**Design Philosophy: Panels, Not Cards**

Linear's UI redesign (March 2024) focused on "reducing visual noise, maintaining visual alignment, and increasing hierarchy." They use **elevation through color** (LCH color space), **typography hierarchy**, and **subtle dividers** — not boxes within boxes.

Raycast uses **List** as the de-facto interface, with **Detail** views for rich information. Actions are hidden until needed via ActionPanel.

**For Maxwell, this means:**

| Avoid (Card-Heavy)                  | Use (Panel-Based)                              |
| ----------------------------------- | ---------------------------------------------- |
| 5 separate bordered boxes           | Single unified region                          |
| Visible borders around each section | Subtle 1px dividers at 4% opacity              |
| Each section has its own background | Shared background, elevation for overlays only |
| "Card" as the unit                  | "Section" as the unit                          |
| Expand by showing new card          | Expand inline with disclosure chevron          |

**Panel Structure:**

One unified `IntelligencePanel` with these sections (separated by subtle rules or whitespace):

1. **Header** — Icon + "MAXWELL" label + deadline badge + verification score
2. **Assessment** — Primary outcome, verdict pill, Maxwell range, headline
3. **Outcomes** — List rows (for multi-outcome), inline expandable
4. **Thesis** — FOR/AGAINST columns, uncertainty, catalyst (collapsed by default)
5. **Resolution Risk** — Inline warning if MEDIUM/HIGH (not a separate card)
6. **Sources** — Collapsed row, expands inline

```
╭─────────────────────────────────────────────────────────────────╮
│ ⚡ MAXWELL                                     23d  ●  82%      │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ SEATTLE                                       UNDERPRICED       │
│ 24%  →  22% – 28% – 34%                                         │
│                                                                 │
│ Seattle has health advantage the market is underweighting       │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ Seattle        24%   UNDERPRICED   Healthiest playoff roster    │
│ LA Rams        21%   FAIR          Strong offense, weather risk │
│ Buffalo        14%   OVERPRICED    WR injuries limit ceiling    │
│ New England    13%   FAIR          Underdog value               │
│                                                                 │
│ ▸ 4 more                                                        │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ ▸ Thesis                                                        │
│ ▸ Resolution risk · MEDIUM                                      │
│ ▸ Sources (30)                                                  │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

**Expanded State (Thesis):**

```
│ ▾ Thesis                                                        │
│                                                                 │
│   FOR                            AGAINST                        │
│   ● Healthiest roster            ● No SB experience             │
│   ● Home field through NFC       ● AFC champ battle-tested      │
│   ● Best playoff defense         ● Weaker SOS                   │
│                                                                 │
│   KEY UNCERTAINTY                                               │
│   Any key injury fundamentally changes equation                 │
│                                                                 │
│   NEXT CATALYST                                                 │
│   Divisional Round (Jan 18) — clarifies path                    │
│                                                                 │
```

**Resolution Risk (inline, not separate card):**

```
│ ▾ Resolution risk · MEDIUM                                      │
│   ⚠ Resolution depends on "NFL official results"                │
│   ⚠ Polymarket UMA oracle has 12% historical dispute rate       │
```

**Key Design Principles:**

1. **Typography does the work** — Section labels: `text-[10px] uppercase tracking-widest text-white/25 font-medium`
2. **Dividers are whispers** — 1px rules at `rgba(255,255,255,0.05)` (matches `--border-subtle`)
3. **Elevation is earned** — Only modals, popovers, and tooltips get elevation
4. **Disclosure is inline** — Chevrons expand content in place, no new "cards" appear
5. **Alignment is felt** — Obsessive vertical alignment of labels, values, and icons
6. **Use existing patterns** — Copy exactly from `MarketDataPanel.tsx` and `CollapsibleSection`

---

## 2. Research Summary

### Trader Psychology

The top Polymarket trader (Domer, $2.5M+ profit) described prediction markets as:

> "Slow-motion poker hands where you can out-research your opponents."

Traders engage in **opinion arbitrage**: finding the delta between personal assessment and market price. If market shows 42% but research suggests 60%, that 18% gap is potential edge.

### What Traders Want (Ranked)

| Rank | Need                                                | Maxwell Response                     |
| ---- | --------------------------------------------------- | ------------------------------------ |
| 1    | **Speed** — First to know = edge                    | 30-60 second research pipeline       |
| 2    | **Trust** — Resolution clarity, verified data       | Claim verification + resolution risk |
| 3    | **WHY prices move** — Interpretation, not just data | Structured thesis (for/against)      |
| 4    | **Control** — Tools to act on insights              | Future: alerts, position sizing      |
| 5    | **Edge** — What's the market missing?               | Maxwell estimate vs market price     |

### What Traders DO NOT Want

| Avoid                     | Reason                               |
| ------------------------- | ------------------------------------ |
| "BET YES" recommendations | They make their own calls            |
| Black-box AI              | Trust requires transparent reasoning |
| Post-liquidity signals    | By time it trends, smart money moved |
| Extensive setup required  | Already have "tab nightmare"         |

### The #1 Unmet Need: Resolution Risk

No existing tool predicts which markets will face disputed resolutions. Traders describe a traumatic pattern:

> "Markets are not resolved by what happens in the real world but by UMA whales, a restricted number which manipulates the outcome by spending tens of thousands."

**This is our biggest differentiation opportunity.**

---

## 2.5. Design Philosophy: The $200/Month Standard

### Reference Points

Maxwell's UI should feel like it was designed by Linear and Raycast — the two most respected design systems in modern software. This section codifies the research findings into actionable design principles.

### Research Sources

| Source                          | Key Insight                                                   |
| ------------------------------- | ------------------------------------------------------------- |
| Linear UI Redesign (March 2024) | "Reduce visual noise, maintain alignment, increase hierarchy" |
| Raycast API Design System       | "List is the de-facto interface" — not cards                  |
| Bloomberg Terminal UX           | "Concealing complexity" — show only what's needed             |
| Koyfin                          | "See it all at a glance" — flexible widget views              |
| Premium trading platforms       | Progressive disclosure: Summary → Reasoning → Raw Data        |

### Core Principle: Panels, Not Cards

> **"Cards create visual noise. Panels create focus."**

Linear's 2024 redesign explicitly moved away from card-heavy layouts toward unified panels with:

- **Elevation through color** (LCH color space for surfaces)
- **Typography hierarchy** (font weight, size, opacity)
- **Subtle dividers** (1px rules at 4% opacity)

Raycast's List + Detail pattern confirms: information should flow in sections within a container, not scatter across bordered boxes.

### The Anti-Pattern: Card Fatigue

Every SaaS tool uses stacked cards. The result:

```
┌─────────┐
│ Card 1  │
└─────────┘
┌─────────┐
│ Card 2  │
└─────────┘
┌─────────┐
│ Card 3  │
└─────────┘
```

This creates:

- **Visual fragmentation** — gaps between cards feel disconnected
- **Border overload** — 15+ visible borders on a single screen
- **Scan friction** — eyes have to "jump" between isolated units
- **Generic feel** — looks like every other dashboard tool

### The Solution: Unified Panel with Sections

```
╭─────────────────────────────────────╮
│  Section 1                          │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  Section 2                          │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  Section 3                          │
╰─────────────────────────────────────╯
```

This creates:

- **Visual cohesion** — one container, flowing content
- **Minimal borders** — only the outer panel has a visible edge
- **Natural scanning** — eyes flow top-to-bottom without jumping
- **Premium feel** — distinctive, Linear-quality appearance

### Design Principles (Ranked)

| Priority | Principle                    | Implementation                                           |
| -------- | ---------------------------- | -------------------------------------------------------- |
| 1        | **Typography does the work** | Section labels: 10px uppercase tracking-widest 30% white |
| 2        | **Dividers are whispers**    | 1px rules at `rgba(255,255,255,0.04)`                    |
| 3        | **Elevation is earned**      | Only modals, popovers, tooltips get box-shadow           |
| 4        | **Disclosure is inline**     | Chevrons expand content in place, no new "cards"         |
| 5        | **Alignment is felt**        | Obsessive vertical alignment of labels and values        |
| 6        | **Content breathes**         | 16-24px padding, sections flow without gaps              |

### What Makes It Feel $200/Month

Based on Bloomberg Terminal and premium trading platform research:

1. **Concealed Complexity**

   - Thousands of data points available, but only relevant ones visible
   - Progressive disclosure: Summary → Details → Raw Data
   - User never feels overwhelmed

2. **Real-Time Confidence Indicators**

   - Verification scores visible at a glance
   - Sources referenced inline
   - Timestamps on every analysis

3. **Zero-Friction State Transitions**

   - Chevron click → instant inline expansion (no page load)
   - Smooth 200ms animations (not jarring)
   - Keyboard shortcuts for power users

4. **AI Accent Color**
   - Purple (`#a855f7`) for AI-generated insights
   - Creates premium/tech association
   - Subtle glow for emphasis (`rgba(168,85,247,0.15)`)

### Color Psychology for Trading Intelligence

**IMPORTANT**: Use the app's existing status colors, not new ones.

| Color                   | Existing Token     | Meaning                | Usage                         |
| ----------------------- | ------------------ | ---------------------- | ----------------------------- |
| Teal Green (`#4ade80`)  | `--verified`       | Opportunity / Verified | UNDERPRICED verdict           |
| Soft Red (`#f87171`)    | `--failed`         | Caution / Risk         | OVERPRICED verdict, HIGH risk |
| Gray (`#8f8f8f`)        | `--text-secondary` | Neutral                | FAIR verdict                  |
| Warm Yellow (`#fbbf24`) | `--flagged`        | Warning / Uncertainty  | UNCERTAIN, MEDIUM risk        |
| Purple (`#6f3bf5`)      | `--brand-accent`   | Brand / AI             | Maxwell branding only         |

### Typography System

**Use existing app patterns exactly** (from `MarketDataPanel.tsx`):

| Element            | Existing Pattern                            | Class                                                             |
| ------------------ | ------------------------------------------- | ----------------------------------------------------------------- |
| **Section Label**  | 10px, uppercase, tracking-widest, 25% white | `text-[10px] uppercase tracking-widest text-white/25 font-medium` |
| **Primary Text**   | 13px+, off-white                            | `text-[13px] text-[#e8e8e8]`                                      |
| **Secondary Text** | 13px, 60% white                             | `text-[13px] text-white/60`                                       |
| **Muted Text**     | 11px, 40% white                             | `text-[11px] text-white/40`                                       |
| **Numbers**        | 13px, monospace                             | `text-[13px] font-mono tabular-nums`                              |

### Component Naming Convention

To reinforce the philosophy, we use "Panel" and "Section" — never "Card":

| Instead of         | Use                     |
| ------------------ | ----------------------- |
| `IntelligenceCard` | `IntelligencePanel`     |
| `VerdictCard`      | `AssessmentSection`     |
| `AnalysisCard`     | `ThesisSection`         |
| `RiskCard`         | `ResolutionRiskSection` |
| `SourcesCard`      | `SourcesSection`        |

---

## 3. Architecture Overview

### Current Pipeline

```
Query → Decompose → Search → Synthesize → Verify → Adjudicate → UI (prose)
         Phase 1    Phase 2   Phase 3     Phase 4   Phase 5
```

### Proposed Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        MAXWELL PIPELINE (ENHANCED)                            │
│                                                                               │
│  INPUTS:                                                                      │
│  ├── query: string                                                            │
│  ├── marketContext: MarketContext  ← NEW                                      │
│  │                                                                            │
│  ▼                                                                            │
│  Phase 1: DECOMPOSE ──► Market-aware sub-queries (all top N outcomes)        │
│  Phase 2: SEARCH    ──► Sources + cross-platform price data                  │
│  Phase 3: SYNTHESIZE ──► Structured thesis format (not prose)                │
│  Phase 4: VERIFY    ──► Claims + Resolution Risk Scoring ← NEW               │
│  Phase 5: ADJUDICATE ──► Raw verdict (preserved for chat context)            │
│  Phase 6: PRESENT   ──► MaxwellIntelligence JSON ← NEW                       │
│                                                                               │
│  OUTPUTS:                                                                     │
│  ├── intelligence: MaxwellIntelligence (for UI rendering)                    │
│  └── context: { rawSynthesis, rawAdjudication, verification, sources }       │
│       └── (preserved for future follow-up chat agent)                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### New Endpoint Structure

| Endpoint                       | Purpose       | Timeout |
| ------------------------------ | ------------- | ------- |
| `POST /api/maxwell/decompose`  | Phase 1       | 30s     |
| `POST /api/maxwell/search`     | Phase 2       | 60s     |
| `POST /api/maxwell/synthesize` | Phase 3 (SSE) | 30s     |
| `POST /api/maxwell/verify`     | Phase 4 (SSE) | 60s     |
| `POST /api/maxwell/adjudicate` | Phase 5 (SSE) | 30s     |
| `POST /api/maxwell/present`    | Phase 6 ← NEW | 30s     |

---

## 4. Type Definitions

### MarketContext (Input)

```typescript
/**
 * Market context passed to Maxwell for prediction market analysis.
 * This enables market-aware decomposition and comparative analysis.
 */
interface MarketContext {
  // ─── IDENTITY ───
  id: string; // "poly:abc123"
  platform: "polymarket" | "kalshi";

  // ─── MARKET DEFINITION ───
  title: string; // "Super Bowl Champion 2026"
  type: "binary" | "multi-option" | "matchup";

  // ─── OUTCOMES ───
  outcomes: MarketOutcomeContext[]; // All outcomes with current prices

  // ─── RESOLUTION ───
  rules: string; // Full resolution rules text
  resolutionSource?: string; // "NFL official results"
  endDate: Date; // Resolution deadline

  // ─── MARKET DATA ───
  volume: number; // Total volume USD
  volume24h: number; // 24h volume USD
  liquidity?: number; // Current liquidity

  // ─── CROSS-PLATFORM (if available) ───
  crossPlatformOdds?: {
    platform: "polymarket" | "kalshi";
    outcomes: Array<{ name: string; price: number }>;
  };
}

interface MarketOutcomeContext {
  name: string; // "Seattle"
  price: number; // 0.24 (24%)
  priceChange24h?: number; // +0.03 (+3%)
  volume?: number; // Outcome-specific volume
}
```

### MaxwellIntelligence (Output)

```typescript
/**
 * Structured intelligence output for prediction market analysis.
 * This replaces the prose-based adjudication output for UI rendering.
 *
 * CRITICAL: This is intelligence, not recommendation.
 * We say "UNDERPRICED" not "BET YES".
 */
interface MaxwellIntelligence {
  // ─── MARKET CONTEXT ───
  market: {
    question: string; // "Who will win Super Bowl LX?"
    type: "binary" | "multi-option" | "matchup";
    deadline: string; // "23 days"
    deadlineDate: string; // ISO date for sorting
    resolutionCriteria: string; // Plain language summary
  };

  // ─── RESOLUTION RISK ───
  resolutionRisk: {
    level: "LOW" | "MEDIUM" | "HIGH";
    score: number; // 0-100
    factors: string[]; // Specific risk factors identified
    historicalDisputes?: string; // "Similar markets had 23% dispute rate"
  };

  // ─── MAXWELL'S ASSESSMENT ───
  assessment: {
    // For binary: applies to YES outcome
    // For multi-option: applies to top-ranked outcome
    primaryOutcome: string; // "Seattle" or "YES"
    marketPrice: number; // 0.24
    maxwellRange: {
      low: number; // 0.22 (conservative)
      mid: number; // 0.28 (central estimate)
      high: number; // 0.34 (optimistic)
    };
    verdict: "UNDERPRICED" | "OVERPRICED" | "FAIR" | "UNCERTAIN";
    confidence: "HIGH" | "MEDIUM" | "LOW";
    headline: string; // One sentence insight
  };

  // ─── STRUCTURED THESIS ───
  thesis: {
    factorsFor: ThesisFactor[]; // Max 5
    factorsAgainst: ThesisFactor[]; // Max 5
    keyUncertainty: string; // Single biggest unknown
    nextCatalyst: {
      event: string; // "Divisional Round"
      date?: string; // "January 18, 2026"
      impact: string; // "Will clarify path difficulty"
    };
    sourceConflicts?: string[]; // When sources disagree
  };

  // ─── MULTI-OUTCOME RANKINGS ───
  // Only present for multi-option and matchup markets
  outcomes?: OutcomeAnalysis[]; // Ordered by Maxwell conviction

  // ─── CROSS-PLATFORM ARBITRAGE ───
  arbitrage?: {
    detected: boolean;
    description?: string; // "Polymarket 24% vs Kalshi 28%"
    spread?: number; // 0.04 (4%)
  };

  // ─── VERIFICATION SUMMARY ───
  verification: {
    score: number; // 0-100
    level: "VERIFIED" | "PARTIAL" | "LOW_CONFIDENCE";
    sourcesAnalyzed: number;
    claimsVerified: number;
    claimsDisputed: number;
    topSources: SourceSummary[]; // Top 5 sources
  };

  // ─── RAW DATA (for future chat agent) ───
  raw: {
    synthesis: string; // Phase 3 output
    adjudication: string; // Phase 5 output
    allSources: SourceReference[];
    allClaims: ClaimReference[];
  };

  // ─── METADATA ───
  generatedAt: string; // ISO timestamp
  pipelineDurationMs: number;
  modelUsed: string;
}

interface ThesisFactor {
  point: string; // "Healthiest playoff roster"
  evidence: string; // Supporting detail
  sourceIndex: number; // Reference to source
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

interface OutcomeAnalysis {
  name: string; // "Seattle"
  marketPrice: number; // 0.24
  maxwellRange: {
    low: number;
    mid: number;
    high: number;
  };
  view: "UNDERPRICED" | "OVERPRICED" | "FAIR" | "UNCERTAIN";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  oneLiner: string; // Brief reasoning
  rank: number; // 1 = most favorable
}

interface SourceSummary {
  title: string;
  domain: string; // "espn.com"
  relevanceScore: number; // 0-1
}

interface SourceReference {
  index: number;
  title: string;
  url: string;
  snippet: string;
  date?: string;
}

interface ClaimReference {
  id: string;
  text: string;
  confidence: number;
  entailment: "SUPPORTED" | "CONTRADICTED" | "NEUTRAL";
}
```

---

## 5. Phase 1: Market-Aware Decomposition

### Current Behavior

The decomposer receives a text query and generates generic sub-queries.

### New Behavior

The decomposer receives query + MarketContext and generates **prediction-market-specific** sub-queries.

### Updated Decomposition Prompt

```typescript
export const PREDICTION_MARKET_DECOMPOSITION_PROMPT = `You are a Master Search Strategist for a prediction market intelligence platform.

CONTEXT:
- Current Date: {currentDate}
- User Query: {query}

MARKET CONTEXT:
- Title: {marketTitle}
- Type: {marketType}
- Outcomes: {outcomes}
- Current Prices: {prices}
- Resolution Rules: {rules}
- Deadline: {deadline}
- Platform: {platform}

YOUR TASK:
Generate sub-queries that will gather intelligence for a PREDICTION MARKET trader.
Traders need to assess: Is this market fairly priced? What might the market be missing?

REQUIRED SUB-QUERY CATEGORIES:

1. **RESOLUTION CLARITY** (CRITICAL - addresses #1 trader pain point)
   - Search for the exact resolution criteria interpretation
   - Look for historical disputes on similar markets
   - Check for ambiguous language that could cause issues
   - Query: "[market topic] resolution dispute" or "[platform] [topic] controversy"

2. **RECENT CATALYSTS** (last 24-72 hours)
   - What just happened that could affect this market?
   - Breaking news, announcements, developments
   - Use topic: 'news', days: 1-3

3. **FACTORS FOR EACH OUTCOME** (research ALL top outcomes, not just one)
   For multi-outcome markets with {outcomeCount} outcomes, generate queries for the top {topN} by market price:
   {outcomeQueries}

4. **CONTRARIAN SIGNALS**
   - What could prove the market consensus wrong?
   - Expert opinions that diverge from market pricing
   - Historical precedents where similar situations resolved unexpectedly

5. **CROSS-PLATFORM COMPARISON** (if applicable)
   - Search for equivalent market on other platform
   - Note any price discrepancies

OUTPUT FORMAT:
{
  "reasoning": "Your decomposition strategy",
  "complexity": "standard" | "deep_research",
  "complexityReasoning": "Why this complexity level",
  "subQueries": [
    {
      "id": "q1",
      "query": "concise search query",
      "topic": "general" | "news",
      "depth": "basic" | "advanced",
      "days": number | null,
      "domains": ["domain.com"] | null,
      "purpose": "What this query investigates",
      "category": "resolution" | "catalyst" | "factor_for" | "factor_against" | "contrarian" | "cross_platform",
      "targetOutcome": "Seattle" | null  // For multi-outcome markets
    }
  ]
}

RULES:
- For multi-outcome markets, analyze TOP {topN} outcomes by market price
- Always include at least one resolution-focused query
- Always include recent news queries (days: 1-3)
- Balance queries across FOR and AGAINST factors
- Target authoritative sources for the domain (see DOMAIN TARGETING below)

DOMAIN TARGETING:
- Political markets: fivethirtyeight.com, realclearpolitics.com, politico.com
- Sports markets: espn.com, nfl.com, pro-football-reference.com
- Crypto markets: glassnode.com, arkham.ai, official project domains
- Economic markets: federalreserve.gov, bls.gov, sec.gov, reuters.com
`;
```

### Top N Outcome Selection

For multi-outcome markets, analyze the top N outcomes by market price:

| Total Outcomes | Analyze Top N |
| -------------- | ------------- |
| 2 (matchup)    | 2 (both)      |
| 3-6            | All           |
| 7-12           | Top 6         |
| 13-32          | Top 8         |
| 33+            | Top 10        |

This ensures comprehensive coverage without excessive API costs.

---

## 6. Phase 3: Structured Synthesis

### Current Behavior

Synthesizer outputs prose with `[n]` citations.

### New Behavior

Synthesizer outputs **structured thesis format** that the Presenter can parse.

### Updated Synthesis Prompt

```typescript
export const PREDICTION_MARKET_SYNTHESIS_PROMPT = `You are an intelligence analyst for a prediction market research platform.

CONTEXT:
- Current Date: {currentDate}
- Market Question: {marketQuestion}
- Market Type: {marketType}
- Outcomes Being Analyzed: {outcomes}
- Resolution Rules: {rules}
- Deadline: {deadline}

SOURCES PROVIDED:
{sources}

YOUR TASK:
Synthesize the research into a STRUCTURED INTELLIGENCE BRIEFING.
This will be parsed by a downstream system, so follow the format exactly.

OUTPUT FORMAT:

## MARKET CONTEXT
[One paragraph restating what this market is asking, the deadline, and resolution criteria in plain language]

## RESOLUTION ANALYSIS
[Analysis of resolution criteria clarity. Flag any ambiguous language, historical disputes, or interpretation risks]
- Risk Level: LOW | MEDIUM | HIGH
- Risk Factors: [List specific concerns, if any]

## FACTORS FOR: {primaryOutcome}
List 3-5 factors that support this outcome occurring:
1. **[Factor Title]** — [Evidence with citation] [n]
2. **[Factor Title]** — [Evidence with citation] [n]
3. **[Factor Title]** — [Evidence with citation] [n]

## FACTORS AGAINST: {primaryOutcome}
List 3-5 factors that work against this outcome:
1. **[Factor Title]** — [Evidence with citation] [n]
2. **[Factor Title]** — [Evidence with citation] [n]
3. **[Factor Title]** — [Evidence with citation] [n]

## KEY UNCERTAINTY
[The single biggest unknown that could swing the outcome either direction]

## NEXT CATALYST
- Event: [What event could move the market next]
- Date: [When, if known]
- Impact: [How it could affect odds]

## SOURCE CONFLICTS
[Explicitly state when sources disagree on key facts. If no conflicts, state "No significant source conflicts identified."]

## MULTI-OUTCOME COMPARISON (if applicable)
For each analyzed outcome:
### {OutcomeName} ({marketPrice}%)
- Factors For: [Brief summary]
- Factors Against: [Brief summary]
- Assessment: UNDERPRICED | OVERPRICED | FAIR
- Confidence: HIGH | MEDIUM | LOW
- One-liner: [Single sentence assessment]

STRICT RULES:
1. NEVER say "you should bet" or "I recommend" — this is intelligence, not advice
2. NEVER say "I am X% confident" — let the evidence speak
3. NEVER use filler phrases like "it's important to note" or "one must consider"
4. EVERY factual claim MUST cite its source using [n] notation
5. Be DENSE — traders want information, not padding
6. Flag ALL source conflicts explicitly
7. For multi-outcome markets, analyze ALL outcomes provided
`;
```

### Forbidden Patterns

The synthesis prompt explicitly forbids:

| Pattern           | Example                            | Why Forbidden               |
| ----------------- | ---------------------------------- | --------------------------- |
| Recommendations   | "You should bet YES"               | Traders decide, not Maxwell |
| Confidence claims | "I am 80% confident"               | Presumptuous                |
| Filler phrases    | "It's important to note..."        | Wastes trader time          |
| Hedging caveats   | "Of course, anything could happen" | Obvious, adds nothing       |
| First person      | "I found that..."                  | Breaks analyst persona      |

---

## 7. Phase 4: Resolution Risk Scoring

### The Problem

Resolution disputes are the #1 trader pain point. No existing tool predicts which markets will face disputed resolutions.

### The Solution

Add **AI-powered resolution risk scoring** to the verification phase. This uses Maxwell's existing OpenRouter integration to analyze resolution criteria.

### Resolution Risk Analysis Prompt

```typescript
export const RESOLUTION_RISK_PROMPT = `You are a prediction market resolution analyst.

Your task is to analyze the RESOLUTION CRITERIA of a prediction market and assess the risk of disputes.

MARKET INFORMATION:
- Platform: {platform}
- Title: {title}
- Resolution Rules: {rules}
- Resolution Source: {resolutionSource}
- Deadline: {deadline}

HISTORICAL CONTEXT (if available):
{historicalDisputes}

ANALYZE FOR THESE RISK FACTORS:

1. **AMBIGUOUS LANGUAGE**
   - Words like "significant", "material", "substantial", "reasonable"
   - Undefined terms that require interpretation
   - Subjective criteria ("in the opinion of...")

2. **RESOLUTION SOURCE RELIABILITY**
   - Official government/organization sources = LOW risk
   - Major news outlets = LOW-MEDIUM risk
   - Social media posts = HIGH risk
   - "To be determined" = HIGH risk

3. **EDGE CASES**
   - What happens if the event is cancelled?
   - What if there's a tie or unclear outcome?
   - What if the resolution source is unavailable?

4. **PLATFORM-SPECIFIC RISKS**
   - Polymarket: UMA oracle disputes, whale voting manipulation
   - Kalshi: Centralized resolution, potential for rule interpretation disputes

5. **TEMPORAL RISKS**
   - Very long time horizons increase uncertainty
   - Markets that depend on future announcements
   - "First to X" markets with unclear timing

OUTPUT FORMAT:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "riskScore": 0-100,
  "factors": [
    {
      "type": "ambiguous_language" | "source_reliability" | "edge_case" | "platform_risk" | "temporal_risk",
      "description": "Specific issue identified",
      "severity": "LOW" | "MEDIUM" | "HIGH"
    }
  ],
  "ambiguousTerms": ["term1", "term2"],
  "recommendation": "Brief recommendation for trader awareness",
  "historicalComparison": "Similar markets had X% dispute rate" | null
}

CALIBRATION:
- LOW (0-30): Clear rules, official sources, well-defined outcomes
- MEDIUM (31-60): Some ambiguity but manageable, reputable sources
- HIGH (61-100): Vague criteria, unreliable sources, high dispute likelihood
`;
```

### Integration with Verification Phase

The resolution risk analysis runs in parallel with claim verification:

```typescript
// In verifier.ts (conceptual)
async function verifyWithResolutionRisk(
  answer: string,
  sources: MaxwellSource[],
  marketContext: MarketContext,
  config: ExecutionConfig
): Promise<VerificationOutput & { resolutionRisk: ResolutionRisk }> {
  // Run in parallel
  const [claimVerification, resolutionRisk] = await Promise.all([
    verifyClaims(answer, sources, config),
    analyzeResolutionRisk(marketContext),
  ]);

  return {
    ...claimVerification,
    resolutionRisk,
  };
}
```

---

## 8. Phase 6: The Presenter

### Purpose

Transform the prose outputs from Phases 3-5 into structured `MaxwellIntelligence` JSON for UI rendering.

### Endpoint

`POST /api/maxwell/present`

### Request Schema

```typescript
interface PresentRequest {
  // Original inputs
  query: string;
  marketContext: MarketContext;

  // Phase outputs
  synthesis: string; // Phase 3 output
  verification: VerificationOutput; // Phase 4 output (includes resolution risk)
  adjudication: string; // Phase 5 output
  sources: MaxwellSource[];

  // Metadata
  pipelineDurationMs: number;
}
```

### Response Schema

```typescript
interface PresentResponse {
  intelligence: MaxwellIntelligence;
  durationMs: number;
}
```

### Presenter System Prompt

```typescript
export const PRESENTER_SYSTEM_PROMPT = `You are the Presentation Layer for a prediction market intelligence platform.

Your job is to transform research outputs into STRUCTURED JSON that a UI can render beautifully.

CRITICAL PRINCIPLES:

1. **INTELLIGENCE, NOT ADVICE**
   - Say "UNDERPRICED" not "BET YES"
   - Say "Maxwell range: 22-28%" not "I predict 25%"
   - Traders make their own decisions

2. **STRUCTURED, NOT PROSE**
   - Every output field must be concise
   - Headlines are ONE sentence
   - Factor descriptions are ONE sentence each
   - No paragraphs in structured fields

3. **PROBABILITY ESTIMATION**
   - Provide a RANGE (low/mid/high), not a point estimate
   - Base on evidence density and source agreement
   - If sources conflict significantly, widen the range

4. **COMPARATIVE ANALYSIS**
   - For multi-outcome markets, rank ALL analyzed outcomes
   - Compare each outcome's evidence quality
   - Identify the most/least favorable based on research

5. **VERDICTS**
   - UNDERPRICED: Evidence suggests higher probability than market
   - OVERPRICED: Evidence suggests lower probability than market
   - FAIR: Evidence aligns with market pricing
   - UNCERTAIN: Insufficient or conflicting evidence

6. **CONFIDENCE LEVELS**
   - HIGH: Strong evidence consensus, high verification score
   - MEDIUM: Mixed evidence, some verification issues
   - LOW: Conflicting sources, low verification score
`;
```

### Presenter User Prompt

```typescript
export const PRESENTER_USER_PROMPT = `Transform this prediction market research into structured intelligence.

MARKET CONTEXT:
{marketContextJSON}

SYNTHESIS OUTPUT (Phase 3):
{synthesis}

VERIFICATION OUTPUT (Phase 4):
{verificationJSON}

ADJUDICATION OUTPUT (Phase 5):
{adjudication}

SOURCES USED:
{sourcesJSON}

PIPELINE DURATION: {durationMs}ms

Generate a MaxwellIntelligence JSON object following this EXACT schema:

{
  "market": {
    "question": "string - the market question in plain language",
    "type": "binary | multi-option | matchup",
    "deadline": "string - human readable like '23 days'",
    "deadlineDate": "ISO date string",
    "resolutionCriteria": "string - plain language summary of how this resolves"
  },
  "resolutionRisk": {
    "level": "LOW | MEDIUM | HIGH",
    "score": 0-100,
    "factors": ["string array of specific risk factors"],
    "historicalDisputes": "string or null"
  },
  "assessment": {
    "primaryOutcome": "string - the outcome being primarily assessed",
    "marketPrice": 0.XX,
    "maxwellRange": {
      "low": 0.XX,
      "mid": 0.XX,
      "high": 0.XX
    },
    "verdict": "UNDERPRICED | OVERPRICED | FAIR | UNCERTAIN",
    "confidence": "HIGH | MEDIUM | LOW",
    "headline": "One sentence capturing the key insight"
  },
  "thesis": {
    "factorsFor": [
      {
        "point": "Brief factor title",
        "evidence": "One sentence of supporting evidence",
        "sourceIndex": 1,
        "confidence": "HIGH | MEDIUM | LOW"
      }
    ],
    "factorsAgainst": [
      {
        "point": "Brief factor title",
        "evidence": "One sentence of supporting evidence",
        "sourceIndex": 2,
        "confidence": "HIGH | MEDIUM | LOW"
      }
    ],
    "keyUncertainty": "The single biggest unknown",
    "nextCatalyst": {
      "event": "What event",
      "date": "When (if known)",
      "impact": "How it affects odds"
    },
    "sourceConflicts": ["Array of conflicts or empty"]
  },
  "outcomes": [
    {
      "name": "Outcome name",
      "marketPrice": 0.XX,
      "maxwellRange": { "low": 0.XX, "mid": 0.XX, "high": 0.XX },
      "view": "UNDERPRICED | OVERPRICED | FAIR | UNCERTAIN",
      "confidence": "HIGH | MEDIUM | LOW",
      "oneLiner": "One sentence assessment",
      "rank": 1
    }
  ],
  "arbitrage": {
    "detected": false,
    "description": null,
    "spread": null
  },
  "verification": {
    "score": 0-100,
    "level": "VERIFIED | PARTIAL | LOW_CONFIDENCE",
    "sourcesAnalyzed": number,
    "claimsVerified": number,
    "claimsDisputed": number,
    "topSources": [
      { "title": "string", "domain": "string", "relevanceScore": 0.XX }
    ]
  },
  "raw": {
    "synthesis": "Full synthesis text",
    "adjudication": "Full adjudication text",
    "allSources": [{ "index": 1, "title": "...", "url": "...", "snippet": "...", "date": "..." }],
    "allClaims": [{ "id": "c1", "text": "...", "confidence": 0.XX, "entailment": "..." }]
  },
  "generatedAt": "ISO timestamp",
  "pipelineDurationMs": number,
  "modelUsed": "model identifier"
}

RULES:
- factorsFor and factorsAgainst should have 3-5 items each
- outcomes array should be sorted by rank (1 = most favorable)
- topSources should have max 5 items
- All text fields should be concise - no paragraphs
- The headline should be memorable and insightful
- If multi-outcome, the assessment.primaryOutcome should match the rank 1 outcome
`;
```

---

## 9. API Specification

### New Endpoint: POST /api/maxwell/present

#### Request

```typescript
// POST /api/maxwell/present
// Content-Type: application/json

{
  "query": "Super Bowl Champion 2026",
  "marketContext": {
    "id": "poly:superbowl2026",
    "platform": "polymarket",
    "title": "Super Bowl Champion 2026",
    "type": "multi-option",
    "outcomes": [
      { "name": "Seattle", "price": 0.24 },
      { "name": "Los Angeles Rams", "price": 0.21 },
      { "name": "Buffalo", "price": 0.14 },
      { "name": "New England", "price": 0.13 }
    ],
    "rules": "This market will resolve to the team that wins Super Bowl LX...",
    "endDate": "2026-02-08T00:00:00Z",
    "volume": 675000000,
    "volume24h": 917000
  },
  "synthesis": "## MARKET CONTEXT\n...",
  "verification": { /* VerificationOutput */ },
  "adjudication": "Based on verified evidence...",
  "sources": [ /* MaxwellSource[] */ ],
  "pipelineDurationMs": 45000
}
```

#### Response

```typescript
// 200 OK
// Content-Type: application/json

{
  "intelligence": { /* MaxwellIntelligence */ },
  "durationMs": 2500
}
```

### Updated Hook Interface

```typescript
// use-maxwell.ts updates

interface UseMaxwellOptions {
  query: string;
  marketContext: MarketContext; // NEW: Required for prediction markets
}

interface UseMaxwellReturn {
  // Existing
  phase: ExecutionPhase;
  sources: MaxwellSource[];
  verification: VerificationOutput | null;
  phaseDurations: PhaseDurations;
  error: string | null;

  // Updated
  intelligence: MaxwellIntelligence | null; // REPLACES: answer, adjudication

  // Methods
  runAnalysis: () => Promise<void>;
  reset: () => void;
}
```

### Caching Strategy

The `MaxwellIntelligence` output replaces the current cached response:

```typescript
// Cache key structure
const cacheKey = `maxwell:${marketId}:intelligence`;

// Cache TTL
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Stored data
interface CachedIntelligence {
  intelligence: MaxwellIntelligence;
  generatedAt: string;
  expiresAt: string;
}
```

---

## 10. UI Specification

### Design Philosophy: Panels, Not Cards

Based on research into Linear, Raycast, Bloomberg Terminal, and premium trading platforms:

> **"Cards create visual noise. Panels create focus."**

Linear's 2024 UI redesign explicitly focused on "reducing visual noise, maintaining visual alignment, and increasing hierarchy." They use **elevation through color** (LCH color space), **typography hierarchy**, and **subtle dividers** — not bordered boxes.

Bloomberg Terminal's core design principle is **concealing complexity** — thousands of functions available, but only relevant ones visible. Premium trading interfaces achieve the $200/month feel through:

1. **Progressive disclosure**: Summary → Reasoning → Raw Data
2. **Expandable sections**: Collapsed by default, expand for detail
3. **Real-time confidence indicators**: Show verification scores, data sources
4. **Zero-friction state transitions**: Single-click layout switches

### Component: IntelligencePanel

Replaces: `VerdictCard`, `AnalysisCard`, `ClaimsCard`, `SourcesGrid`

**NOT** multiple stacked cards. **ONE** unified panel with flowing sections.

#### Props

```typescript
interface IntelligencePanelProps {
  intelligence: MaxwellIntelligence;
  isLoading?: boolean;
  defaultExpandedSections?: ("thesis" | "outcomes" | "risk" | "sources")[];
}
```

#### Visual Structure

The panel has ONE border (the outer container). Internal sections are separated by:

- Typography hierarchy (size, weight, opacity)
- Subtle 1px rules at 4% white opacity
- Whitespace (16-24px vertical spacing)

**NO internal borders. NO nested cards. NO visual "boxes within boxes."**

#### Default State (Collapsed)

```
╭─────────────────────────────────────────────────────────────────╮
│                                                                 │
│  ⚡ MAXWELL                                    23d   ●  82%     │
│                                                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                 │
│  SEATTLE                                      UNDERPRICED       │
│  24%  →  22% – 28% – 34%                                        │
│                                                                 │
│  Seattle has health advantage the market is underweighting      │
│                                                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                 │
│  Seattle        24%   UNDERPRICED   Healthiest playoff roster   │
│  LA Rams        21%   FAIR          Strong offense, weather     │
│  Buffalo        14%   OVERPRICED    WR injuries limit ceiling   │
│  New England    13%   FAIR          Underdog value              │
│                                                                 │
│  ▸ 4 more outcomes                                              │
│                                                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                 │
│  ▸ Thesis                                                       │
│  ▸ Resolution risk · MEDIUM                                     │
│  ▸ Sources (30)                                                 │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

#### Expanded State (Thesis Section)

When user clicks "▸ Thesis", it expands **inline** (not as a new card):

```
│  ▾ Thesis                                                       │
│                                                                 │
│    FOR                           AGAINST                        │
│    ● Healthiest roster           ● No SB experience             │
│      ESPN                          NFL.com                      │
│    ● Home field through NFC      ● AFC champ battle-tested      │
│      Pro Football Reference        ESPN                         │
│    ● Best playoff defense        ● Weaker SOS                   │
│      NFL.com                       FiveThirtyEight              │
│                                                                 │
│    KEY UNCERTAINTY                                              │
│    Any key injury fundamentally changes equation                │
│                                                                 │
│    NEXT CATALYST                                                │
│    Divisional Round (Jan 18) — clarifies path                   │
│                                                                 │
```

#### Resolution Risk (Inline Warning)

When risk is MEDIUM or HIGH, the disclosure row shows a warning indicator:

```
│  ▾ Resolution risk · MEDIUM                                     │
│    ⚠ Resolution depends on "NFL official results"               │
│    ⚠ Polymarket UMA oracle has 12% historical dispute rate      │
```

When HIGH, the entire row gets subtle amber background (`bg-amber-500/5`):

```
│  ▾ Resolution risk · HIGH                          ⚠            │
│    ⚠ Ambiguous term: "officially announced" undefined           │
│    ⚠ Resolution source is social media post                     │
│    ⚠ Similar markets had 23% historical dispute rate            │
│                                                                 │
│    Consider this risk before entering a position.               │
```

#### Sources (Inline Expansion)

```
│  ▾ Sources (30)                                                 │
│    ESPN · NFL.com · Pro Football Reference · Reuters · +26     │
│                                                                 │
│    ▸ View all sources                                           │
│    ▸ Raw analysis                                               │
│    ▸ Verification details                                       │
```

The "View all sources" opens a **modal** (elevation earned for overlays).

### Section Anatomy

Each section follows this structure:

```
│  SECTION_LABEL                           SECTION_METADATA       │
│                                                                 │
│  Primary content (larger, brighter)                             │
│  Secondary content (smaller, dimmer)                            │
│                                                                 │
```

- **SECTION_LABEL**: 10px, uppercase, tracking-widest, 30% white
- **SECTION_METADATA**: 10px, normal case, 30% white, right-aligned
- **Primary content**: 14-16px, 100% white
- **Secondary content**: 12-13px, 50-70% white

### Design Tokens

**CRITICAL**: These tokens are derived from the existing `globals.css` design system.
Do NOT invent new colors — use what the app already defines.

```css
/* ─── BACKGROUNDS (from globals.css) ─── */
--bg-primary: #0a0a0a; /* Page background */
--bg-surface: #141414; /* Panel background */
--bg-elevated: #1a1a1a; /* Modals, popovers only */
--surface-hover: rgba(255, 255, 255, 0.03);

/* ─── TEXT (from globals.css - OFF-WHITE, not pure white) ─── */
--text-primary: #e8e8e8; /* Main text */
--text-secondary: #8f8f8f; /* Secondary text */
--text-tertiary: #525252; /* Muted text, labels */

/* ─── BORDERS (from globals.css) ─── */
--border-subtle: rgba(255, 255, 255, 0.05); /* Section dividers */
--border-default: rgba(255, 255, 255, 0.08); /* Panel border */

/* ─── STATUS COLORS (from globals.css) ─── */
--verified: #4ade80; /* Teal-ish green - verification */
--flagged: #fbbf24; /* Warm yellow - warnings */
--failed: #f87171; /* Soft red - errors */

/* ─── BRAND (from globals.css) ─── */
--brand-accent: #6f3bf5; /* Purple accent */

/* ─── VERDICT COLORS (NEW - intelligence-specific) ─── */
--verdict-underpriced: #4ade80; /* Uses --verified green */
--verdict-overpriced: #f87171; /* Uses --failed red */
--verdict-fair: #8f8f8f; /* Uses --text-secondary */
--verdict-uncertain: #fbbf24; /* Uses --flagged yellow */

/* ─── RESOLUTION RISK (NEW - uses existing status colors) ─── */
--risk-low: #4ade80; /* --verified */
--risk-medium: #fbbf24; /* --flagged */
--risk-high: #f87171; /* --failed */
--risk-high-bg: rgba(248, 113, 113, 0.05);

/* ─── TYPOGRAPHY (matches existing app patterns) ─── */
--font-sans: var(--font-geist-sans), system-ui, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

/* Section label (EXACTLY as used in MarketDataPanel.tsx) */
.section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em; /* tracking-widest */
  color: rgba(255, 255, 255, 0.25); /* text-white/25 */
  font-weight: 500; /* font-medium */
}

/* Outcome row text hierarchy (from OutcomesList) */
.outcome-name {
  font-size: 13px;
}
.outcome-name-leading {
  color: #e8e8e8;
  font-weight: 500;
}
.outcome-name-normal {
  color: rgba(255, 255, 255, 0.6);
}
.outcome-percent {
  font-size: 13px;
  font-family: var(--font-mono);
}
.outcome-percent-leading {
  color: #e8e8e8;
}
.outcome-percent-normal {
  color: rgba(255, 255, 255, 0.5);
}

/* ─── SPACING (matches existing patterns) ─── */
--section-gap: 24px; /* mb-6 between sections */
--content-padding: 0; /* Inline with page, not indented */
--row-height: auto; /* Natural height */

/* ─── BORDER RADIUS ─── */
--radius-panel: 0; /* NO border radius - inline with page */
--radius-pill: 9999px; /* Verdict badges */
--radius-button: 8px; /* lg rounded */
```

### Visual Integration with Market Page

Based on the existing `MarketDataPanel.tsx`, the IntelligencePanel should render as a **natural continuation of the page** — NOT as a separate bordered card.

**Current Page Flow:**

```
┌─ MarketDataPanel ──────────────────────────────────────┐
│  POLYMARKET ↗                               SPORTS     │
│  [Icon] Super Bowl Champion 2026                       │
│  $675.1M vol  $917K 24h  $13.6M liq  ⏱ 23d            │
│                                                        │
│  ● Seattle  ● Los Angeles R  ● Buffalo  ● New England  │
│                                                        │
│  📊 PRICE HISTORY                      1D 1W 1M [ALL]  │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Chart]                                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
│  OUTCOMES (8)                                          │
│  ● Seattle        ███████████████████  24%            │
│  ● Los Angeles R  ████████████████     21%            │
│  ● Buffalo        ██████████           14%            │
│  ● New England    █████████            13%            │
│  ▸ 4 more                                              │
│                                                        │
│  ▾ DESCRIPTION                                    ▴    │
│    This is a market on predicting the winner...        │
│                                                        │
│  ▾ RESOLUTION RULES                               ▴    │
│    This market will resolve to "Yes" if...             │
│                                                        │
└────────────────────────────────────────────────────────┘

┌─ IntelligencePanel (NEW - continues same visual flow) ─┐
│                                                        │
│  ⚡ MAXWELL                              23d  ● 82%    │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                        │
│  SEATTLE                              UNDERPRICED      │
│  24%  →  22% – 28% – 34%                               │
│                                                        │
│  Seattle has health advantage the market is...         │
│  ...                                                   │
└────────────────────────────────────────────────────────┘
```

**Key Integration Points:**

| Aspect           | MarketDataPanel Pattern                               | IntelligencePanel Should Match                  |
| ---------------- | ----------------------------------------------------- | ----------------------------------------------- |
| Section labels   | `text-[10px] uppercase tracking-widest text-white/25` | ✓ Same                                          |
| Collapsible rows | ChevronDown rotation, no borders                      | ✓ Same                                          |
| Spacing          | `mb-6` between sections                               | ✓ Same                                          |
| Background       | `bg-[var(--bg-primary)]`                              | ✓ Same (or `--bg-surface` for slight elevation) |
| Dividers         | None visible (whitespace only)                        | Use `rgba(255,255,255,0.05)` if needed          |
| Font sizes       | 13px outcomes, 10px labels                            | ✓ Same                                          |

### Verdict Pill Design

The verdict pill should match the existing button/tag patterns:

```tsx
// VerdictPill component
<span
  className={`
    px-3 py-1 
    rounded-full 
    text-[11px] 
    font-mono 
    uppercase 
    tracking-wider
    ${verdict === "UNDERPRICED" && "bg-[#4ade80]/10 text-[#4ade80]"}
    ${verdict === "OVERPRICED" && "bg-[#f87171]/10 text-[#f87171]"}
    ${verdict === "FAIR" && "bg-white/5 text-[#8f8f8f]"}
    ${verdict === "UNCERTAIN" && "bg-[#fbbf24]/10 text-[#fbbf24]"}
  `}
>
  {verdict}
</span>
```

### Maxwell Range Display

Follow the existing price display patterns (monospace, tabular-nums):

```tsx
// Maxwell range in outcome row style
<div className="flex items-center gap-2 text-[13px] font-mono tabular-nums">
  <span className="text-[#8f8f8f]">24%</span>
  <span className="text-[#525252]">→</span>
  <span className="text-[#8f8f8f]">22%</span>
  <span className="text-[#525252]">–</span>
  <span className="text-[#e8e8e8]">28%</span> {/* mid = brightest */}
  <span className="text-[#525252]">–</span>
  <span className="text-[#8f8f8f]">34%</span>
</div>
```

### Interaction Patterns

| Element            | Hover              | Click                      | Keyboard   |
| ------------------ | ------------------ | -------------------------- | ---------- |
| Panel header       | None               | None                       | None       |
| Disclosure row (▸) | `bg-white/3`       | Expand/collapse inline     | Enter      |
| Outcome row        | `bg-white/3`       | Navigate to outcome detail | Arrow keys |
| Source tag         | Underline          | Open source in new tab     | —          |
| Verdict pill       | Tooltip with range | —                          | —          |
| "View all sources" | `bg-white/5`       | Open sources modal         | Enter      |

### Animation Specifications

```css
/* Disclosure expand/collapse */
.section-content {
  transition: height 200ms ease-out, opacity 150ms ease-out;
}

/* Row hover */
.disclosure-row:hover {
  transition: background-color 100ms ease-out;
}

/* Chevron rotation */
.chevron {
  transition: transform 200ms ease-out;
}
.chevron-expanded {
  transform: rotate(90deg);
}
```

### Responsive Behavior

| Breakpoint          | Behavior                                                                  |
| ------------------- | ------------------------------------------------------------------------- |
| Desktop (≥1024px)   | Full panel width, all sections visible                                    |
| Tablet (768-1023px) | Full width, thesis collapsed by default                                   |
| Mobile (<768px)     | Full width, only Assessment + Outcomes visible, everything else collapsed |

### Loading State

```
╭─────────────────────────────────────────────────────────────────╮
│                                                                 │
│  ⚡ MAXWELL                                         Analyzing...│
│                                                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                 │
│  ████████████████████████  ████████                             │
│  ██████████  ██████████████████                                 │
│                                                                 │
│  ████████████████████████████████████████████                   │
│                                                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                 │
│  ████████████  ████  ████████████  ████████████████████         │
│  ████████████  ████  ████████████  ████████████████████         │
│  ████████████  ████  ████████████  ████████████████████         │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

- Skeleton blocks with subtle pulse animation
- "Analyzing..." text in header metadata area
- No spinners (spinners feel cheap)

### Error State

```
╭─────────────────────────────────────────────────────────────────╮
│                                                                 │
│  ⚡ MAXWELL                                              ⚠      │
│                                                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                 │
│  Analysis failed                                                │
│  Unable to complete research. This may be a temporary issue.    │
│                                                                 │
│  [Retry]                                                        │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

### Component File Structure

```
app/components/maxwell/
├── IntelligencePanel.tsx          # Main container with corner brackets
├── sections/
│   ├── AssessmentSection.tsx      # Verdict, range bar, headline
│   ├── OutcomesSection.tsx        # Outcome list with data bars
│   ├── ThesisSection.tsx          # FOR/AGAINST with strength bars
│   ├── ResolutionRiskSection.tsx  # Risk scanner view
│   └── SourcesSection.tsx         # Source constellation + disclosure
├── primitives/
│   ├── PanelFrame.tsx             # Corner bracket layout
│   ├── MaxwellRangeBar.tsx        # Confidence interval visualization
│   ├── WaveformSignature.tsx      # ▁▂▃▄▅▆▇█ animated signature
│   ├── VerificationChecklist.tsx  # ├─ ✓/✗ tree-style list
│   ├── FactorStrengthBar.tsx      # ████████░░ weighted reasoning
│   ├── RiskGauge.tsx              # ████░ risk meter
│   ├── CatalystTimeline.tsx       # NOW ──●───● RESOLUTION
│   ├── OutcomeDataBar.tsx         # Bar + price + verdict
│   ├── DeltaGlow.tsx              # Edge detection glow effect
│   ├── DisclosureRow.tsx          # ▸/▾ expandable row
│   ├── VerdictPill.tsx            # UNDERPRICED/OVERPRICED/FAIR badge
│   ├── SectionDivider.tsx         # Subtle 1px rule
│   └── SkeletonBlock.tsx          # Loading placeholder
└── modals/
    ├── SourcesModal.tsx           # Full sources list
    ├── RawAnalysisModal.tsx       # Prose output
    └── VerificationModal.tsx      # Claim details
```

### Why This Approach Works

| Problem with Cards                 | Solution with Panel                  |
| ---------------------------------- | ------------------------------------ |
| 5 borders = visual noise           | 1 border (outer only)                |
| Gaps between cards feel fragmented | Flowing sections feel cohesive       |
| Each card needs its own background | Shared surface, typography hierarchy |
| Expand = new card appears          | Expand = inline disclosure           |
| Mobile: cards stack awkwardly      | Mobile: sections collapse elegantly  |
| "Card fatigue" from every SaaS     | Distinctive, Linear-quality feel     |

---

## 10.5 Visual Design Language: Terminal Intelligence

### Philosophy: Command Center, Not Dashboard

Maxwell's UI must communicate:

> "You're inside the machine. You're seeing what the AI sees. This is the raw intelligence feed."

This blends **Linear's restraint** (clean, minimal, typography-driven) with **Tensorlake's terminal aesthetic** (corner brackets, status checklists, data bars). The result: a premium intelligence platform that traders trust.

### The Core Feel

| Consumer Dashboard (Avoid)   | Terminal Intelligence (Target)     |
| ---------------------------- | ---------------------------------- |
| Rounded cards with gradients | Corner brackets framing content    |
| Colorful pie charts          | Monochrome data bars               |
| "82% verified" as text       | `✓ 24 claims verified` checklist   |
| Emoji and icons everywhere   | Geometric, minimal indicators      |
| Bubble fonts                 | Monospace for data, sans for prose |

---

### 1. Panel Frame: Corner Brackets

Instead of a fully-bordered rounded card, use **corner brackets** that say "target acquired":

```
┌─                                                               ─┐

  ⚡ MAXWELL                                       23d   ●  82%

  ───────────────────────────────────────────────────────────────

  SEATTLE                                         UNDERPRICED
  24%  →  22% ─────●───── 34%
                   28%

  "Seattle has health advantage the market is underweighting"

└─                                                               ─┘
```

**Implementation:**

```tsx
<div className="relative">
  {/* Top-left corner */}
  <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-white/20" />
  {/* Top-right corner */}
  <div className="absolute top-0 right-0 w-4 h-4 border-r border-t border-white/20" />
  {/* Bottom-left corner */}
  <div className="absolute bottom-0 left-0 w-4 h-4 border-l border-b border-white/20" />
  {/* Bottom-right corner */}
  <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-white/20" />

  {/* Content */}
  <div className="p-6">{children}</div>
</div>
```

---

### 2. Maxwell Range Bar (THE Killer Feature)

This single visualization shows where Maxwell thinks the probability should be vs where the market is:

```
MAXWELL RANGE
                    MARKET
                      ↓
░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓█▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
           22%       28%        34%
                     ↑
                  MAXWELL
```

**Simplified version for inline use:**

```
     22%──────[███████████]──────34%
              ↑ 28% MAXWELL
         ↑ 24% MARKET
```

**Behavior:**

- **Solid core** (`█`) = Maxwell mid estimate
- **Gradient fade** (`▓`) = Confidence range (low to high)
- **Vertical marker** = Current market price
- **Gap glow** = When market is outside Maxwell range, the gap pulses subtly

**Implementation:**

```tsx
interface RangeBarProps {
  marketPrice: number; // 0.24
  maxwellLow: number; // 0.22
  maxwellMid: number; // 0.28
  maxwellHigh: number; // 0.34
}

// The bar is 100% width, values mapped to percentages
// marketPrice marker is absolutely positioned
// Range is rendered with gradient opacity
```

---

### 3. Maxwell Signature: Waveform + Pulse

The `⚡ MAXWELL` header includes a **waveform signature** that encodes confidence:

```
⚡ MAXWELL ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁                    23d   ●  82%
```

**Behavior:**

- **Fresh analysis (< 1 hour)**: Waveform pulses subtly
- **Stale analysis (> 6 hours)**: Waveform is static, slightly dimmed
- **Higher confidence**: Taller peaks in waveform
- **Lower confidence**: Flatter waveform

**Implementation:**

```tsx
const waveformChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

function generateWaveform(confidence: number): string {
  // Confidence affects peak height
  const peakIndex = Math.floor(confidence * 7);
  const wave = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0]
    .map(i => Math.min(i, peakIndex))
    .map(i => waveformChars[i])
    .join('');
  return wave;
}

// Pulse animation for fresh analysis
.waveform-fresh {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
```

---

### 4. Verification Status Checklist

Instead of "82% verified • 30 sources", show a **terminal-style checklist**:

```
VERIFICATION
├─ ✓  30 sources analyzed
├─ ✓  24 claims verified
├─ ✗  6 claims disputed
└─ ●  82% confidence
```

**Color coding:**

- `✓` = `#4ade80` (verified green)
- `✗` = `#f87171` (failed red)
- `●` = `#e8e8e8` (neutral)

**Implementation:**

```tsx
<div className="font-mono text-[12px] space-y-1">
  <div className="flex items-center gap-2">
    <span className="text-white/30">├─</span>
    <span className="text-[#4ade80]">✓</span>
    <span className="text-white/60">30 sources analyzed</span>
  </div>
  <div className="flex items-center gap-2">
    <span className="text-white/30">├─</span>
    <span className="text-[#4ade80]">✓</span>
    <span className="text-white/60">24 claims verified</span>
  </div>
  <div className="flex items-center gap-2">
    <span className="text-white/30">├─</span>
    <span className="text-[#f87171]">✗</span>
    <span className="text-white/60">6 claims disputed</span>
  </div>
  <div className="flex items-center gap-2">
    <span className="text-white/30">└─</span>
    <span className="text-white/80">●</span>
    <span className="text-white/80">82% confidence</span>
  </div>
</div>
```

---

### 5. Factor Strength Bars

Factors aren't equal. Show **weighted reasoning**:

```
FOR                              AGAINST
████████░░ Healthiest roster     ███░░░░░░░ No SB experience
██████░░░░ Home field NFC        █████░░░░░ AFC battle-tested
████░░░░░░ Best playoff defense  ██░░░░░░░░ Weaker SOS
```

**Bar length = confidence in that factor** (derived from verification score of supporting claims)

**Implementation:**

```tsx
interface Factor {
  text: string;
  confidence: number; // 0-1
  stance: "for" | "against";
}

// Render bar using block characters
function renderBar(confidence: number): string {
  const filled = Math.round(confidence * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}
```

---

### 6. Delta Flash (Edge Detection)

When Maxwell strongly disagrees with the market, **make it visible**:

| Delta                       | Behavior                          |
| --------------------------- | --------------------------------- |
| Market within Maxwell range | No special effect                 |
| UNDERPRICED by 4%+          | Subtle green glow on verdict pill |
| OVERPRICED by 4%+           | Subtle red glow on verdict pill   |
| UNCERTAIN (low confidence)  | Subtle amber pulse                |

**Implementation:**

```tsx
const delta = maxwellMid - marketPrice;
const hasSignificantDelta = Math.abs(delta) >= 0.04;

// Glow classes
const glowClass = hasSignificantDelta
  ? delta > 0
    ? "shadow-[0_0_12px_rgba(74,222,128,0.3)]" // Green glow
    : "shadow-[0_0_12px_rgba(248,113,113,0.3)]" // Red glow
  : "";
```

---

### 7. Resolution Risk Scanner

Show Maxwell "reading" the resolution rules and flagging problems:

```
┌─ RESOLUTION SCAN ──────────────────────────────────────────────┐
│                                                                 │
│  "This market will resolve to 'Yes' if the Buffalo Bills..."   │
│                                                                 │
│  ↓ SCAN COMPLETE                                                │
│                                                                 │
│  ⚠ AMBIGUOUS TERM                                               │
│  └──→ "officially announced" — definition unclear               │
│                                                                 │
│  ⚠ DISPUTE HISTORY                                              │
│  └──→ Similar markets: 23% dispute rate on Polymarket           │
│                                                                 │
│                                              RISK: MEDIUM ████░ │
└─                                                               ─┘
```

**Key elements:**

- Corner brackets (not full border)
- `↓ SCAN COMPLETE` status indicator
- `⚠` warning icons with `└──→` connection lines
- Risk gauge bar at bottom right

---

### 8. Outcome Data Bars

Like the Tensorlake vertical bar chart, but horizontal for outcomes:

```
OUTCOMES (8)
● Seattle      ████████████████████████░░░░░░░░░░  24%  UNDERPRICED
● LA Rams      ████████████████████░░░░░░░░░░░░░░  21%  FAIR
● Buffalo      ████████████░░░░░░░░░░░░░░░░░░░░░░  14%  OVERPRICED
● New England  ███████████░░░░░░░░░░░░░░░░░░░░░░░  13%  FAIR
  ▸ 4 more
```

**The colored dot matches the chart color for that outcome** (visual continuity with price chart above).

---

### 9. Next Catalyst Timeline

Show temporal context for traders:

```
TIMELINE
NOW ──────●───────────────────────●─────────────● RESOLUTION
          ↑                       ↑             ↑
     Divisional              Conference      Super Bowl
       Jan 18                  Jan 26          Feb 9
```

**Implementation:**

- Calculate relative positions based on dates
- `NOW` marker is always at left
- Resolution date is always at right
- Catalysts are positioned proportionally

---

### 10. Source Constellation (Optional Enhancement)

Instead of just a count, show source **quality distribution**:

```
SOURCES (30)
●●●●●●●●●●●●●●●●●●●●●●●●○○○○○○
├── tier 1 ──┤├─ tier 2 ─┤├ tier 3 ┤
```

Where:

- **Tier 1** (`●` bright) = Official sources (NFL.com, ESPN, Reuters)
- **Tier 2** (`●` medium) = Reputable analysis (FiveThirtyEight, Pro Football Reference)
- **Tier 3** (`○` dim) = Secondary sources (blogs, Twitter)

---

### Animation Specifications

```css
/* Waveform pulse for fresh analysis */
@keyframes waveform-pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.waveform-fresh {
  animation: waveform-pulse 2s ease-in-out infinite;
}

/* Delta glow for significant edge */
@keyframes edge-glow {
  0%,
  100% {
    box-shadow: 0 0 8px rgba(74, 222, 128, 0.2);
  }
  50% {
    box-shadow: 0 0 16px rgba(74, 222, 128, 0.4);
  }
}

.edge-detected {
  animation: edge-glow 3s ease-in-out infinite;
}

/* Corner bracket hover */
.panel-frame:hover .corner {
  border-color: rgba(255, 255, 255, 0.4);
  transition: border-color 200ms ease-out;
}
```

---

### Typography Rules

| Element         | Font | Size | Color            | Notes                      |
| --------------- | ---- | ---- | ---------------- | -------------------------- |
| Section labels  | Sans | 10px | `text-white/25`  | Uppercase, tracking-widest |
| Data values     | Mono | 13px | `text-[#e8e8e8]` | Tabular-nums               |
| Waveform        | Mono | 12px | `text-white/60`  | Block characters           |
| Checklist lines | Mono | 12px | `text-white/30`  | `├─`, `└─` characters      |
| Status symbols  | Mono | 12px | Status colors    | `✓`, `✗`, `●`, `⚠`         |
| Bar characters  | Mono | 12px | Varies           | `█`, `▓`, `░`              |
| Prose text      | Sans | 14px | `text-white/70`  | Headlines, descriptions    |

---

### What This Achieves

| Before (Text-on-Text) | After (Terminal Intelligence)           |
| --------------------- | --------------------------------------- |
| "82% verified"        | `├─ ✓ 24 claims verified`               |
| "22% – 28% – 34%"     | Visual range bar with market marker     |
| "UNDERPRICED"         | Verdict pill with delta glow            |
| "Healthiest roster"   | Factor with confidence bar `████████░░` |
| "MEDIUM risk"         | Risk scanner with gauge `████░`         |
| "Jan 18"              | Timeline: `NOW ──●───────● RESOLUTION`  |
| ⚡ MAXWELL            | `⚡ MAXWELL ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁` with pulse |

**The user doesn't just read intelligence. They FEEL it.**

---

## 11. Implementation Plan

### Phase 1: Types & Infrastructure (Day 1)

| Task                                   | File                           | Effort |
| -------------------------------------- | ------------------------------ | ------ |
| Define `MarketContext` interface       | `types.ts`                     | S      |
| Define `MaxwellIntelligence` interface | `types.ts`                     | M      |
| Define `ResolutionRisk` interface      | `types.ts`                     | S      |
| Create presenter route scaffold        | `api/maxwell/present/route.ts` | S      |

### Phase 2: Decomposition Updates (Day 2)

| Task                                       | File            | Effort |
| ------------------------------------------ | --------------- | ------ |
| Add prediction market decomposition prompt | `prompts.ts`    | M      |
| Update decomposer to accept MarketContext  | `decomposer.ts` | M      |
| Implement top-N outcome selection logic    | `decomposer.ts` | S      |
| Add outcome-specific query generation      | `decomposer.ts` | M      |

### Phase 3: Synthesis Updates (Day 3)

| Task                                     | File             | Effort |
| ---------------------------------------- | ---------------- | ------ |
| Add structured synthesis prompt          | `prompts.ts`     | M      |
| Update synthesizer to use market context | `synthesizer.ts` | S      |
| Add multi-outcome synthesis logic        | `synthesizer.ts` | M      |

### Phase 4: Resolution Risk Scoring (Day 4)

| Task                                       | File          | Effort |
| ------------------------------------------ | ------------- | ------ |
| Add resolution risk prompt                 | `prompts.ts`  | M      |
| Create `resolutionAnalyzer.ts`             | New file      | M      |
| Integrate with verification phase          | `verifier.ts` | M      |
| Add resolution risk to verification output | `types.ts`    | S      |

### Phase 5: Presenter Implementation (Day 5)

| Task                           | File                           | Effort |
| ------------------------------ | ------------------------------ | ------ |
| Add presenter prompts          | `prompts.ts`                   | M      |
| Create `presenter.ts` module   | New file                       | M      |
| Implement present API route    | `api/maxwell/present/route.ts` | M      |
| Add presenter to pipeline flow | `use-maxwell.ts`               | M      |

### Phase 6: Hook Updates (Day 6)

| Task                                          | File             | Effort |
| --------------------------------------------- | ---------------- | ------ |
| Update hook to accept MarketContext           | `use-maxwell.ts` | M      |
| Add presenter phase to pipeline               | `use-maxwell.ts` | M      |
| Replace answer/adjudication with intelligence | `use-maxwell.ts` | M      |
| Update caching to use intelligence            | `use-maxwell.ts` | S      |

### Phase 7: UI Implementation (Days 7-9)

**7a. Core Structure (Day 7)**

| Task                                                | File          | Effort |
| --------------------------------------------------- | ------------- | ------ |
| Create `IntelligencePanel.tsx` with corner brackets | New file      | M      |
| Create `PanelFrame.tsx` (corner bracket layout)     | `primitives/` | S      |
| Create `AssessmentSection.tsx`                      | `sections/`   | M      |
| Create `OutcomesSection.tsx`                        | `sections/`   | M      |
| Create `ThesisSection.tsx`                          | `sections/`   | M      |
| Create `ResolutionRiskSection.tsx`                  | `sections/`   | S      |
| Create `SourcesSection.tsx`                         | `sections/`   | S      |

**7b. Terminal Intelligence Primitives (Day 8)**

| Task                                                   | File          | Effort |
| ------------------------------------------------------ | ------------- | ------ |
| Create `MaxwellRangeBar.tsx` (confidence interval viz) | `primitives/` | L      |
| Create `WaveformSignature.tsx` (animated waveform)     | `primitives/` | M      |
| Create `VerificationChecklist.tsx` (tree-style list)   | `primitives/` | M      |
| Create `FactorStrengthBar.tsx` (weighted reasoning)    | `primitives/` | S      |
| Create `RiskGauge.tsx` (risk meter visualization)      | `primitives/` | S      |
| Create `CatalystTimeline.tsx` (temporal context)       | `primitives/` | M      |
| Create `OutcomeDataBar.tsx` (bar + verdict)            | `primitives/` | S      |
| Create `DeltaGlow.tsx` (edge detection effect)         | `primitives/` | S      |

**7c. Existing Primitives (Day 8 continued)**

| Task                                 | File          | Effort |
| ------------------------------------ | ------------- | ------ |
| Create `DisclosureRow.tsx` primitive | `primitives/` | S      |
| Create `VerdictPill.tsx` primitive   | `primitives/` | S      |
| Create `SourcesModal.tsx`            | `modals/`     | M      |
| Create `RawAnalysisModal.tsx`        | `modals/`     | M      |
| Create `VerificationModal.tsx`       | `modals/`     | M      |

### Phase 8: Integration & Cleanup (Day 10)

| Task                                               | File                    | Effort |
| -------------------------------------------------- | ----------------------- | ------ |
| Update `MaxwellDashboard` to use IntelligencePanel | `MaxwellDashboard.tsx`  | M      |
| Delete old cards (VerdictCard, AnalysisCard, etc.) | Multiple                | S      |
| Update market page to pass MarketContext           | `markets/[id]/page.tsx` | M      |
| Test full pipeline end-to-end                      | —                       | L      |

### Phase 9: Polish & Testing (Day 11)

| Task                             | File                    | Effort |
| -------------------------------- | ----------------------- | ------ |
| Waveform pulse animation         | `WaveformSignature.tsx` | S      |
| Delta glow animation             | `DeltaGlow.tsx`         | S      |
| Corner bracket hover effects     | `PanelFrame.tsx`        | S      |
| Loading states (skeleton blocks) | `IntelligencePanel.tsx` | S      |
| Error states                     | `IntelligencePanel.tsx` | S      |
| Edge case handling               | Multiple                | M      |
| Build verification               | —                       | S      |

---

## 12. Success Metrics

### Quantitative

| Metric                      | Target                               | Measurement             |
| --------------------------- | ------------------------------------ | ----------------------- |
| Time to insight             | < 60 seconds                         | Pipeline duration       |
| UI information density      | 70% reduction in vertical space      | Before/after comparison |
| Verification score accuracy | > 80% correlation with disputes      | Historical validation   |
| Resolution risk prediction  | > 60% accuracy on dispute prediction | Track disputed markets  |

### Qualitative

| Metric                | Target                               | Measurement                |
| --------------------- | ------------------------------------ | -------------------------- |
| Trader satisfaction   | "This is exactly what I needed"      | User interviews            |
| Information hierarchy | Traders find key info immediately    | User testing               |
| Trust signals         | Traders reference verification score | Usage analytics            |
| Premium perception    | "Worth paying for"                   | Willingness to pay surveys |

### Anti-Metrics (What NOT to Optimize)

| Anti-Metric             | Reason                            |
| ----------------------- | --------------------------------- |
| Recommendation accuracy | We don't make recommendations     |
| Bet volume driven       | We're intelligence, not a casino  |
| Time spent in app       | Traders should get info and leave |

---

## 13. Appendix: Research Findings

### A. Trader Pain Points (Ranked)

1. **Resolution disputes** — UMA whales, ambiguous rules
2. **Information asymmetry** — Professionals have better/faster data
3. **Data fragmentation** — "Tab nightmare" across platforms
4. **Whale context** — See trades but not WHY
5. **Multi-outcome complexity** — Math is hard

### B. Trader Quotes

> "Markets are not resolved by what happens in the real world but by UMA whales."

> "Prediction markets are slow-motion poker hands where you can out-research your opponents."

> "If the market is 60 and you're 50 confident, walk away—unless you have reason to believe the market is wrong."

> "First to know equals edge."

### C. Existing Tool Landscape

| Tool       | Purpose         | Gap Maxwell Fills     |
| ---------- | --------------- | --------------------- |
| PolyTrack  | Whale tracking  | No context on WHY     |
| Polysights | Analytics       | No verification       |
| Propheseer | API aggregation | No intelligence layer |
| FourKast   | Institutional   | No resolution risk    |

### D. Pricing Research

Traders mentioned willingness to pay $200/month for:

- Real-time arbitrage detection
- Institutional-grade cross-platform data
- AI agents for automated research
- High-rate-limit API access
- Priority resolution support

---

## Revision History

| Version | Date         | Author       | Changes     |
| ------- | ------------ | ------------ | ----------- |
| 1.0     | January 2026 | Maxwell Team | Initial PRD |

---

_End of Document_
