import type { VerifiedClaim } from './types';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar';
const PERPLEXITY_TIMEOUT_MS = 15000;
const MAX_CLAIMS_FOR_CROSS_CHECK = 10;

interface PerplexityCrossCheckResult {
    claimId: string;
    claimText: string;
    perplexityVerdict: 'AGREES' | 'DISAGREES' | 'INCONCLUSIVE';
    perplexityEvidence: string;
    citations: string[];
}

export interface PerplexityCrossCheckOutput {
    results: PerplexityCrossCheckResult[];
    durationMs: number;
    enabled: boolean;
}

function getPerplexityApiKey(): string | null {
    return process.env.PERPLEXITY_API_KEY || null;
}

/**
 * Selects the most important claims for cross-checking.
 * Prioritizes: CONTRADICTED claims first, then high-confidence SUPPORTED, then NEUTRAL.
 * This maximizes the value of each Perplexity API call.
 */
function selectClaimsForCrossCheck(claims: VerifiedClaim[]): VerifiedClaim[] {
    const contradicted = claims.filter(c => c.entailment === 'CONTRADICTED');
    const supported = claims.filter(c => c.entailment === 'SUPPORTED').sort((a, b) => b.confidence - a.confidence);
    const neutral = claims.filter(c => c.entailment === 'NEUTRAL').sort((a, b) => a.confidence - b.confidence);

    const selected: VerifiedClaim[] = [];

    // Contradicted claims are highest priority — verify the contradiction
    for (const claim of contradicted) {
        if (selected.length >= MAX_CLAIMS_FOR_CROSS_CHECK) break;
        selected.push(claim);
    }

    // Then neutral/uncertain claims — these benefit most from a second opinion
    for (const claim of neutral) {
        if (selected.length >= MAX_CLAIMS_FOR_CROSS_CHECK) break;
        selected.push(claim);
    }

    // Then high-confidence supported claims — spot-check for false positives
    for (const claim of supported) {
        if (selected.length >= MAX_CLAIMS_FOR_CROSS_CHECK) break;
        selected.push(claim);
    }

    return selected;
}

async function crossCheckSingleClaim(
    apiKey: string,
    claim: VerifiedClaim
): Promise<PerplexityCrossCheckResult> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PERPLEXITY_TIMEOUT_MS);

        const response = await fetch(PERPLEXITY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: PERPLEXITY_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a fact-checker. Given a factual claim, search the web and determine if it is TRUE, FALSE, or UNCERTAIN. Respond with exactly one word on the first line: TRUE, FALSE, or UNCERTAIN. Then on the next line, provide a brief explanation (1-2 sentences) with the key evidence.',
                    },
                    {
                        role: 'user',
                        content: `Verify this claim: "${claim.text}"`,
                    },
                ],
                max_tokens: 150,
                temperature: 0.1,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            console.warn(`[Perplexity] API error for claim ${claim.id}: HTTP ${response.status}`);
            return {
                claimId: claim.id,
                claimText: claim.text,
                perplexityVerdict: 'INCONCLUSIVE',
                perplexityEvidence: 'Perplexity API error',
                citations: [],
            };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const citations = data.citations || [];

        const firstLine = content.split('\n')[0].trim().toUpperCase();
        const explanation = content.split('\n').slice(1).join(' ').trim();

        let verdict: 'AGREES' | 'DISAGREES' | 'INCONCLUSIVE';
        if (firstLine.includes('TRUE')) {
            verdict = 'AGREES';
        } else if (firstLine.includes('FALSE')) {
            verdict = 'DISAGREES';
        } else {
            verdict = 'INCONCLUSIVE';
        }

        return {
            claimId: claim.id,
            claimText: claim.text,
            perplexityVerdict: verdict,
            perplexityEvidence: explanation || content,
            citations,
        };
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.warn(`[Perplexity] Timeout for claim ${claim.id}`);
        } else {
            console.warn(`[Perplexity] Error for claim ${claim.id}:`, error);
        }
        return {
            claimId: claim.id,
            claimText: claim.text,
            perplexityVerdict: 'INCONCLUSIVE',
            perplexityEvidence: 'Cross-check failed',
            citations: [],
        };
    }
}

/**
 * Cross-checks verified claims using Perplexity Sonar as an independent verification signal.
 * Runs in parallel with concurrency limit. Gracefully degrades if API key is missing.
 */
export async function crossCheckWithPerplexity(
    claims: VerifiedClaim[]
): Promise<PerplexityCrossCheckOutput> {
    const startTime = Date.now();
    const apiKey = getPerplexityApiKey();

    if (!apiKey) {
        console.log('[Perplexity] No API key configured — skipping cross-check');
        return { results: [], durationMs: 0, enabled: false };
    }

    if (claims.length === 0) {
        return { results: [], durationMs: 0, enabled: true };
    }

    const selectedClaims = selectClaimsForCrossCheck(claims);
    console.log(`[Perplexity] Cross-checking ${selectedClaims.length} claims`);

    // Run cross-checks with concurrency of 3
    const CONCURRENCY = 3;
    const results: PerplexityCrossCheckResult[] = [];

    for (let i = 0; i < selectedClaims.length; i += CONCURRENCY) {
        const batch = selectedClaims.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(
            batch.map(claim => crossCheckSingleClaim(apiKey, claim))
        );
        results.push(...batchResults);
    }

    const durationMs = Date.now() - startTime;
    const agrees = results.filter(r => r.perplexityVerdict === 'AGREES').length;
    const disagrees = results.filter(r => r.perplexityVerdict === 'DISAGREES').length;
    console.log(`[Perplexity] Cross-check complete: ${agrees} agree, ${disagrees} disagree, ${results.length - agrees - disagrees} inconclusive (${durationMs}ms)`);

    return { results, durationMs, enabled: true };
}

/**
 * Integrates Perplexity cross-check results into verified claims.
 * Adjusts confidence based on agreement/disagreement.
 */
export function integratePerplexityResults(
    claims: VerifiedClaim[],
    crossCheck: PerplexityCrossCheckOutput
): VerifiedClaim[] {
    if (!crossCheck.enabled || crossCheck.results.length === 0) {
        return claims;
    }

    const crossCheckMap = new Map(crossCheck.results.map(r => [r.claimId, r]));

    return claims.map(claim => {
        const pxResult = crossCheckMap.get(claim.id);
        if (!pxResult) return claim;

        let adjustedConfidence = claim.confidence;
        const issues = [...claim.issues];

        if (pxResult.perplexityVerdict === 'AGREES' && claim.entailment === 'SUPPORTED') {
            // Independent confirmation — boost confidence
            adjustedConfidence = Math.min(1.0, claim.confidence * 1.1);
            issues.push('CROSS-VALIDATED by independent search');
        } else if (pxResult.perplexityVerdict === 'DISAGREES' && claim.entailment === 'SUPPORTED') {
            // Our pipeline says supported but Perplexity disagrees — flag it
            adjustedConfidence = claim.confidence * 0.7;
            issues.push(`DISPUTED BY INDEPENDENT CHECK: ${pxResult.perplexityEvidence}`);
        } else if (pxResult.perplexityVerdict === 'AGREES' && claim.entailment === 'CONTRADICTED') {
            // Perplexity says true but we said contradicted — reconsider
            adjustedConfidence = Math.min(0.5, claim.confidence * 1.5);
            issues.push(`CONTRADICTION DISPUTED: Independent search supports this claim`);
        } else if (pxResult.perplexityVerdict === 'DISAGREES' && claim.entailment === 'CONTRADICTED') {
            // Both agree it's false — high confidence in contradiction
            adjustedConfidence = Math.max(0.05, claim.confidence * 0.8);
            issues.push('CROSS-VALIDATED CONTRADICTION by independent search');
        } else if (pxResult.perplexityVerdict === 'AGREES' && claim.entailment === 'NEUTRAL') {
            // Independent confirmation for uncertain claim — upgrade
            adjustedConfidence = Math.min(0.85, claim.confidence * 1.3);
            issues.push('INDEPENDENTLY CONFIRMED (was uncertain)');
        }

        return {
            ...claim,
            confidence: adjustedConfidence,
            confidenceLevel: adjustedConfidence >= 0.7 ? 'high' as const : adjustedConfidence >= 0.4 ? 'medium' as const : 'low' as const,
            issues,
        };
    });
}
