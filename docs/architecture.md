# Kisan Scheme Saathi — Architecture Documentation

## Executive Overview

**Kisan Scheme Saathi** ("From Scheme Confusion to Application Readiness") is an explainable, farmer-centric government scheme eligibility and application-readiness platform developed specifically for Karnataka, India.

Unlike generic LLM chatbots that hallucinate rules, fabricate criteria, or make false promises of government sanction, Kisan Scheme Saathi is built on an **authoritative deterministic rules engine**. Artificial intelligence (Google Gemini) is exclusively leveraged for grounded, bilingual (Kannada/English) plain-language explanations of verified outcomes.

---

## Architecture Topology

```
+--------------------------------------------------------------------------+
|                  CLIENT INTERFACE (PWA / Mobile / Web)                   |
|  - React 19 + Tailwind CSS + Lucide Icons + Framer Motion                |
|  - Full Offline PWA Support (Workbox / CacheFirst)                       |
|  - Instant Bilingual English & Kannada (Noto Sans Kannada)               |
+------------------------------------+-------------------------------------+
                                     |
                                REST APIs (JSON)
                                     |
+------------------------------------v-------------------------------------+
|                      FULLSTACK SERVER / BACKEND                          |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  |           AUTHORITATIVE DETERMINISTIC RULES ENGINE                 |  |
|  |  - Strict Equality, Inequalities, Ceiling/Floor Checks             |  |
|  |  - Multi-condition Disqualification & Exclusions Filter            |  |
|  |  - 3-State Classification: ELIGIBLE / LIKELY_ELIGIBLE / NOT_ELIG   |  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
|  +---------------------------+  +-------------------------------------+  |
|  | VERIFIED SCHEME REPOSITORY|  | GROUNDED AI EXPLAINER (GEMINI 2.5)  |  |
|  | - 8 Karnataka Schemes     |  | - Strictly Grounded in Result DTO   |  |
|  | - Bhoomi, FRUITS, DIMS    |  | - Never Overrides or Invents Rules  |  |
|  | - Samrakshane, SSP        |  | - Plain-Language Kannada/English    |  |
|  +---------------------------+  +-------------------------------------+  |
+--------------------------------------------------------------------------+
```

---

## Authoritative 3-State Classification

Every evaluated scheme yields exactly one of three states:

1. **`ELIGIBLE`**:
   - All mandatory criteria evaluated and satisfied.
   - Zero disqualifying exclusions triggered.
   - All prerequisite registrations confirmed.

2. **`LIKELY ELIGIBLE — VERIFICATION REQUIRED`**:
   - Meets all known baseline criteria.
   - One or more prerequisite conditions require verification on an official government portal (e.g. FRUITS ID, Bele Sameekshe crop survey, or RD barcode caste certificate).

3. **`NOT ELIGIBLE`**:
   - One or more mandatory criteria failed (e.g. land ceiling exceeded, not in Karnataka), OR
   - One or more exclusion rules triggered (e.g. income tax payee, institutional landholder, existing borewell on survey number).

---

## Security & Privacy Non-Negotiables

- **Zero Sensitive Data Storage**: The platform never asks for or stores Aadhaar 12-digit numbers, bank account numbers, or passwords.
- **Explainability**: Every result itemizes satisfied criteria (green), failed criteria (red), and unknown/verification-required criteria (amber).
- **Mandatory Disclaimer**: *"Final eligibility and benefit approval are determined exclusively by the responsible government authority."*
