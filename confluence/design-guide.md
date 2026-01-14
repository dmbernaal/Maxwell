# Maxwell Design Guide: Terminal & Data

> **Philosophy**: The interface is a high-precision instrument. It rejects the "mysterious" purple-tinted void for a brutally neutral, data-first "Terminal" aesthetic. It uses deep, pure blacks, sharp corners, and high-contrast dividers. It feels like a Bloomberg Terminal designed by Rams.

---

## 1. Color Palette

### The Data Void
We strictly use neutral grays and blacks. No purple/blue tints in the background.

| Token | Value | Usage |
| :--- | :--- | :--- |
| **Background** | `#050505` | The global page background. Pure, OLED-ready black. |
| **Surface** | `#0a0a0a` | The "Data Block" background. Slightly lighter than void. Solid. |
| **Surface Hover** | `#171717` | Distinct interaction state. |
| **Border** | `#262626` | Sharp, technical dividers. |
| **Brand Accent** | `#6F3BF5` | Used *strictly* for status or key brand moments (The Ghost). Never for atmosphere. |

### Text & Content
High contrast for readability, mechanical hierarchy.

| Token | Value | Usage |
| :--- | :--- | :--- |
| **Primary** | `#FFFFFF` | Data values, user input. |
| **Secondary** | `#a3a3a3` | Labels, descriptions. (Neutral Gray 400) |
| **Tertiary** | `#525252` | "Empty" states, placeholders. (Neutral Gray 600) |
| **Subtle** | `#262626` | Grid lines, subtle borders. |

---

## 2. Typography

### Typefaces
*   **Sans**: `Inter` (or system sans) for UI chrome.
*   **Mono**: `JetBrains Mono` or `Geist Mono` for ALL data, numbers, and technical labels.

### Hierarchy Patterns
*   **Headers**: Tight tracking, medium weight.
    *   *Style*: `text-white font-medium tracking-tight`
    *   *Example*: "Maxwell"
*   **Data Labels**: Monospace, uppercase, small.
    *   *Style*: `font-mono text-[10px] uppercase tracking-wider text-[#525252]`
*   **Values**: Tabular nums, bright white.

---

## 3. Motion Physics

### The "Switch" Standard
Motion should feel like flipping a physical switch or sliding a solid drawer. Zero bounce.

```tsx
transition={{
  type: 'spring',
  stiffness: 400, // Very high tension
  damping: 30     // Critically damped (No overshoot)
}}
```

### Micro-Interactions
*   **Hover**: Instant color shift. No fade.
*   **Active**: `scale: 0.98` (Subtle press).

---

## 4. Component Patterns

### The "Data Block" (Cards/Inputs)
Everything is a solid block of data. No glass morphism. No blurs.

*   **Shape**: `rounded-lg` or `rounded-md`. Sharp corners are preferred over pills.
*   **Surface**: `bg-[#0a0a0a]`. Solid.
*   **Border**: `border border-[#262626]`.
*   **Shadow**: None or very subtle drop shadow for layering (`shadow-sm`).

### Input Bar
A technical command line, not a search bubble.
*   **Style**: Rectangular (`rounded-lg`), solid background (`#0a0a0a`), distinct border (`border-white/10`).
*   **Focus**: Border becomes bright (`border-white/20`), no glow.

### The Ghost
*   **Placement**: Anchored.
*   **Behavior**: Mechanical pulse. Less "living soul", more "processing core".
