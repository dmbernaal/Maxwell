# Maxwell Prediction Markets - Design PRD

**Version**: 2.0 (Refined)  
**Last Updated**: January 2025  
**Status**: Draft - Pending Approval

---

## Design Philosophy

### Design DNA: **Luxury/Refined**

Maxwell embodies "**Breathing Obsidian**" - a dark, mysterious aesthetic where content floats naturally on a deep void. The interface should feel like polished obsidian illuminated by moonlight.

**Core Principles:**
1. **NO SEPARATORS** - Use space and opacity, never lines or color divisions
2. **Content Flows** - Every element breathes into the next
3. **Subdued Elegance** - Alpha borders, glassmorphism, negative tracking
4. **Match Existing Maxwell** - Improve, don't deviate

---

## 1. Color System

### Backgrounds (The Void)

```css
--bg-void: #0A090C;        /* Deepest layer */
--bg-primary: #120F14;     /* Main background */
--bg-surface: #18151d;     /* Floating elements - SUBTLE */
--bg-elevated: #1f1b26;    /* Modals only */

/* CRITICAL: Use bg-white/[0.02] instead of surfaces when possible */
/* This creates definition without harsh edges */
```

### Text Hierarchy (Moonlight)

```css
/* Never use pure white - too harsh */
--text-primary: rgba(255,255,255,0.90);    /* Headlines */
--text-secondary: rgba(255,255,255,0.70);  /* Body */
--text-tertiary: rgba(255,255,255,0.50);   /* Secondary info */
--text-muted: rgba(255,255,255,0.30);      /* Labels, hints */
--text-ghost: rgba(255,255,255,0.20);      /* Barely visible */
```

### Platform Colors

```css
/* Polymarket */
--poly-primary: #2E90FA;
--poly-muted: rgba(46, 144, 250, 0.10);
--poly-border: rgba(46, 144, 250, 0.20);

/* Kalshi */
--kalshi-primary: #12B76A;
--kalshi-muted: rgba(18, 183, 106, 0.10);
--kalshi-border: rgba(18, 183, 106, 0.20);
```

### Semantic Colors

```css
/* Verification Status */
--verified: #4ade80;       /* SUPPORTED claims */
--uncertain: #fbbf24;      /* NEUTRAL claims */
--contradicted: #f87171;   /* CONTRADICTED claims */

/* Market Direction */
--bullish: #10B981;        /* YES trending */
--bearish: #F43F5E;        /* NO trending */

/* Brand (Use Sparingly) */
--brand-accent: #6F3BF5;
--brand-glow: rgba(111, 59, 245, 0.15);
```

### Borders (Almost Invisible)

```css
/* RULE: Borders should whisper, not shout */
--border-ghost: rgba(255,255,255,0.05);   /* Default */
--border-subtle: rgba(255,255,255,0.08);  /* Hover */
--border-visible: rgba(255,255,255,0.12); /* Focus */

/* BANNED: border-white/20 or higher - too harsh */
```

---

## 2. Typography

### Font Stack

```css
--font-sans: 'Geist Sans', 'Inter', system-ui, sans-serif;
--font-mono: 'Geist Mono', 'JetBrains Mono', monospace;
```

### Scale with Tracking

| Token | Size | Weight | Tracking | Use |
|-------|------|--------|----------|-----|
| `display` | 48-64px | 300 | `-0.03em` | Verdict headline ("YES", "UNLIKELY") |
| `h1` | 32px | 500 | `-0.02em` | Market title |
| `h2` | 24px | 500 | `-0.02em` | Section headers |
| `body-lg` | 18px | 400 | `0` | Deep analysis text |
| `body` | 14px | 400 | `0` | Default |
| `caption` | 11px | 500 | `0.15em` | Labels (UPPERCASE) |
| `mono-lg` | 32px | 700 | `-0.01em` | Odds display |
| `mono` | 12px | 500 | `0` | Data, prices |

---

## 3. Motion Physics

### Spring Constants (Framer Motion)

```typescript
// Snappy interactions (buttons, cards)
const SPRING_SNAPPY = { type: 'spring', stiffness: 400, damping: 30 };

// Default (panels, modals)  
const SPRING_DEFAULT = { type: 'spring', stiffness: 300, damping: 40 };

// Gentle (background, ambient)
const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 30 };
```

### Interaction States

```css
/* Hover - Lift, don't brighten */
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px -8px rgba(0,0,0,0.5);
}

/* Active - Press in */
.button:active {
  transform: scale(0.98);
}

/* Focus - Brand ring */
.interactive:focus-visible {
  outline: 2px solid var(--brand-accent);
  outline-offset: 2px;
}
```

---

## 4. Screen Wireframes

### Landing Page (`/`)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│                                                                 │
│                       👻                                        │
│                  (Ghost Logo)                                   │
│                   120 × 120                                     │
│                                                                 │
│                                                                 │
│               "Hi, I am Maxwell."                               │
│              (text-2xl text-white/80)                           │
│                                                                 │
│                                                                 │
│    ┌─────────────────────────────────────────────────────┐     │
│    │  🔍  Search prediction markets...                    │     │
│    │     (InputInterface - pill shape, spotlight glow)   │     │
│    └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          │ (on focus)                           │
│                          ▼                                      │
│    ┌─────────────────────────────────────────────────────┐     │
│    │  TRENDING MARKETS                                   │     │
│    │                                                      │     │
│    │  ┌────────────────────────────────────────────────┐ │     │
│    │  │ 🔷  Will Trump win 2024?           67%  $21M  │ │     │
│    │  │     ↳ Polymarket · Politics                    │ │     │
│    │  └────────────────────────────────────────────────┘ │     │
│    │                                                      │     │
│    │  ┌────────────────────────────────────────────────┐ │     │
│    │  │ 🟢  Fed rate cut by March?         42%  $8M   │ │     │
│    │  │     ↳ Kalshi · Economics                       │ │     │
│    │  └────────────────────────────────────────────────┘ │     │
│    │                                                      │     │
│    │  ┌────────────────────────────────────────────────┐ │     │
│    │  │ 🔷🟢 Bitcoin > $100k by EOY?       34%  $15M  │ │     │
│    │  │      ↳ Both platforms                          │ │     │
│    │  └────────────────────────────────────────────────┘ │     │
│    └─────────────────────────────────────────────────────┘     │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

NOTES:
- Dropdown appears on focus, no trigger needed
- 🔷 = Polymarket (blue circle)
- 🟢 = Kalshi (green circle)  
- 🔷🟢 = Both platforms (show both icons)
- Dropdown uses bg-[#18151d]/90 backdrop-blur-xl
- NO border on dropdown - just shadow and blur
```

### MarketAutocomplete Item Detail

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌────┐                                            ┌──────┐ │
│  │ 🔷 │  Will Bitcoin reach $100,000 by EOY?      │  34% │ │
│  │    │                                            │ Prob │ │
│  └────┘  Polymarket · Crypto · $15.2M Vol          └──────┘ │
│          ─────────────                                       │
│          (text-white/40, platform color underline)          │
│                                                              │
└──────────────────────────────────────────────────────────────┘

STRUCTURE:
- Left: Platform icon in colored bg (w-10 h-10 rounded-full)
- Center: Title (text-white/90) + Meta (text-white/40)
- Right: Probability in platform color (large mono font)
- Hover: bg-white/[0.03], transform: translateX(4px)
```

### Market Detail Page (`/markets/[id]`)

**CRITICAL: NO SEPARATORS, NO HEADER BAR**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ← Back                                                    [⬆] [↓] Actions  │
│  (floating, opacity-40 → hover:opacity-100)               (floating pills) │
│                                                                             │
│                                                                             │
│   ┌─────────────────────────────────┐    ┌────────────────────────────────┐│
│   │                                 │    │                                ││
│   │  LEFT PANEL (55%)               │    │  RIGHT PANEL (45%)             ││
│   │  Market Data                    │    │  Maxwell Report                ││
│   │  (Sticky on scroll)             │    │  (Scrollable)                  ││
│   │                                 │    │                                ││
│   │                                 │    │                                ││
│   │  🔷 POLYMARKET                  │    │                                ││
│   │                                 │    │  ┌────────────────────────────┐││
│   │                                 │    │  │                            │││
│   │  Will Khamenei be out          │    │  │  UNLIKELY                  │││
│   │  as Supreme Leader             │    │  │  (text-6xl, verdict color) │││
│   │  by January 31?                │    │  │                            │││
│   │                                 │    │  │  87% confidence ●          │││
│   │                                 │    │  │                            │││
│   │  ┌────────────────────────────┐│    │  └────────────────────────────┘││
│   │  │                            ││    │                                ││
│   │  │   24%        76%           ││    │  Current odds likely overstate ││
│   │  │   YES        NO            ││    │  probability given recent...   ││
│   │  │   ▓▓░░░░░░░  ░░░░░░░░▓▓   ││    │  (text-xl text-white/70)       ││
│   │  │                            ││    │                                ││
│   │  └────────────────────────────┘│    │                                ││
│   │                                 │    │  KEY FACTORS                   ││
│   │                                 │    │  (text-xs uppercase mono)      ││
│   │  ┌────────────────────────────┐│    │                                ││
│   │  │ 📈 Price Chart              ││    │  ● Regime stability...  ✓     ││
│   │  │ [1H] [1D] [1W] [1M]        ││    │  ● No credible reports... ✓    ││
│   │  │                            ││    │  ● Succession timeline... ⚠    ││
│   │  │    ╱╲    ╱╲                ││    │                                ││
│   │  │   ╱  ╲  ╱  ╲╱╲             ││    │                                ││
│   │  │  ╱    ╲╱                   ││    │  DEEP ANALYSIS                 ││
│   │  │                            ││    │  (expandable section)          ││
│   │  └────────────────────────────┘│    │                                ││
│   │                                 │    │  The current market prices... ││
│   │                                 │    │  [Show more ↓]                ││
│   │  ┌────────────────────────────┐│    │                                ││
│   │  │ 📋 Resolution Rules         ││    │                                ││
│   │  │ Resolves YES if removed... ││    │  ────────────────────────────  ││
│   │  │ Source: Consensus...       ││    │  (h-16 spacer, not a line)    ││
│   │  └────────────────────────────┘│    │                                ││
│   │                                 │    │  SOURCES                       ││
│   │                                 │    │  [horizontal scroll rail]      ││
│   │                                 │    │                                ││
│   └─────────────────────────────────┘    └────────────────────────────────┘│
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  💬 Ask about this market...                                        │  │
│   │     (InputInterface, fixed bottom, bg-[#18151d]/95 backdrop-blur)   │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

CRITICAL DESIGN RULES:
1. NO header bar - navigation floats in top corners
2. NO line between left/right panels - use gap-16 or gap-24
3. NO section separators - use vertical spacing (h-12, h-16)
4. Panels have NO visible border - just content placement
5. Right panel content flows as one document
```

---

## 5. Component Specifications

### 5.1 MarketAutocomplete

**Purpose**: Dropdown showing markets as user types or on focus

**Platform Indication**:
```
🔷 = Polymarket only (blue bg, blue icon)
🟢 = Kalshi only (green bg, green icon)
🔷🟢 = Both platforms (show both icons side-by-side)
```

**How We Know Markets Exist**:
- Fetched via `/api/markets?query={input}` 
- Debounced 300ms
- Returns `UnifiedMarket[]` with `platform` field
- Markets on both platforms have matching titles (detected server-side)

**States**:
- **Empty/Focus**: Show "Trending Markets" (top 5 by volume)
- **Typing**: Filter results, show "Top Matches"
- **No Results**: "No markets found for '{query}'"
- **Loading**: Skeleton shimmer on 3 items

### 5.2 VerdictCard (Refined)

**This is NOT the existing canvas card. It's a NEW headline component.**

**Purpose**: Display Maxwell's final adjudication verdict prominently

**Content Source**: 
- `adjudication` from Maxwell Phase 5 (Adjudicator)
- But REFINED for market context (see Section 6)

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  UNLIKELY                              ┌──────────────────┐ │
│  (verdict headline)                    │ 87% CONFIDENCE   │ │
│  text-6xl font-bold                    │ (status badge)   │ │
│  color = confidence-based              └──────────────────┘ │
│                                                             │
│  ▏Current odds likely overstate the probability            │
│  ▏given recent geopolitical stability and lack of          │
│  ▏credible succession reports.                             │
│  (pl-6 border-l-2 border-white/10)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

NO box border on the card itself - content floats
The left border on explanation is the only "line" (2px, very subtle)
```

**Verdict Values** (derived from adjudication content):
- `YES` - If adjudication supports the market question
- `NO` - If adjudication contradicts
- `LIKELY` - Strong probability for YES
- `UNLIKELY` - Strong probability for NO
- `UNCERTAIN` - Insufficient evidence

**Color Mapping**:
```typescript
const verdictColors = {
  YES: 'text-emerald-400',
  LIKELY: 'text-emerald-400',
  NO: 'text-rose-400',
  UNLIKELY: 'text-rose-400',
  UNCERTAIN: 'text-amber-400',
};
```

### 5.3 Unified Report Flow (Right Panel)

**CRITICAL: This is ONE flowing document, NOT separate boxed components**

```
1. VerdictCard (headline + explanation)
   ↓ (h-12 spacer)
2. Key Factors (claims from verification)
   - Inline list, no box
   - Status icon (✓, ⚠, ✗) + claim text
   - Subtle hover: bg-white/[0.02]
   ↓ (h-8 spacer)
3. Deep Analysis (synthesis response)
   - Collapsed by default (first 3 paragraphs)
   - "Show more" expands
   - Uses existing ResponseDisplay markdown
   ↓ (h-12 spacer)
4. Sources (horizontal rail)
   - Cards scroll horizontally
   - Fade gradient on right edge
   ↓ (h-24 spacer - extra breathing room)
5. Follow-up Input (fixed at bottom)
   - Uses existing InputInterface
   - Sticky/fixed position
   - backdrop-blur for depth
```

### 5.4 Navigation Pattern (Floating Commands)

**CRITICAL: NO navbar, NO header bar**

```tsx
// Floating navigation - no container
<nav className="fixed top-0 left-0 right-0 p-8 flex justify-between pointer-events-none z-50">
  {/* Left: Back - appears on hover or scroll */}
  <button className="pointer-events-auto opacity-40 hover:opacity-100 transition-opacity flex items-center gap-3">
    <ArrowLeft className="w-4 h-4 text-white" />
    <span className="text-sm font-mono tracking-widest uppercase text-white">Back</span>
  </button>

  {/* Right: Actions */}
  <div className="pointer-events-auto flex gap-2">
    <GlassPill icon={<Share />} />
    <GlassPill icon={<Download />} />
  </div>
</nav>

// GlassPill component
const GlassPill = ({ icon }) => (
  <button className="p-2.5 rounded-full bg-white/[0.03] backdrop-blur-md border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all">
    {icon}
  </button>
);
```

### 5.5 Split View Without Lines

**The Gravity Well Pattern**:
- Left panel: 55% width, `sticky top-0`
- Right panel: 45% width, scrollable
- Gap: `gap-16` (64px) or `gap-24` (96px) - the space IS the separator
- NO border between them
- Same background color on both sides

```tsx
<div className="flex min-h-screen">
  {/* Left - Sticky */}
  <div className="w-[55%] sticky top-0 h-screen p-8 overflow-hidden">
    <MarketDataPanel />
  </div>
  
  {/* The gap is the separator - 64-96px of empty void */}
  
  {/* Right - Scrollable */}
  <div className="w-[45%] min-h-screen p-8 pb-32">
    <MarketIntelligencePanel />
  </div>
</div>
```

---

## 6. Maxwell Pipeline Adjustments

### Problem: Adjudication Doesn't Answer YES/NO

Current Maxwell adjudication (`RECONSTRUCTOR_SYSTEM_PROMPT`) produces a general intelligence report. For prediction markets, we need it to:

1. **Answer the binary question** (YES/NO/LIKELY/UNLIKELY)
2. **Provide confidence** on that specific answer
3. **Explain reasoning** in market context

### Solution: Market-Aware Adjudication Prompt

Add a new prompt variant or modify the adjudicator to accept market context:

```typescript
// New: MARKET_ADJUDICATOR_PROMPT
export const MARKET_ADJUDICATOR_PROMPT = `
You are providing a MARKET VERDICT for a prediction market question.

MARKET QUESTION: "{question}"
RESOLUTION DATE: {endDate}
RESOLUTION RULES: {rules}

Based on the verified facts below, you MUST:
1. Give a VERDICT: "YES", "NO", "LIKELY", "UNLIKELY", or "UNCERTAIN"
2. State your CONFIDENCE (0-100%)
3. Explain WHY in 2-3 sentences

FORMAT YOUR RESPONSE AS:
VERDICT: [YES/NO/LIKELY/UNLIKELY/UNCERTAIN]
CONFIDENCE: [0-100]%
REASONING: [Your explanation]

Then provide a brief market analysis (2-3 paragraphs max).

VERIFIED FACTS:
{verifiedFacts}

DISPUTED FACTS:
{disputedFacts}

UNVERIFIED:
{unverifiedFacts}
`;
```

### Parsing the Response

```typescript
interface MarketVerdict {
  verdict: 'YES' | 'NO' | 'LIKELY' | 'UNLIKELY' | 'UNCERTAIN';
  confidence: number;
  reasoning: string;
  fullAnalysis: string;
}

function parseMarketVerdict(adjudication: string): MarketVerdict {
  const verdictMatch = adjudication.match(/VERDICT:\s*(YES|NO|LIKELY|UNLIKELY|UNCERTAIN)/i);
  const confidenceMatch = adjudication.match(/CONFIDENCE:\s*(\d+)%/i);
  const reasoningMatch = adjudication.match(/REASONING:\s*(.+?)(?=\n\n|$)/is);
  
  return {
    verdict: (verdictMatch?.[1] || 'UNCERTAIN').toUpperCase() as MarketVerdict['verdict'],
    confidence: parseInt(confidenceMatch?.[1] || '50'),
    reasoning: reasoningMatch?.[1]?.trim() || '',
    fullAnalysis: adjudication,
  };
}
```

---

## 7. Component Status

### Existing (Reuse As-Is)

| Component | Location | Changes |
|-----------|----------|---------|
| `InputInterface` | `app/components/` | Add `isMarketSearch` prop |
| `ResponseDisplay` | `app/components/` | None - reuse for Deep Analysis |
| `ClaimHeatmap` | `app/components/maxwell/` | None |
| `PhaseProgress` | `app/components/maxwell/` | Show during analysis |
| `SmallGhostLogo` | `app/components/` | None |

### Already Created (Review & Refine)

| Component | Location | Refinements Needed |
|-----------|----------|-------------------|
| `MarketAutocomplete` | `app/components/` | Add platform indication (🔷🟢) |
| `MarketIntelligencePanel` | `app/components/maxwell/` | Refactor to unified flow |
| `VerdictCard` | `app/components/maxwell/` | Update for market verdicts |

### To Build

| Component | Priority | Notes |
|-----------|----------|-------|
| `MarketDataPanel` | P0 | Left side of split view |
| `PriceChart` | P1 | Recharts, platform colors |
| `MarketGrid` | P0 | Landing page grid |
| `MarketCard` | P0 | Grid item |
| `KeyFactorsList` | P0 | Inline claims display |

---

## 8. Responsive Behavior

### Breakpoints

```css
--bp-mobile: 640px;
--bp-tablet: 768px;
--bp-desktop: 1024px;
--bp-wide: 1280px;
```

### Landing Page

| Screen | Grid | Autocomplete |
|--------|------|--------------|
| Mobile | 1 col | Full width, bottom sheet |
| Tablet | 2 cols | 90% width |
| Desktop | 3 cols | 70% width |

### Market Detail Page

| Screen | Behavior |
|--------|----------|
| Mobile (<768px) | Stacked layout, tabs: "Market" / "Analysis" |
| Tablet (768-1024px) | 50/50 split, smaller gap |
| Desktop (>1024px) | 55/45 split, gap-16 |

---

## 9. Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Icon buttons | `aria-label` on all |
| Keyboard nav | Arrow keys in autocomplete |
| Focus visible | Brand-colored ring |
| Color contrast | 4.5:1 minimum |
| Screen reader | Semantic HTML, ARIA roles |
| Touch targets | 44×44px minimum |
| Motion | `prefers-reduced-motion` respected |

---

## 10. Anti-Slop Checklist

Before marking any component complete:

- [ ] NO `bg-blue-500`, `bg-indigo-500` - use semantic tokens
- [ ] NO `shadow-md`, `shadow-lg` - use layered shadows
- [ ] NO `rounded-xl` as default - use contextual radius
- [ ] NO `duration-300 ease-in-out` - use spring physics
- [ ] NO `border-white/20` or higher - too harsh
- [ ] ALL spacing divisible by 4
- [ ] ALL headers have negative tracking
- [ ] ALL interactive elements have hover/active/focus states

---

## Approval

- [ ] Engineering Lead
- [ ] Product Owner
- [ ] Design Lead

---

*This document supersedes the previous design.prd.md version 1.0*
