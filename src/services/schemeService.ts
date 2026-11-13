import { SchemeDefinition } from '../types/scheme';
import { VERIFIED_SCHEMES } from '../data/schemesData';
import { request } from './api';
import { schemeCacheDb, SchemeGuideCachePayload } from './schemeCacheDb';

export type SchemeDataSource = 'network' | 'indexeddb' | 'bundled';

export interface SchemesCatalogResult {
  schemes: SchemeDefinition[];
  isOffline: boolean;
  source: SchemeDataSource;
  cachedTimestamp: string;
  sourceVersion: string;
  lastVerifiedDate: string;
  /** @deprecated alias kept for backward compatibility */
  lastFreshness: string;
}

export const schemeService = {
  /**
   * Retrieves all verified Karnataka schemes.
   * Online: fetches /api/schemes and persists into IndexedDB (with cache metadata).
   * Offline/error: loads persisted schemes from IndexedDB, falling back to bundled rules if empty.
   */
  async getAllSchemes(): Promise<SchemesCatalogResult> {
    const isBrowserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

    if (!isBrowserOffline) {
      try {
        const data = await request<{
          schemes: SchemeDefinition[];
          version?: string;
          lastVerifiedDate?: string;
        }>('/schemes');

        if (data && Array.isArray(data.schemes) && data.schemes.length > 0) {
          const envelope = await schemeCacheDb.saveSchemesCatalog(data.schemes, {
            sourceVersion: data.version || '2026.5-KAR',
            lastVerifiedDate: data.lastVerifiedDate
          });
          return {
            schemes: data.schemes,
            isOffline: false,
            source: 'network',
            cachedTimestamp: envelope.cachedTimestamp,
            sourceVersion: envelope.sourceVersion,
            lastVerifiedDate: envelope.lastVerifiedDate,
            lastFreshness: envelope.cachedTimestamp
          };
        }
      } catch {
        // Fall through to IndexedDB offline store
      }
    }

    const cachedEnvelope = await schemeCacheDb.getSchemesCatalog();
    if (cachedEnvelope && cachedEnvelope.cachedData.length > 0) {
      return {
        schemes: cachedEnvelope.cachedData,
        isOffline: true,
        source: 'indexeddb',
        cachedTimestamp: cachedEnvelope.cachedTimestamp,
        sourceVersion: cachedEnvelope.sourceVersion,
        lastVerifiedDate: cachedEnvelope.lastVerifiedDate,
        lastFreshness: cachedEnvelope.cachedTimestamp
      };
    }

    // Seed IndexedDB from bundled verified definitions so subsequent offline loads have structured metadata
    const seeded = await schemeCacheDb.saveSchemesCatalog(VERIFIED_SCHEMES, {
      sourceVersion: '2026.5-KAR',
      lastVerifiedDate: '2026-11-10'
    });
    return {
      schemes: VERIFIED_SCHEMES,
      isOffline: true,
      source: 'bundled',
      cachedTimestamp: seeded.cachedTimestamp,
      sourceVersion: seeded.sourceVersion,
      lastVerifiedDate: seeded.lastVerifiedDate,
      lastFreshness: seeded.cachedTimestamp
    };
  },

  /**
   * Retrieves a specific scheme by ID (API -> IndexedDB -> bundled).
   */
  async getSchemeById(id: string): Promise<SchemeDefinition | undefined> {
    const isBrowserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!isBrowserOffline) {
      try {
        const scheme = await request<SchemeDefinition>(`/schemes/${id}`);
        if (scheme && scheme.id) {
          await schemeCacheDb.saveSchemeDetail(scheme);
          return scheme;
        }
      } catch {
        // Fall back to IndexedDB
      }
    }

    const cached = await schemeCacheDb.getSchemeDetail(id);
    if (cached?.cachedData) {
      return cached.cachedData;
    }

    const { schemes } = await this.getAllSchemes();
    return schemes.find((s) => s.id === id);
  },

  /**
   * Retrieves verified application guide metadata (steps, official URLs, centres) with IndexedDB fallback.
   */
  async getApplicationGuide(schemeId: string): Promise<{
    guide: SchemeGuideCachePayload | null;
    isOffline: boolean;
    cachedTimestamp?: string;
  }> {
    const isBrowserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!isBrowserOffline) {
      try {
        const guide = await request<SchemeGuideCachePayload>(`/schemes/${schemeId}/application-guide`);
        if (guide && guide.schemeId) {
          const env = await schemeCacheDb.saveSchemeGuide(guide);
          return { guide, isOffline: false, cachedTimestamp: env.cachedTimestamp };
        }
      } catch {
        // Fall through to IndexedDB
      }
    }

    const cachedGuide = await schemeCacheDb.getSchemeGuide(schemeId);
    if (cachedGuide?.cachedData) {
      return {
        guide: cachedGuide.cachedData,
        isOffline: true,
        cachedTimestamp: cachedGuide.cachedTimestamp
      };
    }

    const scheme = await this.getSchemeById(schemeId);
    if (!scheme) return { guide: null, isOffline: true };

    return {
      guide: {
        schemeId: scheme.id,
        schemeNameEn: scheme.nameEn,
        schemeNameKn: scheme.nameKn,
        officialPortalUrl: scheme.officialPortalUrl,
        informationUrl: scheme.informationUrl,
        helplinePhone: scheme.helplinePhone,
        stepsEn: scheme.applicationStepsEn,
        stepsKn: scheme.applicationStepsKn,
        assistanceCentresEn: scheme.assistanceCentresEn,
        assistanceCentresKn: scheme.assistanceCentresKn,
        lastVerifiedDate: scheme.lastVerifiedDate,
        applicationDeadline: scheme.applicationDeadline ?? null,
        deadlineVerified: Boolean(scheme.deadlineVerified)
      },
      isOffline: true
    };
  },

  async clearOfflineSchemeCache(): Promise<void> {
    await schemeCacheDb.clearAll();
  }
};
