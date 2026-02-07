# Design Change: Continuous Progress Bar

## Context
The user requested a "Flash Speed" progress concept to replace the discrete segmented bar. The goal was to create a sense of continuous, high-velocity motion.

## Implementation
- Created `ContinuousProgress.tsx` primitive.
- Replaced the segmented bar in `ResearchProgress.tsx` with `ContinuousProgress`.

## Visual Details
- **Continuous Line:** A single 2px line at the top of the container.
- **Spring Physics:** Used `framer-motion` spring with high stiffness (120) and damping (20) to simulate "Flash" speed (rapid acceleration/deceleration).
- **Visual Effects:**
    - **Gradient Trail:** `from-transparent via-indigo-500 to-white`
    - **Comet Head:** A white blur and shadow at the leading edge.
    - **Warp Speed Shimmer:** A continuous linear gradient animation moving across the bar.

## Files Modified
- `app/components/maxwell/primitives/ContinuousProgress.tsx` (New)
- `app/components/maxwell/ResearchProgress.tsx` (Modified)
