/**
 * MarketChat Type Definitions
 * 
 * Core types for the Agentic MarketChat system.
 * Shared between client (hook/component) and server (API route/router).
 */

// ─────────────────────────────────────────────────────────────────────────────
// CHAT MESSAGE
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  tier?: ChatTier;
  sources?: ScoredSource[];
  cost?: CostBreakdown;
  latencyMs?: number;
  toolsUsed?: string[];
}

export type ChatTier = 'fast' | 'simple' | 'moderate' | 'complex' | 'research';

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE SCORING
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoredSource {
  id: number;
  title: string;
  url: string;
  snippet: string;
  score: number;           // Tavily relevance score
  qualityScore: number;    // Domain authority (0-1)
  recencyScore: number;    // Freshness (0-1)
  adjustedScore: number;   // Combined score
  qualityTier: SourceTier;
  publishedDate?: string;
}

export type SourceTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';

// ─────────────────────────────────────────────────────────────────────────────
// COST TRACKING
// ─────────────────────────────────────────────────────────────────────────────

export interface CostBreakdown {
  llm: number;
  search: number;
  extract: number;
  classification: number;
  total: number;
}

export function emptyCost(): CostBreakdown {
  return { llm: 0, search: 0, extract: 0, classification: 0, total: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SENT EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export type ServerEvent =
  | { type: 'status'; status: string; tool?: string; phase?: number; totalPhases?: number; estimatedTime?: string }
  | { type: 'chunk'; content: string }
  | { type: 'sources'; sources: ScoredSource[] }
  | { type: 'facts'; facts: Array<{ content: string; source: string; confidence: string; timestamp: number }> }
  | { type: 'complete'; tier: string; cost: CostBreakdown; latencyMs: number }
  | { type: 'error'; message: string; code: string };

// ─────────────────────────────────────────────────────────────────────────────
// COMPLEXITY CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'research';

// ─────────────────────────────────────────────────────────────────────────────
// API REQUEST / RESPONSE
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketChatRequest {
  marketId: string;
  messages: Array<{
    role: 'user' | 'agent';
    content: string;
  }>;
  maxwellReport?: import('../maxwell/types').MaxwellIntelligence | null;
  conversationFacts?: Array<{ content: string; source: string; confidence: string; timestamp: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// THINKING TRACE (CLIENT)
// ─────────────────────────────────────────────────────────────────────────────

export interface ThinkingStep {
  id: string;
  status: string;
  tool?: string;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT STATUS (CLIENT)
// ─────────────────────────────────────────────────────────────────────────────

export type ChatStatus =
  | 'idle'
  | 'thinking'
  | 'searching'
  | 'calculating'
  | 'synthesizing'
  | 'planning'
  | 'researching'
  | 'validating';
