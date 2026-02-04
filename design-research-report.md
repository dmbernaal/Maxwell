# Comprehensive Design System Research: Deconstructing "0.1% Quality"

## 1. Executive Summary
This report deconstructs the visual language of industry-leading interfaces (**Raycast**, **Linear**) to establish a "0.1% Quality" standard. The goal is to eradicate "AI Slop" (generic, template-like aesthetics) and define a premium, data-first design system. The findings below serve as the foundation for `design-guide-ultimate.md`.

## 2. Deconstructed Visual Language (Raycast & Linear)

### 2.1 Typography
*   **Font Choice:** **Inter Variable** (woff2) is the standard. It offers unmatched legibility at small sizes and neutral character.
    *   *Raycast:* Uses System Font (San Francisco on macOS) for native feel, but Inter for web.
    *   *Linear:* Exclusively Inter.
*   **Weights:**
    *   **Regular (400):** Body text.
    *   **Medium (500):** Interactive elements, buttons, navigation.
    *   **Bold (700):** Headers (used sparingly).
*   **Tracking (Letter-spacing):**
    *   **Headers:** Negative tracking (e.g., `-0.02em` or `tracking-tight`) for a tighter, more graphic look.
    *   **Body:** Standard or slightly loose for readability.
    *   **Caps:** Positive tracking (`tracking-widest`) for small labels (10px-12px).
*   **Scale:**
    *   **Micro-labels:** 10px-11px (uppercase, muted).
    *   **Body:** 13px-14px (high density).
    *   **Headers:** 16px-24px (restrained sizing, rarely massive).
*   **Numbers:** **Monospace** (`font-mono`, `tabular-nums`) is mandatory for all data to ensure alignment and "financial terminal" precision.

### 2.2 Colors & Surfaces
*   **The "Void" Background:**
    *   **Avoid:** Pure Black (#000000) can cause smearing on OLEDs, but is used by Raycast for contrast.
    *   **Preferred:** "Off-Black" or "Obsidian" (e.g., `#050505`, `#08090a`).
    *   **Anti-Slop Rule:** NO purple/blue tinted dark modes. Neutrality is premium.
*   **Panels & Cards:**
    *   **Philosophy:** "Panels, not cards." Avoid visual fragmentation.
    *   **Surface Color:** Ultra-subtle transparency. `rgba(255, 255, 255, 0.02)` to `0.04`.
    *   **Glass Effect:**
        *   *Linear:* "Liquid Glass" — Gaussian blur + subtle gradient overlay + specular highlights + noise.
        *   *Implementation:* `backdrop-filter: blur(12px)` with a noise texture overlay to prevent banding.
*   **Borders & Separation:**
    *   **Width:** 1px (or 0.5px on high-DPI).
    *   **Color:** "Whisper-thin." `rgba(255, 255, 255, 0.05)` to `0.08`.
    *   **Separation:** Achieved primarily through **spacing** and **opacity**, not heavy borders or drop shadows.

### 2.3 Spacing & Layout
*   **Grid:** Strict 4px/8px grid.
*   **Density:** High. "Information density" is a feature of pro tools.
    *   *Padding:* Tighter than consumer apps. `p-2` (8px) or `p-3` (12px) for components; `p-4` to `p-6` for layout containers.
*   **Breathing Room:** Generous margins between *sections*, tight spacing *within* components.

### 2.4 Motion & Interaction
*   **Physics:** **Springs** over Curves.
    *   *Avoid:* `ease-in-out`, `linear`.
    *   *Use:* Spring physics (e.g., `stiffness: 400, damping: 30`) for a snappy, responsive feel.
*   **Duration:** Fast. 200ms-300ms max. "Zero-friction."
*   **Hover States:**
    *   **Scale:** Subtle scale down (`scale-[0.98]`) on press.
    *   **Brightness:** `brightness-110` or subtle background fill (`bg-white/5`).
    *   **Lift:** Linear uses a subtle "lift" (y-axis translation) + shadow expansion.

### 2.5 Icons
*   **Library:** Custom or highly consistent open-source (Lucide, Phosphor).
*   **Style:** Outline/Stroke (1.5px or 2px stroke).
*   **Sizing:** Small and precise. 16px (standard) to 20px.
*   **Color:** Muted by default (`text-white/40`), active on hover (`text-white`).

## 3. The "Anti-Slop" Protocol (AI Aesthetics)
To avoid the generic "AI Generated" look:

| Feature | "AI Slop" (Avoid) | "0.1% Quality" (Adopt) |
| :--- | :--- | :--- |
| **Background** | Deep Purple/Blue Gradients | "Breathing Obsidian" (#050505), Neutral |
| **Corners** | `rounded-xl` everywhere | `rounded-lg` or `rounded-md` (Sharp/Precise) |
| **Shadows** | `shadow-lg` (diffuse, dirty) | Layered, tight shadows or "Elevation via Color" |
| **Borders** | Thick, high contrast (`border-white/20`) | Whisper-thin (`border-white/5`), 1px |
| **Gradients** | Primary button gradients | Subtle noise textures, "Spotlight" effects |
| **Motion** | Slow `ease-in-out` (floaty) | Snappy Spring Physics (responsive) |
| **Layout** | Floating Cards | Unified Panels, Split Views |

## 4. Agentic Skill Search: Prompts for Premium UI

### 4.1 Keywords & Triggers
Use these terms in prompts to force high-quality output:
*   **"Breathing Obsidian":** Evokes a living, deep black aesthetic.
*   **"Terminal Aesthetic":** Triggers data-density, monospace fonts, and high contrast.
*   **"Bloomberg Terminal designed by Rams":** Combines data density with German minimalist precision.
*   **"Whisper-thin borders":** Forces low-opacity borders (4-8%).
*   **"Progressive Disclosure":** UX pattern for managing complexity.

### 4.2 The "Design Engineer" Persona
*   **Role:** "You are a Design Engineer obsessed with pixel-perfection and '0.1% Quality'."
*   **Constraint:** "Reject generic 'modern' defaults. No purple gradients. No floating cards. Build for a $200/month professional tool."

### 4.3 Technical Constraints for AI
*   "Use `text-balance` for headings."
*   "Use `tabular-nums` for all data."
*   "Use `tracking-tight` for headers."
*   "Use `backdrop-blur-md` with `bg-black/50` for glass."

## 5. Implementation Strategy
1.  **Define Tokens:** Create a `globals.css` with semantic tokens (`--bg-void`, `--border-subtle`) derived from the research.
2.  **Component Audit:** Review all existing components against the "Anti-Slop" checklist.
3.  **Motion System:** Replace CSS transitions with `framer-motion` springs where possible, or optimized CSS variables.
4.  **Documentation:** Codify these rules into `design-guide-ultimate.md`.
