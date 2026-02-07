# Design Decisions

## Intelligence Summary Redesign
- **Problem**: User hated the "Accordion Row" with chevron (looked like "hacker slop").
- **Goal**: Improve vertical rhythm and connect the Ticker to the Table.
- **Solution**: "The Note" style.
  - Removed accordion, chevron, and box borders.
  - Used a clean text block with a subtle left border (`border-l border-white/10`).
  - Added a minimal "EXECUTIVE SUMMARY" label in `text-[10px] font-mono`.
  - Improved typography: `font-light`, `tracking-wide`, `leading-7` for better readability.
  - Kept metadata (Model name) but made it subtle.
- **Result**: The text now acts as a bridge between the Ticker and the Table, matching the "Raycast AI" aesthetic.
