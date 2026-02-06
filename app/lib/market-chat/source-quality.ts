import type { SourceTier } from './types';

const SOURCE_QUALITY: Record<string, number> = {
  'fivethirtyeight.com': 0.98,
  'natesilver.net': 0.97,
  'realclearpolitics.com': 0.95,
  'reuters.com': 0.95,
  'apnews.com': 0.95,
  'federalreserve.gov': 0.98,
  'bls.gov': 0.98,
  'bea.gov': 0.98,
  'sec.gov': 0.97,
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
  'axios.com': 0.78,
  'thehill.com': 0.75,
  'cnbc.com': 0.80,
  'marketwatch.com': 0.78,
  'yahoo.com': 0.70,
  'espn.com': 0.80,
  'sports.yahoo.com': 0.78,
  'twitter.com': 0.40,
  'x.com': 0.40,
  'reddit.com': 0.35,
  'substack.com': 0.50,
  'medium.com': 0.45,
  'wikipedia.org': 0.60,
};

export function scoreSourceQuality(url: string): number {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '');
    return SOURCE_QUALITY[domain] || 0.50;
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

export function getSourceTier(score: number): SourceTier {
  if (score >= 0.90) return 'tier1';
  if (score >= 0.80) return 'tier2';
  if (score >= 0.65) return 'tier3';
  return 'tier4';
}
