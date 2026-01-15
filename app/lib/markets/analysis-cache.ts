import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { MaxwellSource, VerificationOutput } from '../maxwell/types';

export interface CachedAnalysis {
  marketId: string;
  query: string;
  verdict: string;
  confidence: number;
  answer: string;
  adjudication: string | null;
  sources: MaxwellSource[];
  verification: VerificationOutput | null;
  timestamp: number;
  durationMs: number;
}

const CACHE_KEY_PREFIX = 'market-analysis:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getCachedAnalysis(marketId: string): Promise<CachedAnalysis | null> {
  try {
    const key = `${CACHE_KEY_PREFIX}${marketId}`;
    const cached = await idbGet<CachedAnalysis>(key);
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_TTL_MS) {
      await idbDel(key);
      return null;
    }
    
    return cached;
  } catch (error) {
    console.error('[AnalysisCache] Error reading cache:', error);
    return null;
  }
}

export async function setCachedAnalysis(analysis: CachedAnalysis): Promise<void> {
  try {
    const key = `${CACHE_KEY_PREFIX}${analysis.marketId}`;
    await idbSet(key, analysis);
  } catch (error) {
    console.error('[AnalysisCache] Error writing cache:', error);
  }
}

export async function clearCachedAnalysis(marketId: string): Promise<void> {
  try {
    const key = `${CACHE_KEY_PREFIX}${marketId}`;
    await idbDel(key);
  } catch (error) {
    console.error('[AnalysisCache] Error clearing cache:', error);
  }
}
