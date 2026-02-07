# Maxwell Pipeline — Explained for the Team

## The Short Version

**A basic RAG system trusts the LLM. Maxwell doesn't.**

A RAG system retrieves documents, feeds them to an LLM, and hopes the answer is correct. Maxwell retrieves documents, generates an answer, then **puts every claim on trial** — checking each one against the actual evidence before producing the final output.

---

## What a Basic RAG System Does

```mermaid
flowchart LR
    Q([User Question]) --> R[Retrieve\nRelevant Chunks]
    R --> LLM[LLM Generates\nAnswer]
    LLM --> A([Answer with\nSource References])

    style Q fill:#1a1a1a,stroke:#444,color:#fff
    style R fill:#1a1a1a,stroke:#444,color:#fff
    style LLM fill:#1a1a1a,stroke:#444,color:#fff
    style A fill:#1a1a1a,stroke:#444,color:#fff
```

**3 steps. That's it.**

1. User asks a question
2. System finds relevant document chunks (via embeddings + cosine similarity)
3. LLM reads the chunks and generates an answer with "[source]" references

**The problem:** The LLM will confidently cite Source [3] while saying something Source [3] never actually said. It hallucinates facts, invents numbers, and misattributes claims — all while looking perfectly cited. There's no check. You just trust it.

---

## What Maxwell Does

```mermaid
flowchart TD
    Q([User Question + Market Data]) --> D

    subgraph Phase1["PHASE 1 · DECOMPOSE"]
        D[LLM breaks question into\n3-9 targeted sub-queries\neach with topic, depth, time range]
    end

    D --> S

    subgraph Phase2["PHASE 2 · SEARCH + EXTRACT"]
        S[Parallel Tavily searches\nacross all sub-queries] --> F[Filter: remove low-relevance\nresults + blocked domains]
        F --> E[Tavily Extract: fetch full\npage content for top 5 sources]
        E --> EMB[Pre-embed ALL passages\ninto vectors for later use]
    end

    EMB --> SYN

    subgraph Phase3["PHASE 3 · SYNTHESIZE"]
        SYN[LLM reads ALL sources\nand writes a detailed\nintelligence report with citations]
    end

    SYN --> CL

    subgraph Phase4["PHASE 4 · VERIFY — This is what makes Maxwell different"]
        CL[Extract every factual\nclaim from the report] --> COS[For each claim:\ncompute cosine similarity\nagainst ALL source passages]
        COS --> NLI[For each claim + best evidence:\nNLI entailment check\nSUPPORTED / CONTRADICTED / NEUTRAL]
        NLI --> NUM[Numeric consistency check:\ndo the numbers actually match?]
        NUM --> PX[Perplexity cross-check:\nindependent search engine\nverifies key claims]
        PX --> AGG[Aggregate all signals\ninto confidence score per claim]
    end

    AGG --> ADJ

    subgraph Phase5["PHASE 5 · ADJUDICATE"]
        ADJ[New LLM call that ONLY uses:\n✓ Verified facts\n✗ Corrected contradictions\n? Hedged uncertain claims\nProduces final clean answer]
    end

    ADJ --> PR

    subgraph Phase6["PHASE 6 · PRESENT"]
        PR[Transform into structured\nMaxwellIntelligence JSON:\nassessment, thesis, outcomes,\nverification scores, sources]
    end

    PR --> OUT([Final Intelligence Report\nwith confidence scores])

    style Q fill:#7C3AED,stroke:#7C3AED,color:#fff
    style OUT fill:#7C3AED,stroke:#7C3AED,color:#fff
    style Phase4 fill:#111,stroke:#7C3AED,color:#fff
```

**6 phases. The magic is Phase 4.**

---

## Side-by-Side Comparison

```mermaid
flowchart LR
    subgraph RAG["BASIC RAG"]
        direction TB
        R1[Retrieve chunks] --> R2[LLM generates answer]
        R2 --> R3[Return answer\n— hope it's right]
    end

    subgraph MAX["MAXWELL"]
        direction TB
        M1[Decompose into\nsub-queries] --> M2[Search + Extract\nfull content]
        M2 --> M3[LLM synthesizes\nfirst draft]
        M3 --> M4[Extract every\nfactual claim]
        M4 --> M5[Verify each claim\nagainst evidence]
        M5 --> M6[Cross-check with\nindependent search]
        M6 --> M7[Rebuild answer\nfrom verified facts only]
        M7 --> M8[Structure into\nintelligence report]
    end

    style RAG fill:#1a1a1a,stroke:#444,color:#fff
    style MAX fill:#1a1a1a,stroke:#7C3AED,color:#fff
```

| | Basic RAG | Maxwell |
|---|---|---|
| **Search** | Single query → retrieve chunks | 3-9 targeted sub-queries in parallel |
| **Sources** | Pre-loaded document chunks | Live web search + full page extraction |
| **Synthesis** | LLM reads chunks, writes answer | LLM reads ALL sources, writes detailed report |
| **Verification** | ❌ None. Trust the LLM. | ✅ Every claim extracted and checked |
| **Hallucination check** | ❌ None | ✅ Cosine similarity + NLI entailment + numeric check |
| **Independent check** | ❌ None | ✅ Perplexity cross-validates key claims |
| **Final answer** | Raw LLM output | Rebuilt from ONLY verified facts |
| **Confidence** | None | Per-claim confidence score (0-100%) |
| **Output** | Text blob | Structured intelligence: assessment, thesis, factors, risks |

---

## The Verification Phase in Detail

This is the part your co-founder's RAG system does NOT do. Here's exactly what happens:

```mermaid
sequenceDiagram
    participant SYN as Synthesis Output
    participant CE as Claim Extractor
    participant EMB as Embedding Engine
    participant NLI as NLI Checker
    participant PX as Perplexity
    participant AGG as Signal Aggregator

    SYN->>CE: "Drake Maye threw 4,394 yards and 31 TDs [3]"
    CE->>CE: Extract: Claim C1 = "Drake Maye threw 4,394 yards"
    CE->>CE: Extract: Claim C2 = "Drake Maye threw 31 TDs"
    CE->>CE: Extract: Claim C3 = "Source [3] supports this"

    Note over CE,EMB: For EACH claim...

    CE->>EMB: Embed claim C1
    EMB->>EMB: Cosine similarity vs ALL 6,249 source passages
    EMB->>EMB: Best match: Source [3] passage, similarity 0.91
    EMB->>EMB: Also check: Does Source [3] actually say this?

    EMB->>NLI: Claim: "4,394 yards" + Evidence: best passage
    NLI->>NLI: SUPPORTED — passage confirms 4,394 yards
    NLI->>AGG: verdict=SUPPORTED, confidence=0.91

    EMB->>NLI: Claim: "31 TDs" + Evidence: best passage
    NLI->>NLI: CONTRADICTED — passage says 29 TDs, not 31
    NLI->>AGG: verdict=CONTRADICTED, confidence=0.15

    AGG->>PX: Cross-check C2 with independent search
    PX->>PX: Perplexity searches web independently
    PX->>AGG: DISAGREES — confirms 29 TDs

    Note over AGG: C1: VERIFIED (4,394 yards ✓)
    Note over AGG: C2: DISPUTED (31 TDs → actually 29 TDs)
```

**This is what catches hallucinations.** The LLM confidently wrote "31 TDs" and cited Source [3]. A basic RAG would pass that through. Maxwell catches it because:

1. It embeds the claim and finds the actual passage in Source [3]
2. NLI entailment check compares "31 TDs" vs what the passage actually says ("29 TDs")
3. Perplexity independently confirms it's 29, not 31
4. The adjudicator receives "CONTRADICTED: 31 TDs → actually 29 TDs" and uses the correct number

---

## Why This Matters for Making Money

```mermaid
flowchart TD
    subgraph BAD["WITHOUT VERIFICATION"]
        B1[LLM says:\nTeam has 14-3 record\nagainst tough schedule] --> B2[Trader thinks:\nStrong team, buy YES]
        B2 --> B3[Reality:\nSchedule was 31st-ranked\neasiest in NFL]
        B3 --> B4[💸 Lost money on\nbad information]
    end

    subgraph GOOD["WITH MAXWELL VERIFICATION"]
        G1[LLM says:\nTeam has 14-3 record\nagainst tough schedule] --> G2[Verification catches:\nSchedule was 31st-ranked\nnot tough]
        G2 --> G3[Adjudicator corrects:\n14-3 record against\n31st-ranked schedule]
        G3 --> G4[Trader thinks:\nInflated record,\nbe cautious]
    end

    style BAD fill:#1a1a1a,stroke:#EF4444,color:#fff
    style GOOD fill:#1a1a1a,stroke:#22C55E,color:#fff
```

---

## The Full Pipeline at a Glance

```mermaid
flowchart LR
    A[DECOMPOSE\n3-9 sub-queries] -->|queries| B[SEARCH\n+ EXTRACT\n20-50 sources]
    B -->|sources + embeddings| C[SYNTHESIZE\nDraft report\nwith citations]
    C -->|draft| D[VERIFY\nEvery claim\nchecked]
    D -->|verified claims| E[ADJUDICATE\nRebuild from\nverified facts]
    E -->|clean answer| F[PRESENT\nStructured\nintelligence]

    style A fill:#1a1a1a,stroke:#555,color:#fff
    style B fill:#1a1a1a,stroke:#555,color:#fff
    style C fill:#1a1a1a,stroke:#555,color:#fff
    style D fill:#1a1a1a,stroke:#7C3AED,color:#fff
    style E fill:#1a1a1a,stroke:#7C3AED,color:#fff
    style F fill:#1a1a1a,stroke:#555,color:#fff
```

**Phase 4 (Verify) and Phase 5 (Adjudicate) are what no basic RAG system does.** That's Maxwell's moat.

---

## TL;DR for the Team

**RAG = "Here's what the LLM thinks the documents say"**
**Maxwell = "Here's what the documents actually say, verified claim by claim"**

Your co-founder's RAG system retrieves chunks and lets the LLM reference them. Maxwell does that AND THEN puts every single claim on trial — checking it against the actual source text, running an independent search to cross-validate, and only including facts that survive verification. The final answer is rebuilt from scratch using only verified information.

That's not a RAG. That's a verification engine with a RAG as its first step.
