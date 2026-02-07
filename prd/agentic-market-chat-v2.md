# Product Requirements Document: Agentic MarketChat System v2
## True Multi-Agent Architecture

**Project:** Maxwell V2 - ZapMarket  
**Feature:** Agentic MarketChat (Multi-Agent Market Expert System)  
**Status:** Draft for Review  
**Date:** February 2026  
**Version:** 2.0 - Agentic Architecture  
**Author:** AI Assistant + Product Team  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What Makes This Truly Agentic](#2-what-makes-this-truly-agentic)
3. [Multi-Agent Architecture](#3-multi-agent-architecture)
4. [System Architecture](#4-system-architecture)
5. [Agent Specifications](#5-agent-specifications)
6. [Model Selection Strategy](#6-model-selection-strategy)
7. [API Specifications](#7-api-specifications)
8. [Data Models](#8-data-models)
9. [Implementation Phases](#9-implementation-phases)
10. [Cost Analysis](#10-cost-analysis)
11. [Testing Strategy](#11-testing-strategy)
12. [Success Metrics](#12-success-metrics)

---

## 1. Executive Summary

### 1.1 The Vision

**Agentic MarketChat** is not a chatbot with tools. It is a **multi-agent orchestration system** where specialized AI agents collaborate to provide expert prediction market analysis. Inspired by Oh-My-OpenCode patterns, the system uses:

- **Planner Agent**: Decomposes user queries into subtasks
- **Specialist Agents**: Execute domain-specific tasks (news, analysis, calculations)
- **Synthesizer Agent**: Combines outputs and generates final response
- **Reflection Loop**: Self-critique and refinement

### 1.2 Key Differentiators

| Traditional Tool-Calling | True Agentic System (This) |
|-------------------------|---------------------------|
| Single LLM + 3 tools | Multi-agent orchestration with 5+ specialized agents |
| Intent classifier routes to endpoint | Planner agent autonomously delegates tasks |
| One-shot query → response | Iterative loops with reflection and self-correction |
| Fixed 2-4 parallel searches | Adaptive: search → analyze → search more if insufficient |
| Static search depth | Dynamic depth based on result quality assessment |
| No planning phase | Explicit planning before execution (Prometheus pattern) |
| Stateless or simple history | Semantic memory with fact extraction and retrieval |

### 1.3 Success Criteria

- **Agent Collaboration:** 95% of queries involve 2+ agents working together
- **Adaptive Search:** System performs 1-3 search iterations based on quality assessment
- **Response Quality:** 90% of responses rated 4+ stars by users
- **Cost Efficiency:** Average $0.03 per conversation (vs $0.05 for naive implementation)
- **Latency:** P50 < 4s, P95 < 12s (including multi-step reasoning)
- **Source Quality:** 90% of citations from Tier 1/2 sources

---

## 2. What Makes This Truly Agentic

### 2.1 The Oh-My-OpenCode Pattern

This system follows the Oh-My-OpenCode agentic architecture:

```
User Query
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. PLANNER AGENT (Claude Sonnet 4)      │
│    • Decompose query into subtasks      │
│    • Assign specialist agents           │
│    • Define acceptance criteria         │
│    • Estimate resource needs            │
└─────────────────────────────────────────┘
    │
    ├─► Specialist Agent 1 ───────────────┐
    │   (News Analyst - Gemini Flash)     │
    │   • Real-time news search             │
    │   • Source quality scoring            │
    │   • Fact extraction                   │
    │                                     │
    ├─► Specialist Agent 2 ───────────────┤
    │   (Maxwell Interpreter - Claude)    │
    │   • Parse Maxwell report            │
    │   • Answer report-specific Qs       │
    │   • Identify gaps in analysis       │
    │                                     │
    ├─► Specialist Agent 3 ───────────────┤
    │   (Calculator - Deterministic)      │
    │   • Probability calculations          │
    │   • EV analysis                       │
    │   • Kelly sizing                      │
    │                                     │
    └─► Specialist Agent 4 ───────────────┘
        (Market Data - Live APIs)
        • Current prices
        • Related markets
        • Order book depth
    │
    ▼
┌─────────────────────────────────────────┐
│ 2. REFLECTION LOOP                      │
│    • Assess result sufficiency          │
│    • Identify gaps                      │
│    • Trigger additional searches        │
│    • Max 3 iterations                   │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 3. SYNTHESIZER AGENT (Claude Sonnet)    │
│    • Combine all specialist outputs     │
│    • Generate coherent response         │
│    • Add citations                      │
│    • Self-critique                      │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 4. MEMORY UPDATE                        │
│    • Extract key facts                  │
│    • Update semantic memory             │
│    • Summarize conversation             │
└─────────────────────────────────────────┘
    │
    ▼
  Response to User
```

### 2.2 Why This Matters

**Example: User asks "What's the latest on Harris?"**

**Tool-Calling Approach (Old):**
1. Classify intent → "search_required"
2. Execute 3 parallel Tavily searches
3. Synthesize results
4. Return answer

**Agentic Approach (New):**
1. **Planner** decomposes: "Latest polling", "Recent news", "Campaign developments"
2. **News Analyst** searches → finds 5 articles, 3 are 10 days old
3. **Reflection:** "Results are stale, need more recent data"
4. **News Analyst** searches again with time filter → finds today's polls
5. **Maxwell Interpreter** checks if this affects existing analysis
6. **Calculator** computes if new polls change probability estimates
7. **Synthesizer** combines everything with citations
8. **Memory** extracts: "User is tracking Harris polling closely"

**Result:** More accurate, more contextual, more useful.

---

## 3. Multi-Agent Architecture

### 3.1 Agent Hierarchy

**AGENT ORCHESTRATOR** (Manages agent lifecycle & routing)
    │
    ├─► **PLANNER AGENT** (Claude Sonnet 4)
    │   • Entry point for all queries
    │   • Creates execution plan
    │   • Monitors progress
    │
    ├─► **SPECIALIST AGENTS** (Parallel execution)
    │   │
    │   ├─► **News Analyst** (Gemini Flash)
    │   │   • Tavily search with iterative refinement
    │   │   • Source quality scoring
    │   │   • Fact extraction
    │   │
    │   ├─► **Maxwell Interpreter** (Claude Haiku)
    │   │   • Parse and explain Maxwell reports
    │   │   • Identify analysis gaps
    │   │   • Compare to current data
    │   │
    │   ├─► **Calculator** (Deterministic + Claude)
    │   │   • Probability math
    │   │   • EV calculations
    │   │   • Scenario modeling
    │   │
    │   └─► **Market Data Fetcher** (Direct APIs)
    │       • Live prices from Polymarket/Kalshi
    │       • Related markets
    │       • Order book analysis
    │
    └─► **SYNTHESIZER AGENT** (Claude Sonnet 4)
        • Combines all specialist outputs
        • Generates final response
        • Quality assurance

### 3.2 Agent Communication Protocol

Agents communicate via a shared **Agent Context Bus**:

```typescript
interface AgentContextBus {
  // Original user query
  userQuery: string;
  
  // Execution plan from Planner
  executionPlan: {
    subtasks: Subtask[];
    dependencies: Map<string, string[]>;
    acceptanceCriteria: string[];
  };
  
  // Shared workspace
  workspace: {
    marketData: UnifiedMarket;
    maxwellReport?: MaxwellIntelligence;
    searchResults: SearchResult[];
    calculations: CalculationResult[];
    facts: ExtractedFact[];
  };
  
  // Agent outputs
  agentOutputs: Map<AgentId, AgentOutput>;
  
  // Reflection state
  reflectionState: {
    iteration: number;
    gaps: string[];
    needsMoreSearch: boolean;
  };
}
```

---

## 4. System Architecture

### 4.1 High-Level Architecture

**CLIENT LAYER**
- MarketChat Component
  - Input Interface
  - Chat Thread (Messages)
  - Agent Status (Thinking/Searching)
- Agent Orchestrator Hook
  - Context Manager
  - Planner Interface
  - Agent Router
  - Memory Manager
  - Stream Handler
  - State Manager

**API LAYER**
- SINGLE ENDPOINT: `/api/market-chat`
  - Planner Agent execution
  - Specialist Agent orchestration
  - Reflection loop management
  - Synthesizer coordination
  - Streaming SSE with agent status updates
  - Uses Vercel AI SDK with maxSteps: 10

**EXTERNAL SERVICES**
- Tavily Search
- OpenRouter (LLMs)
- Vercel Blob

### 4.2 Key Architectural Decisions

#### Decision 1: Single Endpoint with maxSteps

**Why:** The Vercel AI SDK handles multi-step tool calling automatically. No need for multiple endpoints.

```typescript
// ONE endpoint handles everything
export async function POST(req: Request) {
  const { messages, market, maxwellReport } = await req.json();
  
  return streamText({
    model: openrouter('anthropic/claude-sonnet-4'),
    system: buildPlannerPrompt(market, maxwellReport),
    messages,
    tools: {
      // Specialist agents as tools
      search_news: newsAnalystTool,
      get_maxwell_detail: maxwellInterpreterTool,
      calculate: calculatorTool,
      get_market_data: marketDataTool,
      synthesize: synthesizerTool,
    },
    maxSteps: 10, // Allow complex multi-agent workflows
    maxTokens: 4000,
  });
}
```

#### Decision 2: No Intent Classifier

**Why:** Modern LLMs (Claude, GPT-4, Gemini) have native tool calling. They decide when to use tools.

**Before (Old):**
```typescript
const intent = await classifyIntent(query); // +800ms latency
if (intent === 'search') {
  return await searchEndpoint(query);
}
```

**After (New):**
```typescript
// LLM naturally decides tool use
const response = await generateText({
  model: 'claude-sonnet-4',
  tools: [searchNewsTool, calculateTool, getMaxwellTool],
  messages: [{ role: 'user', content: query }],
  // LLM autonomously calls tools as needed
});
```

**Result:** -800ms latency, simpler architecture, better decisions.

#### Decision 3: Planner Agent as Entry Point

**Why:** Complex queries need planning. The Planner decides which specialists to invoke and in what order.

```typescript
// Planner creates execution plan
interface ExecutionPlan {
  subtasks: [
    { agent: 'news_analyst', task: 'Find latest Harris polling', priority: 1 },
    { agent: 'maxwell_interpreter', task: 'Check if new polls affect thesis', priority: 2, dependsOn: [0] },
    { agent: 'calculator', task: 'Recalculate probabilities', priority: 3, dependsOn: [0, 1] },
  ];
  parallelGroups: [[0], [1, 2]]; // Group 0 runs first, then 1 and 2 in parallel
}
```

---

## 5. Agent Specifications

### 5.1 Planner Agent

**Model:** Claude Sonnet 4  
**Temperature:** 0.2  
**Max Tokens:** 2000

**Role:** Entry point for all queries. Creates execution plan.

**System Prompt:**
```markdown
You are the Planner Agent for a prediction market analysis system.

Your job: Create an execution plan for answering the user's query.

You have access to these specialist agents:
1. **news_analyst** - Searches for current news and developments
2. **maxwell_interpreter** - Explains Maxwell intelligence reports
3. **calculator** - Performs probability and EV calculations
4. **market_data** - Fetches live market prices and data

CURRENT MARKET: {{market.title}}
MAXWELL REPORT: {{maxwellReport ? 'Available' : 'Not available'}}

Create a plan:
1. Break the query into subtasks
2. Assign each subtask to a specialist
3. Define dependencies (which tasks need others first)
4. Set priorities

Output format:
{
  "reasoning": "Why this plan will answer the query",
  "subtasks": [
    {
      "id": "t1",
      "agent": "news_analyst",
      "task": "specific task description",
      "priority": 1,
      "dependsOn": [],
      "acceptanceCriteria": "What success looks like"
    }
  ],
  "parallelGroups": [["t1"], ["t2", "t3"]]
}
```

**Example:**
- **Input:** "What's the latest on Harris and should I buy?"
- **Output:** Plan with 4 subtasks: search news → interpret Maxwell → calculate EV → synthesize

---

### 5.2 News Analyst Agent

**Model:** Gemini Flash (speed) or Gemini Pro (complex queries)  
**Temperature:** 0.1  
**Max Tokens:** 1500

**Role:** Real-time news search and analysis.

**Capabilities:**
- Iterative Tavily search with reflection
- Source quality scoring
- Fact extraction
- Duplicate detection

**Iterative Search Algorithm:**
```typescript
async function iterativeSearch(query: string, context: string) {
  let results: SearchResult[] = [];
  let iteration = 0;
  let assessment = { sufficient: false, gaps: ['Need more recent data'] };
  
  while (iteration < 3 && !assessment.sufficient) {
    // Generate search query based on gaps
    const searchQuery = await generateSearchQuery(query, context, results, assessment.gaps);
    
    // Execute Tavily search
    const newResults = await tavily.search({
      query: searchQuery,
      search_depth: iteration === 0 ? 'basic' : 'advanced',
      time_range: iteration === 0 ? 'week' : 'day',
      max_results: 5 + iteration * 2, // More results on later iterations
    });
    
    // Score and rank
    const scoredResults = scoreResults(newResults.results, SOURCE_QUALITY);
    results = deduplicateAndRank([...results, ...scoredResults]);
    
    // Assess sufficiency
    assessment = await assessSufficiency(query, results);
    iteration++;
  }
  
  return {
    results: results.slice(0, 8),
    iterations: iteration,
    assessment
  };
}
```

**Source Quality Scoring:**
```typescript
const SOURCE_QUALITY: Record<string, number> = {
  // Tier 1: Gold standard
  'fivethirtyeight.com': 0.98,
  'natesilver.net': 0.98,
  'polls.com': 0.95,
  
  // Tier 2: Major news/pollsters
  'cnn.com': 0.88,
  'reuters.com': 0.90,
  'apnews.com': 0.90,
  'foxnews.com': 0.85,
  'quinnipiac.edu': 0.92,
  
  // Tier 3: Local/secondary
  'politico.com': 0.82,
  'axios.com': 0.85,
  
  // Tier 4: Social/blogs (lower weight)
  'twitter.com': 0.40,
  'reddit.com': 0.35,
  'substack.com': 0.50,
};

function scoreResults(results: TavilyResult[], qualityMap: Record<string, number>) {
  return results.map(r => {
    const domain = new URL(r.url).hostname.replace('www.', '');
    const qualityScore = qualityMap[domain] || 0.50;
    const recencyScore = calculateRecencyScore(r.published_date);
    
    return {
      ...r,
      adjustedScore: r.score * qualityScore * recencyScore,
      quality: qualityScore > 0.90 ? 'tier1' : qualityScore > 0.80 ? 'tier2' : 'tier3'
    };
  }).sort((a, b) => b.adjustedScore - a.adjustedScore);
}
```

---

### 5.3 Maxwell Interpreter Agent

**Model:** Claude Haiku (fast) or Claude Sonnet (complex analysis)  
**Temperature:** 0.1  
**Max Tokens:** 1500

**Role:** Parse and explain Maxwell intelligence reports.

**Capabilities:**
- Extract key insights from Maxwell report
- Compare report to current market data
- Identify gaps in analysis
- Answer specific questions about report sections

**System Prompt:**
```markdown
You are the Maxwell Interpreter Agent.

Your job: Parse Maxwell intelligence reports and answer questions about them.

MAXWELL REPORT:
{{maxwellReport}}

CAPABILITIES:
- Explain the thesis in simple terms
- Compare Maxwell estimates to market prices
- Identify which outcomes are UNDERPRICED/OVERPRICED
- Extract resolution risks
- Answer specific questions about methodology

RULES:
1. Always cite specific sections of the report
2. If asked about something not in the report, say so
3. Use exact numbers from the report (don't round)
4. Explain technical terms
```

---

### 5.4 Calculator Agent

**Model:** Deterministic functions + Claude Haiku for explanations  
**Temperature:** 0.0 (deterministic)  

**Role:** Perform all mathematical calculations.

**Capabilities:**
- Probability calculations
- Expected Value (EV) analysis
- Kelly criterion sizing
- Scenario modeling
- Correlation analysis

**Tools:**
```typescript
const calculatorTools = {
  calculate_implied_probability: {
    description: "Calculate implied probability from market price",
    execute: ({ price }) => price, // Market price is already probability
  },
  
  calculate_ev: {
    description: "Calculate expected value of a position",
    execute: ({ userProbability, marketPrice, positionSize }) => {
      const winAmount = positionSize * (1 / marketPrice - 1);
      const lossAmount = positionSize;
      const winProb = userProbability;
      const lossProb = 1 - userProbability;
      
      const ev = (winProb * winAmount) - (lossProb * lossAmount);
      const edge = userProbability - marketPrice;
      
      return { ev, edge, roi: ev / positionSize };
    }
  },
  
  calculate_kelly: {
    description: "Calculate Kelly criterion position size",
    execute: ({ userProbability, marketPrice }) => {
      const b = (1 - marketPrice) / marketPrice; // Odds
      const p = userProbability;
      const q = 1 - p;
      
      const kellyFraction = (b * p - q) / b;
      const halfKelly = kellyFraction * 0.5; // Conservative
      
      return { fullKelly: kellyFraction, halfKelly, recommended: halfKelly };
    }
  },
  
  compare_outcomes: {
    description: "Compare multiple outcomes",
    execute: ({ outcomes }) => {
      // Statistical comparison
      return {
        bestValue: outcomes.sort((a, b) => b.edge - a.edge)[0],
        totalEdge: outcomes.reduce((sum, o) => sum + o.edge, 0),
        variance: calculateVariance(outcomes.map(o => o.price))
      };
    }
  }
};
```

---

### 5.5 Market Data Agent

**Model:** Direct API calls (no LLM)  

**Role:** Fetch live market data from Polymarket and Kalshi.

**Capabilities:**
- Current market prices
- Price history
- Order book depth
- Related markets
- Volume and liquidity data

---

### 5.6 Synthesizer Agent

**Model:** Claude Sonnet 4  
**Temperature:** 0.3  
**Max Tokens:** 2500

**Role:** Combine all specialist outputs into coherent response.

**System Prompt:**
```markdown
You are the Synthesizer Agent.

Your job: Combine outputs from specialist agents into a clear, expert-level response.

INPUTS:
- User query: {{userQuery}}
- News Analyst output: {{newsOutput}}
- Maxwell Interpreter output: {{maxwellOutput}}
- Calculator output: {{calcOutput}}
- Market Data output: {{marketOutput}}

OUTPUT REQUIREMENTS:
1. Start with the direct answer (no preamble)
2. Show your reasoning
3. Cite sources as [1], [2], etc.
4. Bold key numbers
5. Use bullet points for multiple findings
6. Add "Key Takeaway" at the end

FORMAT:
**Answer:** [Direct answer]

**Reasoning:**
• [Point 1 with citation]
• [Point 2 with citation]
• [Point 3 with calculation]

**Key Takeaway:** [One sentence summary]
```

---

## 6. Model Selection Strategy

### 6.1 Model Hierarchy

| Task | Model | Why |
|------|-------|-----|
| **Planning** | Claude Sonnet 4 | Complex reasoning, tool orchestration |
| **News Search** | Gemini Flash | Speed, cost-effective for search queries |
| **Maxwell Interpretation** | Claude Haiku | Fast, good at structured data |
| **Calculations** | Deterministic + Haiku | Accuracy + explanation |
| **Synthesis** | Claude Sonnet 4 | Quality, coherence, citations |
| **Reflection** | Claude Haiku | Quick assessment |
| **Simple Q&A** | Gemini Flash | Speed for trivial queries |

### 6.2 Cost Optimization

| Scenario | Model Chain | Cost | Latency |
|----------|-------------|------|---------|
| Simple fact lookup | Gemini Flash | $0.0005 | <1s |
| Maxwell question | Claude Haiku | $0.001 | <2s |
| News + Analysis | Gemini Flash → Claude Sonnet | $0.015 | 6-10s |
| Complex multi-agent | Sonnet (Planner) → Flash/Haiku (Specialists) → Sonnet (Synthesizer) | $0.03 | 8-15s |

### 6.3 Fast Path Optimization

Skip LLM entirely for trivial questions:

```typescript
const FAST_PATTERNS = [
  { 
    pattern: /when does (this|it|the market) (close|end|resolve)/i, 
    handler: (m) => `This market closes on ${formatDate(m.endDate)}.` 
  },
  { 
    pattern: /what('s| is) the (current )?price|odds|chance/i, 
    handler: (m) => `Current odds: ${m.outcomes.map(o => `${o.name}: ${o.price}%`).join(', ')}` 
  },
  { 
    pattern: /volume|how much traded/i, 
    handler: (m) => `Total volume: $${formatVolume(m.volume)}` 
  },
  { 
    pattern: /what (type|kind) of market/i, 
    handler: (m) => `This is a ${m.marketType} market with ${m.outcomes.length} outcomes.` 
  },
];

// Check fast patterns first
for (const { pattern, handler } of FAST_PATTERNS) {
  if (pattern.test(query)) {
    return { content: handler(market), source: 'fast_path', cost: 0, latency: 50 };
  }
}

// Fall back to agentic system
return await runAgenticSystem(query);
```

---

## 7. API Specifications

### 7.1 Single Endpoint: `/api/market-chat`

**Method:** POST  
**Content-Type:** application/json  
**Response:** Server-Sent Events (SSE)

**Request Body:**
```typescript
interface MarketChatRequest {
  marketId: string;
  messages: Array<{
    role: 'user' | 'agent';
    content: string;
    timestamp?: number;
  }>;
  market: UnifiedMarket;
  maxwellReport?: MaxwellIntelligence;
  userPreferences?: {
    detailLevel: 'brief' | 'detailed';
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  };
}
```

**Response Events:**
```
event: plan-start
data: {"planner": "claude-sonnet-4", "estimatedSteps": 3}

event: agent-start
data: {"agent": "news_analyst", "task": "Find latest Harris polling", "model": "gemini-flash"}

event: search-iteration
data: {"iteration": 1, "query": "Harris polling March 2025", "results": 5}

event: reflection
data: {"sufficient": false, "gaps": ["Need swing state data"], "nextAction": "search_again"}

event: search-iteration
data: {"iteration": 2, "query": "Pennsylvania Michigan Wisconsin polls March 2025", "results": 4}

event: reflection
data: {"sufficient": true, "totalSources": 8, "tier1Sources": 5}

event: agent-complete
data: {"agent": "news_analyst", "sources": 8, "facts": 12, "durationMs": 3200}

event: agent-start
data: {"agent": "maxwell_interpreter", "task": "Compare to Maxwell thesis", "model": "claude-haiku"}

event: agent-complete
data: {"agent": "maxwell_interpreter", "insights": 3, "durationMs": 800}

event: agent-start
data: {"agent": "calculator", "task": "Calculate EV if Harris wins", "model": "deterministic"}

event: agent-complete
data: {"agent": "calculator", "calculations": 2, "durationMs": 50}

event: synthesize-start
data: {"agent": "synthesizer", "model": "claude-sonnet-4", "inputs": 3}

event: response-chunk
data: {"content": "Based on the latest polling"}

event: response-chunk
data: {"content": " [1][2], Harris leads in key swing states..."}

event: response-complete
data: {"totalTokens": 1847, "cost": 0.028, "durationMs": 8900, "agentsUsed": 4}

event: memory-update
data: {"factsExtracted": 3, "conversationSummary": "User tracking Harris polling"}

event: complete
data: {"status": "success"}
```

**Error Handling:**
```
event: agent-error
data: {"agent": "news_analyst", "error": "Tavily rate limit exceeded", "fallback": "Using cached results"}

event: complete
data: {"status": "partial_success", "warnings": ["Used cached data from 2 hours ago"]}
```

---

## 8. Data Models

### 8.1 Core Types

```typescript
// Agent System Types

interface AgentMessage {
  id: string;
  role: 'user' | 'planner' | 'news_analyst' | 'maxwell_interpreter' | 
         'calculator' | 'market_data' | 'synthesizer';
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokens?: number;
    cost?: number;
    durationMs?: number;
    toolsUsed?: string[];
    sources?: AgentSource[];
  };
}

interface AgentSource {
  id: string;
  title: string;
  url: string;
  snippet: string;
  score: number;
  adjustedScore: number;
  quality: 'tier1' | 'tier2' | 'tier3';
  publishedDate?: string;
  agent: string; // Which agent found this
}

interface ExecutionPlan {
  id: string;
  reasoning: string;
  subtasks: Subtask[];
  parallelGroups: string[][];
  estimatedCost: number;
  estimatedLatency: number;
}

interface Subtask {
  id: string;
  agent: AgentType;
  task: string;
  priority: number;
  dependsOn: string[];
  acceptanceCriteria: string[];
  status: 'pending' | 'running' | 'complete' | 'failed';
  output?: AgentOutput;
  durationMs?: number;
}

type AgentType = 
  | 'planner'
  | 'news_analyst' 
  | 'maxwell_interpreter' 
  | 'calculator' 
  | 'market_data' 
  | 'synthesizer';

interface AgentOutput {
  agent: AgentType;
  content: string;
  data?: any;
  sources?: AgentSource[];
  facts?: ExtractedFact[];
  calculations?: CalculationResult[];
}

interface ExtractedFact {
  fact: string;
  confidence: number;
  source: string;
  timestamp: number;
  category: 'market' | 'political' | 'economic' | 'user_preference';
}

interface CalculationResult {
  type: 'probability' | 'ev' | 'kelly' | 'comparison';
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  formula: string;
}

// Memory Types

interface UserMemory {
  userId: string;
  marketId: string;
  facts: ExtractedFact[];
  preferences: {
    detailLevel: 'brief' | 'detailed';
    wantsCalculations: boolean;
    favoriteTopics: string[];
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  };
  conversationSummary: string;
  lastUpdated: number;
}

interface SemanticMemory {
  id: string;
  embedding: number[];
  content: string;
  metadata: {
    marketId: string;
    timestamp: number;
    type: 'fact' | 'insight' | 'preference';
  };
}
```

### 8.2 State Management

```typescript
interface AgentChatState {
  // Current conversation
  messages: AgentMessage[];
  isProcessing: boolean;
  currentPlan?: ExecutionPlan;
  activeAgents: AgentType[];
  
  // Progress tracking
  progress: {
    currentStep: number;
    totalSteps: number;
    currentAgent?: AgentType;
    status: string;
  };
  
  // Memory
  memory?: UserMemory;
  semanticMemory?: SemanticMemory[];
  
  // Actions
  sendQuery: (query: string) => Promise<void>;
  loadMemory: (marketId: string) => Promise<void>;
  saveMemory: () => Promise<void>;
  clearMemory: () => Promise<void>;
}
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Basic agent infrastructure

**Tasks:**
- [ ] Create type definitions
- [ ] Build context assembler
- [ ] Implement Planner Agent
- [ ] Create single `/api/market-chat` endpoint
- [ ] Add basic message streaming
- [ ] Simple conversation persistence

**Success Criteria:**
- Planner creates execution plans
- Messages stream correctly
- History persists in IndexedDB

---

### Phase 2: Specialist Agents (Week 2)
**Goal:** Build all specialist agents

**Tasks:**
- [ ] Implement News Analyst with iterative search
- [ ] Add source quality scoring
- [ ] Build Maxwell Interpreter
- [ ] Create Calculator Agent
- [ ] Add Market Data Fetcher
- [ ] Build Synthesizer Agent

**Success Criteria:**
- All 5 specialist agents functional
- Can answer questions using multiple agents
- Source quality scoring working

---

### Phase 3: Reflection & Memory (Week 3)
**Goal:** Add intelligence layers

**Tasks:**
- [ ] Implement reflection loop
- [ ] Add iterative search (1-3 iterations)
- [ ] Build fact extraction
- [ ] Create semantic memory with embeddings
- [ ] Add conversation summarization

**Success Criteria:**
- System performs 1-3 search iterations based on quality
- Facts extracted and stored
- Memory retrieval working

---

### Phase 4: Optimization (Week 4)
**Goal:** Performance and cost optimization

**Tasks:**
- [ ] Implement fast path optimization
- [ ] Add model selection logic
- [ ] Build caching layer
- [ ] Add cost tracking
- [ ] Optimize prompts

**Success Criteria:**
- 50% of simple queries use fast path
- Average cost per conversation <$0.03
- P50 latency < 4s

---

### Phase 5: Polish (Week 5)
**Goal:** Production readiness

**Tasks:**
- [ ] Add comprehensive error handling
- [ ] Build fallback strategies
- [ ] Add rate limiting
- [ ] Create monitoring dashboard
- [ ] Write documentation
- [ ] Performance testing

**Success Criteria:**
- 99% uptime
- All edge cases handled
- Documentation complete

---

## 10. Cost Analysis

### 10.1 Cost Breakdown

| Component | Cost per Call | Typical Usage per Conversation | Total Cost |
|-----------|---------------|-------------------------------|------------|
| **Planner** (Claude Sonnet) | $0.003 | 1x | $0.003 |
| **News Analyst** (Gemini Flash) | $0.0005 | 2-3x | $0.001-0.0015 |
| **Maxwell Interpreter** (Haiku) | $0.001 | 1x | $0.001 |
| **Calculator** (Deterministic) | $0 | 1-2x | $0 |
| **Synthesizer** (Claude Sonnet) | $0.015 | 1x | $0.015 |
| **Tavily Search** | $0.002 | 4-8 searches | $0.008-0.016 |
| **Embeddings** (for memory) | $0.0001 | 3-5 facts | $0.0003-0.0005 |
| **TOTAL** | - | - | **$0.028-0.037** |

### 10.2 Monthly Cost Projections

| Users | Conversations/User/Month | Cost per Conversation | Monthly Cost |
|-------|-------------------------|----------------------|--------------|
| 100 | 10 | $0.03 | $300 |
| 1,000 | 10 | $0.03 | $3,000 |
| 5,000 | 10 | $0.03 | $15,000 |
| 10,000 | 10 | $0.03 | $30,000 |

### 10.3 Cost Optimization Strategies

1. **Fast Path:** Skip LLM for 40% of queries → Save $0.015 per query
2. **Caching:** Cache search results for 5 minutes → Save 30% on repeated queries
3. **Model Downgrade:** Use Gemini Flash instead of Sonnet where possible → Save 50% on simple tasks
4. **Smart Routing:** Only use advanced search when needed → Save $0.01 per basic query

**Estimated Savings:** 40-50% cost reduction vs naive implementation

---

## 11. Testing Strategy

### 11.1 Unit Tests

**Agent Tests:**
```typescript
describe('Planner Agent', () => {
  test('creates execution plan for complex query', async () => {
    const plan = await planner.createPlan('What\'s the latest on Harris?');
    expect(plan.subtasks).toHaveLength(3);
    expect(plan.subtasks[0].agent).toBe('news_analyst');
  });
});

describe('News Analyst', () => {
  test('performs iterative search', async () => {
    const result = await newsAnalyst.search('Harris polling');
    expect(result.iterations).toBeGreaterThanOrEqual(1);
    expect(result.results.length).toBeGreaterThan(0);
  });
  
  test('scores sources by quality', async () => {
    const results = await newsAnalyst.search('election 2024');
    const tier1Count = results.filter(r => r.quality === 'tier1').length;
    expect(tier1Count).toBeGreaterThan(0);
  });
});
```

### 11.2 Integration Tests

**API Tests:**
```typescript
describe('/api/market-chat', () => {
  test('handles simple query with fast path', async () => {
    const response = await fetch('/api/market-chat', {
      method: 'POST',
      body: JSON.stringify({
        query: 'When does this close?',
        market: mockMarket
      })
    });
    
    const events = await parseSSE(response);
    expect(events).toContainEqual({ type: 'fast-path', cost: 0 });
  });
  
  test('handles complex query with multi-agent', async () => {
    const response = await fetch('/api/market-chat', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Should I buy based on latest news?',
        market: mockMarket,
        maxwellReport: mockMaxwell
      })
    });
    
    const events = await parseSSE(response);
    expect(events).toContainEqual(expect.objectContaining({ type: 'agent-start' }));
    expect(events.filter(e => e.type === 'agent-complete').length).toBeGreaterThan(2);
  });
});
```

### 11.3 E2E Tests

**User Flows:**
```typescript
describe('MarketChat E2E', () => {
  test('complete multi-turn conversation', async () => {
    // 1. Ask about market
    await sendMessage('What does Maxwell say?');
    await expectResponseContains('UNDERPRICED');
    
    // 2. Ask for latest news
    await sendMessage('Any updates today?');
    await expectToolStatus('SEARCHING');
    await expectResponseContainsSources();
    
    // 3. Ask for calculation
    await sendMessage('What if I bet $1000?');
    await expectResponseContains('EV');
    await expectResponseContains('Kelly');
    
    // 4. Verify memory
    await reloadPage();
    await expectChatHistoryRestored();
  });
});
```

---

## 12. Success Metrics

### 12.1 Quantitative Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Agent Collaboration Rate** | > 95% | % of queries using 2+ agents |
| **Adaptive Search Rate** | > 60% | % of searches with 2+ iterations |
| **Response Quality** | > 4.0/5.0 | User rating |
| **Source Quality** | > 90% | % Tier 1/2 citations |
| **Cost per Conversation** | < $0.03 | Average |
| **Latency P50** | < 4s | Median response time |
| **Latency P95** | < 12s | 95th percentile |
| **Fast Path Usage** | > 40% | % queries using fast path |
| **User Engagement** | > 40% | % market visitors using chat |
| **Conversation Depth** | > 4 messages | Average per conversation |

### 12.2 Qualitative Metrics

- **Expert Review:** Domain experts rate responses as "expert-level"
- **User Feedback:** Post-conversation thumbs up/down
- **Error Rate:** < 1% failed requests
- **Fallback Rate:** < 5% queries falling back to cached data

---

## Summary: Key Changes from v1

### Deleted (from v1):
1. ❌ Intent classifier (redundant with native tool calling)
2. ❌ Three separate endpoints (/query, /search, /analyze)
3. ❌ Bloated system prompts (600+ words of fluff)
4. ❌ Static 2-4 parallel searches
5. ❌ Simple message history (replaced with semantic memory)

### Added (new in v2):
1. ✅ Multi-agent orchestration (5 specialized agents)
2. ✅ Planner Agent with execution plans
3. ✅ Iterative search with reflection loop
4. ✅ Source quality scoring (Tier 1/2/3)
5. ✅ Semantic memory with fact extraction
6. ✅ Fast path optimization (skip LLM for simple queries)
7. ✅ Model selection strategy (right model for right task)
8. ✅ Cost tracking and optimization
9. ✅ Single endpoint with maxSteps
10. ✅ Real-time agent status streaming

### Architecture Shift:
- **From:** Tool-calling system with routing
- **To:** True agentic system with planning, reflection, and multi-agent collaboration

This is now a **modern agentic system** worthy of the Oh-My-OpenCode pattern.

---

