type UnifiedCursorV1 = {
  v: 1;
  reqSig: string;
  polyOffset: number;
  kalshiCursor?: string;
  exhausted?: { poly?: boolean; kalshi?: boolean };
};

export type UnifiedCursor = UnifiedCursorV1;

export function createReqSig(platform: string, sort: string, query?: string): string {
  return `${platform}|${sort}|${query ?? ''}`;
}

export function encodeUnifiedCursor(cursor: UnifiedCursor): string {
  const json = JSON.stringify(cursor);
  const base64 = Buffer.from(json).toString('base64url');
  return `v1.${base64}`;
}

export function decodeUnifiedCursor(encoded: string | undefined): UnifiedCursor | null {
  if (!encoded) return null;
  
  try {
    if (!encoded.startsWith('v1.')) return null;
    
    const base64 = encoded.slice(3);
    const json = Buffer.from(base64, 'base64url').toString('utf-8');
    const parsed = JSON.parse(json);
    
    if (parsed.v !== 1) return null;
    
    return parsed as UnifiedCursor;
  } catch {
    return null;
  }
}

export function createInitialCursor(reqSig: string): UnifiedCursor {
  return {
    v: 1,
    reqSig,
    polyOffset: 0,
  };
}
