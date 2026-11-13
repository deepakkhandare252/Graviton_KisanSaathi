import test from 'node:test';
import assert from 'node:assert/strict';
import { RulesEngine } from './rulesEngine.ts';
import { VERIFIED_SCHEMES } from '../data/schemesData.ts';
import { FarmerProfile } from '../types/scheme.ts';

const baseFarmerProfile: FarmerProfile = {
  state: 'Karnataka',
  district: 'mandya',
  farmerCategory: 'small_marginal',
  socialCategory: 'OBC_2A',
  landHoldingAcres: 2.5,
  hasLandOwnership: true,
  annualIncome: 120000,
  age: 42,
  cropsGrown: ['Paddy', 'Sugarcane'],
  hasWaterSource: true,
  hasExistingBorewell: false,
  isCooperativeMember: true,
  hasChildrenInHigherEducation: true,
  notifiedCropInHobli: true,
  hasFruitsId: true,
  fruitsIdNumber: 'FID-2026-987654',
  hasRtcOrPahani: true,
  hasAadhaarBankLinked: true,
  hasCasteIncomeCertificate: true,
  hasSowingCertificate: true,
  isInstitutionalLandholder: false,
  isConstitutionalPostHolder: false,
  isGovernmentEmployee: false,
  isIncomeTaxPayee: false,
  isEnrolledInEsiOrCghs: false
};

test('Rules Engine: Fully compliant farmer qualifies as ELIGIBLE for PM-KISAN & Raitha Siri', () => {
  const pmKisan = VERIFIED_SCHEMES.find((s) => s.id === 'pm-kisan-raitha-siri');
  assert.ok(pmKisan, 'Scheme definition must exist');

  const result = RulesEngine.evaluateScheme(pmKisan, baseFarmerProfile);

  assert.equal(result.status, 'ELIGIBLE');
  assert.equal(result.statusLabelEn, 'ELIGIBLE');
  assert.equal(result.failedConditions.length, 0);
  assert.ok(result.satisfiedConditions.length > 0);
  assert.equal(result.verificationRequired, false);
});

test('Rules Engine: Exclusion triggered (Income Tax Payee) produces NOT_ELIGIBLE', () => {
  const pmKisan = VERIFIED_SCHEMES.find((s) => s.id === 'pm-kisan-raitha-siri');
  assert.ok(pmKisan);

  const taxPayerProfile = {
    ...baseFarmerProfile,
    isIncomeTaxPayee: true
  };

  const result = RulesEngine.evaluateScheme(pmKisan, taxPayerProfile);

  assert.equal(result.status, 'NOT_ELIGIBLE');
  assert.equal(result.statusLabelEn, 'NOT ELIGIBLE');
  const exclusion = result.failedConditions.find((c) => c.condition.id === 'excl_tax_payer');
  assert.ok(exclusion, 'Should contain failed exclusion condition');
  assert.match(exclusion.reasonEn, /Exclusion triggered/);
});

test('Rules Engine: Missing mandatory attribute (e.g. state or FRUITS ID unknown) produces LIKELY_ELIGIBLE', () => {
  const pmKisan = VERIFIED_SCHEMES.find((s) => s.id === 'pm-kisan-raitha-siri');
  assert.ok(pmKisan);

  const partialProfile: Partial<FarmerProfile> = {
    ...baseFarmerProfile,
    hasFruitsId: undefined
  };

  const result = RulesEngine.evaluateScheme(pmKisan, partialProfile);

  assert.equal(result.status, 'LIKELY_ELIGIBLE');
  assert.equal(result.verificationRequired, true);
  assert.ok(result.unknownConditions.length > 0);
  const fruitsUnknown = result.unknownConditions.find((c) => c.condition.field === 'hasFruitsId');
  assert.ok(fruitsUnknown);
});

test('Rules Engine: Ganga Kalyana borewell exclusion triggers NOT_ELIGIBLE when existing borewell exists', () => {
  const gangaKalyana = VERIFIED_SCHEMES.find((s) => s.id === 'ganga-kalyana');
  assert.ok(gangaKalyana);

  const farmerWithBorewell: FarmerProfile = {
    ...baseFarmerProfile,
    hasExistingBorewell: true
  };

  const result = RulesEngine.evaluateScheme(gangaKalyana, farmerWithBorewell);

  assert.equal(result.status, 'NOT_ELIGIBLE');
  const existingBorewellFail = result.failedConditions.find((c) => c.condition.id === 'gk_excl_existing_borewell');
  assert.ok(existingBorewellFail);
});

test('Rules Engine: PMKSY ceiling check fails when land holding exceeds 12.5 acres', () => {
  const pmksy = VERIFIED_SCHEMES.find((s) => s.id === 'pmksy-micro-irrigation');
  assert.ok(pmksy);

  const largeFarmer: FarmerProfile = {
    ...baseFarmerProfile,
    landHoldingAcres: 18.0
  };

  const result = RulesEngine.evaluateScheme(pmksy, largeFarmer);

  assert.equal(result.status, 'NOT_ELIGIBLE');
  const ceilingFail = result.failedConditions.find((c) => c.condition.id === 'pmksy_land_ceiling');
  assert.ok(ceilingFail);
});

test('Rules Engine: All schemes evaluation returns structured bilingual explanations', () => {
  const results = RulesEngine.evaluateAllSchemes(VERIFIED_SCHEMES, baseFarmerProfile);
  assert.equal(results.length, VERIFIED_SCHEMES.length);

  for (const res of results) {
    assert.ok(res.schemeId);
    assert.ok(res.schemeName);
    assert.ok(res.schemeNameKn);
    assert.ok(res.summaryExplanationEn);
    assert.ok(res.summaryExplanationKn);
    assert.ok(res.nextActionEn);
    assert.ok(res.nextActionKn);
    assert.ok(res.officialPortalUrl);
    assert.ok(res.lastVerifiedDate);
  }
});
