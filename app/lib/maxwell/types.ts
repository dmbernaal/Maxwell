/**
 * Maxwell Type Definitions
 *
 * This file contains all TypeScript interfaces for the Maxwell verified search agent.
 * All other Maxwell files should import types from here to maintain consistency.
 *
 * @module maxwell/types
 */

// ============================================
// PHASE 1: DECOMPOSITION TYPES
// ============================================

/**
 * A sub-query generated from the original user query.
 * Each sub-query is designed to be searched independently.
 */
export type TavilySearchTopic = 'general' | 'news' | 'finance';
export type TavilySearchDepth = 'basic' | 'advanced';
export type TavilyTimeRange = 'day' | 'week' | 'month' | 'year' | 'd' | 'w' | 'm' | 'y';

/**
 * Category of sub-query for prediction market decomposition.
 * Used to ensure comprehensive coverage of market analysis angles.
 */
export type SubQueryCategory = 'resolution' | 'catalyst' | 'factor_for' | 'factor_against' | 'contrarian' | 'cross_platform';

/**
 * A sub-query generated from the original user query.
 * Each sub-query is designed to be searched independently.
 */
export interface SubQuery {
    /** Unique identifier (e.g., "q1", "q2") */
    id: string;
    /** The actual search query optimized for web search */
    query: string;
    /** Explanation of why this sub-query is needed */
    purpose: string;

    // Smart Search Configuration
    /** Search topic: 'general' or 'news' */
    topic: TavilySearchTopic;
    /** Search depth: 'basic' or 'advanced' */
    depth: TavilySearchDepth;
    /** Number of days back to search (optional) */
    days?: number;
    /** Specific domains to include (optional) */
    domains?: string[];
    /** Specific domains to exclude (optional) */
    excludeDomains?: string[];
    
    // Prediction Market Specific Fields (optional for backward compatibility)
    /** Category of query for market analysis coverage */
    category?: SubQueryCategory;
    /** Target outcome this query is investigating (for multi-outcome markets) */
    targetOutcome?: string;
}

import { ComplexityLevel, ExecutionConfig } from './configFactory';

// ... (previous imports)

// ============================================
// PHASE 1: DECOMPOSITION TYPES
// ============================================

/**
 * Output from the decomposition phase.
 */
export interface DecompositionOutput {
    /** The original user query */
    originalQuery: string;
    /** Array of sub-queries to execute */
    subQueries: SubQuery[];
    /** Explanation of the decomposition strategy */
    reasoning: string;
    /** Detected complexity level */
    complexity: ComplexityLevel;
    /** Reasoning for complexity assessment */
    complexityReasoning: string;
    /** Time taken for decomposition in milliseconds */
    durationMs: number;
}

// ... (Search, Synthesis, Verification types remain same)

// ============================================
// STREAMING EVENT TYPES
// ============================================



// ... (Other events)

/**
 * Union type of all possible Maxwell events.
 */


// ============================================
// FRONTEND STATE TYPES
// ============================================

/**
 * Complete frontend state for Maxwell.
 */
export interface MaxwellState {
    phase: ExecutionPhase;
    config?: ExecutionConfig; // Added config
    subQueries: SubQuery[];
    searchMetadata: SearchMetadata[];
    sources: MaxwellSource[];
    answer: string;
    verification: VerificationOutput | null;
    adjudication: string | null;
    error: string | null;
    phaseDurations: PhaseDurations;
}

/**
 * A source retrieved from web search.
 * Sources are deduplicated by URL across all sub-queries.
 */
export interface MaxwellSource {
    /** Unique identifier (e.g., "s1", "s2") - 1-indexed for citations */
    id: string;
    /** Full URL of the source */
    url: string;
    /** Title of the page/article */
    title: string;
    /** Text snippet/content from the source */
    snippet: string;
    /** Which sub-query found this source (e.g., "q1") */
    fromQuery: string;
    /** Published date of the source (from Tavily) */
    date?: string;
    /** Relevance score from search provider (0-1) */
    score?: number;
}

/**
 * Metadata about a single search execution.
 */
export interface SearchMetadata {
    /** Sub-query ID this search was for */
    queryId: string;
    /** The search query that was executed */
    query: string;
    /** Number of sources found */
    sourcesFound: number;
    /** Status of the search */
    status: 'complete' | 'failed' | 'no_results';
}

/**
 * Output from the parallel search phase.
 */
export interface SearchOutput {
    /** All deduplicated sources */
    sources: MaxwellSource[];
    /** Metadata for each sub-query search */
    searchMetadata: SearchMetadata[];
    /** Time taken for all searches in milliseconds */
    durationMs: number;
}

// ============================================
// PHASE 3: SYNTHESIS TYPES
// ============================================

/**
 * Output from the synthesis phase.
 */
export interface SynthesisOutput {
    /** The generated answer with [n] citations */
    answer: string;
    /** IDs of sources that were cited */
    sourcesUsed: string[];
    /** Time taken for synthesis in milliseconds */
    durationMs: number;
}

// ============================================
// PHASE 4: VERIFICATION TYPES
// ============================================

/**
 * Entailment verdict from NLI check.
 * - SUPPORTED: Evidence directly supports the claim
 * - CONTRADICTED: Evidence contradicts the claim
 * - NEUTRAL: Evidence doesn't address the claim
 */
export type EntailmentVerdict = 'SUPPORTED' | 'CONTRADICTED' | 'NEUTRAL';

/**
 * A claim extracted from the synthesized answer.
 */
export interface ExtractedClaim {
    /** Unique identifier (e.g., "c1", "c2") */
    id: string;
    /** The factual claim text */
    text: string;
    /** Source numbers cited in the original answer (e.g., [1, 3]) */
    citedSources: number[];
}

/**
 * A passage chunked from a source for fine-grained retrieval.
 */
export interface Passage {
    /** The passage text (1-3 sentences) */
    text: string;
    /** ID of the source this passage came from */
    sourceId: string;
    /** 1-indexed source number for citation matching */
    sourceIndex: number;
    /** Title of the source */
    sourceTitle: string;
    /** Published date of the source */
    sourceDate?: string;
}

/**
 * Result of numeric consistency check.
 */
export interface NumericCheck {
    /** Numbers extracted from the claim */
    claimNumbers: string[];
    /** Numbers extracted from the evidence */
    evidenceNumbers: string[];
    /** Whether the numbers match */
    match: boolean;
}

/**
 * Result from evidence retrieval for a single claim.
 */
export interface RetrievalResult {
    /** Best matching passage across all sources */
    bestPassage: Passage;
    /** Similarity score of best match */
    retrievalSimilarity: number;
    /** Best similarity from cited sources only */
    citedSourceSupport: number;
    /** Best similarity from all sources */
    globalBestSupport: number;
    /** True if best evidence comes from uncited source */
    citationMismatch: boolean;
}

/**
 * Aggregated verdict from all verification signals.
 */
export interface AggregatedVerdict {
    /** Final confidence score (0.0 to 1.0) */
    confidence: number;
    /** Confidence level category */
    confidenceLevel: 'high' | 'medium' | 'low';
    /** List of issues found during verification */
    issues: string[];
}

/**
 * A fully verified claim with all signals.
 */
export interface VerifiedClaim {
    /** Unique identifier */
    id: string;
    /** The claim text */
    text: string;

    // Confidence
    /** Aggregated confidence score (0.0 to 1.0) */
    confidence: number;
    /** Confidence level category */
    confidenceLevel: 'high' | 'medium' | 'low';

    // Entailment signal
    /** NLI verdict */
    entailment: EntailmentVerdict;
    /** Explanation from NLI model */
    entailmentReasoning: string;

    // Evidence
    /** Best matching source passage */
    bestMatchingSource: {
        sourceId: string;
        sourceTitle: string;
        sourceIndex: number;
        passage: string;
        similarity: number;
        isCitedSource: boolean;
    };

    // Citation correctness
    /** True if best evidence comes from uncited source */
    citationMismatch: boolean;
    /** Best similarity from cited sources */
    citedSourceSupport: number;
    /** Best similarity from all sources */
    globalBestSupport: number;

    // Numeric consistency
    /** Numeric check result, null if no numbers in claim */
    numericCheck: NumericCheck | null;

    // Issues
    /** List of issues found during verification */
    issues: string[];
}

/**
 * Summary of verification results.
 */
export interface VerificationSummary {
    /** Claims with SUPPORTED entailment */
    supported: number;
    /** Claims with NEUTRAL entailment */
    uncertain: number;
    /** Claims with CONTRADICTED entailment */
    contradicted: number;
    /** Claims with citation mismatch */
    citationMismatches: number;
    /** Claims with numeric mismatch */
    numericMismatches: number;
}

/**
 * Output from the verification phase.
 */
export interface VerificationOutput {
    /** All verified claims */
    claims: VerifiedClaim[];
    /** Overall confidence percentage (0-100) */
    overallConfidence: number;
    /** Summary counts */
    summary: VerificationSummary;
    /** Time taken for verification in milliseconds */
    durationMs: number;
}

// ============================================
// ORCHESTRATOR TYPES
// ============================================

/**
 * Status of phase execution.
 */
export interface PhaseStatus {
    status: 'pending' | 'in_progress' | 'complete' | 'error';
    durationMs?: number;
    error?: string;
}

/**
 * Complete phase tracking for the orchestrator.
 */
/**
 * Complete phase tracking for the orchestrator.
 */
export interface MaxwellPhases {
    decomposition: PhaseStatus & {
        subQueries?: SubQuery[];
    };
    search: PhaseStatus & {
        totalSources?: number;
        searchMetadata?: SearchMetadata[];
    };
    synthesis: PhaseStatus;
    verification: PhaseStatus & {
        claimsExtracted?: number;
        claimsVerified?: number;
    };
    adjudication: PhaseStatus;
}

/**
 * Complete response from Maxwell.
 */
export interface MaxwellResponse {
    /** The synthesized answer */
    answer: string;
    /** All sources used */
    sources: MaxwellSource[];
    /** Verification results */
    verification: VerificationOutput;
    /** Adjudication verdict */
    adjudication: string | null;
    /** Phase execution details */
    phases: MaxwellPhases;
    /** Total execution time in milliseconds */
    totalDurationMs: number;
}

// ============================================
// PHASE 5: ADJUDICATION TYPES
// ============================================

/**
 * Event emitted during adjudication for streamed content.
 */
export interface AdjudicationChunkEvent {
    type: 'adjudication-chunk';
    content: string;
}

// ============================================
// STREAMING EVENT TYPES
// ============================================

/**
 * Event emitted when a phase starts.
 */
export interface PhaseStartEvent {
    type: 'phase-start';
    phase: 'decomposition' | 'search' | 'synthesis' | 'verification' | 'adjudication' | 'presenter';
}

/**
 * Event emitted when a phase completes.
 */
export interface PhaseCompleteEvent {
    type: 'phase-complete';
    phase: 'decomposition' | 'search' | 'synthesis' | 'verification' | 'adjudication' | 'presenter';
    data: unknown;
}

/**
 * Event emitted during search phase for each completed sub-query.
 */
export interface SearchProgressEvent {
    type: 'search-progress';
    data: SearchMetadata;
}

/**
 * Event emitted during synthesis for streamed content.
 */
export interface SynthesisChunkEvent {
    type: 'synthesis-chunk';
    content: string;
}

/**
 * Event emitted during verification for progress updates.
 */
export interface VerificationProgressEvent {
    type: 'verification-progress';
    data: {
        current: number;
        total: number;
        status: string;
    };
}

/**
 * Event emitted when all phases complete successfully.
 */
export interface CompleteEvent {
    type: 'complete';
    data: MaxwellResponse;
}

/**
 * Event emitted when an error occurs.
 */
export interface ErrorEvent {
    type: 'error';
    message: string;
}

/**
 * Event emitted when planning is complete.
 */
export interface PlanningCompleteEvent {
    type: 'planning-complete';
    config: ExecutionConfig;
}

/**
 * Union type of all possible Maxwell events.
 */
export type MaxwellEvent =
    | PhaseStartEvent
    | PhaseCompleteEvent
    | PlanningCompleteEvent
    | SearchProgressEvent
    | SynthesisChunkEvent
    | VerificationProgressEvent
    | AdjudicationChunkEvent
    | CompleteEvent
    | ErrorEvent;

// ============================================
// FRONTEND STATE TYPES
// ============================================

/**
 * Current phase of execution for UI.
 */
export type ExecutionPhase =
    | 'idle'
    | 'decomposition'
    | 'search'
    | 'synthesis'
    | 'verification'
    | 'adjudication'
    | 'presenter'
    | 'complete'
    | 'error';

/**
 * Phase duration tracking for UI.
 */
export interface PhaseDurations {
    decomposition?: number;
    search?: number;
    synthesis?: number;
    verification?: number;
    adjudication?: number;
    presenter?: number;
    total?: number;
}

/**
 * Complete frontend state for Maxwell.
 */
export interface MaxwellState {
    phase: ExecutionPhase;
    config?: ExecutionConfig;
    subQueries: SubQuery[];
    searchMetadata: SearchMetadata[];
    sources: MaxwellSource[];
    answer: string;
    verification: VerificationOutput | null;
    adjudication: string | null;
    error: string | null;
    phaseDurations: PhaseDurations;
}

// ============================================
// PHASE 1 TRADER REVAMP: INTELLIGENCE TYPES
// ============================================

export type IntelligenceVerdict = 'UNDERPRICED' | 'OVERPRICED' | 'FAIR' | 'UNCERTAIN';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ResolutionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type IntelligenceVerificationLevel = 'VERIFIED' | 'PARTIAL' | 'LOW_CONFIDENCE';
export type ClaimEntailment = 'SUPPORTED' | 'CONTRADICTED' | 'NEUTRAL';
export type IntelligenceMarketType = 'binary' | 'multi-option' | 'matchup';
export type IntelligencePlatform = 'polymarket' | 'kalshi';

export interface MarketOutcomeContext {
    name: string;
    price: number;
    priceChange24h?: number;
    volume?: number;
}

export interface MarketContext {
    id: string;
    platform: IntelligencePlatform;
    title: string;
    type: IntelligenceMarketType;
    outcomes: MarketOutcomeContext[];
    rules: string;
    resolutionSource?: string;
    endDate: Date;
    volume: number;
    volume24h: number;
    liquidity?: number;
    crossPlatformOdds?: {
        platform: IntelligencePlatform;
        outcomes: Array<{ name: string; price: number }>;
    };
}

export interface ResolutionRisk {
    level: ResolutionRiskLevel;
    score: number;
    factors: string[];
    historicalDisputes?: string;
}

export interface ThesisFactor {
    point: string;
    evidence: string;
    sourceIndex: number;
    confidence: ConfidenceLevel;
}

export interface OutcomeAnalysis {
    name: string;
    marketPrice: number;
    maxwellRange: {
        low: number;
        mid: number;
        high: number;
    };
    view: IntelligenceVerdict;
    confidence: ConfidenceLevel;
    oneLiner: string;
    rank: number;
}

export interface SourceSummary {
    title: string;
    domain: string;
    relevanceScore: number;
}

export interface SourceReference {
    index: number;
    title: string;
    url: string;
    snippet: string;
    date?: string;
}

export interface ClaimReference {
    id: string;
    text: string;
    confidence: number;
    entailment: ClaimEntailment;
}

export interface MaxwellIntelligence {
    market: {
        question: string;
        type: IntelligenceMarketType;
        deadline: string;
        deadlineDate: string;
        resolutionCriteria: string;
    };
    resolutionRisk: ResolutionRisk;
    assessment: {
        primaryOutcome: string;
        marketPrice: number;
        maxwellRange: {
            low: number;
            mid: number;
            high: number;
        };
        verdict: IntelligenceVerdict;
        confidence: ConfidenceLevel;
        headline: string;
    };
    thesis: {
        factorsFor: ThesisFactor[];
        factorsAgainst: ThesisFactor[];
        keyUncertainty: string;
        nextCatalyst: {
            event: string;
            date?: string;
            impact: string;
        };
        sourceConflicts?: string[];
    };
    outcomes?: OutcomeAnalysis[];
    arbitrage?: {
        detected: boolean;
        description?: string;
        spread?: number;
    };
    verification: {
        score: number;
        level: IntelligenceVerificationLevel;
        sourcesAnalyzed: number;
        claimsVerified: number;
        claimsDisputed: number;
        topSources: SourceSummary[];
    };
    raw: {
        synthesis: string;
        adjudication: string;
        allSources: SourceReference[];
        allClaims: ClaimReference[];
    };
    generatedAt: string;
    pipelineDurationMs: number;
    modelUsed: string;
}
