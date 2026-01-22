# Phase 7: UI Implementation

> **Status**: Ready for Implementation  
> **Depends On**: Phase 6 (Hook Updates) ✅  
> **Effort**: 3 days (Days 7-9)  
> **Reference**: Section 10 & 10.5 of `/prd/maxwell-trader-revamp.prd.md`

---

## Overview

Transform Maxwell's UI from card-heavy prose display to a unified **Terminal Intelligence** panel that renders the `MaxwellIntelligence` JSON output from Phase 6.

### What We're Replacing

| Current Component | Status | Replacement |
|-------------------|--------|-------------|
| `VerdictCard.tsx` | DELETE | `AssessmentSection.tsx` |
| `AnalysisCard.tsx` | DELETE | `ThesisSection.tsx` |
| `ClaimsCard.tsx` | DELETE | `VerificationChecklist.tsx` |
| `SourcesGrid.tsx` | DELETE | `SourcesSection.tsx` |
| `MaxwellDashboard.tsx` | REFACTOR | Use `IntelligencePanel.tsx` |
| `MarketIntelligencePanel.tsx` | REFACTOR | Use `IntelligencePanel.tsx` |

### Design Philosophy

> **"Cards create visual noise. Panels create focus."**

- ONE unified panel, not 5 stacked cards
- Corner brackets frame (Terminal aesthetic)
- Typography hierarchy instead of borders
- Inline disclosure expansion
- Monospace for data, sans-serif for prose

---

## File Structure

```
app/components/maxwell/
├── IntelligencePanel.tsx              # Main container (NEW)
├── sections/
│   ├── HeaderSection.tsx              # ⚡ MAXWELL + waveform + metadata (NEW)
│   ├── AssessmentSection.tsx          # Verdict, range, headline (NEW)
│   ├── OutcomesSection.tsx            # Multi-outcome list (NEW)
│   ├── ThesisSection.tsx              # FOR/AGAINST factors (NEW)
│   ├── ResolutionRiskSection.tsx      # Risk scanner (NEW)
│   └── SourcesSection.tsx             # Collapsed sources (NEW)
├── primitives/
│   ├── PanelFrame.tsx                 # Corner bracket layout (NEW)
│   ├── MaxwellRangeBar.tsx            # Confidence interval viz (NEW)
│   ├── WaveformSignature.tsx          # ▁▂▃▄▅▆▇█ animated (NEW)
│   ├── VerificationChecklist.tsx      # ├─ ✓/✗ tree-style (NEW)
│   ├── FactorStrengthBar.tsx          # ████████░░ weighted (NEW)
│   ├── RiskGauge.tsx                  # ████░ risk meter (NEW)
│   ├── CatalystTimeline.tsx           # NOW ──●───● RESOLUTION (NEW)
│   ├── OutcomeDataBar.tsx             # Bar + price + verdict (NEW)
│   ├── DeltaGlow.tsx                  # Edge detection glow (NEW)
│   ├── DisclosureRow.tsx              # ▸/▾ expandable row (NEW)
│   ├── VerdictPill.tsx                # UNDERPRICED badge (NEW)
│   ├── SectionDivider.tsx             # Subtle 1px rule (NEW)
│   └── SkeletonBlock.tsx              # Loading placeholder (NEW)
└── modals/
    ├── SourcesModal.tsx               # Full sources list (NEW)
    ├── RawAnalysisModal.tsx           # Prose output (NEW)
    └── VerificationModal.tsx          # Claim details (NEW)
```

---

## Task Breakdown

### Day 7: Core Structure (7a)

#### Task 7a-1: Create `PanelFrame.tsx`
**File**: `app/components/maxwell/primitives/PanelFrame.tsx`

Corner bracket layout that frames the intelligence panel.

```typescript
interface PanelFrameProps {
  children: React.ReactNode;
  className?: string;
}
```

**Visual**:
```
┌─                                                               ─┐

  {children}

└─                                                               ─┘
```

**Implementation Details**:
- Use `position: absolute` for corner elements
- Corner size: `w-4 h-4` (16px)
- Border color: `border-white/20`
- On hover: `border-white/40` with 200ms transition
- NO background color on the frame itself
- Padding: `p-6` for content area

**Code Pattern**:
```tsx
<div className="relative">
  {/* Top-left corner */}
  <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-white/20 transition-colors duration-200 group-hover:border-white/40" />
  {/* Top-right corner */}
  <div className="absolute top-0 right-0 w-4 h-4 border-r border-t border-white/20 transition-colors duration-200 group-hover:border-white/40" />
  {/* Bottom-left corner */}
  <div className="absolute bottom-0 left-0 w-4 h-4 border-l border-b border-white/20 transition-colors duration-200 group-hover:border-white/40" />
  {/* Bottom-right corner */}
  <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-white/20 transition-colors duration-200 group-hover:border-white/40" />
  
  <div className="p-6">{children}</div>
</div>
```

---

#### Task 7a-2: Create `SectionDivider.tsx`
**File**: `app/components/maxwell/primitives/SectionDivider.tsx`

Subtle horizontal rule between sections.

```typescript
interface SectionDividerProps {
  className?: string;
}
```

**Implementation**:
```tsx
<div className={cn("h-px bg-white/5 my-6", className)} />
```

**CRITICAL**: Use `bg-white/5` (5% opacity), NOT visible borders.

---

#### Task 7a-3: Create `DisclosureRow.tsx`
**File**: `app/components/maxwell/primitives/DisclosureRow.tsx`

Expandable row with chevron indicator.

```typescript
interface DisclosureRowProps {
  label: string;
  metadata?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  warning?: boolean; // Shows amber indicator for HIGH risk
}
```

**States**:
- Collapsed: `▸ {label}` with optional metadata right-aligned
- Expanded: `▾ {label}` with children revealed below
- Warning: Amber `⚠` icon and `bg-amber-500/5` background when `warning=true`

**Behavior**:
- Click anywhere on row to toggle
- Hover: `bg-white/3`
- Chevron rotates 90° on expand
- Content animates height (200ms ease-out)
- Keyboard: Enter/Space to toggle

**Code Pattern**:
```tsx
const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? false);

<div>
  <button
    onClick={() => setIsExpanded(!isExpanded)}
    className={cn(
      "w-full flex items-center justify-between py-2 px-1 -mx-1 rounded",
      "hover:bg-white/[0.03] transition-colors duration-100",
      warning && "bg-amber-500/5"
    )}
  >
    <div className="flex items-center gap-2">
      <ChevronRight 
        className={cn(
          "w-4 h-4 text-white/40 transition-transform duration-200",
          isExpanded && "rotate-90"
        )} 
      />
      <span className="text-[13px] text-white/60">{label}</span>
      {warning && <span className="text-amber-500">⚠</span>}
    </div>
    {metadata && (
      <span className="text-[11px] text-white/40">{metadata}</span>
    )}
  </button>
  
  <AnimatePresence>
    {isExpanded && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="overflow-hidden"
      >
        <div className="pl-6 pt-3">{children}</div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

---

#### Task 7a-4: Create `VerdictPill.tsx`
**File**: `app/components/maxwell/primitives/VerdictPill.tsx`

Colored badge showing verdict.

```typescript
type Verdict = 'UNDERPRICED' | 'OVERPRICED' | 'FAIR' | 'UNCERTAIN';

interface VerdictPillProps {
  verdict: Verdict;
  glow?: boolean; // Enable delta glow effect
  className?: string;
}
```

**Color Mapping** (uses existing design tokens):
| Verdict | Background | Text | Glow |
|---------|------------|------|------|
| UNDERPRICED | `bg-[#4ade80]/10` | `text-[#4ade80]` | `shadow-[0_0_12px_rgba(74,222,128,0.3)]` |
| OVERPRICED | `bg-[#f87171]/10` | `text-[#f87171]` | `shadow-[0_0_12px_rgba(248,113,113,0.3)]` |
| FAIR | `bg-white/5` | `text-[#8f8f8f]` | none |
| UNCERTAIN | `bg-[#fbbf24]/10` | `text-[#fbbf24]` | `shadow-[0_0_12px_rgba(251,191,36,0.3)]` |

**Implementation**:
```tsx
const VERDICT_STYLES: Record<Verdict, { bg: string; text: string; glow: string }> = {
  UNDERPRICED: {
    bg: 'bg-[#4ade80]/10',
    text: 'text-[#4ade80]',
    glow: 'shadow-[0_0_12px_rgba(74,222,128,0.3)]',
  },
  OVERPRICED: {
    bg: 'bg-[#f87171]/10',
    text: 'text-[#f87171]',
    glow: 'shadow-[0_0_12px_rgba(248,113,113,0.3)]',
  },
  FAIR: {
    bg: 'bg-white/5',
    text: 'text-[#8f8f8f]',
    glow: '',
  },
  UNCERTAIN: {
    bg: 'bg-[#fbbf24]/10',
    text: 'text-[#fbbf24]',
    glow: 'shadow-[0_0_12px_rgba(251,191,36,0.3)]',
  },
};

<span
  className={cn(
    "px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider",
    styles.bg,
    styles.text,
    glow && styles.glow,
    className
  )}
>
  {verdict}
</span>
```

---

#### Task 7a-5: Create `SkeletonBlock.tsx`
**File**: `app/components/maxwell/primitives/SkeletonBlock.tsx`

Loading placeholder with pulse animation.

```typescript
interface SkeletonBlockProps {
  width?: string; // e.g., "w-32", "w-full"
  height?: string; // e.g., "h-4", "h-6"
  className?: string;
}
```

**Implementation**:
```tsx
<div
  className={cn(
    "bg-white/5 rounded animate-pulse",
    width ?? "w-full",
    height ?? "h-4",
    className
  )}
/>
```

**CRITICAL**: Use subtle pulse, NOT spinners. Spinners feel cheap.

---

#### Task 7a-6: Create `HeaderSection.tsx`
**File**: `app/components/maxwell/sections/HeaderSection.tsx`

Panel header with Maxwell branding, waveform, and metadata.

```typescript
interface HeaderSectionProps {
  deadline: string; // "23d"
  verificationScore: number; // 0-100
  isFresh?: boolean; // < 1 hour old, enables pulse
  isLoading?: boolean;
}
```

**Layout**:
```
⚡ MAXWELL ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁                    23d   ●  82%
```

**Elements**:
- `⚡` icon (Zap from lucide-react)
- "MAXWELL" in uppercase, tracking-widest, text-white/60
- Waveform signature (see `WaveformSignature.tsx`)
- Deadline badge (monospace, text-white/40)
- Verification dot (`●`) colored by score
- Score percentage (monospace)

**Verification Dot Colors**:
| Score | Color |
|-------|-------|
| 70-100 | `#4ade80` (green) |
| 40-69 | `#fbbf24` (amber) |
| 0-39 | `#f87171` (red) |

**Loading State**:
- Replace waveform + metadata with "Analyzing..." text
- Subtle skeleton pulse

---

#### Task 7a-7: Create `AssessmentSection.tsx`
**File**: `app/components/maxwell/sections/AssessmentSection.tsx`

Primary verdict display with Maxwell range.

```typescript
interface AssessmentSectionProps {
  primaryOutcome: string; // "SEATTLE" or "YES"
  marketPrice: number; // 0.24
  maxwellRange: {
    low: number;
    mid: number;
    high: number;
  };
  verdict: 'UNDERPRICED' | 'OVERPRICED' | 'FAIR' | 'UNCERTAIN';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  headline: string;
  isLoading?: boolean;
}
```

**Layout**:
```
SEATTLE                                      UNDERPRICED
24%  →  22% – 28% – 34%

Seattle has health advantage the market is underweighting
```

**Elements**:
1. **Primary Outcome**: Uppercase, `text-[16px]`, `text-[#e8e8e8]`, `font-medium`
2. **Verdict Pill**: Right-aligned, uses `VerdictPill.tsx`
3. **Price Range**: 
   - Market price: `text-[#8f8f8f]`
   - Arrow: `text-[#525252]`
   - Low/High: `text-[#8f8f8f]`
   - Mid: `text-[#e8e8e8]` (brightest)
   - All monospace, tabular-nums
4. **Headline**: `text-[14px]`, `text-white/70`, italic

**Delta Glow Logic**:
```typescript
const delta = maxwellRange.mid - marketPrice;
const hasSignificantDelta = Math.abs(delta) >= 0.04;
// Pass glow={hasSignificantDelta} to VerdictPill
```

**Loading State**: Skeleton blocks for outcome, range, headline

---

#### Task 7a-8: Create `OutcomesSection.tsx`
**File**: `app/components/maxwell/sections/OutcomesSection.tsx`

Multi-outcome list with verdicts.

```typescript
interface OutcomesSectionProps {
  outcomes: Array<{
    name: string;
    marketPrice: number;
    maxwellRange: { low: number; mid: number; high: number };
    view: 'UNDERPRICED' | 'OVERPRICED' | 'FAIR' | 'UNCERTAIN';
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    oneLiner: string;
    rank: number;
  }>;
  defaultVisibleCount?: number; // Default 4
  isLoading?: boolean;
}
```

**Layout** (each outcome row):
```
Seattle        24%   UNDERPRICED   Healthiest playoff roster
LA Rams        21%   FAIR          Strong offense, weather risk
Buffalo        14%   OVERPRICED    WR injuries limit ceiling
New England    13%   FAIR          Underdog value

▸ 4 more outcomes
```

**Row Structure**:
- Name: `text-[13px]`, rank 1 gets `text-[#e8e8e8] font-medium`, others `text-white/60`
- Price: `text-[13px] font-mono tabular-nums`, rank 1 bright, others dim
- Verdict: Small pill variant (no glow)
- One-liner: `text-[12px] text-white/40`, truncated with ellipsis

**Expand Behavior**:
- Show first 4 outcomes
- "▸ N more outcomes" disclosure row
- Click to expand all

**Hover**: `bg-white/[0.03]` on row

---

#### Task 7a-9: Create `ThesisSection.tsx`
**File**: `app/components/maxwell/sections/ThesisSection.tsx`

FOR/AGAINST factors with strength bars.

```typescript
interface ThesisSectionProps {
  factorsFor: Array<{
    point: string;
    evidence: string;
    sourceIndex: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  factorsAgainst: Array<{
    point: string;
    evidence: string;
    sourceIndex: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  keyUncertainty: string;
  nextCatalyst: {
    event: string;
    date?: string;
    impact: string;
  };
  sourceConflicts?: string[];
  sources: Array<{ title: string; domain: string }>;
  defaultExpanded?: boolean;
  isLoading?: boolean;
}
```

**Layout** (expanded):
```
▾ Thesis

  FOR                           AGAINST
  ● Healthiest roster           ● No SB experience
    ESPN                          NFL.com
  ● Home field through NFC      ● AFC battle-tested
    Pro Football Reference        ESPN
  ● Best playoff defense        ● Weaker SOS
    NFL.com                       FiveThirtyEight

  KEY UNCERTAINTY
  Any key injury fundamentally changes equation

  NEXT CATALYST
  Divisional Round (Jan 18) — clarifies path
```

**Subcomponents**:
- Uses `DisclosureRow.tsx` for collapse
- Uses `FactorStrengthBar.tsx` for factor confidence
- Two-column layout for FOR/AGAINST (use CSS grid)
- Source name extracted from `sources[sourceIndex]`

**Source Display**: Show domain only (e.g., "ESPN" not full title)

---

#### Task 7a-10: Create `ResolutionRiskSection.tsx`
**File**: `app/components/maxwell/sections/ResolutionRiskSection.tsx`

Resolution risk scanner display.

```typescript
interface ResolutionRiskSectionProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number; // 0-100
  factors: string[];
  historicalDisputes?: string;
  defaultExpanded?: boolean;
  isLoading?: boolean;
}
```

**Layout** (expanded, HIGH risk):
```
▾ Resolution risk · HIGH                          ⚠
  ⚠ Ambiguous term: "officially announced" undefined
  ⚠ Resolution source is social media post
  ⚠ Similar markets had 23% historical dispute rate

  Consider this risk before entering a position.
```

**Behavior**:
- Uses `DisclosureRow.tsx` with `warning={level === 'HIGH'}`
- HIGH risk: amber background (`bg-amber-500/5`)
- Each factor prefixed with `⚠` in amber
- Uses `RiskGauge.tsx` for score visualization
- Shows risk level pill next to label

**Risk Level Colors**:
| Level | Color |
|-------|-------|
| LOW | `#4ade80` |
| MEDIUM | `#fbbf24` |
| HIGH | `#f87171` |

---

#### Task 7a-11: Create `SourcesSection.tsx`
**File**: `app/components/maxwell/sections/SourcesSection.tsx`

Collapsed sources with modal access.

```typescript
interface SourcesSectionProps {
  sources: Array<{
    index: number;
    title: string;
    url: string;
    snippet: string;
    date?: string;
  }>;
  topSources: Array<{
    title: string;
    domain: string;
    relevanceScore: number;
  }>;
  verification: {
    score: number;
    sourcesAnalyzed: number;
    claimsVerified: number;
    claimsDisputed: number;
  };
  rawSynthesis: string;
  rawAdjudication: string;
  defaultExpanded?: boolean;
  isLoading?: boolean;
}
```

**Layout** (expanded):
```
▾ Sources (30)
  ESPN · NFL.com · Pro Football Reference · Reuters · +26

  ▸ View all sources
  ▸ Raw analysis
  ▸ Verification details
```

**Behavior**:
- Top 4 sources shown as domain tags
- "+N" badge for remaining
- Nested disclosure rows for modals
- "View all sources" opens `SourcesModal.tsx`
- "Raw analysis" opens `RawAnalysisModal.tsx`
- "Verification details" opens `VerificationModal.tsx`

---

#### Task 7a-12: Create `IntelligencePanel.tsx`
**File**: `app/components/maxwell/IntelligencePanel.tsx`

Main container that composes all sections.

```typescript
interface IntelligencePanelProps {
  intelligence: MaxwellIntelligence | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  defaultExpandedSections?: Array<'thesis' | 'risk' | 'sources'>;
}
```

**Structure**:
```tsx
<PanelFrame>
  <HeaderSection ... />
  <SectionDivider />
  
  <AssessmentSection ... />
  <SectionDivider />
  
  {intelligence.outcomes && intelligence.outcomes.length > 0 && (
    <>
      <OutcomesSection ... />
      <SectionDivider />
    </>
  )}
  
  <ThesisSection ... />
  <ResolutionRiskSection ... />
  <SourcesSection ... />
</PanelFrame>
```

**States**:
1. **Loading**: Show `HeaderSection` with "Analyzing...", skeleton blocks
2. **Error**: Show error message with Retry button
3. **Complete**: Full panel with all sections

**Error State Layout**:
```
┌─                                                               ─┐

  ⚡ MAXWELL                                              ⚠

  ─────────────────────────────────────────────────────────────────

  Analysis failed
  Unable to complete research. This may be a temporary issue.

  [Retry]

└─                                                               ─┘
```

---

### Day 8: Terminal Intelligence Primitives (7b)

#### Task 7b-1: Create `WaveformSignature.tsx`
**File**: `app/components/maxwell/primitives/WaveformSignature.tsx`

Animated waveform that encodes confidence.

```typescript
interface WaveformSignatureProps {
  confidence: number; // 0-100
  isFresh?: boolean; // Enables pulse animation
  className?: string;
}
```

**Implementation**:
```tsx
const WAVEFORM_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

function generateWaveform(confidence: number): string {
  const normalizedConfidence = Math.min(100, Math.max(0, confidence)) / 100;
  const peakIndex = Math.floor(normalizedConfidence * 7);
  
  const wave = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0]
    .map(i => Math.min(i, peakIndex))
    .map(i => WAVEFORM_CHARS[i])
    .join('');
  
  return wave;
}

<span
  className={cn(
    "font-mono text-[12px] text-white/60",
    isFresh && "animate-pulse",
    className
  )}
>
  {generateWaveform(confidence)}
</span>
```

**Animation CSS** (add to globals.css if not present):
```css
@keyframes waveform-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.waveform-fresh {
  animation: waveform-pulse 2s ease-in-out infinite;
}
```

---

#### Task 7b-2: Create `MaxwellRangeBar.tsx`
**File**: `app/components/maxwell/primitives/MaxwellRangeBar.tsx`

Visual confidence interval with market price marker.

```typescript
interface MaxwellRangeBarProps {
  marketPrice: number; // 0.24
  low: number; // 0.22
  mid: number; // 0.28
  high: number; // 0.34
  className?: string;
}
```

**Visual** (simplified inline version):
```
     22%──────[███████████]──────34%
              ↑ 28% MAXWELL
         ↑ 24% MARKET
```

**Implementation Approach**:
1. Calculate positions as percentages (0-100 scale normalized to low-high range)
2. Render bar with gradient from low to high
3. Solid block at mid position
4. Vertical marker at market price position
5. When market outside range, show gap with subtle glow

**Code Pattern**:
```tsx
const rangeWidth = high - low;
const midPosition = ((mid - low) / rangeWidth) * 100;
const marketPosition = ((marketPrice - low) / rangeWidth) * 100;
const marketOutsideRange = marketPrice < low || marketPrice > high;

<div className="relative h-4 w-full">
  {/* Background track */}
  <div className="absolute inset-0 bg-white/5 rounded-full" />
  
  {/* Maxwell range */}
  <div 
    className="absolute top-0 h-full bg-white/20 rounded-full"
    style={{ left: '0%', width: '100%' }}
  />
  
  {/* Mid marker (brightest) */}
  <div 
    className="absolute top-0 h-full w-1 bg-white/80 rounded-full"
    style={{ left: `${midPosition}%` }}
  />
  
  {/* Market price marker */}
  <div 
    className={cn(
      "absolute top-0 h-full w-0.5 rounded-full",
      marketOutsideRange ? "bg-amber-500" : "bg-[#4ade80]"
    )}
    style={{ left: `${Math.max(0, Math.min(100, marketPosition))}%` }}
  />
</div>
```

---

#### Task 7b-3: Create `VerificationChecklist.tsx`
**File**: `app/components/maxwell/primitives/VerificationChecklist.tsx`

Tree-style verification status display.

```typescript
interface VerificationChecklistProps {
  sourcesAnalyzed: number;
  claimsVerified: number;
  claimsDisputed: number;
  score: number;
  className?: string;
}
```

**Layout**:
```
├─ ✓  30 sources analyzed
├─ ✓  24 claims verified
├─ ✗  6 claims disputed
└─ ●  82% confidence
```

**Implementation**:
```tsx
<div className="font-mono text-[12px] space-y-1">
  <div className="flex items-center gap-2">
    <span className="text-white/30">├─</span>
    <span className="text-[#4ade80]">✓</span>
    <span className="text-white/60">{sourcesAnalyzed} sources analyzed</span>
  </div>
  <div className="flex items-center gap-2">
    <span className="text-white/30">├─</span>
    <span className="text-[#4ade80]">✓</span>
    <span className="text-white/60">{claimsVerified} claims verified</span>
  </div>
  {claimsDisputed > 0 && (
    <div className="flex items-center gap-2">
      <span className="text-white/30">├─</span>
      <span className="text-[#f87171]">✗</span>
      <span className="text-white/60">{claimsDisputed} claims disputed</span>
    </div>
  )}
  <div className="flex items-center gap-2">
    <span className="text-white/30">└─</span>
    <span className="text-white/80">●</span>
    <span className="text-white/80">{Math.round(score)}% confidence</span>
  </div>
</div>
```

---

#### Task 7b-4: Create `FactorStrengthBar.tsx`
**File**: `app/components/maxwell/primitives/FactorStrengthBar.tsx`

Weighted reasoning bar using block characters.

```typescript
interface FactorStrengthBarProps {
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  className?: string;
}
```

**Confidence Mapping**:
| Confidence | Filled Blocks | Display |
|------------|---------------|---------|
| HIGH | 8 | `████████░░` |
| MEDIUM | 5 | `█████░░░░░` |
| LOW | 2 | `██░░░░░░░░` |

**Implementation**:
```tsx
const CONFIDENCE_BLOCKS: Record<string, number> = {
  HIGH: 8,
  MEDIUM: 5,
  LOW: 2,
};

const filled = CONFIDENCE_BLOCKS[confidence] ?? 5;
const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

<span className="font-mono text-[12px] text-white/40">{bar}</span>
```

---

#### Task 7b-5: Create `RiskGauge.tsx`
**File**: `app/components/maxwell/primitives/RiskGauge.tsx`

Risk meter visualization.

```typescript
interface RiskGaugeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number; // 0-100
  className?: string;
}
```

**Visual**:
- LOW: `████░` (green)
- MEDIUM: `████░` (amber)
- HIGH: `████░` (red)

**Implementation**:
```tsx
const LEVEL_CONFIG: Record<string, { blocks: number; color: string }> = {
  LOW: { blocks: 1, color: 'text-[#4ade80]' },
  MEDIUM: { blocks: 3, color: 'text-[#fbbf24]' },
  HIGH: { blocks: 5, color: 'text-[#f87171]' },
};

const config = LEVEL_CONFIG[level];
const filled = config.blocks;
const bar = '█'.repeat(filled) + '░'.repeat(5 - filled);

<span className={cn("font-mono text-[12px]", config.color)}>{bar}</span>
```

---

#### Task 7b-6: Create `CatalystTimeline.tsx`
**File**: `app/components/maxwell/primitives/CatalystTimeline.tsx`

Temporal context visualization.

```typescript
interface CatalystTimelineProps {
  catalysts: Array<{
    event: string;
    date: string; // ISO date
  }>;
  resolutionDate: string; // ISO date
  className?: string;
}
```

**Visual**:
```
NOW ──────●───────────────────────●─────────────● RESOLUTION
          ↑                       ↑             ↑
     Divisional              Conference      Super Bowl
       Jan 18                  Jan 26          Feb 9
```

**Implementation Notes**:
- Calculate relative positions based on dates
- NOW marker at left (0%)
- Resolution date at right (100%)
- Catalysts positioned proportionally
- Use monospace font for alignment
- Line: `─` character repeated
- Markers: `●`

---

#### Task 7b-7: Create `OutcomeDataBar.tsx`
**File**: `app/components/maxwell/primitives/OutcomeDataBar.tsx`

Horizontal data bar for outcomes.

```typescript
interface OutcomeDataBarProps {
  percentage: number; // 0-100
  color?: string; // Outcome color for chart continuity
  className?: string;
}
```

**Visual**:
```
████████████████████████░░░░░░░░░░  24%
```

**Implementation**:
```tsx
const filled = Math.round(percentage / 100 * 34);
const bar = '█'.repeat(filled) + '░'.repeat(34 - filled);

<span 
  className={cn("font-mono text-[12px]", className)}
  style={{ color }}
>
  {bar}
</span>
```

---

#### Task 7b-8: Create `DeltaGlow.tsx`
**File**: `app/components/maxwell/primitives/DeltaGlow.tsx`

Edge detection glow effect wrapper.

```typescript
interface DeltaGlowProps {
  delta: number; // Maxwell mid - market price
  threshold?: number; // Default 0.04 (4%)
  children: React.ReactNode;
  className?: string;
}
```

**Behavior**:
- If `|delta| >= threshold`:
  - Positive delta (underpriced): green glow
  - Negative delta (overpriced): red glow
- Glow animates with subtle pulse

**Implementation**:
```tsx
const hasSignificantDelta = Math.abs(delta) >= (threshold ?? 0.04);
const isUnderpriced = delta > 0;

const glowClass = hasSignificantDelta
  ? isUnderpriced
    ? "shadow-[0_0_12px_rgba(74,222,128,0.3)] animate-edge-glow-green"
    : "shadow-[0_0_12px_rgba(248,113,113,0.3)] animate-edge-glow-red"
  : "";

<div className={cn(glowClass, className)}>{children}</div>
```

**CSS Animations**:
```css
@keyframes edge-glow-green {
  0%, 100% { box-shadow: 0 0 8px rgba(74, 222, 128, 0.2); }
  50% { box-shadow: 0 0 16px rgba(74, 222, 128, 0.4); }
}

@keyframes edge-glow-red {
  0%, 100% { box-shadow: 0 0 8px rgba(248, 113, 113, 0.2); }
  50% { box-shadow: 0 0 16px rgba(248, 113, 113, 0.4); }
}

.animate-edge-glow-green {
  animation: edge-glow-green 3s ease-in-out infinite;
}

.animate-edge-glow-red {
  animation: edge-glow-red 3s ease-in-out infinite;
}
```

---

### Day 8 Continued: Modals (7c)

#### Task 7c-1: Create `SourcesModal.tsx`
**File**: `app/components/maxwell/modals/SourcesModal.tsx`

Full sources list in modal.

```typescript
interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: Array<{
    index: number;
    title: string;
    url: string;
    snippet: string;
    date?: string;
  }>;
  topSources: Array<{
    title: string;
    domain: string;
    relevanceScore: number;
  }>;
}
```

**Layout**:
- Modal with dark overlay
- List of all sources
- Each source: title, domain, snippet, date
- Click to open URL in new tab
- Relevance score shown for top sources

---

#### Task 7c-2: Create `RawAnalysisModal.tsx`
**File**: `app/components/maxwell/modals/RawAnalysisModal.tsx`

Prose output modal.

```typescript
interface RawAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  synthesis: string;
  adjudication: string;
}
```

**Layout**:
- Tabs: "Synthesis" | "Adjudication"
- Markdown rendering of content
- Scrollable content area

---

#### Task 7c-3: Create `VerificationModal.tsx`
**File**: `app/components/maxwell/modals/VerificationModal.tsx`

Claim verification details.

```typescript
interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  claims: Array<{
    id: string;
    text: string;
    confidence: number;
    entailment: 'SUPPORTED' | 'CONTRADICTED' | 'NEUTRAL';
  }>;
  verification: {
    score: number;
    sourcesAnalyzed: number;
    claimsVerified: number;
    claimsDisputed: number;
  };
}
```

**Layout**:
- Summary stats at top
- List of all claims with entailment status
- Color coding: SUPPORTED (green), CONTRADICTED (red), NEUTRAL (gray)

---

### Day 9: Integration & Polish (Phase 8 overlap)

#### Task 8-1: Update `MaxwellDashboard.tsx`
**File**: `app/components/maxwell/MaxwellDashboard.tsx`

Replace card-based layout with `IntelligencePanel`.

**Changes**:
1. Import `IntelligencePanel`
2. When `intelligence` is available, render `IntelligencePanel`
3. Keep `PhaseProgress` for loading state
4. Remove imports for old cards

```tsx
// OLD
import { VerdictCard } from './VerdictCard';
import { AnalysisCard } from './AnalysisCard';
import { ClaimsCard } from './ClaimsCard';
import { SourcesGrid } from './SourcesGrid';

// NEW
import { IntelligencePanel } from './IntelligencePanel';
import { PhaseProgress } from './PhaseProgress';
```

---

#### Task 8-2: Update `MarketIntelligencePanel.tsx`
**File**: `app/components/maxwell/MarketIntelligencePanel.tsx`

Same changes as Dashboard - use new `IntelligencePanel`.

**Props Update**:
```typescript
interface MarketIntelligencePanelProps {
  intelligence: MaxwellIntelligence | null;
  phase: ExecutionPhase;
  phaseDurations: PhaseDurations;
  phaseStartTimes: Record<string, number>;
  error: string | null;
  onQuery: (query: string) => void;
  onRunAnalysis?: (forceRefresh?: boolean) => void;
  market?: UnifiedMarket;
  isCached?: boolean;
  cacheTimestamp?: number;
}
```

---

#### Task 8-3: Update `markets/[id]/page.tsx`
**File**: `app/markets/[id]/page.tsx`

Pass `MarketContext` and `intelligence` to components.

**Changes**:
1. Construct `MarketContext` from `UnifiedMarket` data
2. Pass `intelligence` from `maxwell.intelligence`
3. Update `onRunAnalysis` to pass `MarketContext`

---

#### Task 8-4: Delete Old Components
**Files to DELETE**:
- `app/components/maxwell/VerdictCard.tsx`
- `app/components/maxwell/AnalysisCard.tsx`
- `app/components/maxwell/ClaimsCard.tsx`
- `app/components/maxwell/SourcesGrid.tsx`
- `app/components/maxwell/ClaimHeatmap.tsx`
- `app/components/maxwell/AdjudicationPanel.tsx`

**CRITICAL**: Only delete after verifying `IntelligencePanel` works.

---

#### Task 8-5: Add CSS Animations
**File**: `app/globals.css`

Add animation keyframes if not present:

```css
/* Waveform pulse for fresh analysis */
@keyframes waveform-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.animate-waveform-pulse {
  animation: waveform-pulse 2s ease-in-out infinite;
}

/* Delta glow for significant edge */
@keyframes edge-glow-green {
  0%, 100% { box-shadow: 0 0 8px rgba(74, 222, 128, 0.2); }
  50% { box-shadow: 0 0 16px rgba(74, 222, 128, 0.4); }
}

@keyframes edge-glow-red {
  0%, 100% { box-shadow: 0 0 8px rgba(248, 113, 113, 0.2); }
  50% { box-shadow: 0 0 16px rgba(248, 113, 113, 0.4); }
}

.animate-edge-glow-green {
  animation: edge-glow-green 3s ease-in-out infinite;
}

.animate-edge-glow-red {
  animation: edge-glow-red 3s ease-in-out infinite;
}
```

---

## Design Tokens Reference

All colors from existing `globals.css`:

```css
/* Backgrounds */
--bg-primary: #0a0a0a;
--bg-surface: #141414;
--bg-elevated: #1a1a1a;

/* Text (OFF-WHITE, not pure white) */
--text-primary: #e8e8e8;
--text-secondary: #8f8f8f;
--text-tertiary: #525252;

/* Borders */
--border-subtle: rgba(255, 255, 255, 0.05);
--border-default: rgba(255, 255, 255, 0.08);

/* Status */
--verified: #4ade80;
--flagged: #fbbf24;
--failed: #f87171;

/* Brand */
--brand-accent: #6f3bf5;
```

**Verdict Colors** (map to existing):
- UNDERPRICED → `--verified` (#4ade80)
- OVERPRICED → `--failed` (#f87171)
- FAIR → `--text-secondary` (#8f8f8f)
- UNCERTAIN → `--flagged` (#fbbf24)

---

## Typography Reference

| Element | Size | Color | Font | Extra |
|---------|------|-------|------|-------|
| Section label | 10px | `text-white/25` | Sans | `uppercase tracking-widest font-medium` |
| Primary text | 13-14px | `#e8e8e8` | Sans | — |
| Secondary text | 13px | `text-white/60` | Sans | — |
| Muted text | 11-12px | `text-white/40` | Sans | — |
| Data values | 13px | varies | Mono | `tabular-nums` |
| Waveform | 12px | `text-white/60` | Mono | Block characters |
| Checklist | 12px | varies | Mono | `├─`, `└─` characters |

---

## Testing Checklist

### Visual Tests
- [ ] Panel renders with corner brackets
- [ ] All sections have correct typography
- [ ] Disclosure rows expand/collapse smoothly
- [ ] Verdict pills show correct colors
- [ ] Delta glow appears on significant differences
- [ ] Waveform animates when fresh
- [ ] Loading state shows skeleton blocks
- [ ] Error state shows retry button

### Interaction Tests
- [ ] Disclosure rows toggle on click
- [ ] Disclosure rows toggle on Enter key
- [ ] Hover states work on all interactive elements
- [ ] Modals open and close correctly
- [ ] Source links open in new tab

### Integration Tests
- [ ] `IntelligencePanel` receives `MaxwellIntelligence` correctly
- [ ] Loading state shows during analysis
- [ ] Error state shows on failure with retry
- [ ] Cached analysis hydrates correctly

### Responsive Tests
- [ ] Desktop (≥1024px): Full panel, all sections
- [ ] Tablet (768-1023px): Thesis collapsed by default
- [ ] Mobile (<768px): Only Assessment + Outcomes visible

---

## Success Criteria

1. **Zero card borders** — Only corner brackets on outer panel
2. **Typography hierarchy** — Sections differentiated by text style, not boxes
3. **Inline expansion** — All disclosures expand in place
4. **Terminal aesthetic** — Monospace data, tree-style lists, block characters
5. **Premium feel** — Smooth animations, subtle hover states
6. **Build passes** — No TypeScript errors
7. **Tests pass** — All 448+ existing tests still pass

---

## Dependencies

- `framer-motion` — Already installed, use for animations
- `lucide-react` — Already installed, use for icons (ChevronRight, Zap, AlertTriangle)
- `clsx` / `cn` utility — Already available

---

## Out of Scope for Phase 7

- Keyboard navigation (except Enter for disclosure)
- Screen reader accessibility (Phase 9)
- Unit tests for UI components (Phase 9)
- Performance optimization (Phase 9)

---

_End of Phase 7 PRD_
