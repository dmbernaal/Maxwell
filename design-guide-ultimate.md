# The "0.1% Quality" Ultimate Design Guide
**Reference Standard for Premium "Glass & Steel" Interfaces (Raycast/Linear Style)**

This guide defines the non-negotiable standards for building a $200/month premium application. It is designed to eradicate "AI Slop" and enforce engineering precision.

---

## 1. Core Philosophy: "The Void & The Glass"

The interface is not a page; it is a **Machine**. It consists of **The Void** (Background) and **Active Surfaces** (Glass/Steel).

*   **No Solid Grays:** Never use `bg-gray-900` or generic Tailwind colors.
*   **The Void:** `#050505` (Almost Black). The infinite workspace.
*   **The Glass:** `bg-white/[0.02]` (2% Opacity). The primary surface for content.
*   **The Steel:** `border-white/[0.08]`. The structure that holds the glass.

---

## 2. Typography: "Data vs. Prose"

We use **Geist Sans** for UI/Prose and **Geist Mono** for Data/Code.

### The "Micro Label" (The Linear Standard)
Used for meta-data, headers, and secondary info.
*   **Class:** `text-[10px] font-medium uppercase tracking-wider text-white/40 select-none font-mono`
*   **Why:** Prevents "shouting". Data should be legible but subservient to the primary value.

### The "Data Value"
Used for financial numbers, percentages, and metrics.
*   **Class:** `text-[13px] font-mono tabular-nums text-[#EDEDED] tracking-tight`
*   **Why:** `tabular-nums` ensures vertical alignment. `text-[#EDEDED]` is "Off-White" to reduce eye strain compared to `text-white` (pure #FFF).

### The "Prose" (Chat/Content)
Used for AI responses and descriptions.
*   **Class:** `text-[13px] leading-relaxed text-white/80 font-sans antialiased`
*   **Anti-Slop:** Never use `text-base` (16px) for dense information. 13px-14px is the premium standard.

---

## 3. Colors & Surfaces (The Palette)

| Token | Value | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- |
| **Void** | `#050505` | `bg-[#050505]` | Main background, full screen containers. |
| **Glass** | `rgba(255,255,255, 0.02)` | `bg-white/[0.02]` | Cards, Panels, Tables. **NEVER use solid #0A0A0A.** |
| **Hover** | `rgba(255,255,255, 0.04)` | `hover:bg-white/[0.04]` | Interactive rows, buttons. |
| **Border** | `rgba(255,255,255, 0.08)` | `border-white/[0.08]` | Primary structural borders. |
| **Highlight** | `rgba(255,255,255, 0.12)` | `border-white/[0.12]` | Active states, focus rings. |

---

## 4. Spacing & Layout (The Grid)

*   **Standard Padding:** `p-3` (12px) for dense components, `p-6` (24px) for main views.
*   **Sidebar Padding:** Always match the Main View's vertical rhythm. If Header is `p-6`, Sidebar must be `p-6` (or `pt-6`).
*   **Gaps:** Use explicit `space-y-4` (16px) or `space-y-2` (8px). Avoid arbitrary margins.

---

## 5. Components & "Anti-AI Slop" Rules

### A. Buttons
*   **Don't:** Large, pill-shaped, blue-500 buttons.
*   **Do:** Compact, `h-7` or `h-8`, `rounded-md`.
*   **Style:** `bg-white/5 hover:bg-white/10 text-white/90 border border-white/5`.
*   **Typography:** `text-[11px] font-medium`.

### B. Icons
*   **Library:** Lucide React.
*   **Size:** Always specific. `w-3 h-3` (12px) for meta, `w-4 h-4` (16px) for actions. Never default.
*   **Color:** `text-white/40` (Inactive) -> `text-white/90` (Active).

### C. Rounded Corners
*   **Standard:** `rounded-md` (6px) or `rounded-sm` (4px).
*   **Anti-Slop:** Avoid `rounded-xl` or `rounded-2xl` unless it is a standalone modal. "Professional" tools use tighter corners.

### D. Animations (The "Raycast Feel")
*   **Transition:** `transition-all duration-200 ease-out`.
*   **Hover:** subtle `scale-[1.01]` or `brightness-110`.
*   **Loading:** Skeleton loaders (`bg-white/5 animate-pulse`) instead of spinners where possible.

---

## 6. Implementation Checklist (The "0.1%" Audit)

Before shipping ANY component, verify:
1.  [ ] **Select-None:** Are labels unselectable? (`select-none`)
2.  [ ] **Tabular Nums:** Are numbers monospaced? (`tabular-nums`)
3.  [ ] **Border Continuity:** Do borders align perfectly?
4.  [ ] **Contrast Check:** Is the text `#EDEDED` or `white/40`? (Never pure gray-500).
5.  [ ] **Console Cleanliness:** No React key warnings or hydration errors.

---

## 7. AI Prompt Injection (For Future Generations)

When asking an AI to design, PRE-PROMPT with:
> "Design a high-density, technical interface for a financial terminal. Use a dark theme (#050505 background). Use 13px font size for body, 10px uppercase mono for labels. Use 1px borders (white/8%) for separation, not shadows. Avoid rounded-xl. Make it look like Linear or Raycast."
