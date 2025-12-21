# Maxwell Features & Data Availability

> **Status:** Analysis of current codebase capabilities.

This document outlines the features, streaming capabilities, and data structures available in the Maxwell pipeline. It serves as a reference for UI development and feature implementation.

## 1. Streaming Capabilities

Maxwell uses a robust event-based streaming architecture (`AsyncGenerator`) that provides real-time updates to the frontend.

| Event Type | Payload Data | UI Application |
|------------|--------------|----------------|
| `phase-start` | `{ phase: string }` | Show active phase indicator (e.g., "Searching...", "Verifying...") |
| `phase-complete` | `{ phase: string, data: any }` | Mark phase as done, display summary stats |
| `search-progress` | `SearchMetadata` | Show individual sub-queries completing in real-time |
| `synthesis-chunk` | `{ content: string }` | Stream the answer text token-by-token |
| `verification-progress` | `{ current, total, status }` | Show progress bar (e.g., "Verifying claim 3 of 8") |
| `adjudication-chunk` | `{ content: string }` | Stream the final verdict token-by-token |
| `complete` | `MaxwellResponse` | Final state update, enable "View Results" |

## 2. Data Availability by Phase

### Phase 1: Decomposition
**Available Data:**
- **Original Query:** The user's raw input.
- **Sub-Queries:** List of optimized search queries (`id`, `query`, `purpose`).
- **Reasoning:** Strategy explanation for *why* these queries were chosen.
- **Duration:** Time taken.

### Phase 2: Search
**Available Data:**
- **Sources:** Deduplicated list of all found sources.
  - `url`, `title`, `snippet`, `fromQuery`
- **Search Metadata:** Status of each sub-query execution.
  - `query`, `sourcesFound`, `status`

### Phase 3: Synthesis
**Available Data:**
- **Answer:** Full markdown text with `[n]` citations.
- **Sources Used:** List of source IDs actually cited in the text.

### Phase 4: Verification (The "Killer Feature")
This phase produces rich data for every factual claim extracted from the answer.

**Per-Claim Data (`VerifiedClaim`):**
- **Claim Text:** The specific fact being verified.
- **Verdict (`entailment`):** `SUPPORTED`, `NEUTRAL`, or `CONTRADICTED`.
- **Confidence Score:** 0.0 - 1.0 (and computed level: high/medium/low).
- **Reasoning (`entailmentReasoning`):** Explanation from the NLI model (e.g., *"The evidence explicitly states X, which supports the claim..."*).
- **Evidence (`bestMatchingSource`):**
  - `passage`: The exact sentence(s) from the source used for verification.
  - `sourceTitle`: Title of the source.
  - `sourceIndex`: Index of the source.
  - `isCitedSource`: Whether this evidence came from a source cited in the answer.
- **Issues:** List of specific problems (e.g., "Numeric mismatch", "Citation mismatch").

### Phase 5: Adjudication
**Available Data:**
- **Verdict Text:** The final authoritative summary or correction.
- **Status:** Implicitly derived from verification results (Verified vs. Correction).

## 3. Feature Status: Reasoning & Evidence

**Do they still exist?**
**YES.** The backend pipeline fully generates and returns both reasoning and evidence for every verified claim.

*   **Reasoning:** Available as `claim.entailmentReasoning`.
*   **Evidence:** Available as `claim.bestMatchingSource.passage`.

**Current UI Status:**
The data is present in the `VerificationOutput` object passed to the frontend. However, the current `VerificationPanel` implementation (Grid View) **does not currently display** these fields. It only shows the claim text, verdict, and confidence score. The `ClaimRow` component (which supports expanding to show reasoning/evidence) is defined in the code but currently unused in the main view.

## 4. UI Implementation Opportunities

Based on the available data, the following UI features can be enabled:

1.  **Expandable Verification Cards:** Click a card to reveal the `entailmentReasoning` and `bestMatchingSource.passage`.
2.  **Source Attribution:** Show which specific source provided the evidence (using `sourceTitle` and `sourceIndex`).
3.  **Issue Highlighting:** Display specific flags like "Numeric Mismatch" or "Citation Error" derived from the `issues` array.
4.  **Live Progress:** Use `verification-progress` events to show claims being checked one-by-one.
