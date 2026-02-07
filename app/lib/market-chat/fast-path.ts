import type { UnifiedMarket } from '../markets/types';
import type { MaxwellIntelligence } from '../maxwell/types';

interface FastPathResult {
  matched: boolean;
  response: string;
}

const FAST_PATTERNS: Array<{
  patterns: RegExp[];
  extract: (market: UnifiedMarket, report?: MaxwellIntelligence) => string;
}> = [
  {
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
    patterns: [
      /what (type|kind) of market/i,
      /is this (binary|multi)/i,
    ],
    extract: (m) => `This is a **${m.marketType}** market on **${m.platform}** with ${m.outcomes.length} outcome${m.outcomes.length > 1 ? 's' : ''}.`,
  },
  {
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

  if (market.status === 'resolved' || market.status === 'closed') {
    if (/\b(buy|sell|bet|wager|position)\b/i.test(normalized)) {
      return {
        matched: true,
        response: `This market is **${market.status}** and no longer accepting trades.`,
      };
    }
  }

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
