import type { UnifiedMarket } from '../markets/types';
import type { MaxwellIntelligence } from '../maxwell/types';

export function buildMarketChatSystemPrompt(
  market: UnifiedMarket,
  maxwellReport: MaxwellIntelligence | null,
  conversationFacts: string[]
): string {
  const statusNote = (market.status === 'resolved' || market.status === 'closed')
    ? `\n⚠️ THIS MARKET IS ${market.status.toUpperCase()}. No longer accepting trades. Answer questions about historical data only.`
    : '';

  const outcomesLine = market.outcomes.length > 0
    ? market.outcomes.map(o => `${o.name}: ${(o.price * 100).toFixed(1)}%`).join(' | ')
    : 'No outcome data available';

  const marketBlock = `
MARKET: ${market.title}
PLATFORM: ${market.platform}
TYPE: ${market.marketType}
STATUS: ${market.status}${statusNote}
OUTCOMES: ${outcomesLine}
CLOSES: ${new Date(market.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
VOLUME: $${formatCompact(market.volume)} total | $${formatCompact(market.volume24h)} 24h
${market.liquidity ? `LIQUIDITY: $${formatCompact(market.liquidity)}` : ''}
${market.rules ? `RESOLUTION RULES: ${market.rules.slice(0, 500)}` : ''}
${market.resolutionSource ? `RESOLUTION SOURCE: ${market.resolutionSource}` : ''}
`.trim();

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
${maxwellReport.outcomes && maxwellReport.outcomes.length > 1 ? `  OUTCOMES: ${maxwellReport.outcomes.map(o => `${o.name}: market ${(o.marketPrice * 100).toFixed(0)}% → analysis ${o.maxwellRange.low}-${o.maxwellRange.high}% (${o.view})`).join(' | ')}` : ''}
`.trim() : 'ANALYSIS REPORT: Not available. User has not run analysis yet.';

  const factsBlock = conversationFacts.length > 0
    ? `\nESTABLISHED FACTS FROM THIS CONVERSATION:\n${conversationFacts.map(f => `- ${f}`).join('\n')}`
    : '';

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

function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}
