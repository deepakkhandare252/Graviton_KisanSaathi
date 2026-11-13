# KISAN SCHEME SAATHI (ಕಿಸಾನ್ ಸ್ಕೀಮ್ ಸಾಥಿ)
> *"From Scheme Confusion to Application Readiness."*

An explainable, farmer-centric government scheme eligibility and application-readiness assistant tailored specifically for **Karnataka, India**.

---

## 🌟 The Core Problem We Solve
Indian agriculture features dozens of Central and State schemes (PM-KISAN, PMFBY, PMKSY, Ganga Kalyana, Raitha Vidya Nidhi, Raitha Sanjeevini, Yashaswini). Yet farmers frequently face:
1. **Scheme Confusion**: Vague criteria and unfamiliarity with official gazette rules.
2. **Rejection at Counters**: Showing up at Raitha Samparka Kendras (RSK) or Grama One with missing land records (RTC/Pahani), unseeded FRUITS IDs, or lack of NPCI bank mapping.
3. **AI Hallucinations**: Generic chatbots that invent requirements, manufacture fake URLs, or make unverified promises of government approval.

**Kisan Scheme Saathi** solves this by separating **deterministic rules evaluation** from **grounded AI explanation**.

---

## 🏛️ System Architecture

- **Authoritative Deterministic Rules Engine**:
  - Implemented with strict logical evaluations: numeric ceilings/floors, boolean prerequisites, categorical memberships, and disqualifying exclusions.
  - Three distinct outcomes:
    1. **`ELIGIBLE`** (All mandatory criteria satisfied, zero exclusions)
    2. **`LIKELY ELIGIBLE — VERIFICATION REQUIRED`** (Baseline criteria met; official portal verification needed)
    3. **`NOT ELIGIBLE`** (Mandatory rule failed or statutory exclusion triggered)
- **Karnataka Government Integrations Reference**:
  - **FRUITS Portal** (Farmer Registration & Unified Beneficiary Information System)
  - **Bhoomi Portal** (Digitally signed RTC / Pahani records)
  - **Samrakshane Portal** (Crop Insurance & Bele Sameekshe crop surveys)
  - **Nadakacheri** (RD Barcode Caste & Income Certificates)
  - **State Scholarship Portal (SSP)** (Raitha Vidya Nidhi student-parent matching)
- **Strict Separation of Concerns**:
  - `backend/`: Java Spring Boot production architecture (controllers, services, entities, DTOs, evaluators, `pom.xml`, `application.properties`).
  - `server.ts`: Express fullstack API server providing `/api/schemes`, `/api/eligibility/evaluate`, `/api/schemes/:id/checklist`, and `/api/assistant/explain`.
  - `frontend/`: React 19 + Tailwind CSS + Lucide Icons + PWA offline support.
- **Bilingual Internationalization (i18n)**:
  - 100% full translations in **Kannada (ಕನ್ನಡ)** and **English** across all forms, buttons, condition breakdowns, checklists, and guides.
- **Progressive Web App (PWA) & Multi-Layer Caching**:
  - **TanStack Query**: Centralized `QueryClient` with user-scoped query keys (`["saved-schemes", userId]`, `["applications", userId]`), bounded retries, request deduplication, and `refetchOnReconnect`.
  - **IndexedDB (`idb`)**: Persists public Karnataka scheme rules, checklists, and application portal guides (`kisan_scheme_saathi_cache`), separating local cache timestamps (`cachedTimestamp`) from official rule verification dates (`lastVerifiedDate`).
  - **Service Worker (`vite-plugin-pwa` / Workbox)**: Precaches static assets and applies `NetworkFirst` caching strictly to public `GET /api/schemes*` routes.
  - **Backend Caffeine Cache (`backend/`)**: `@EnableCaching` + `CaffeineCacheManager` for `schemesCatalog`, `schemeDetails`, `schemeChecklists`, and `schemeGuides` (30-min TTL, stats & eviction support).
  - **Strict Security Boundaries**: Auth routes, SMS OTPs, JWTs, eligibility API calls, saved schemes, and private application records are never cached in Service Worker `CacheStorage` or public IndexedDB stores (`Cache-Control: no-store`). All user-scoped query caches are purged immediately on sign-out, account switch, or `401` responses.

---

## 📋 Verified Karnataka Schemes Included

1. **PM-KISAN & Karnataka Raitha Siri**: ₹10,000/yr direct income support (₹6,000 Central + ₹4,000 Karnataka DBT).
2. **Pradhan Mantri Fasal Bima Yojana (Samrakshane)**: Subsidized crop loss insurance (1.5% to 2% farmer premium).
3. **PM Krishi Sinchayee Yojana (PMKSY Drip & Sprinkler)**: Up to 90% subsidy for SC/ST and 75% for small/marginal farmers.
4. **Ganga Kalyana Scheme**: Free borewell drilling, pump set, and energization for SC/ST and backward classes farmers owning 1.5–5 acres.
5. **Krishi Yanthradhare (CHSC)**: 30–50% subsidized farm machinery hiring across 300+ hobli custom hiring service centers.
6. **Chief Minister's Raitha Vidya Nidhi**: ₹2,500 to ₹11,000 annual scholarship for farmer children pursuing post-matric / higher education.
7. **Raitha Sanjeevini Accidental Relief Scheme**: ₹2,00,000 compensation for agricultural accidents, snakebites, and machinery mishaps.
8. **Yashaswini Health Insurance**: Cashless hospitalization up to ₹5,00,000/yr for members of rural cooperative societies.

---

## 🚀 Running the Application

### Development Server:
```bash
npm run dev
# Starts server.ts on port 3000 with Vite middleware and REST APIs
```

### Running Logic Unit Tests:
```bash
npm run test
# Executes fast unit tests via npx --yes tsx --test src/rules/rulesEngine.test.ts
```

### Building for Production:
```bash
npm run build
npm start
```

---

## 🔒 Statutory Disclaimer
*Final eligibility and benefit approval are determined exclusively by the authorized government agency upon official verification. Kisan Scheme Saathi provides deterministic pre-application advisory.*
