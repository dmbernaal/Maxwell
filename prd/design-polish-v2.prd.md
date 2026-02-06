# ZapMarket — Design Polish to 0.1% (Phase 6)

**Version**: 1.0  
**Last Updated**: February 2026  
**Status**: Planning  
**Goal**: Elevate the market detail view from 90th percentile to 0.1% — the kind of interface that makes people screenshot it and ask "what is this?"

---

## The Gap

The app is **competent and consistent**. The monochrome palette with `#FA5D19` accent is disciplined. The 3-panel layout is strong. The corner grid decorations give it identity. But it's missing the details that separate a good tool from a premium product.

**What's missing:**
1. No visual hero moment — everything is the same weight
2. Typography is monotonous — same font, same sizes, same treatment across all sections
3. The center panel is a uniform grey stream with no rhythm
4. The right panel is a generic data sidebar
5. No sense of life — everything is static
6. The assessment section (the most important data) doesn't command attention

---

## Design Principles (Unchanged)

- **ONE accent color**: `#FA5D19` — everything else is white at varying opacities
- **NO AI slop**: No gradients, no glow, no purple, no traffic light colors
- **Corner grids are sacred**: The `CornerGridDecoration` SVGs are the signature element
- **Trust the text**: Words carry meaning, colors carry hierarchy
- **Font sizes**: 10px, 12px, 14px, 16px only (add 20px and 24px for hero elements)
- **Backgrounds**: `#0A0A0A`, `#111111`, `#141414`, `#1A1A1A`
- **Borders**: `#2A2A2A` default, `#3A3A3A` hover

---

## 1. Assessment Section — The Hero Moment

**File**: `app/components/maxwell/sections/AssessmentSection.tsx`

The assessment is the single most important piece of information on the page. Right now it looks like every other section. It should be the thing that grabs you.

### Current Problems
- The verdict "UNDERPRICED" is a tiny 10px mono label in the corner — the most actionable signal on the page is whispered
- "Market 68% → Maxwell 75% (72% - 78%)" is buried in a row of small text
- The headline paragraph is 14px white/60 — same as every other paragraph

### Design Changes

**Make the verdict the hero:**
- The verdict text ("UNDERPRICED") becomes 20px, font-semibold, `text-white` — the largest text in the section
- Position it prominently, not tucked in a corner cell
- The primary outcome name ("Seattle") stays 16px below it

**Make the price comparison visual:**
- Replace the text-only "Market 68% → Maxwell 75%" with a compact visual:
  - Market price: `text-[20px] font-mono tabular-nums text-white/40` (dimmer — it's the "before")
  - Arrow: `→` in `text-white/20`
  - Maxwell price: `text-[20px] font-mono tabular-nums text-white` (bright — it's your edge)
  - Range in parentheses stays `text-[12px] text-white/30`
- This creates a clear "before → after" visual hierarchy using only size and opacity

**The headline gets more presence:**
- Bump to `text-[14px] text-white/70 leading-relaxed` (from white/60)
- Add `text-pretty` for better line breaks

**Remove visual clutter:**
- The section currently has 3 sub-rows with their own borders. Consolidate into 2 visual blocks:
  1. Verdict + outcome name + price comparison (the hero block)
  2. Headline paragraph (the context)
- Remove the intermediate `border-b` between the price row and headline

### Specific Tailwind Changes

```
// Verdict area
- text-[10px] font-mono → text-[20px] font-semibold
- Positioned as the first thing you read, not a badge in a corner

// Price comparison
- text-[14px] for both prices → text-[20px] for both, with opacity difference
- Market price: text-white/40 (dim)
- Maxwell price: text-white (bright)

// Headline
- text-white/60 → text-white/70
- Add text-pretty
```

---

## 2. Typography Rhythm in the Intelligence Panel

**Files**: 
- `app/components/maxwell/sections/ThesisSection.tsx`
- `app/components/maxwell/sections/OutcomesSection.tsx`
- `app/components/maxwell/sections/ResolutionRiskSection.tsx`
- `app/components/maxwell/sections/SourcesSection.tsx`

### Current Problem
Every section header looks identical: `text-[16px] font-semibold text-white uppercase tracking-tight` with a `ChevronDown` icon in `text-[#FA5D19]`. When everything is the same, nothing stands out. The page becomes a grey wash.

### Design Changes

**Differentiate section headers by importance:**

The sections have a natural hierarchy:
1. **Assessment** — Most important (hero treatment, covered above)
2. **Outcomes** — Second most important (actionable data)
3. **Thesis** — Supporting context
4. **Resolution Risk** — Edge case information
5. **Sources** — Reference material

Reflect this in the typography:

- **Outcomes header**: Keep `text-[16px] font-semibold text-white uppercase`. This is the second most important section.
- **Thesis header**: Reduce to `text-[14px] font-medium text-white/90 uppercase`. Slightly quieter.
- **Resolution Risk header**: `text-[14px] font-medium text-white/70 uppercase`. Even quieter — this is supplementary.
- **Sources header**: `text-[12px] font-medium text-white/60 uppercase`. The quietest — it's reference material.

**Remove the orange ChevronDown from all section headers.** It's visual noise — every section has the same orange chevron, which means none of them are special. Replace with a simple `text-white/30` chevron, or remove it entirely if sections aren't collapsible.

### Specific File Changes

```
// ThesisSection.tsx - Section header
- <ChevronDown className="w-3.5 h-3.5 text-[#FA5D19]" />
- <span className="font-semibold text-[16px] text-white tracking-tight uppercase">
+ <span className="font-medium text-[14px] text-white/90 uppercase tracking-wider">

// ResolutionRiskSection.tsx - Section header  
- <ChevronDown className="w-3.5 h-3.5 text-[#FA5D19]" />
- <span className="font-semibold text-[16px] text-white tracking-tight uppercase">
+ <span className="font-medium text-[14px] text-white/70 uppercase tracking-wider">

// SourcesSection.tsx - Section header
- Similar reduction to text-[12px] text-white/60
```

---

## 3. Outcome Data Bars — Custom Feel

**Files**:
- `app/components/maxwell/primitives/OutcomeDataBar.tsx`
- `app/components/maxwell/sections/OutcomesSection.tsx`

### Current Problem
The thin `h-2` progress bar with a white marker and orange range overlay is functional but looks like a default component. It doesn't feel custom or premium.

### Design Changes

**Replace the rounded progress bar with a sharp-edged range visualization:**
- Background track: `h-1 bg-[#2A2A2A]` (thinner, sharper — no `rounded-full`)
- Market price marker: A `w-[2px] h-3` vertical line that extends above and below the track — like a needle on a gauge
- Maxwell range: `bg-[#FA5D19]/15` (slightly more visible than current /20)
- Maxwell midpoint: A small `w-[2px] h-2 bg-[#FA5D19]/60` marker at the target price

**This creates a Bloomberg-style range indicator** instead of a generic progress bar. The sharp edges match the corner grid aesthetic.

### Specific Changes

```tsx
// OutcomeDataBar.tsx - Range visualization
- <div className="relative h-2 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
+ <div className="relative h-1 w-full bg-[#2A2A2A]">

// Market price marker - taller, sharper
- <div className="absolute top-0 bottom-0 w-0.5 bg-white z-20" 
+ <div className="absolute -top-1 -bottom-1 w-[2px] bg-white z-20"

// Maxwell range - no rounded
- className="absolute top-0 bottom-0 bg-[#FA5D19]/20 rounded-full z-10"
+ className="absolute top-0 bottom-0 bg-[#FA5D19]/15 z-10"
```

---

## 4. Right Panel (MarketDataPanel) — Add Personality

**File**: `app/components/MarketDataPanel.tsx`

### Current Problem
The right panel is the most generic part of the app. "MARKET CONTEXT", "MARKET ACTIVITY", "PRICE HISTORY", "OUTCOMES", "DETAILS" — every trading app has this exact sidebar. The outcomes section with blue/orange progress bars is the most "default chart library" element on the page.

### Design Changes

**4a. Outcome progress bars in the right panel:**
- The `OutcomesList` component uses `h-1.5 rounded-full` bars with platform colors (blue for Polymarket, orange for Kalshi)
- Replace with `h-1` bars, no `rounded-full` — sharp edges to match the app's grid aesthetic
- Use `bg-white/40` for the bar fill instead of platform brand colors. The platform is already identified in the header — the bars don't need to be branded too.

**4b. Order book — remove emerald/rose:**
- The `SpreadDisplay` uses `text-emerald-400` for bid and `text-rose-400` for ask
- The `OrderBookDisplay` uses `bg-emerald-500/[0.06]` and `bg-rose-500/[0.06]` for depth bars
- Replace with monochrome:
  - Bid price: `text-white/70`
  - Ask price: `text-white/50`
  - Bid depth bars: `bg-white/[0.06]`
  - Ask depth bars: `bg-white/[0.04]`
  - Spread value: `text-white/40` (unchanged)

**4c. Hide scrollbar on right panel:**
- Add `no-scrollbar` class to the scroll container (matching what we did for MarketChat)

**4d. Section headers — quieter:**
- Currently `text-[11px]` or `text-[12px]` with `font-medium uppercase tracking-wider text-white/40 font-mono`
- This is fine. No changes needed — the right panel headers are already appropriately quiet.

### Specific File Changes

```tsx
// OutcomesList - bar styling
- className="h-1.5 w-full bg-white/[0.08] rounded-full overflow-hidden"
+ className="h-1 w-full bg-white/[0.06]"

// OutcomesList - bar fill
- className="h-full rounded-full"
- style={{ backgroundColor: outcomeColor }}
+ className="h-full"
+ style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}

// SpreadDisplay - bid/ask colors
- text-emerald-400 → text-white/70
- text-rose-400 → text-white/50

// OrderBookDisplay - depth bars
- bg-emerald-500/[0.06] → bg-white/[0.06]
- bg-rose-500/[0.06] → bg-white/[0.04]
- text-emerald-400/90 → text-white/70
- text-rose-400/90 → text-white/50

// Scroll container
- className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin..."
+ className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar"
```

---

## 5. Chat Panel — Structure the Response

**File**: `app/components/maxwell/MarketChat.tsx`

### Current Problem
When the chat has a long response, it's a wall of text with no visual structure. The text runs edge-to-edge. Compare to the intelligence panel which has clear sections, headers, spacing — the chat panel has none of that.

### Design Changes

**5a. Add breathing room:**
- Increase padding from `p-4` to `px-5 py-4` on the message container
- Add `space-y-5` between messages (from `space-y-4`)

**5b. User message — more distinct:**
- Current: `bg-[#1A1A1A] border border-[#2A2A2A] rounded-sm`
- Change to: `bg-white/[0.04] rounded-lg` — softer, no visible border, matches the app's `bg-white/[0.0x]` pattern from ResponseDisplay source cards

**5c. Agent message markdown — better heading hierarchy:**
- `h2` (section headers in responses like "Key Findings", "Market Analysis"): bump to `text-[14px] font-semibold text-white mt-4 mb-2` (from `text-white/90 mt-3 mb-1`)
- Add `mt-4` before h2 to create visual breathing between sections
- This creates clear "chapters" in long responses

**5d. The input area:**
- Change `rounded-sm` to `rounded-lg` on the input container — matches `GlobalCommandBar` search input pattern
- Change send button from `rounded-sm` to `rounded-lg`

### Specific Changes

```tsx
// Message container spacing
- <div className="p-4 space-y-4">
+ <div className="px-5 py-4 space-y-5">

// UserMessage
- className="max-w-[85%] bg-[#1A1A1A] border border-[#2A2A2A] rounded-sm px-4 py-3"
+ className="max-w-[85%] bg-white/[0.04] rounded-lg px-4 py-3"

// AgentMessage h2
- <h2 className="text-[14px] font-semibold text-white/90 mt-3 mb-1">
+ <h2 className="text-[14px] font-semibold text-white mt-4 mb-2">

// ChatInput container
- className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-sm flex items-end..."
+ className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg flex items-end..."

// Send button
- className={`size-7 rounded-sm flex items-center...`}
+ className={`size-7 rounded-lg flex items-center...`}
```

---

## 6. Remaining Color Cleanup

**Files**: `app/components/MarketDataPanel.tsx`, various primitives

### Emerald/Rose in Order Book & Spread
These are the last non-monochrome colors in the data display (covered in section 4b above).

### StatusBadge primitive
**File**: `app/components/maxwell/primitives/StatusBadge.tsx`
- Uses `emerald-400`, `rose-400`, `amber-400`, `zinc-400`
- Change to monochrome: all statuses use `text-white/60` with `bg-white/40` dot
- Exception: if used for "live" status, use `bg-[#FA5D19]` dot

### ProbabilityBar primitive
**File**: `app/components/maxwell/primitives/ProbabilityBar.tsx`
- Uses `bg-emerald-400` (positive edge), `bg-rose-400` (negative edge)
- Change to: positive edge `bg-white/70`, negative edge `bg-white/30`, neutral `bg-white/50`
- The range overlay: `bg-white/[0.12]` (unchanged)

### ClaimHeatmap
**File**: `app/components/maxwell/ClaimHeatmap.tsx`
- Uses `bg-emerald-500`, `bg-amber-500`, `bg-rose-500` for confidence highlighting
- Change to opacity-based: high `bg-white/20`, medium `bg-white/10`, low `bg-white/5`

### VerdictCard
**File**: `app/components/maxwell/VerdictCard.tsx`
- Uses `#10b981` (emerald), `#a855f7` (purple), `#71717a` (gray)
- Change to: `text-white` (yes/likely), `text-white/60` (no/unlikely), `text-white/40` (uncertain)

### ClaimsCard
**File**: `app/components/maxwell/ClaimsCard.tsx`
- Uses `#10b981` (verified), `#f97316` (uncertain), `#a855f7` (disputed)
- Change to: `text-white/70` (verified), `text-white/40` (uncertain), `text-white/30` (disputed)

### EventLog
**File**: `app/components/maxwell/EventLog.tsx`
- Uses `text-emerald-500/50`, `text-rose-400`
- Change to: `text-white/40`, `text-white/30`

### PhaseProgress
**File**: `app/components/maxwell/PhaseProgress.tsx`
- Uses indigo-400, sky-400, violet-400, emerald-400 for different phases
- Change all to `text-white/60` with `bg-[#FA5D19]` for the active phase only

### DeltaGlow
**File**: `app/components/maxwell/primitives/DeltaGlow.tsx`
- Uses cyan and amber glow animations
- Change both to use `#FA5D19` at low opacity: `rgba(250, 93, 25, 0.15)` border, `rgba(250, 93, 25, 0.08)` shadow

### VerificationBadge / VerificationPanel
**Files**: `app/components/maxwell/primitives/VerificationBadge.tsx`, `app/components/maxwell/VerificationPanel.tsx`
- Uses emerald-400, amber-400, rose-400
- Change to monochrome with `#FA5D19` accent for the verified state only

---

## 7. Global Polish

### 7a. Selection color
**File**: `app/globals.css`
- Add `::selection { background: rgba(250, 93, 25, 0.3); color: white; }` — brand the text selection

### 7b. Focus ring
**File**: `app/globals.css`
- Add `*:focus-visible { outline: 2px solid rgba(250, 93, 25, 0.5); outline-offset: 2px; }` — brand the focus ring

---

## Implementation Order

1. **Assessment hero** (highest visual impact, 1 file)
2. **Section header hierarchy** (4 files, quick changes)
3. **OutcomeDataBar redesign** (1 file)
4. **Right panel cleanup** (1 file, color changes + scrollbar)
5. **Chat panel polish** (1 file, spacing + rounding)
6. **Remaining color cleanup** (~10 files, mechanical find-replace)
7. **Global CSS polish** (1 file)

---

## What This Does NOT Include

- No new components
- No new animations (the UI skills constraint says "NEVER add animation unless explicitly requested")
- No layout changes to the 3-panel structure
- No changes to the corner grid decorations
- No changes to the GlobalCommandBar
- No changes to the empty state or loading states
- No changes to backend/API

This is purely a **color, typography, and spacing** pass. The components stay the same. The layout stays the same. We're just tuning the knobs that make the difference between "good" and "premium."
