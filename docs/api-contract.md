# Kisan Scheme Saathi — REST API Contract

Base URL: `/api`

---

## 1. Health Probe
**`GET /api/health`**

Response:
```json
{
  "status": "UP",
  "service": "kisan-scheme-saathi-api",
  "version": "1.0.0",
  "timestamp": "2026-11-10T08:30:00Z",
  "rulesEngine": "authoritative-deterministic",
  "state": "Karnataka"
}
```

---

## 2. Scheme Discovery
**`GET /api/schemes`**

Query Parameters:
- `category` (optional): Filter by category (e.g. `Direct Financial Support`, `Crop Insurance`, `Irrigation & Infrastructure`)

Response:
```json
{
  "schemes": [
    {
      "id": "pm-kisan-raitha-siri",
      "nameEn": "PM-KISAN Samman Nidhi & Karnataka Raitha Siri",
      "nameKn": "ಪಿಎಂ-ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ ಮತ್ತು ಕರ್ನಾಟಕ ರೈತ ಸಿರಿ ಯೋಜನೆ",
      "category": "Direct Financial Support",
      "financialBenefitEn": "₹10,000 annually per landholding family...",
      "officialPortalUrl": "https://fruits.karnataka.gov.in",
      "lastVerifiedDate": "2026-10-15"
    }
  ],
  "total": 8,
  "version": "2026.4-KAR"
}
```

---

## 3. Scheme Detail
**`GET /api/schemes/{id}`**

Path Variables:
- `id`: Scheme unique string identifier (e.g. `pmfby-samrakshane`)

---

## 4. Deterministic Profile Evaluation
**`POST /api/eligibility/evaluate`**

Request Body (`FarmerProfile`):
```json
{
  "state": "Karnataka",
  "district": "mandya",
  "farmerCategory": "small_marginal",
  "socialCategory": "OBC_2A",
  "landHoldingAcres": 2.5,
  "hasLandOwnership": true,
  "annualIncome": 120000,
  "age": 42,
  "cropsGrown": ["Paddy", "Sugarcane"],
  "hasWaterSource": true,
  "hasExistingBorewell": false,
  "isCooperativeMember": true,
  "hasChildrenInHigherEducation": false,
  "notifiedCropInHobli": true,
  "hasFruitsId": true,
  "hasRtcOrPahani": true,
  "hasAadhaarBankLinked": true,
  "hasCasteIncomeCertificate": true,
  "hasSowingCertificate": true,
  "isInstitutionalLandholder": false,
  "isConstitutionalPostHolder": false,
  "isGovernmentEmployee": false,
  "isIncomeTaxPayee": false,
  "isEnrolledInEsiOrCghs": false
}
```

Response:
```json
{
  "timestamp": "2026-11-10T08:31:00Z",
  "evaluatedCount": 8,
  "results": [
    {
      "schemeId": "pm-kisan-raitha-siri",
      "schemeName": "PM-KISAN Samman Nidhi & Karnataka Raitha Siri",
      "schemeNameKn": "ಪಿಎಂ-ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ ಮತ್ತು ಕರ್ನಾಟಕ ರೈತ ಸಿರಿ ಯೋಜನೆ",
      "status": "ELIGIBLE",
      "statusLabelEn": "ELIGIBLE",
      "statusLabelKn": "ಅರ್ಹತೆ ಹೊಂದಿದ್ದಾರೆ",
      "satisfiedConditions": [ ... ],
      "failedConditions": [],
      "unknownConditions": [],
      "verificationRequired": false,
      "officialPortalUrl": "https://fruits.karnataka.gov.in",
      "lastVerifiedDate": "2026-10-15",
      "nextActionEn": "Proceed to application readiness checklist..."
    }
  ]
}
```

---

## 5. Scheme Document Prerequisites Checklist
**`GET /api/schemes/{id}/checklist`**

---

## 6. Grounded Gemini AI Explanation
**`POST /api/assistant/explain`**

Request:
```json
{
  "schemeId": "ganga-kalyana",
  "result": { ... },
  "userQuestion": "Why do I need to verify my caste certificate?",
  "language": "kn"
}
```

Response:
```json
{
  "explanation": "ಗಂಗಾ ಕಲ್ಯಾಣ ಯೋಜನೆಯು ಹಿಂದುಳಿದ ಹಾಗೂ ಪರಿಶಿಷ್ಟ ವರ್ಗಗಳಿಗೆ ಮೀಸಲಾದ ಯೋಜನೆಯಾಗಿದೆ...",
  "source": "grounded-gemini"
}
```
