# Maxwell Design Guide: Obsidian & Moonlight

> **Philosophy**: The interface should feel like a polished obsidian artifact—dark, mysterious, and premium. It uses deep blacks with subtle purple/pink undertones, illuminated by "moonlight" (white/silver text and glows). Motion is snappy and mechanical, not bouncy.

---

## 1. Color Palette

### The Obsidian Void
The foundation of the app is a specific "tinted black" that feels warm and premium, not sterile.

| Token | Value | Usage |
| :--- | :--- | :--- |
| **Background** | `#120F14` | The global page background. A deep, near-black with a hint of purple/pink. |
| **Surface** | `#18151d` | The primary background for Cards, Inputs, and Chat Bubbles. |
| **Surface Hover** | `#231f29` | The hover state for interactive surfaces. |
| **Brand Accent** | `#6F3BF5` | Used *sparingly* for the Ghost, dots, and subtle glows. Never for large backgrounds. |

### Text & Content
We use a monochromatic scale to maintain the "Moonlight" aesthetic.

| Token | Value | Usage |
| :--- | :--- | :--- |
| **Primary** | `text-white` (100%) | Main content, user input, active states. |
| **Secondary** | `text-white/70` | Agent responses, descriptions. Soft and readable. |
| **Tertiary** | `text-white/40` | Labels, timestamps, "Thinking" text. |
| **Subtle** | `text-white/20` | Borders, deeply receded labels. |

---

## 2. Typography

### Typefaces
*   **Sans**: `Inter` (or system sans) for all UI text.
*   **Mono**: `JetBrains Mono` (or system mono) for code, citations, and data points.

### Hierarchy Patterns
*   **Headers**: Uppercase, tracked out.
    *   *Style*: `text-[11px] font-medium uppercase tracking-[0.2em] text-white/40`
    *   *Example*: "MAXWELL'S ANALYSIS"
*   **Body**: Relaxed leading, soft color.
    *   *Style*: `text-[17px] leading-relaxed text-white/70`
*   **Chips/Tags**: Monospace, small.
    *   *Style*: `text-[9px] font-mono`

---

## 3. Motion Physics

We reject "bouncy" or "floaty" animations in favor of **Snappy, Mechanical Precision**.

### The "Snappy" Standard
All layout transitions (Ghost movement, Input expansion) must use these exact spring physics:

```tsx
transition={{
  type: 'spring',
  stiffness: 300, // High tension (Fast)
  damping: 40     // High friction (No bounce)
}}
```

### Micro-Interactions
*   **Hover**: `scale: 1.05` (Subtle grow).
*   **Tap**: `scale: 0.95` (Tactile feedback).
*   **Pulse**: `scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5]` (For "Thinking" dots).

---

## 4. Component Patterns

### The "Solid Border" Spotlight
Inputs and interactive containers use a specific spotlight effect that highlights the *border*, not the background.

*   **Structure**:
    1.  **Outer Shell**: `bg-white/5` (The border color).
    2.  **Spotlight Layer**: `radial-gradient` (White glow) on top of the shell.
    3.  **Inner Content**: `bg-[#18151d]` (Opaque Obsidian) with `m-[1px]` or `p-[2px]` to reveal the shell as a border.

### Obsidian Chips (Cards)
Cards (like Sources or Quick Actions) are "chips" of obsidian floating on the void.

*   **Base**: `bg-[#18151d] border border-white/5 rounded-xl`.
*   **Hover**: `hover:bg-[#231f29] hover:border-white/10`.
*   **Text Interaction**: Title brightens to `text-white`, metadata brightens to `text-white/50`.
*   **NO COLORED HOVERS**: Do not turn cards purple or blue on hover. Keep it monochromatic.

### The "Floating Stream" (Chat)
The chat content never touches the top or bottom edges of the screen. It fades into the void.

*   **Masking**:
    ```tsx
    maskImage: 'linear-gradient(to bottom, transparent 0%, black 200px, black calc(100% - 300px), transparent calc(100% - 100px))'
    ```
*   **Top Fade**: `200px` (Dissolves behind the Ghost).
*   **Bottom Fade**: `100px` (Dissolves *above* the Input Bar).

---

## 5. The Ghost
*   **Placement**: Fixed at the top, aligned with the chat content (`max-w-3xl mx-auto`).
*   **Behavior**: "Living Soul". It pulses and glows but stays structurally anchored.
*   **Transition**: Moves from center (Relaxed) to top-left (Active) using the **Snappy** physics.
