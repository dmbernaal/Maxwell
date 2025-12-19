# Maxwell Development Changelog

This file tracks the completion of each implementation phase.

---

## Phase 0: Foundation
**Status**: ✅ Complete  
**Completed**: December 19, 2024

### Files Created
- `app/lib/maxwell/types.ts` - All TypeScript interfaces (~320 lines)
- `app/lib/maxwell/env.ts` - Environment validation with fail-fast pattern
- `app/lib/maxwell/constants.ts` - Configuration constants and thresholds
- `tests/test-foundation.ts` - Foundation test script

### Directories Created
- `app/lib/maxwell/` - Core Maxwell business logic
- `app/api/maxwell/` - API endpoints (empty, for Phase 9)
- `app/components/maxwell/` - UI components (empty, for Phase 11)
- `tests/` - Test files

### Types Defined
- Decomposition: `SubQuery`, `DecompositionOutput`
- Search: `MaxwellSource`, `SearchMetadata`, `SearchOutput`
- Synthesis: `SynthesisOutput`
- Verification: `ExtractedClaim`, `Passage`, `NumericCheck`, `VerifiedClaim`, `VerificationOutput`, `VerificationSummary`
- Orchestrator: `PhaseStatus`, `MaxwellPhases`, `MaxwellResponse`
- Events: `PhaseStartEvent`, `PhaseCompleteEvent`, `SearchProgressEvent`, `SynthesisChunkEvent`, `VerificationProgressEvent`, `CompleteEvent`, `ErrorEvent`, `MaxwellEvent`
- Frontend: `ExecutionPhase`, `PhaseDurations`, `MaxwellState`

### Constants Defined
- Models: `DECOMPOSITION_MODEL`, `SYNTHESIS_MODEL`, `CLAIM_EXTRACTION_MODEL`, `NLI_MODEL`, `EMBEDDING_MODEL`
- Thresholds: `HIGH_CONFIDENCE_THRESHOLD` (0.72), `MEDIUM_CONFIDENCE_THRESHOLD` (0.42)
- Limits: `MAX_SUB_QUERIES` (5), `RESULTS_PER_QUERY` (5), `MAX_CLAIMS_TO_VERIFY` (12)

### Tests Passed
- [x] `npm run build` - TypeScript compiles without errors
- [x] `npx tsx --env-file=.env tests/test-foundation.ts` - All checks pass

### Notes
- Using OpenRouter for embeddings (`qwen/qwen3-embedding-8b`) instead of OpenAI
- No `OPENAI_API_KEY` required - all API calls go through OpenRouter
- Named Maxwell source type `MaxwellSource` to avoid conflict with existing `Source` type
