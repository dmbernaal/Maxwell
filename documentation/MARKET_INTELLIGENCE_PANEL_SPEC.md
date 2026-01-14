# Market Intelligence Panel - Technical Specification

## 1. Layout Specification

The Right Panel is a permanent, dedicated space for market intelligence, replacing the transient "MaxwellCanvas".

**Container:**
- `h-full flex flex-col relative bg-[#18151d] border-l border-white/10`
- **Width:** Fixed 400px-600px (resizable ideally, or set to `w-[450px]` for desktop).

**Zones:**
1.  **Header (Fixed):**
    - `h-14 flex items-center justify-between px-6 border-b border-white/5`
    - Contains: Title ("MARKET INTELLIGENCE"), Live Status Pulse, Export/Share actions.
2.  **Scrollable Content (Flexible):**
    - `flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8`
    - Uses `scroll-behavior: smooth`.
3.  **Input Area (Sticky Bottom):**
    - `p-4 border-t border-white/5 bg-[#18151d]/95 backdrop-blur-sm z-20`
    - Wraps the Chat Interface.

## 2. Component Hierarchy & Reuse Strategy

```jsx
<MarketIntelligencePanel>
  {/* Header */}
  <PanelHeader status={status} />

  {/* Scrollable Content */}
  <div className="flex-1 overflow-y-auto">
    
    {/* 1. THE VERDICT (Alpha First) */}
    {/* New Component: High-impact summary card */}
    <VerdictCard 
      adjudication={adjudication} 
      confidence={verification.overallConfidence} 
    />

    {/* 2. VERIFICATION DASHBOARD */}
    {/* Reuse: VerificationPanel (stripped of some padding) */}
    <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
      <VerificationPanel mode="compact" />
    </div>

    {/* 3. SYNTHESIS & HEATMAP */}
    {/* Reuse: ResponseDisplay (Text + Inline Citations) */}
    {/* Reuse: ClaimHeatmap (Toggled view) */}
    <ResponseDisplay 
      showSources={false} // We handle sources separately
      enableHeatmap={true}
    />

    {/* 4. SOURCE EVIDENCE */}
    {/* Reuse: Source Grid logic from ResponseDisplay */}
    <SourcesGrid sources={sources} />

  </div>

  {/* Input Area */}
  <div className="sticky bottom-0">
    <InputInterface mode="compact" />
  </div>
</MarketIntelligencePanel>
```

## 3. Scroll Behavior & Interaction

- **Independent Scrolling:** The report scrolls independently of the left "Market Data" panel.
- **Sticky Headers:** Section headers (Verdict, Analysis, Evidence) use `sticky top-0 bg-[#18151d]/90 backdrop-blur z-10` to maintain context during deep reads.
- **Smart Auto-Scroll:** When a new phase completes (e.g., Synthesis -> Verification), the view gently scrolls to reveal the new content, unless the user is actively interacting (scrolling/hovering).

## 4. Section Order Rationale (The "Trader's Flow")

We prioritize **Time-to-Alpha**:

1.  **The Verdict (Adjudication):** Traders need the binary answer ("Yes/No", "Bullish/Bearish") *immediately*. This is the most valuable pixel real estate.
2.  **Confidence Score:** "Should I trust this verdict?" Placed right next to the verdict.
3.  **Key Verified Claims:** The "Executive Summary" of facts that support the verdict.
4.  **Deep Analysis (Synthesis):** The narrative "Why". Read only if the verdict is surprising.
5.  **Sources:** Due diligence. Checked last to verify specific details.

**Why this beats the prompt's order:** The prompt suggested "Synthesizer -> Sources -> Verdict". This is a "Research Paper" flow (Introduction -> Data -> Conclusion). Traders operate in "Executive Summary" flow (Conclusion -> Supporting Data -> Methodology).

## 5. States & feedback

- **Empty/Idle:** "Select a market to generate intelligence." (Ghost logo watermark).
- **Analyzing (Loading):**
    - Instead of a full-screen loader, use a **Skeleton Verdict Card** that pulses.
    - Show `PhaseProgress` (minimal version) in the Header.
    - Text streams in via `ResponseDisplay` (already handles streaming).
- **Mobile Behavior:**
    - Single Column Layout.
    - Tabs at top: `[Market Data] [Intelligence]`.
    - Input area remains fixed at bottom of viewport.

## 6. Visual Aesthetic ("Obsidian & Moonlight")

- **Background:** `#18151d` (Obsidian)
- **Text:** White/90 (Primary), White/50 (Secondary)
- **Accents:**
    - **Moonlight:** `text-brand-accent` (for links/highlights)
    - **Signal:** Emerald-400 (Verified), Rose-400 (Disputed), Amber-400 (Uncertain)
- **Borders:** `border-white/5` (Subtle separation)
- **Shadows:** `shadow-2xl` on the Verdict Card to make it "pop" off the page.
