
## UI/UX Improvements
- **Symmetry Fix**: Aligned "Market Context" (Right Panel) padding with "Signal Terminal" (Center Stage). Both now use `p-6` to ensure header labels align horizontally, creating a more cohesive "Control Panel" aesthetic.
- **Maxwell Traces**: `use-maxwell.ts` logs SSE events into `events` (phase-start/complete, synthesis/adjudication chunks, verification-progress). Only verification progress includes a human status string; other phases need derived messaging.
