import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAppQueryClient,
  queryKeys,
  computeProfileHash,
  buildEligibilityCacheKey,
  shouldRetryQuery,
  clearPrivateUserCaches
} from './queryClient.ts';

test('user-scoped query keys isolate data across accounts and guest mode', () => {
  assert.notDeepEqual(queryKeys.savedSchemes('user-1'), queryKeys.savedSchemes('user-2'));
  assert.notDeepEqual(queryKeys.applications('user-1'), queryKeys.applications('guest'));
  assert.notDeepEqual(queryKeys.notifications('user-1'), queryKeys.notifications('user-2'));
  assert.notDeepEqual(queryKeys.profile('user-1'), queryKeys.profile('user-2'));
});

test('computeProfileHash & buildEligibilityCacheKey re-key on any input or rule version change', () => {
  const profileA = {
    state: 'Karnataka',
    district: 'mandya',
    landHoldingAcres: 2.5,
    cropsGrown: ['Paddy', 'Sugarcane']
  };
  const profileSameCanonicalOrder = {
    state: 'Karnataka',
    district: 'mandya',
    landHoldingAcres: 2.5,
    cropsGrown: ['Sugarcane', 'Paddy']
  };
  const profileModifiedLand = {
    ...profileA,
    landHoldingAcres: 6.0
  };

  assert.equal(computeProfileHash(profileA), computeProfileHash(profileSameCanonicalOrder));
  assert.notEqual(computeProfileHash(profileA), computeProfileHash(profileModifiedLand));

  assert.notDeepEqual(
    buildEligibilityCacheKey('all', profileA, '2026.5-KAR'),
    buildEligibilityCacheKey('all', profileA, '2026.6-KAR')
  );
  assert.notDeepEqual(
    buildEligibilityCacheKey('all', profileA, '2026.5-KAR'),
    buildEligibilityCacheKey('all', profileModifiedLand, '2026.5-KAR')
  );
});

test('shouldRetryQuery skips 4xx auth/validation errors and bounds transient retries', () => {
  assert.equal(shouldRetryQuery(0, { status: 401 }), false);
  assert.equal(shouldRetryQuery(0, { status: 403 }), false);
  assert.equal(shouldRetryQuery(0, { status: 404 }), false);
  assert.equal(shouldRetryQuery(0, { status: 409 }), false);
  assert.equal(shouldRetryQuery(0, { status: 503 }), true);
  assert.equal(shouldRetryQuery(1, { status: 429 }), true);
  assert.equal(shouldRetryQuery(2, { status: 503 }), false);
});

test('clearPrivateUserCaches purges user-scoped & eligibility caches on logout while preserving public schemes', () => {
  const qc = createAppQueryClient();
  qc.setQueryData(queryKeys.schemes, { schemes: [{ id: 'pm-kisan-raitha-siri' }] });
  qc.setQueryData(queryKeys.savedSchemes('farmer-1'), [{ schemeId: 'pm-kisan-raitha-siri' }]);
  qc.setQueryData(queryKeys.applications('farmer-1'), [{ id: 'app-1' }]);
  qc.setQueryData(queryKeys.notifications('farmer-1'), { notifications: [{ id: 'n-1' }], unreadCount: 1 });
  qc.setQueryData(queryKeys.reminders('farmer-1'), { reminders: [{ schemeId: 'pmfby-karnataka' }] });
  qc.setQueryData(queryKeys.eligibility('all', 'fp_abc', '2026.5-KAR'), [{ schemeId: 'pm-kisan-raitha-siri' }]);

  clearPrivateUserCaches(qc);

  assert.ok(qc.getQueryData(queryKeys.schemes), 'Public scheme catalog stays cached after logout');
  assert.equal(qc.getQueryData(queryKeys.savedSchemes('farmer-1')), undefined);
  assert.equal(qc.getQueryData(queryKeys.applications('farmer-1')), undefined);
  assert.equal(qc.getQueryData(queryKeys.notifications('farmer-1')), undefined);
  assert.equal(qc.getQueryData(queryKeys.reminders('farmer-1')), undefined);
  assert.equal(qc.getQueryData(queryKeys.eligibility('all', 'fp_abc', '2026.5-KAR')), undefined);
});
