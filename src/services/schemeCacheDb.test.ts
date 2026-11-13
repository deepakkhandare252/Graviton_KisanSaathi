import test from 'node:test';
import assert from 'node:assert/strict';
import { VERIFIED_SCHEMES } from '../data/schemesData.ts';
import { buildCatalogEnvelope, isCacheEntryFresh, schemeCacheDb } from './schemeCacheDb.ts';

test('buildCatalogEnvelope separates cachedTimestamp from official lastVerifiedDate', () => {
  const cachedAt = '2026-11-13T10:30:00.000Z';
  const envelope = buildCatalogEnvelope(VERIFIED_SCHEMES, {
    sourceVersion: '2026.5-KAR',
    cachedTimestamp: cachedAt
  });

  assert.equal(envelope.cachedTimestamp, cachedAt);
  assert.equal(envelope.sourceVersion, '2026.5-KAR');
  assert.notEqual(
    envelope.lastVerifiedDate,
    cachedAt,
    'Official rule lastVerifiedDate must remain distinct from local cache timestamp'
  );
  assert.equal(envelope.cachedData.length, VERIFIED_SCHEMES.length);
  assert.ok(envelope.schemeVersion.includes('pm-kisan-raitha-siri'));
});

test('isCacheEntryFresh validates cache age accurately', () => {
  const recent = new Date(Date.now() - 60_000).toISOString();
  const expired = new Date(Date.now() - 2 * 60 * 60_000).toISOString();

  assert.equal(isCacheEntryFresh(recent, 5 * 60_000), true);
  assert.equal(isCacheEntryFresh(expired, 5 * 60_000), false);
  assert.equal(isCacheEntryFresh(null, 5 * 60_000), false);
  assert.equal(isCacheEntryFresh('not-a-date', 5 * 60_000), false);
});

test('schemeCacheDb gracefully saves, reads, and clears catalog in non-browser storage environments', async () => {
  const saved = await schemeCacheDb.saveSchemesCatalog(VERIFIED_SCHEMES, {
    sourceVersion: '2026.5-KAR',
    lastVerifiedDate: '2026-11-10'
  });
  assert.equal(saved.cachedData.length, VERIFIED_SCHEMES.length);

  // Without IndexedDB/localStorage in Node, getSchemesCatalog returns null without throwing
  const summary = await schemeCacheDb.getCacheSummary();
  assert.equal(typeof summary.hasCachedCatalog, 'boolean');

  await schemeCacheDb.clearAll();
});
