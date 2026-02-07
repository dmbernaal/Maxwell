# Product Requirements Document: Agentic MarketChat System

**Project:** Maxwell V2 - ZapMarket  
**Feature:** Agentic MarketChat (Market Expert Agent)  
**Status:** Draft for Review  
**Date:** February 2026  
**Author:** AI Assistant + Product Team  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [User Stories & Use Cases](#3-user-stories--use-cases)
4. [System Architecture](#4-system-architecture)
5. [Technical Specifications](#5-technical-specifications)
6. [API Specifications](#6-api-specifications)
7. [Data Models](#7-data-models)
8. [System Prompts & Persona](#8-system-prompts--persona)
9. [Tool Definitions](#9-tool-definitions)
10. [UI/UX Specifications](#10-uiux-specifications)
11. [Implementation Phases](#11-implementation-phases)
12. [Testing Strategy](#12-testing-strategy)
13. [Success Metrics](#13-success-metrics)
14. [Open Questions](#14-open-questions)

---

## 1. Executive Summary

### 1.1 Overview

The Agentic MarketChat system transforms the current placeholder MarketChat component into a sophisticated **Market Expert Agent** that serves as an intelligent conversational interface for prediction market analysis. This agent combines deep market context, Maxwell intelligence reports, real-time search capabilities, and persistent conversation memory to provide users with expert-level insights and analysis.

### 1.2 Key Value Propositions

| Current State | Future State |
|--------------|--------------|
| Placeholder chat that returns generic messages | True agent with reasoning, tool use, and memory |
| No access to Maxwell intelligence | Deep integration with Maxwell reports |
| No search capabilities | Parallel Tavily search when needed |
| Stateless conversations | Persistent chat history per market |
| Generic responses | Expert-level market analysis |

### 1.3 Success Criteria

- **Response Quality:** 90% of user queries answered with relevant, accurate information
- **Tool Usage:** Appropriate tool selection (search vs direct answer) in 95% of cases
- **User Engagement:** 40% of market detail page users interact with MarketChat
- **Conversation Depth:** Average 4+ messages per conversation
- **Performance:** Sub-3-second response time for direct answers, sub-10-second for search-based answers

---

## 2. Problem Statement

### 2.1 Current Pain Points

1. **Information Gap:** Users viewing a market have questions that aren't answered by the static UI
2. **Maxwell Report Limitations:** The full Maxwell analysis takes 30-45 seconds and is run once - users can't ask follow-up questions
3. **No Real-Time Updates:** Markets change quickly; the Maxwell report is a snapshot in time
4. **Context Switching:** Users must leave the app to search for latest news, breaking flow
5. **Memory Loss:** Each visit to a market starts fresh - no continuity in user exploration

### 2.2 User Scenarios

**Scenario A: The Active Trader**
> "I'm looking at the Harris election market. The Maxwell report says it's UNDERPRICED, but that was yesterday. Has anything changed in the last 24 hours? I need to know before I place my bet."

**Scenario B: The Researcher**
> "I'm analyzing multiple markets. I asked about the Fed rates market yesterday, but now I have follow-up questions about how it relates to the inflation market. I wish the system remembered our previous conversation."

**Scenario C: The New User**
> "I don't understand how this market resolves. The description is technical. I want to ask simple questions without triggering a full AI analysis that takes 30 seconds."

---

## 3. User Stories & Use Cases

### 3.1 Primary User Stories

#### US-001: Quick Market Questions
**As a** user viewing a market  
**I want to** ask simple questions about the market description, rules, or resolution criteria  
**So that** I can understand the market without reading long technical descriptions  

**Acceptance Criteria:**
- [ ] Agent can answer "What are the resolution criteria?" from market context
- [ ] Agent can explain market type (binary vs multi-option) in simple terms
- [ ] Agent can clarify ambiguous resolution scenarios
- [ ] Response time < 2 seconds

#### US-002: Maxwell Report Follow-Up
**As a** user who has run Maxwell analysis  
**I want to** ask follow-up questions about specific parts of the report  
**So that** I can dig deeper into the analysis without re-running the full pipeline  

**Acceptance Criteria:**
- [ ] Agent has access to full MaxwellIntelligence object
- [ ] Agent can cite specific outcomes and their verdicts
- [ ] Agent can explain the thesis in simpler terms
- [ ] Agent can compare Maxwell estimates to market prices

#### US-003: Real-Time News Updates
**As a** an active trader  
**I want to** ask about latest developments affecting the market  
**So that** I can make informed decisions based on current events  

**Acceptance Criteria:**
- [ ] Agent can trigger parallel Tavily searches for breaking news
- [ ] Agent shows "searching..." indicator while gathering data
- [ ] Agent synthesizes search results with existing context
- [ ] Agent cites sources for news claims

#### US-004: Cross-Market Analysis
**As a** researcher analyzing multiple markets  
**I want to** compare this market to others I've viewed  
**So that** I can identify patterns and correlations  

**Acceptance Criteria:**
- [ ] Agent remembers previous market conversations (within session)
- [ ] Agent can reference other markets user has asked about
- [ ] Agent can identify correlations between markets

#### US-005: Conversation Continuity
**As a** returning user  
**I want to** continue previous conversations when I return to a market  
**So that** I don't have to repeat context or re-ask questions  

**Acceptance Criteria:**
- [ ] Chat history persists in IndexedDB
- [ ] Previous conversations load when revisiting market
- [ ] Agent references previous Q&A in new responses
- [ ] User can clear history if desired

### 3.2 Use Case Matrix

| Use Case | Input | Agent Action | Output | Tools Used |
|----------|-------|--------------|--------|------------|
| **Quick Fact** | "When does this close?" | Retrieve from market context | "This market closes on March 15, 2025 at 2:00 PM ET" | None (direct answer) |
| **Maxwell Clarification** | "Why is Harris underpriced?" | Retrieve from Maxwell report | "Maxwell estimates 52-58% vs market 48% because..." | None (direct answer) |
| **Breaking News** | "Any news today?" | Execute 3 parallel searches | "Latest Quinnipiac poll shows... [sources]" | search_web |
| **Deep Research** | "What are experts saying?" | Decompose into sub-queries, search, synthesize | Comprehensive analysis with multiple sources | search_web |
| **Calculation** | "What's the implied probability?" | Extract numbers, calculate | "The implied probability is 73.2% because..." | analyze_data |
| **Comparison** | "How does this compare to 2020?" | Search historical data, compare | "In 2020, similar markets traded at..." | search_web + analyze_data |

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         MarketChat Component                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Input      │  │  Chat Thread  │  │  Tool Status │              │   │
│  │  │   Interface  │  │  (Messages)   │  │  Indicator   │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Agent Orchestrator (Hook)                       │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Context    │  │   Intent     │  │   Tool       │              │   │
│  │  │   Assembler  │  │   Classifier │  │   Router     │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Memory     │  │   Stream     │  │   State      │              │   │
│  │  │   Manager    │  │   Handler    │  │   Manager    │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               API LAYER                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ /api/market-chat │  │ /api/market-chat │  │ /api/market-chat │          │
│  │    /query        │  │    /search       │  │    /analyze      │          │
│  │                  │  │                  │  │                  │          │
│  │ Simple Q&A       │  │ Parallel Tavily  │  │ Deep analysis    │          │
│  │ with context     │  │ search           │  │ with search      │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │    Tavily    │  │  OpenRouter  │  │   Vercel     │                      │
│  │    Search    │  │   (LLMs)     │  │    Blob      │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Responsibilities

#### 4.2.1 Client Layer

**MarketChat Component:**
- Render chat interface with message thread
- Handle user input and submit queries
- Display tool status indicators (searching, analyzing, etc.)
- Show streaming responses
- Manage scroll and auto-scroll behavior

**Agent Orchestrator (useMarketChatAgent Hook):**
- Assemble context from multiple sources (market, Maxwell, history)
- Classify user intent (direct answer vs search vs analyze)
- Route to appropriate API endpoint
- Manage conversation memory (load/save from IndexedDB)
- Handle streaming responses
- Maintain agent state (thinking, searching, responding)

#### 4.2.2 API Layer

**`/api/market-chat/query`:**
- Handle simple Q&A using existing context
- No external search calls
- Fast response (< 2 seconds)
- Uses Gemini Flash or similar fast model

**`/api/market-chat/search`:**
- Handle queries requiring current information
- Decompose query into sub-queries (2-4 parallel searches)
- Execute parallel Tavily searches
- Aggregate and deduplicate results
- Synthesize response with citations
- Stream progress updates

**`/api/market-chat/analyze`:**
- Handle calculation and analysis queries
- Extract relevant data from context
- Perform calculations (probabilities, comparisons)
- Return structured analysis with reasoning

#### 4.2.3 External Services

**Tavily Search:**
- Primary search provider
- Parallel search execution
- Configurable depth (basic/advanced)
- Time-range filtering
- Domain filtering

**OpenRouter:**
- LLM provider (Gemini Flash, Claude Sonnet)
- Structured output support
- Streaming support

**Vercel Blob (Optional):**
- Store large search results if needed
- Cache frequently accessed data

### 4.3 Data Flow

```
User Query
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. INTENT CLASSIFICATION               │
│    • Analyze query semantics            │
│    • Check for search triggers          │
│    • Determine required tools             │
└─────────────────────────────────────────┘
    │
    ├─► Direct Answer Path ───────────────────┐
    │                                          │
    ▼                                          │
┌─────────────────────────────────────────┐   │
│ 2a. CONTEXT ASSEMBLY                     │   │
│    • Market data                         │   │
│    • Maxwell report (if available)       │   │
│    • Chat history (last 10 messages)     │   │
│    • System prompt                       │   │
└─────────────────────────────────────────┘   │
    │                                          │
    ▼                                          │
┌─────────────────────────────────────────┐   │
│ 3a. LLM CALL (/api/market-chat/query)    │   │
│    • Model: Gemini Flash                 │   │
│    • Streaming: Yes                      │   │
│    • Temperature: 0.3                    │   │
└─────────────────────────────────────────┘   │
    │                                          │
    └──────────────────────────────────────────┘
    │
    ├─► Search Required Path ─────────────────┐
    │                                          │
    ▼                                          │
┌─────────────────────────────────────────┐   │
│ 2b. QUERY DECOMPOSITION                  │   │
│    • Break into 2-4 sub-queries          │   │
│    • Assign search parameters            │   │
│    • Determine depth and time range      │   │
└─────────────────────────────────────────┘   │
    │                                          │
    ▼                                          │
┌─────────────────────────────────────────┐   │
│ 3b. PARALLEL SEARCH                      │   │
│    • Execute Tavily searches             │   │
│    • Deduplicate by URL                  │   │
│    • Score and rank results              │   │
└─────────────────────────────────────────┘   │
    │                                          │
    ▼                                          │
┌─────────────────────────────────────────┐   │
│ 4b. SYNTHESIS (/api/market-chat/search) │   │
│    • Combine search results              │   │
│    • Integrate with Maxwell context      │   │
│    • Generate response with citations    │   │
│    • Stream progress                     │   │
└─────────────────────────────────────────┘   │
    │                                          │
    └──────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 5. RESPONSE STREAMING                    │
│    • Stream chunks to UI                 │
│    • Show tool call indicators           │
│    • Render markdown                     │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 6. PERSISTENCE                           │
│    • Save message to chat history        │
│    • Update IndexedDB                    │
│    • Update Zustand store               │
└─────────────────────────────────────────┘
```

---

## 5. Technical Specifications

### 5.1 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 16 (App Router) | Full-stack React framework |
| **Language** | TypeScript 5.0 | Type safety |
| **State Management** | Zustand + IndexedDB | Global state + persistence |
| **Streaming** | Vercel AI SDK 5.0 | SSE streaming support |
| **Search** | Tavily API | Web search |
| **LLM** | OpenRouter | Gemini Flash, Claude Sonnet |
| **Styling** | Tailwind CSS 4 | UI styling |
| **Animation** | Framer Motion | UI transitions |

### 5.2 File Structure

```
app/
├── api/
│   └── market-chat/
│       ├── query/
│       │   └── route.ts          # Simple Q&A endpoint
│       ├── search/
│       │   └── route.ts          # Search + synthesis endpoint
│       └── analyze/
│           └── route.ts          # Analysis endpoint
├── components/
│   └── maxwell/
│       ├── MarketChat.tsx        # Main chat component
│       ├── AgentInput.tsx        # Input with tool indicators
│       ├── AgentMessage.tsx      # Message with citations
│       ├── ToolStatus.tsx        # Search/analysis indicators
│       └── ChatHistory.tsx       # Message thread
├── hooks/
│   └── use-market-chat-agent.ts  # Agent orchestrator
├── lib/
│   └── market-chat/
│       ├── types.ts              # Type definitions
│       ├── context-assembler.ts  # Build agent context
│       ├── intent-classifier.ts  # Query classification
│       ├── query-decomposer.ts   # Break into sub-queries
│       ├── search-executor.ts    # Tavily search wrapper
│       ├── memory-manager.ts     # Chat history management
│       └── prompts.ts            # System prompts
├── types/
│   └── market-chat.ts            # Shared types
└── prd/
    └── agentic-market-chat.md    # This document
```

### 5.3 Performance Requirements

| Metric | Target | Maximum |
|--------|--------|---------|
| **Direct Answer** | < 2 seconds | 3 seconds |
| **Search Query** | < 8 seconds | 15 seconds |
| **Analysis Query** | < 5 seconds | 10 seconds |
| **Time to First Token** | < 500ms | 1 second |
| **Memory Usage** | < 50MB | 100MB |
| **IndexedDB Size** | < 10MB per user | 50MB |

### 5.4 Scalability Considerations

- **Rate Limiting:** Respect Tavily rate limits (implement exponential backoff)
- **Concurrent Searches:** Maximum 4 parallel Tavily searches
- **Context Window:** Limit chat history to last 20 messages (summarize older)
- **Caching:** Cache search results for 5 minutes for identical queries
- **Blob Storage:** Use Vercel Blob for large search results (> 100KB)

---

## 6. API Specifications

### 6.1 Endpoint: `/api/market-chat/query`

**Method:** POST  
**Purpose:** Simple Q&A using existing context (no external search)

**Request Body:**
```typescript
interface QueryRequest {
  marketId: string;                    // "poly:event:30829"
  query: string;                       // User's question
  chatHistory: Array<{
    role: 'user' | 'agent';
    content: string;
  }>;
  maxwellReport?: MaxwellIntelligence; // If analysis exists
  market: UnifiedMarket;               // Full market data
}
```

**Response:** Server-Sent Events (SSE)
```
event: response-chunk
data: {"content": "According to the market description..."}

event: response-chunk
data: {"content": " this market resolves based on..."}

event: complete
data: {"durationMs": 1200}
```

**Error Response:**
```json
{
  "error": "Failed to generate response",
  "code": "GENERATION_ERROR",
  "details": "..."
}
```

**Implementation Notes:**
- Uses Gemini Flash for speed
- Temperature: 0.3 (factual)
- Max tokens: 800
- No external API calls

---

### 6.2 Endpoint: `/api/market-chat/search`

**Method:** POST  
**Purpose:** Deep research with parallel Tavily searches

**Request Body:**
```typescript
interface SearchRequest {
  marketId: string;
  query: string;
  chatHistory: Array<{
    role: 'user' | 'agent';
    content: string;
  }>;
  maxwellReport?: MaxwellIntelligence;
  market: UnifiedMarket;
  searchConfig?: {
    depth: 'basic' | 'advanced';
    maxResults: number;              // Default: 5
    timeRange?: 'day' | 'week' | 'month';
  };
}
```

**Response:** Server-Sent Events (SSE)
```
event: tool-start
data: {"tool": "search_web", "subQueries": 3, "estimatedTime": "6-8 seconds"}

event: search-progress
data: {"completed": 1, "total": 3, "query": "Harris polling latest", "results": 5}

event: search-progress
data: {"completed": 2, "total": 3, "query": "Trump approval rating", "results": 5}

event: search-complete
data: {"sources": 12, "deduplicated": 8, "topDomains": ["cnn.com", "polls.com"]}

event: synthesis-start
data: {"sources": 8}

event: response-chunk
data: {"content": "Based on the latest polling data..."}

event: response-chunk
data: {"content": " [1] shows Harris leading by 3 points..."}

event: complete
data: {"durationMs": 7200, "sourcesUsed": 4}
```

**Implementation Notes:**
- Decomposes query into 2-4 sub-queries
- Executes parallel Tavily searches
- Deduplicates by URL
- Ranks by relevance score
- Synthesizes with citations
- Uses Claude Sonnet for complex synthesis

---

### 6.3 Endpoint: `/api/market-chat/analyze`

**Method:** POST  
**Purpose:** Calculations and analysis

**Request Body:**
```typescript
interface AnalyzeRequest {
  marketId: string;
  query: string;
  analysisType: 'probability' | 'comparison' | 'scenario' | 'trend';
  chatHistory: Array<{
    role: 'user' | 'agent';
    content: string;
  }>;
  maxwellReport?: MaxwellIntelligence;
  market: UnifiedMarket;
}
```

**Response:** Server-Sent Events (SSE)
```
event: analysis-start
data: {"type": "probability", "dataPoints": 3}

event: response-chunk
data: {"content": "The implied probability is calculated as..."}

event: response-chunk
data: {"content": " 73.2% based on current market pricing."}

event: complete
data: {"durationMs": 2100, "calculation": "0.52 / 0.71 = 0.732"}
```

**Implementation Notes:**
- Extracts numerical data from context
- Performs deterministic calculations
- Uses LLM for explanation generation
- Returns both result and reasoning

---

## 7. Data Models

### 7.1 Core Types

```typescript
// app/lib/market-chat/types.ts

/**
 * Agent conversation message
 */
export interface AgentMessage {
  id: string;                          // UUID
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  metadata?: {
    toolsUsed?: string[];              // ['search_web', 'analyze_data']
    sources?: AgentSource[];           // Citations
    durationMs?: number;               // Response time
    model?: string;                    // 'gemini-flash' | 'claude-sonnet'
  };
}

/**
 * Source citation from search
 */
export interface AgentSource {
  id: string;                          // s1, s2, etc.
  title: string;
  url: string;
  snippet: string;
  score?: number;                      // Tavily relevance score
  publishedDate?: string;
}

/**
 * Agent context for system prompt
 */
export interface AgentContext {
  market: {
    id: string;
    title: string;
    description: string;
    marketType: 'binary' | 'matchup' | 'multi-option';
    outcomes: Array<{
      name: string;
      price: number;
    }>;
    endDate: string;
    volume: number;
    platform: 'polymarket' | 'kalshi';
    rules?: string;
    resolutionSource?: string;
  };
  maxwellReport?: {
    verdict: 'UNDERPRICED' | 'OVERPRICED' | 'FAIR' | 'UNCERTAIN';
    confidence: 'high' | 'medium' | 'low';
    thesis: string;
    outcomes: Array<{
      name: string;
      marketPrice: number;
      maxwellRange: {
        low: number;
        mid: number;
        high: number;
      };
      view: string;
    }>;
    keySources: Array<{
      title: string;
      url: string;
    }>;
    resolutionRisks: string[];
  };
  chatHistory: AgentMessage[];
  tools: Array<{
    name: string;
    description: string;
    whenToUse: string;
  }>;
}

/**
 * Intent classification result
 */
export interface IntentClassification {
  type: 'direct_answer' | 'search_required' | 'analysis_required';
  confidence: number;                    // 0.0 - 1.0
  reasoning: string;
  suggestedTools?: string[];
  urgency: 'low' | 'medium' | 'high';
}

/**
 * Sub-query for parallel search
 */
export interface SubQuery {
  id: string;                          // q1, q2, etc.
  query: string;
  purpose: string;                     // Why this query
  topic: 'general' | 'news';
  depth: 'basic' | 'advanced';
  days: number | null;                 // Time range
  domains: string[] | null;            // Domain restrictions
}

/**
 * Chat session stored in IndexedDB
 */
export interface ChatSession {
  id: string;                          // marketId
  marketId: string;
  messages: AgentMessage[];
  lastUpdated: number;
  messageCount: number;
  summary?: string;                    // Auto-generated summary
}
```

### 7.2 State Management

```typescript
// Zustand Store Extension

interface MarketChatState {
  // Current conversation
  messages: AgentMessage[];
  isLoading: boolean;
  currentTool: string | null;
  toolProgress?: {
    current: number;
    total: number;
    status: string;
  };
  
  // History management
  loadChat: (marketId: string) => Promise<void>;
  saveMessage: (marketId: string, message: AgentMessage) => Promise<void>;
  clearChat: (marketId: string) => Promise<void>;
  
  // Agent actions
  sendQuery: (marketId: string, query: string) => Promise<void>;
}
```

---

## 8. System Prompts & Persona

### 8.1 Base System Prompt Template

```markdown
# ROLE: Market Expert Agent

You are an expert prediction market analyst with deep expertise in:
- Political forecasting and polling analysis
- Financial markets and derivatives pricing
- Sports analytics and probability modeling
- Current events and geopolitical risk assessment
- Prediction market mechanics and resolution criteria

Your communication style is:
- **Expert-level:** Speak with authority and precision
- **Concise:** Traders want quick insights, not essays
- **Evidence-based:** Cite sources, show your reasoning
- **Actionable:** Help users make informed trading decisions
- **Humble:** Acknowledge uncertainty when appropriate

## CURRENT MARKET CONTEXT

**Market ID:** {{market.id}}
**Title:** {{market.title}}
**Type:** {{market.marketType}}
**Platform:** {{market.platform}}
**Volume:** ${{market.volume}}
**Closes:** {{market.endDate}}

**Description:**
{{market.description}}

**Current Odds:**
{{#each market.outcomes}}
- {{name}}: {{price}}%
{{/each}}

**Resolution Criteria:**
{{market.rules}}

{{#if maxwellReport}}
## MAXWELL INTELLIGENCE REPORT

**Overall Verdict:** {{maxwellReport.verdict}} ({{maxwellReport.confidence}} confidence)

**Investment Thesis:**
{{maxwellReport.thesis}}

**Outcome Analysis:**
{{#each maxwellReport.outcomes}}
- {{name}}: Market {{marketPrice}}% → Maxwell {{maxwellRange.low}}-{{maxwellRange.high}}% ({{view}})
{{/each}}

**Key Sources:**
{{#each maxwellReport.keySources}}
- [{{title}}]({{url}})
{{/each}}

**Resolution Risks:**
{{#each maxwellReport.resolutionRisks}}
- {{this}}
{{/each}}
{{/if}}

## CONVERSATION HISTORY

{{#each chatHistory}}
{{role}}: {{content}}
{{/each}}

## AVAILABLE TOOLS

You have access to these tools. Use them wisely:

1. **search_web** - Search the web for current information
   - Use when: User asks about recent news, breaking developments, or facts not in context
   - Don't use when: Answer is in market description or Maxwell report
   - Parameters: query (string), depth ('basic' | 'advanced'), days (number | null)

2. **analyze_data** - Perform calculations and analysis
   - Use when: User asks for probability calculations, comparisons, or scenarios
   - Don't use when: Simple factual lookup
   - Parameters: analysisType, data, question

3. **answer_directly** - Answer from existing context
   - Use when: Answer is in market description, Maxwell report, or general knowledge
   - Don't use when: Current information is needed

## RESPONSE GUIDELINES

1. **Start with the answer.** Don't say "Let me think..." or "Here's what I found..."
2. **Cite your sources.** When using Maxwell data, say "According to the Maxwell analysis..."
3. **Show your work.** For calculations, show the math: "52% / 71% = 73.2%"
4. **Be specific.** "Harris leads by 3 points" not "Harris is ahead"
5. **Acknowledge limits.** "I don't have polling data from the last 24 hours" not making it up
6. **No filler.** Remove "I think", "It seems", "Based on my analysis"
7. **Use markdown.** Bold key numbers, bullet lists for multiple points

## DECISION PROTOCOL

Before responding, ask yourself:

1. Is the answer in the market description? → Answer directly
2. Is the answer in the Maxwell report? → Cite Maxwell analysis
3. Do I need current information? → Use search_web
4. Do I need to calculate something? → Use analyze_data

Choose the simplest path that answers the user's question accurately.
```

### 8.2 Tool-Specific Prompts

#### 8.2.1 Query Decomposition Prompt

```markdown
# Query Decomposition Task

Break the user's query into focused sub-queries for parallel web search.

**User Query:** {{query}}
**Market Context:** {{market.title}} - {{market.description}}

**Instructions:**
1. Create 2-4 sub-queries that cover different angles of the question
2. Each sub-query should be specific and searchable
3. Assign appropriate search parameters:
   - topic: 'news' for breaking events, 'general' for background
   - depth: 'advanced' for detailed info, 'basic' for quick facts
   - days: number for recency (1=last 24h, 7=last week, null=all time)

**Output Format:**
```json
{
  "reasoning": "Why these sub-queries cover the user's question",
  "subQueries": [
    {
      "id": "q1",
      "query": "specific search query",
      "purpose": "what this query will find",
      "topic": "news" | "general",
      "depth": "basic" | "advanced",
      "days": number | null,
      "domains": ["example.com"] | null
    }
  ]
}
```

**Example:**
User: "What's the latest on Harris polling?"
Sub-queries:
1. "Harris polling data November 2025" (topic: news, days: 7, depth: advanced)
2. "Harris approval rating current" (topic: news, days: 3, depth: basic)
3. "Harris vs Trump swing state polls" (topic: news, days: 7, depth: advanced)
```

#### 8.2.2 Search Synthesis Prompt

```markdown
# Search Synthesis Task

Synthesize search results into a concise, expert-level response.

**User Query:** {{query}}
**Market Context:** {{market.title}}
**Search Results:**
{{#each sources}}
[{{id}}] {{title}} - {{snippet}}
URL: {{url}}
{{/each}}

**Instructions:**
1. Extract key facts from search results
2. Synthesize into a coherent answer
3. Cite sources using [1], [2], etc.
4. Integrate with Maxwell context if relevant
5. Keep it concise (2-4 paragraphs max)
6. Lead with the most important finding

**Response Format:**
- Start directly with the answer
- Use citations: "According to recent polling [1][2], Harris leads..."
- Bullet points for multiple findings
- Bold key numbers and percentages
```

---

## 9. Tool Definitions

### 9.1 Tool: `search_web`

**Purpose:** Execute parallel web searches for current information

**Parameters:**
```typescript
interface SearchWebParams {
  query: string;                    // The search query (< 400 chars)
  depth: 'basic' | 'advanced';    // Basic = faster/cheaper, Advanced = thorough
  days?: number;                    // Recency filter (null = all time)
  topic?: 'general' | 'news';       // News for breaking events
  maxResults?: number;              // Default: 5, max: 10
  domains?: string[];               // Restrict to specific domains
}
```

**Implementation:**
```typescript
// 1. Decompose query into sub-queries
const subQueries = await decomposeQuery(userQuery, marketContext);

// 2. Execute parallel searches
const searchPromises = subQueries.map(sq => 
  tavily.search({
    query: sq.query,
    search_depth: sq.depth,
    topic: sq.topic,
    time_range: sq.days ? mapDaysToTimeRange(sq.days) : undefined,
    max_results: maxResults,
    include_domains: sq.domains,
    include_answer: false,
    include_raw_content: sq.depth === 'advanced'
  })
);

const results = await Promise.all(searchPromises);

// 3. Deduplicate by URL
const seenUrls = new Set<string>();
const uniqueResults: TavilyResult[] = [];

for (const result of results.flatMap(r => r.results)) {
  if (!seenUrls.has(result.url)) {
    seenUrls.add(result.url);
    uniqueResults.push(result);
  }
}

// 4. Rank by relevance score
const rankedResults = uniqueResults
  .sort((a, b) => b.score - a.score)
  .slice(0, maxResults * 2); // Keep top results

return rankedResults;
```

**When to Use:**
- User asks about "latest", "recent", "today", "this week"
- Breaking news queries
- Fact-checking specific claims
- Information not in market context or Maxwell report

**When NOT to Use:**
- Answer is in market description
- Answer is in Maxwell report
- General knowledge question
- Simple calculation

---

### 9.2 Tool: `analyze_data`

**Purpose:** Perform calculations and analysis on market data

**Parameters:**
```typescript
interface AnalyzeDataParams {
  analysisType: 'probability' | 'comparison' | 'scenario' | 'trend';
  data: {
    marketPrices?: number[];
    maxwellEstimates?: number[];
    historicalData?: any[];
  };
  question: string;
}
```

**Implementation:**
```typescript
// 1. Extract relevant numbers from context
const marketPrice = market.outcomes[0].price;
const maxwellMid = maxwellReport?.outcomes[0].maxwellRange.mid;

// 2. Perform calculation
let result: number;
let explanation: string;

switch (analysisType) {
  case 'probability':
    result = marketPrice / (1 - marketPrice); // Convert to odds
    explanation = `Implied odds: ${result.toFixed(2)}:1`;
    break;
    
  case 'comparison':
    const diff = ((maxwellMid - marketPrice) / marketPrice) * 100;
    result = diff;
    explanation = `Maxwell estimates ${diff > 0 ? '+' : ''}${diff.toFixed(1)}% vs market`;
    break;
    
  case 'scenario':
    // Complex scenario analysis
    break;
}

// 3. Return structured result
return {
  result,
  explanation,
  calculation: `${marketPrice} / ${1 - marketPrice} = ${result.toFixed(3)}`
};
```

**When to Use:**
- Probability calculations
- Comparing market price to Maxwell estimates
- Scenario analysis ("What if X happens?")
- Trend analysis

---

### 9.3 Tool: `answer_directly`

**Purpose:** Answer from existing context without external calls

**Parameters:** None (uses system prompt context)

**Implementation:**
```typescript
// Simply call LLM with system prompt containing all context
const response = await generateText({
  model: openrouter('google/gemini-3-flash-preview'),
  system: buildSystemPrompt(context),
  messages: [
    { role: 'user', content: query }
  ],
  temperature: 0.3,
  max_tokens: 800
});
```

**When to Use:**
- Question about market description
- Question about Maxwell report
- General knowledge
- Simple factual lookup

---

## 10. UI/UX Specifications

### 10.1 Component Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    MarketChat Panel                         │
│                    (Left 25% of screen)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Message Thread                      │   │
│  │                                                     │   │
│  │  🤖 Market Expert Agent                             │   │
│  │     Ask me anything about this market...            │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────     │   │
│  │                                                     │   │
│  │  👤 What does the Maxwell report say?               │   │
│  │                                                     │   │
│  │  🤖 According to Maxwell analysis...              │   │
│  │     [Response with citations]                       │   │
│  │                                                     │   │
│  │  👤 Has anything changed today?                   │   │
│  │                                                     │   │
│  │  🤖 🔍 Searching for latest developments...        │   │
│  │     [Progress: 2/3 searches complete]               │   │
│  │                                                     │   │
│  │  🤖 Based on search results...                      │   │
│  │     [Response with source citations]              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Input Area                          │   │
│  │                                                     │   │
│  │  [Ask about this market...                    ] [↑] │   │
│  │                                                     │   │
│  │  💡 Try: "What's the main risk?"                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Message Types

#### 10.2.1 User Message
```tsx
<div className="flex justify-end">
  <div className="max-w-[85%] bg-[#FA5D19]/10 border border-[#FA5D19]/20 rounded-lg px-4 py-3">
    <p className="text-white text-[14px]">{content}</p>
    <span className="text-[10px] text-white/40 mt-1 block">
      {formatTime(timestamp)}
    </span>
  </div>
</div>
```

#### 10.2.2 Agent Message (Direct Answer)
```tsx
<div className="flex justify-start">
  <div className="max-w-[85%] bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-3">
    <div className="flex items-center gap-2 mb-2">
      <Terminal className="w-3 h-3 text-[#4ade80]" />
      <span className="text-[10px] font-mono text-[#4ade80] tracking-wider">
        MARKET EXPERT
      </span>
    </div>
    <div className="prose prose-invert prose-sm max-w-none">
      <MarkdownRenderer content={content} />
    </div>
    {sources && (
      <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
        <span className="text-[10px] text-white/40">Sources:</span>
        {sources.map(s => (
          <a key={s.id} href={s.url} className="text-[10px] text-[#4a9eff] ml-2">
            [{s.id}]
          </a>
        ))}
      </div>
    )}
  </div>
</div>
```

#### 10.2.3 Tool Status Indicator
```tsx
// Searching State
<div className="flex justify-start">
  <div className="max-w-[85%] bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-3">
    <div className="flex items-center gap-2 mb-2">
      <Loader2 className="w-3 h-3 text-[#fbbf24] animate-spin" />
      <span className="text-[10px] font-mono text-[#fbbf24] tracking-wider">
        SEARCHING
      </span>
    </div>
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/40">Query 1:</span>
        <span className="text-[10px] text-white/60">Harris polling latest</span>
        <Check className="w-3 h-3 text-[#4ade80]" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/40">Query 2:</span>
        <span className="text-[10px] text-white/60">Trump approval rating</span>
        <Loader2 className="w-3 h-3 text-[#fbbf24] animate-spin" />
      </div>
    </div>
    <div className="mt-3 h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
      <div 
        className="h-full bg-[#fbbf24] transition-all duration-300"
        style={{ width: `${(completed / total) * 100}%` }}
      />
    </div>
  </div>
</div>
```

### 10.3 Empty State

```tsx
<div className="flex flex-col items-center justify-center h-full">
  <AsciiDecoration />
  <div className="text-center space-y-3">
    <div className="text-[10px] font-mono font-medium uppercase tracking-wider text-white/30">
      Market Expert Agent
    </div>
    <p className="text-white/30 text-[12px] font-mono min-h-[1.5em]">
      {placeholderText}
    </p>
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      <button className="text-[10px] text-white/40 hover:text-white/60 transition-colors px-2 py-1 border border-white/10 rounded">
        "What's the main risk?"
      </button>
      <button className="text-[10px] text-white/40 hover:text-white/60 transition-colors px-2 py-1 border border-white/10 rounded">
        "Latest news?"
      </button>
      <button className="text-[10px] text-white/40 hover:text-white/60 transition-colors px-2 py-1 border border-white/10 rounded">
        "Why is this underpriced?"
      </button>
    </div>
  </div>
</div>
```

### 10.4 Input Interface

```tsx
<div className="p-4 border-t border-[#2A2A2A]">
  <div className="relative">
    <input
      type="text"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      placeholder="Ask about this market..."
      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3 pr-12
                 text-white text-[14px] placeholder:text-white/30
                 focus:outline-none focus:border-[#FA5D19]/50"
    />
    <button
      onClick={handleSubmit}
      disabled={!inputValue.trim() || isLoading}
      className="absolute right-3 top-1/2 -translate-y-1/2
                 text-[#FA5D19] hover:text-[#EA580C] disabled:text-white/20
                 transition-colors"
    >
      <Send className="w-5 h-5" />
    </button>
  </div>
  
  {/* Tool indicators */}
  {isLoading && currentTool && (
    <div className="flex items-center gap-2 mt-2 text-[10px] text-white/40">
      <Loader2 className="w-3 h-3 animate-spin" />
      <span>{toolStatus}</span>
    </div>
  )}
</div>
```

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Basic Q&A with market context

**Tasks:**
- [ ] Create type definitions (`app/lib/market-chat/types.ts`)
- [ ] Build context assembler (`app/lib/market-chat/context-assembler.ts`)
- [ ] Implement basic `/api/market-chat/query` endpoint
- [ ] Update `MarketChat.tsx` to use new endpoint
- [ ] Add conversation persistence (IndexedDB)
- [ ] Basic message rendering

**Success Criteria:**
- Can answer "What are the resolution criteria?" from market context
- Chat history persists across page reloads
- Response time < 3 seconds

---

### Phase 2: Maxwell Integration (Week 1-2)
**Goal:** Deep integration with Maxwell reports

**Tasks:**
- [ ] Extend context assembler to include Maxwell data
- [ ] Update system prompt with Maxwell sections
- [ ] Add Maxwell citation formatting
- [ ] Test with markets that have Maxwell reports
- [ ] Handle case when Maxwell report doesn't exist

**Success Criteria:**
- Can answer "What does Maxwell say about Harris?"
- Properly cites Maxwell analysis
- Gracefully handles missing reports

---

### Phase 3: Search Integration (Week 2-3)
**Goal:** Add Tavily search capabilities

**Tasks:**
- [ ] Implement query decomposer
- [ ] Build Tavily search executor
- [ ] Create `/api/market-chat/search` endpoint
- [ ] Add tool status indicators in UI
- [ ] Implement parallel search with progress tracking
- [ ] Add source citations in responses

**Success Criteria:**
- Can answer "What's the latest polling?"
- Shows "searching..." indicator with progress
- Cites sources with links
- Response time < 10 seconds

---

### Phase 4: Intent Classification (Week 3)
**Goal:** Smart routing between direct answer and search

**Tasks:**
- [ ] Build intent classifier
- [ ] Define search trigger keywords
- [ ] Implement decision logic
- [ ] Add confidence scoring
- [ ] Test classification accuracy
- [ ] Fine-tune thresholds

**Success Criteria:**
- 95% accuracy in routing decisions
- "When does this close?" → Direct answer
- "Latest news?" → Search
- "What if..." → Analysis

---

### Phase 5: Analysis Tools (Week 3-4)
**Goal:** Add calculation and analysis capabilities

**Tasks:**
- [ ] Implement `/api/market-chat/analyze` endpoint
- [ ] Build probability calculation tools
- [ ] Add comparison analysis
- [ ] Create scenario analysis
- [ ] Add trend detection

**Success Criteria:**
- Can calculate implied probabilities
- Can compare market price to Maxwell estimates
- Can run scenario analysis

---

### Phase 6: Memory & Context (Week 4)
**Goal:** Advanced conversation memory

**Tasks:**
- [ ] Implement conversation summarization
- [ ] Add key fact extraction
- [ ] Build sliding window context management
- [ ] Add cross-market memory (optional)
- [ ] Optimize IndexedDB storage

**Success Criteria:**
- Can reference previous Q&A in new responses
- Long conversations don't lose context
- Storage < 10MB per user

---

### Phase 7: Polish & Optimization (Week 4-5)
**Goal:** Production-ready system

**Tasks:**
- [ ] Optimize prompts based on testing
- [ ] Add error handling and fallbacks
- [ ] Implement rate limiting
- [ ] Add caching for repeated queries
- [ ] Performance optimization
- [ ] Edge case handling
- [ ] Documentation

**Success Criteria:**
- 99% uptime
- < 2s for direct answers
- < 8s for search queries
- Handles all edge cases gracefully

---

## 12. Testing Strategy

### 12.1 Unit Tests

**Intent Classification:**
```typescript
describe('Intent Classification', () => {
  test('should classify direct answer queries', () => {
    const result = classifyIntent('When does this market close?');
    expect(result.type).toBe('direct_answer');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
  
  test('should classify search queries', () => {
    const result = classifyIntent('What\'s the latest news?');
    expect(result.type).toBe('search_required');
    expect(result.suggestedTools).toContain('search_web');
  });
});
```

**Context Assembly:**
```typescript
describe('Context Assembly', () => {
  test('should include market data', () => {
    const context = assembleContext(market, null, []);
    expect(context.market.id).toBe('poly:event:30829');
  });
  
  test('should include Maxwell report when available', () => {
    const context = assembleContext(market, maxwellReport, []);
    expect(context.maxwellReport).toBeDefined();
    expect(context.maxwellReport.verdict).toBe('UNDERPRICED');
  });
});
```

### 12.2 Integration Tests

**API Endpoints:**
```typescript
describe('/api/market-chat/query', () => {
  test('should answer from market context', async () => {
    const response = await fetch('/api/market-chat/query', {
      method: 'POST',
      body: JSON.stringify({
        marketId: 'poly:event:30829',
        query: 'What are the resolution criteria?',
        market: mockMarket,
        chatHistory: []
      })
    });
    
    const data = await response.json();
    expect(data.content).toContain('resolves');
    expect(data.durationMs).toBeLessThan(3000);
  });
});
```

**Search Pipeline:**
```typescript
describe('Search Pipeline', () => {
  test('should execute parallel searches', async () => {
    const results = await executeParallelSearches([
      { query: 'Harris polling', depth: 'basic' },
      { query: 'Trump approval', depth: 'basic' }
    ]);
    
    expect(results).toHaveLength(2);
    expect(results[0].sources.length).toBeGreaterThan(0);
  });
  
  test('should deduplicate results', async () => {
    const results = await executeParallelSearches([
      { query: 'election 2024', depth: 'basic' },
      { query: '2024 election', depth: 'basic' }
    ]);
    
    const uniqueUrls = new Set(results.flatMap(r => r.sources.map(s => s.url)));
    expect(uniqueUrls.size).toBeLessThan(
      results.flatMap(r => r.sources).length
    );
  });
});
```

### 12.3 E2E Tests

**User Flows:**
```typescript
describe('MarketChat E2E', () => {
  test('complete conversation flow', async () => {
    // 1. Visit market page
    await page.goto('/markets/poly:event:30829');
    
    // 2. Ask question about market
    await page.fill('[data-testid="chat-input"]', 'When does this close?');
    await page.click('[data-testid="send-button"]');
    
    // 3. Verify direct answer
    await expect(page.locator('[data-testid="agent-message"]')).toContainText('closes');
    
    // 4. Ask search question
    await page.fill('[data-testid="chat-input"]', 'Latest news?');
    await page.click('[data-testid="send-button"]');
    
    // 5. Verify search indicator
    await expect(page.locator('[data-testid="tool-status"]')).toContainText('SEARCHING');
    
    // 6. Verify response with sources
    await expect(page.locator('[data-testid="agent-message"]')).toContainText('[');
    await expect(page.locator('[data-testid="source-link"]')).toBeVisible();
  });
});
```

### 12.4 Performance Tests

```typescript
describe('Performance', () => {
  test('direct answer response time', async () => {
    const start = Date.now();
    await fetch('/api/market-chat/query', { ... });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(3000);
  });
  
  test('search response time', async () => {
    const start = Date.now();
    await fetch('/api/market-chat/search', { ... });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10000);
  });
});
```

---

## 13. Success Metrics

### 13.1 Quantitative Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Response Quality Score** | > 4.0/5.0 | User feedback on helpfulness |
| **Intent Classification Accuracy** | > 95% | Manual review of 100 queries |
| **Direct Answer Latency** | < 2s | 95th percentile response time |
| **Search Query Latency** | < 8s | 95th percentile response time |
| **User Engagement Rate** | > 40% | % of market page visitors who use chat |
| **Conversation Depth** | > 4 messages | Average messages per conversation |
| **Tool Usage Accuracy** | > 90% | Appropriate tool selection rate |
| **Citation Accuracy** | > 95% | Sources correctly cited |
| **Uptime** | > 99% | API endpoint availability |
| **Error Rate** | < 1% | Failed requests / total requests |

### 13.2 Qualitative Metrics

**User Feedback:**
- Post-conversation rating (thumbs up/down)
- Optional text feedback
- Support ticket analysis

**Expert Review:**
- Domain expert evaluation of responses
- Comparison to human analyst answers
- Accuracy of market insights

**Heuristic Evaluation:**
- Nielsen's 10 usability heuristics
- Cognitive walkthrough
- Expert review sessions

### 13.3 Analytics Events

```typescript
// Track these events
interface AnalyticsEvents {
  'chat_initiated': {
    marketId: string;
    hasMaxwellReport: boolean;
  };
  'message_sent': {
    marketId: string;
    messageLength: number;
    intent: string;
    toolsUsed: string[];
  };
  'response_received': {
    marketId: string;
    durationMs: number;
    responseLength: number;
    sourcesCount: number;
  };
  'conversation_ended': {
    marketId: string;
    messageCount: number;
    durationSeconds: number;
    rating?: number;
  };
  'tool_used': {
    tool: string;
    durationMs: number;
    success: boolean;
  };
}
```

---

## 14. Open Questions

### 14.1 Product Questions

1. **Pricing Strategy:** Should search queries cost more than direct answers? How do we communicate this to users?

2. **Rate Limiting:** What's the daily query limit per user? Do we show remaining queries?

3. **Cross-Market Memory:** Should the agent remember conversations from other markets? How do we prevent context pollution?

4. **Maxwell Report Updates:** If Maxwell report is updated, should we notify users in active conversations?

5. **Export Functionality:** Should users be able to export chat history or share conversations?

### 14.2 Technical Questions

1. **Model Selection:** Should we use different models for different query types (Gemini Flash for simple, Claude for complex)?

2. **Caching Strategy:** How long should we cache search results? Should we cache at the query level or source level?

3. **Context Window:** What's the optimal chat history length? Should we use summarization or sliding window?

4. **Error Recovery:** If search fails halfway through, do we return partial results or fall back to direct answer?

5. **Streaming vs Batched:** Should we stream the entire response or just the thinking indicators?

### 14.3 Design Questions

1. **Tool Transparency:** How much of the "thinking" process should we show? Full tool calls or just high-level status?

2. **Source Presentation:** Inline citations [1] or footnotes? Expandable source cards?

3. **Empty State:** What example questions should we show? Personalized based on market type?

4. **Mobile Experience:** How does the 3-panel layout adapt to mobile? Collapsible chat panel?

5. **Accessibility:** What ARIA labels and keyboard navigation do we need?

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Agentic System** | An AI system that can reason, use tools, and make decisions autonomously |
| **Maxwell Report** | The full intelligence analysis generated by the 5-phase Maxwell pipeline |
| **Tavily** | Search API used for web search and content extraction |
| **Sub-query** | A focused search query derived from the user's original question |
| **Intent Classification** | Determining what the user wants and which tools to use |
| **ReAct Pattern** | Reasoning + Acting - an agent architecture that interleaves thinking and tool use |
| **Context Window** | The amount of conversation history the agent can reference |
| **Tool Call** | When the agent invokes an external capability (search, calculate, etc.) |
| **Citation Mismatch** | When the best evidence comes from a source different than what was cited |
| **NLI** | Natural Language Inference - determining if evidence supports, contradicts, or is neutral to a claim |

---

## Appendix B: Example Conversations

### Example 1: Binary Market (Fed Rates)

**User:** "What's the implied probability of a rate hike?"

**Agent:** The market is pricing a **73% chance** of a rate hike at the next FOMC meeting.

Here's the math: Market price is $0.73 → Implied probability = 73%

This is higher than the CME FedWatch Tool's estimate of 68%, suggesting the market may be slightly overpricing the probability.

**User:** "What are the key dates I should watch?"

**Agent:** According to the market description, here are the key dates:

• **March 20, 2025** - FOMC meeting (resolution date)
• **March 12, 2025** - CPI data release (could move odds)
• **March 14, 2025** - PPI data release

The market resolves based on the **upper bound of the federal funds rate** after the March meeting. Any rate increase from the current 5.25-5.50% range resolves YES.

**User:** "Has Powell said anything recently?"

**Agent:** 🔍 Searching for recent Powell statements...

Based on search results from the last 7 days [1][2]:

• **February 28, 2025** - Powell testified before Congress, said "we're in no rush to cut rates" and data will guide decisions
• **February 25, 2025** - Fed minutes showed most officials favor holding rates steady

These statements support the market's high probability pricing. No surprises that would change the odds significantly.

**Sources:**
[1] Reuters: "Powell signals patience on rate cuts" (Feb 28)
[2] WSJ: "Fed minutes show caution on inflation" (Feb 25)

---

### Example 2: Multi-Option Market (Election)

**User:** "Why is Harris underpriced?"

**Agent:** According to the Maxwell analysis (high confidence), Harris is **UNDERPRICED** at current market levels.

**The Numbers:**
• Market says: **48%**
• Maxwell estimates: **52-58%**
• Edge: **+8-10 percentage points**

**Why the discrepancy?**

The Maxwell report identifies three key factors the market may be underweighting:

1. **Swing state polling** - Recent polls show Harris leading in Pennsylvania (+3), Michigan (+4), and Wisconsin (+2)

2. **Incumbent advantages** - Despite Biden not running, Harris inherits campaign infrastructure and fundraising

3. **Demographic trends** - Youth and minority voter registration is up in key states compared to 2020

**Resolution Risks:**
• Electoral college vs popular vote split (as seen in 2016, 2000)
• Third-party candidates (RFK Jr. polling at 8% nationally)
• Late-breaking events (October surprises)

**User:** "What's the latest polling?"

**Agent:** 🔍 Searching for latest polling data...

Based on polls released in the last 48 hours [1][2][3]:

**National Polls:**
• Quinnipiac (Mar 1): Harris **+4** (49-45)
• CNN/SSRS (Mar 1): Harris **+3** (48-45)
• YouGov (Feb 28): Harris **+2** (47-45)

**Swing State Polls:**
• Pennsylvania (Franklin & Marshall): Harris **+3**
• Michigan (EPIC-MRA): Harris **+4**
• Arizona (OH Predictive): Trump **+1**

**Trend:** Harris has gained 2-3 points nationally over the last two weeks, consistent with the Maxwell thesis that she was underpriced.

**Sources:**
[1] Quinnipiac University Poll (March 1, 2025)
[2] CNN/SSRS Poll (March 1, 2025)
[3] RealClearPolitics Polling Average (updated Mar 2)

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 2026 | AI Assistant | Initial PRD |

**Reviewers:**
- [ ] Product Manager
- [ ] Engineering Lead
- [ ] Design Lead
- [ ] QA Lead

**Approval:**
- [ ] Approved for implementation
- [ ] Changes requested (see comments)
- [ ] Rejected (see comments)
