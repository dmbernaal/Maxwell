This is a crucial point. If you **already have a working UI** from the "Base Product" phase of your take-home (Better-Perplexity), then blindly following your Phase 11 plan will result in **duplicate components**, styling conflicts, and a disjointed UX.

To make this "Senior Engineer" quality, we need to **integrate** Maxwell's unique features (Verification Panel, Phase Progress) into your **existing** layout, rather than creating a completely parallel UI stack.

### 🛑 The Hole: Ignoring Existing Architecture

* **Issue:** Your plan creates `app/components/maxwell/*`.
* **Conflict:** You likely already have `app/components/chat/*` or similar. Creating a separate "Maxwell" folder suggests Maxwell is a different app, but it should be a **feature** within your existing chat interface.
* **Styling:** Your existing app has a specific look (colors, spacing). The proposed `zinc-900` hardcoded styles might clash with your `globals.css` or Tailwind config.

### 🛠️ The Fix: Adaptation Strategy

1. **Reuse Existing Primitives:** If you have a `Card`, `Button`, or `Accordion` component, use them.
2. **Scoped Features:** Only create *new* components for things that didn't exist before:
* **VerificationPanel:** New concept.
* **ProgressDisplay:** New concept (Decomposition/Phases).
* **SourcesPanel:** You likely have one. **Enhance it** instead of replacing it.



Since I cannot see your current codebase, I will provide a **Strict Integration Guide** that instructs the Cursor Agent to **check for existing components first** before creating new ones.

Here is the **Revised Phase 11 Guide**.

---

# Phase 11: Frontend Components

## Integrating Maxwell UI into Existing Design System

### Context

We are adding the visual layer for Maxwell's "Killer Feature" (Verification).
**CRITICAL RULE:** We must respect the existing application's design system found in `confluence/design-guide.md`. Do not create "rogue" styles. If a primitive (like `Card` or `Button`) exists, import it. If not, build it using the existing Tailwind tokens.

### Prerequisites

[ ] Phase 10 complete (Hook working)
[ ] **Design System Check:** Agent must read `confluence/design-guide.md`.
[ ] Existing UI components identified (e.g., `ChatMessage`, `SourceList`).

### Implementation Strategy

#### Step 1: `ProgressDisplay` (New Feature)

This shows the "Agent Reasoning" (Decomposition -> Search -> Verify).

* **Location:** `app/components/maxwell/progress-display.tsx`
* **Style:** Must match your existing "Loading/Thinking" state styles.

```tsx
// app/components/maxwell/progress-display.tsx
'use client';

import { CheckCircle, Loader2, Brain, Search, FileText, Shield } from 'lucide-react';
import type { SubQuery, SearchMetadata, ExecutionPhase, PhaseDurations } from '@/app/lib/maxwell/types';

// Use existing theme colors or fallback to these semantic colors
const STATUS_COLORS = {
  complete: 'text-emerald-400 bg-emerald-400/10',
  active: 'text-blue-400 bg-blue-400/10',
  pending: 'text-zinc-500 bg-zinc-800/50',
};

const PHASES = [
  { id: 'decomposition', label: 'Analyzing', icon: Brain },
  { id: 'search', label: 'Searching', icon: Search },
  { id: 'synthesis', label: 'Synthesizing', icon: FileText },
  { id: 'verification', label: 'Verifying', icon: Shield },
] as const;

interface ProgressDisplayProps {
  phase: ExecutionPhase;
  subQueries: SubQuery[];
  searchMetadata: SearchMetadata[];
  phaseDurations: PhaseDurations;
}

export function ProgressDisplay({ phase, subQueries, searchMetadata, phaseDurations }: ProgressDisplayProps) {
  if (phase === 'idle') return null;
  
  const currentIdx = PHASES.findIndex(p => p.id === phase);
  const isComplete = phase === 'complete';

  return (
    // Match existing card/container style
    <div className="w-full space-y-4 mb-6"> 
      {/* Phase Pills */}
      <div className="flex flex-wrap gap-2">
        {PHASES.map((p, idx) => {
          const Icon = p.icon;
          const isDone = idx < currentIdx || isComplete;
          const isActive = p.id === phase;
          const duration = phaseDurations[p.id as keyof PhaseDurations];

          let style = STATUS_COLORS.pending;
          if (isDone) style = STATUS_COLORS.complete;
          if (isActive) style = STATUS_COLORS.active;

          return (
            <div key={p.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-transparent ${style}`}>
              {isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
              <span>{p.label}</span>
              {duration && <span className="opacity-60 ml-1">{(duration / 1000).toFixed(1)}s</span>}
            </div>
          );
        })}
      </div>

      {/* Decomposition Details (Collapsible Reasoning) */}
      {subQueries.length > 0 && (
        <div className="pl-1 border-l-2 border-zinc-800 space-y-2 mt-2">
          {subQueries.map(sq => {
            const meta = searchMetadata.find(m => m.queryId === sq.id);
            const statusIcon = meta ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <div className="w-3 h-3 rounded-full border border-zinc-600" />;
            
            return (
              <div key={sq.id} className="flex items-center gap-2 text-xs text-zinc-400">
                {statusIcon}
                <span className="truncate max-w-[300px]">{sq.query}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

```

#### Step 2: `VerificationPanel` (The Killer Feature)

This is the new "Trust Layer". It must stand out but fit the theme.

* **Location:** `app/components/maxwell/verification-panel.tsx`

```tsx
// app/components/maxwell/verification-panel.tsx
'use client';

import { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { VerificationOutput, VerifiedClaim } from '@/app/lib/maxwell/types';

// Use a simplified internal card if specific ClaimCard doesn't exist
// If ClaimCard exists in your design system, IMPORT IT instead!

function ConfidenceBadge({ score }: { score: number }) {
  let color = 'bg-red-500/20 text-red-400 border-red-500/30';
  if (score >= 70) color = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  else if (score >= 40) color = 'bg-amber-500/20 text-amber-400 border-amber-500/30';

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${color}`}>
      {score}% TRUST
    </span>
  );
}

export function VerificationPanel({ verification }: { verification: VerificationOutput }) {
  const [isOpen, setIsOpen] = useState(true); // Default open to show off feature

  return (
    <div className="mt-6 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30">
      {/* Header */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-zinc-200">Fact Check</span>
          <ConfidenceBadge score={verification.overallConfidence} />
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>

      {/* Content */}
      {isOpen && (
        <div className="divide-y divide-zinc-800/50">
          {verification.claims.map(claim => (
            <ClaimRow key={claim.id} claim={claim} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimRow({ claim }: { claim: VerifiedClaim }) {
  const [expanded, setExpanded] = useState(false);

  const icon = {
    SUPPORTED: <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />,
    NEUTRAL: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
    CONTRADICTED: <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
  }[claim.entailment];

  return (
    <div className="group bg-zinc-900/20">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 flex gap-3 hover:bg-zinc-800/30 transition-colors"
      >
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1">
          <p className="text-sm text-zinc-300 leading-snug">{claim.text}</p>
        </div>
        <span className="text-xs text-zinc-500 font-mono shrink-0">
          {(claim.confidence * 100).toFixed(0)}%
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 ml-7 space-y-2">
          {/* Reasoning */}
          <div className="text-xs text-zinc-400 bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
            <span className="font-semibold text-zinc-500 block mb-1">Reasoning:</span>
            {claim.entailmentReasoning}
          </div>
          
          {/* Evidence */}
          <div className="text-xs text-zinc-400 bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
            <span className="font-semibold text-zinc-500 block mb-1">Evidence ({claim.bestMatchingSource.sourceTitle}):</span>
            "{claim.bestMatchingSource.passage}"
          </div>

          {/* Issues */}
          {claim.issues.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {claim.issues.map((issue, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  {issue}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

```

#### Step 3: `SourcesPanel` (Integration Check)

**Check First:** Does your app already have a component to list sources?

* **IF YES:** Update it to support the `Source` type from Maxwell (or map the types). Do not duplicate it.
* **IF NO:** Create the following standard component.

```tsx
// app/components/maxwell/sources-panel.tsx
'use client';

import { useState } from 'react';
import { Book, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { Source } from '@/app/lib/maxwell/types';

export function SourcesPanel({ sources }: { sources: Source[] }) {
  const [isOpen, setIsOpen] = useState(false);
  if (sources.length === 0) return null;

  return (
    <div className="mt-4 border-t border-zinc-800 pt-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Book className="w-3 h-3" />
        <span>{sources.length} Sources Cited</span>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          {sources.map((s, i) => (
            <a 
              key={s.id} 
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 p-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition-all group"
            >
              <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 border border-zinc-700 shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-300 truncate font-medium">{s.title}</div>
                <div className="text-[10px] text-zinc-500 truncate">{new URL(s.url).hostname}</div>
              </div>
              <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

```

#### Step 4: `app/components/maxwell/index.ts`

Export everything.

```typescript
export { ProgressDisplay } from './progress-display';
export { VerificationPanel } from './verification-panel';
export { SourcesPanel } from './sources-panel';

```

### Checklist

[ ] **Design Check:** Agent checked `confluence/design-guide.md` before starting.
[ ] **ProgressDisplay:** Created using existing design tokens.
[ ] **VerificationPanel:** Created as a new, distinct feature component.
[ ] **SourcesPanel:** Created OR integrated with existing source list.
[ ] **Integration:** Verified that components accept the types from `app/lib/maxwell/types.ts`.

Proceed to **Phase 12: Final Integration**.