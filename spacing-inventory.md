# Spacing Inventory & Analysis

## Executive Summary
The codebase follows a strong spacing system with `h-14` (56px) for headers, `px-6` (24px) for horizontal containers, and `gap-2` (8px) for atomic elements. However, there are notable deviations, particularly in `ThesisSection.tsx`.

## 1. Sections Inventory
`app/components/maxwell/sections/*.tsx`

| File | Header Height | Header Padding | Body Padding | Gap Patterns |
|------|--------------|----------------|--------------|--------------|
| **AssessmentSection.tsx** | `h-14` | `px-6` (on children) | `p-6` | `gap-2` |
| **HeaderSection.tsx** | `h-12` (Compact) | `px-6` | N/A | `gap-4`, `gap-6` |
| **OutcomesSection.tsx** | `h-14` | `px-6` | `px-6 py-6` | `gap-2` |
| **RawOutputSection.tsx** | `h-14` | `px-6` | **`p-6 pl-10`** | `gap-2`, `gap-6`, `space-x-4` |
| **ResolutionRiskSection.tsx** | `h-14` | `px-6` | **`p-6 pl-10`** | `gap-2`, `space-y-6` |
| **SourcesSection.tsx** | `h-14` | `px-6` | **`p-6 pl-10`** | `gap-2`, `space-y-6` |
| **ThesisSection.tsx** | `h-14` | **`px-4` (Mismatch)** | **`p-6 pl-10`** | `gap-2`, `space-y-8` |

### Key Inconsistencies
1.  **ThesisSection Header**: Uses `px-4` (Line 19) while all other main sections use `px-6`.
2.  **Body Padding Split**:
    *   Standard: `p-6` (Assessment, Outcomes)
    *   Indented: `p-6 pl-10` (RawOutput, ResolutionRisk, Sources, Thesis)

## 2. Primitives Inventory
`app/components/maxwell/primitives/*.tsx`

| File | Height | Padding | Gap/Space |
|------|--------|---------|-----------|
| **ConfidenceRangeBar.tsx** | `h-1.5` | - | `space-y-2`, `gap-2` |
| **DisclosureRow.tsx** | - | `py-3 px-4` (Container)<br>`pt-2 pb-6 px-4 pl-9` (Content) | `gap-2` |
| **OutcomeDataBar.tsx** | `h-2` | `py-2`, `pr-4` | `gap-6` |
| **ProbabilityBar.tsx** | `h-1`, `h-1.5`, `h-2` | - | `gap-1`, `space-y-2` |
| **SkeletonBlock.tsx** | `h-4`, `h-40`, `h-8` | `px-4 py-2`, `px-2 py-1` | `gap-0.5` |
| **VerdictPill.tsx** | - | `px-1.5 py-0.5` (sm)<br>`px-2 py-1` (default) | - |
| **VerificationBadge.tsx** | - | - | `gap-3`, `gap-1.5` |

## 3. MarketDataPanel Inventory
`app/components/MarketDataPanel.tsx`

*   **Header**: `h-12` (Matches HeaderSection)
*   **Header Padding**: `px-6`
*   **Body Padding**: `px-6 py-4` (vs Section `p-6`)
*   **Gaps**: `gap-4` (Grid), `gap-2` (Items)
*   **Internal Rows**: `px-6 py-3`, `px-6 pb-4`
