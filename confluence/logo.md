# Ghost Logo Design & Implementation

The "Ghost Logo" is a core brand asset for Scaletok/Kaiyros, featuring a friendly, animated ghost character. It is implemented as a set of React components that combine SVG paths, shader-based gradients, and interactive animations.

## 1. Color Palette

The logo uses a specific set of 5 colors to create its signature ethereal look. These are defined in `@/lib/ghost-logo-colors.ts`.

| Color Name | Hex Code | Role |
|------------|----------|------|
| **Orchid** | `#ff99cc` | Accent (Lightest, top-left) |
| **Sky Blue** | `#7bbbff` | Accent (Cool tone) |
| **Brand Purple** | `#6f3bf5` | Primary Brand Color |
| **Darker Purple** | `#5b2fcb` | Depth/Shading |
| **Midnight** | `#26153f` | Darkest/Bottom Shadow |

## 2. Gradient Implementation

The ghost's body uses two different gradient strategies depending on the browser capabilities:

### A. Mesh Gradient (Primary)
For modern browsers (non-Safari mobile), we use a **Mesh Gradient** powered by `@paper-design/shaders-react`.
- **Component**: `<MeshGradient />`
- **Behavior**: It creates a fluid, moving gradient using the 5 brand colors.
- **Speed**: Set to `1` for a gentle, constant shifting effect.
- **Implementation**: The gradient is rendered inside a `foreignObject` (for SVGs) or a masked `div` (for `TinyGhostLogo`) to clip it to the ghost's shape.

### B. Linear Gradient (Fallback)
For Safari Mobile (iOS) or server-side rendering (SSR), a static linear gradient is used to ensure performance and compatibility.
- **Direction**: Diagonal (top-left to bottom-right).
- **Stops**:
  - 0%: Orchid (`#ff99cc`)
  - 25%: Sky Blue (`#7bbbff`)
  - 50%: Brand Purple (`#6f3bf5`)
  - 75%: Darker Purple (`#5b2fcb`)
  - 100%: Midnight (`#26153f`)

## 3. Animation & Interactivity

The ghost is brought to life using `framer-motion` for physics-based animations.

### Floating & Breathing
The entire ghost container floats gently up and down while slightly scaling to simulate breathing.
- **Y-Axis**: Moves between `0` and `-2px` (or scaled relative to size).
- **Scale**: Pulses between `1` and `1.02`.
- **Timing**: Infinite loop with a duration of 3 seconds.

### Eye Blinking
The eyes (`<ellipse>`) periodically blink by animating their vertical radius (`ry`).
- **Animation**: `ry` goes from full height -> `0.5` (closed) -> full height.
- **Interval**: Occurs every ~3 seconds (controlled by `repeatDelay`).

### Mouse Tracking (Interactive Eyes)
The ghost's eyes follow the user's cursor.
- **Logic**:
  1. A `mousemove` event listener tracks the cursor position globally.
  2. The component calculates the distance between the cursor and the logo's center.
  3. This delta is clamped to a maximum offset (e.g., `4px` for small logos) to keep the eyes within the face.
  4. `framer-motion` springs are used to smooth the eye movement (`stiffness: 150`, `damping: 15`), making it feel organic rather than robotic.

## 4. Component Variations

We have multiple versions of the logo optimized for different contexts:

### `SmallGhostLogo` (`src/components/ui/SmallGhostLogo.tsx`)
- **Usage**: General UI, headers, modals.
- **Structure**: SVG with `foreignObject` for the shader.
- **Shape**: A classic ghost shape defined in `clipPath`.

### `ChatGhostLogo` (`src/components/ui/ChatGhostLogo.tsx`)
- **Usage**: Chat interfaces, AI avatars.
- **Structure**: Similar to `SmallGhostLogo` but with customizable `size` prop.
- **Shape**: Slightly more rounded/compact shape optimized for chat bubbles.

### `TinyGhostLogo` (`src/components/ui/TinyGhostLogo.tsx`)
- **Usage**: Navigation bars, small icons (e.g., `28px` width).
- **Structure**: Uses a CSS `maskImage` (Webkit mask) instead of SVG `clipPath` for better antialiasing at small sizes.
- **Path**: Uses a high-fidelity path (`TINY_GHOST_PATH`) to preserve details like the "3 wavy ridges" at the bottom even at small scales.

## 5. Technical Considerations

- **Safari Mobile Detection**: The components explicitly check for `isSafariMobile` to disable the heavy WebGL shader and switch to the CSS/SVG linear gradient. This prevents crashes and battery drain on iOS devices.
- **Client-Side Only**: The interactive parts (mouse tracking, shaders) are wrapped in `isClient` checks to avoid hydration mismatches with Next.js SSR.

---

# Ultimate Ghost Logo Implementation Guide

This section is designed to teach an LLM (or a developer) how to build the Kaiyros "Ghost Logo" from scratch. It breaks down the logic, physics, and rendering strategies into reproducible steps.

## 1. Prerequisites & Dependencies

To build this ghost, you need:
1.  **Animation Engine**: `framer-motion` (for physics-based eye movements and loops).
2.  **Shader Engine**: `@paper-design/shaders-react` (for the fluid mesh gradient).
3.  **React**: Hooks (`useState`, `useEffect`).

## 2. The Color DNA

First, define the brand colors. These specific hex codes are crucial for the ethereal look.

```typescript:src/lib/ghost-logo-colors.ts
export const GHOST_LOGO_COLORS = [
  "#ff99cc", // Orchid - Top/Left light source
  "#7bbbff", // Sky Blue - Cool accent
  "#6f3bf5", // Brand Purple - Main body
  "#5b2fcb", // Darker Purple - Depth
  "#26153f", // Midnight - Bottom shadow
]
```

## 3. The "Ghost Brain" (Logic Hook)

The ghost needs to "see" and "live". This requires three pieces of state logic:
1.  **Environment Detection**: Is this Safari Mobile? (Shaders crash/drain battery on iOS web, so we need a fallback).
2.  **Mouse Tracking**: Where is the user looking?
3.  **Eye Physics**: Calculate the eye offset relative to the face center.

### Core Logic Pattern
You should implement this logic inside your component:

```typescript
// 1. Detect Environment
useEffect(() => {
  const userAgent = navigator.userAgent
  // Detect Safari Mobile specifically
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent)
  setIsSafariMobile(isSafari && isMobile)
}, [])

// 2. Track Mouse
useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY })
  }
  window.addEventListener("mousemove", handleMouseMove)
  return () => window.removeEventListener("mousemove", handleMouseMove)
}, [])

// 3. Calculate Eye Offset (The "Looking" Logic)
useEffect(() => {
  // Get the ghost's bounding box
  const rect = document.querySelector("#my-ghost-id svg")?.getBoundingClientRect()
  if (rect) {
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // Calculate distance from center to mouse
    // Multiply by a factor (e.g., 0.1) to dampen the movement
    const deltaX = (mousePosition.x - centerX) * 0.1
    const deltaY = (mousePosition.y - centerY) * 0.1

    // Clamp the values so eyes don't leave the face
    const maxOffset = 4 
    setEyeOffset({
      x: Math.max(-maxOffset, Math.min(maxOffset, deltaX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, deltaY)),
    })
  }
}, [mousePosition])
```

## 4. The Body (Rendering Strategy)

There are two ways to render the ghost body. Choose based on size and fidelity needs.

### Strategy A: SVG with ClipPath (Best for Standard/Large sizes)
Used in `SmallGhostLogo`.
*   **Container**: An `<svg>` element.
*   **Shape**: defined in `<defs><clipPath id="shape">...</clipPath></defs>`.
*   **Fill**: A `<foreignObject>` containing the `<MeshGradient />` div, clipped by the `clipPath`.

### Strategy B: Div with CSS Mask (Best for Tiny/Icon sizes)
Used in `TinyGhostLogo`.
*   **Container**: A `<div>`.
*   **Shape**: An SVG string encoded as a data URL and applied via CSS `mask-image`.
*   **Fill**: The `<MeshGradient />` sits directly inside the div.
*   **Why?**: Better anti-aliasing on edges at small sizes (e.g., 28px).

## 5. The Component Blueprint (Standard Version)

Here is the complete recipe to assemble the standard `SmallGhostLogo`.

### Step-by-Step Assembly

1.  **The Wrapper**: A `motion.div` that handles the "floating" and "breathing".
    *   `y: [0, -2, 0]` (Float up and down)
    *   `scale: [1, 1.02, 1]` (Breathe in and out)
    *   Duration: 3s, Loop: Infinity.

2.  **The SVG Container**:
    *   Define the ghost path.
    *   Define the Fallback Gradient (Linear Gradient) for Safari.

3.  **The Body Fill Logic**:
    *   `if (!isSafariMobile)`: Render `<MeshGradient />` inside `foreignObject`.
    *   `else`: Render a standard `<path>` filled with the Linear Gradient.

4.  **The Eyes**:
    *   Two `motion.ellipse` elements.
    *   **Blinking**: Animate `ry` (vertical radius) from `6` -> `0.5` -> `6`.
    *   **Tracking**: Bind `cx` and `cy` to the calculated `eyeOffset`.
    *   **Spring Physics**: Use `type: "spring"` for `cx/cy` to make eye movements feel organic, not robotic.

## 6. Full Reference Implementation

Here is the "Golden Sample" code for the standard ghost.

```tsx
import { MeshGradient } from "@paper-design/shaders-react"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { GHOST_LOGO_COLORS } from "@/lib/ghost-logo-colors"

export function SmallGhostLogo() {
  // State
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 })
  const [isClient, setIsClient] = useState(false)
  const [isSafariMobile, setIsSafariMobile] = useState(false)

  // ... (Insert Logic Hook code from Section 3 here) ...

  return (
    <motion.div
      id="small-ghost-logo"
      className="relative w-12 h-12 mx-auto"
      // Floating Animation
      animate={{ y: [0, -2, 0], scale: [1, 1.02, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width="48" height="60" viewBox="0 0 48 60" className="w-full h-full">
        <defs>
          {/* THE SHAPE */}
          <clipPath id="ghostClip">
            <path d="M47.5 23V49.5C47.5 56 42.5 60 36 60C32 60 28.5 58 26 55C24 52.5 20.5 52.5 18 55C15.5 57 12.5 58 9 58C3.5 58 0 54 0 49V23C0 10.5 10.5 0 23 0C35.5 0 47.5 10.5 47.5 23Z" />
          </clipPath>
          
          {/* THE FALLBACK (Safari) */}
          <linearGradient id="fallbackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff99cc" />
            <stop offset="25%" stopColor="#7bbbff" />
            <stop offset="50%" stopColor="#6f3bf5" />
            <stop offset="75%" stopColor="#5b2fcb" />
            <stop offset="100%" stopColor="#26153f" />
          </linearGradient>
        </defs>

        {/* RENDER BODY: Modern Browser (Shader) */}
        {isClient && !isSafariMobile && (
          <foreignObject width="48" height="60" clipPath="url(#ghostClip)">
            <div className="w-full h-full">
              <MeshGradient colors={GHOST_LOGO_COLORS} className="w-full h-full" speed={1} />
            </div>
          </foreignObject>
        )}

        {/* RENDER BODY: Safari/Server (Static) */}
        {(isSafariMobile || !isClient) && (
          <path 
            d="M47.5 23V49.5... (Same as clipPath)" 
            fill="url(#fallbackGradient)"
          />
        )}

        {/* EYES (Left) */}
        <motion.ellipse
          rx="4" ry="6" fill="white"
          animate={{
            cx: 16 + eyeOffset.x,
            cy: 24 + eyeOffset.y,
            ry: [6, 0.5, 6], // Blink
          }}
          transition={{ 
            cx: { type: "spring", stiffness: 150, damping: 15 }, // Movement physics
            ry: { duration: 0.1, repeat: Infinity, repeatDelay: 2.9 } // Blink timing
          }}
        />
        
        {/* EYES (Right) */}
        <motion.ellipse
          rx="4" ry="6" fill="white"
          animate={{
            cx: 32 + eyeOffset.x,
            cy: 24 + eyeOffset.y,
            ry: [6, 0.5, 6],
          }}
          transition={{ 
            cx: { type: "spring", stiffness: 150, damping: 15 },
            ry: { duration: 0.1, repeat: Infinity, repeatDelay: 2.9 }
          }}
        />
      </svg>
    </motion.div>
  )
}
```

## 7. Key "Gotchas" for LLMs

1.  **Hydration**: Always wrap shader/window-dependent code in `if (!isClient) return null` or similar checks to avoid Next.js hydration errors.
2.  **ClipPath IDs**: If you have multiple ghosts on a page, `id="ghostClip"` must be unique (e.g., `ghostClip-${id}`). Otherwise, they might clip incorrectly.
3.  **Performance**: The `mousemove` event fires rapidly. In the `TinyGhostLogo`, we use `requestAnimationFrame` to throttle state updates. For simple implementations, the direct state update is usually fine, but `rAF` is better for production.
4.  **Z-Index**: Since the eyes are SVG elements rendered *after* the body (foreignObject/path), they naturally sit on top. No z-index needed inside the SVG.
