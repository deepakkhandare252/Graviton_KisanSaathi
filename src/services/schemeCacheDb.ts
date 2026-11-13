import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SchemeDefinition } from '../types/scheme';

const DB_NAME = 'kisan_scheme_saathi_cache';
const DB_VERSION = 1;
const CATALOG_CACHE_KEY = 'public:schemes:catalog:v1';
export const PUBLIC_SCHEME_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CachedSchemeEnvelope<T> {
  cacheKey: string;
  cachedData: T;
  cachedTimestamp: string;
  sourceVersion: string;
  schemeVersion: string;
  lastVerifiedDate: string;
}

export interface SchemeGuideCachePayload {
  schemeId: string;
  schemeNameEn: string;
  schemeNameKn: string;
  officialPortalUrl: string;
  informationUrl?: string;
  helplinePhone?: string;
  stepsEn: string[];
  stepsKn: string[];
  assistanceCentresEn: string[];
  assistanceCentresKn: string[];
  lastVerifiedDate: string;
  applicationDeadline?: string | null;
  deadlineVerified?: boolean;
}

interface KisanSchemeCacheDB extends DBSchema {
  schemes_catalog: {
    key: string;
    value: CachedSchemeEnvelope<SchemeDefinition[]>;
  };
  scheme_details: {
    key: string;
    value: CachedSchemeEnvelope<SchemeDefinition>;
  };
  scheme_guides: {
    key: string;
    value: CachedSchemeEnvelope<SchemeGuideCachePayload>;
  };
  cache_meta: {
    key: string;
    value: {
      cacheKey: string;
      cachedTimestamp: string;
      sourceVersion: string;
      lastVerifiedDate: string;
      schemeCount: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<KisanSchemeCacheDB>> | null = null;

function isIndexedDbSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

async function getDb(): Promise<IDBPDatabase<KisanSchemeCacheDB> | null> {
  if (!isIndexedDbSupported()) return null;
  if (!dbPromise) {
    dbPromise = openDB<KisanSchemeCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('schemes_catalog')) {
          db.createObjectStore('schemes_catalog', { keyPath: 'cacheKey' });
        }
        if (!db.objectStoreNames.contains('scheme_details')) {
          db.createObjectStore('scheme_details', { keyPath: 'cacheKey' });
        }
        if (!db.objectStoreNames.contains('scheme_guides')) {
          db.createObjectStore('scheme_guides', { keyPath: 'cacheKey' });
        }
        if (!db.objectStoreNames.contains('cache_meta')) {
          db.createObjectStore('cache_meta', { keyPath: 'cacheKey' });
        }
      }
    }).catch((err) => {
      dbPromise = null;
      console.warn('IndexedDB unavailable, using fallback storage:', err);
      return null as unknown as IDBPDatabase<KisanSchemeCacheDB>;
    });
  }
  return dbPromise;
}

export function isCacheEntryFresh(cachedTimestamp: string | null | undefined, maxAgeMs: number): boolean {
  if (!cachedTimestamp) return false;
  const parsed = Date.parse(cachedTimestamp);
  if (Number.isNaN(parsed)) return false;
  const age = Date.now() - parsed;
  return age >= 0 && age <= maxAgeMs;
}

export function buildCatalogEnvelope(
  schemes: SchemeDefinition[],
  meta: { sourceVersion?: string; lastVerifiedDate?: string; cachedTimestamp?: string } = {}
): CachedSchemeEnvelope<SchemeDefinition[]> {
  const latestVerified =
    meta.lastVerifiedDate ||
    schemes.reduce(
      (latest, item) => (item.lastVerifiedDate > latest ? item.lastVerifiedDate : latest),
      '2026-10-15'
    );
  const combinedRulesVersion =
    schemes.map((s) => `${s.id}:${s.rulesVersion}`).sort().join('|') || '2026.5-KAR';

  return {
    cacheKey: CATALOG_CACHE_KEY,
    cachedData: schemes,
    cachedTimestamp: meta.cachedTimestamp || new Date().toISOString(),
    sourceVersion: meta.sourceVersion || '2026.5-KAR',
    schemeVersion: combinedRulesVersion,
    lastVerifiedDate: latestVerified
  };
}

export const schemeCacheDb = {
  async saveSchemesCatalog(
    schemes: SchemeDefinition[],
    meta: { sourceVersion?: string; lastVerifiedDate?: string } = {}
  ): Promise<CachedSchemeEnvelope<SchemeDefinition[]>> {
    const envelope = buildCatalogEnvelope(schemes, meta);
    const db = await getDb();
    if (db) {
      const tx = db.transaction(['schemes_catalog', 'scheme_details', 'cache_meta'], 'readwrite');
      await tx.objectStore('schemes_catalog').put(envelope);
      const detailStore = tx.objectStore('scheme_details');
      for (const scheme of schemes) {
        await detailStore.put({
          cacheKey: `scheme:${scheme.id}`,
          cachedData: scheme,
          cachedTimestamp: envelope.cachedTimestamp,
          sourceVersion: envelope.sourceVersion,
          schemeVersion: scheme.rulesVersion,
          lastVerifiedDate: scheme.lastVerifiedDate
        });
      }
      await tx.objectStore('cache_meta').put({
        cacheKey: 'meta:catalog',
        cachedTimestamp: envelope.cachedTimestamp,
        sourceVersion: envelope.sourceVersion,
        lastVerifiedDate: envelope.lastVerifiedDate,
        schemeCount: schemes.length
      });
      await tx.done;
    }

    // Lightweight mirror in localStorage strictly for non-sensitive public scheme metadata fallback
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('kss_cached_schemes', JSON.stringify(schemes));
        localStorage.setItem('kss_cached_timestamp', envelope.cachedTimestamp);
        localStorage.setItem('kss_cached_version', envelope.sourceVersion);
        localStorage.setItem('kss_last_verified_date', envelope.lastVerifiedDate);
      }
    } catch {
      // ignore quota errors
    }

    return envelope;
  },

  async getSchemesCatalog(): Promise<CachedSchemeEnvelope<SchemeDefinition[]> | null> {
    const db = await getDb();
    if (db) {
      try {
        const entry = await db.get('schemes_catalog', CATALOG_CACHE_KEY);
        if (
          entry &&
          Array.isArray(entry.cachedData) &&
          entry.cachedData.length > 0 &&
          isCacheEntryFresh(entry.cachedTimestamp, PUBLIC_SCHEME_CACHE_TTL_MS)
        ) {
          return entry;
        }
      } catch {
        // fall through to localStorage fallback
      }
    }

    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('kss_cached_schemes');
        const cachedTimestamp = localStorage.getItem('kss_cached_timestamp');
        if (raw) {
          const parsed = JSON.parse(raw) as SchemeDefinition[];
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            isCacheEntryFresh(cachedTimestamp, PUBLIC_SCHEME_CACHE_TTL_MS)
          ) {
            return buildCatalogEnvelope(parsed, {
              cachedTimestamp: cachedTimestamp || undefined,
              sourceVersion: localStorage.getItem('kss_cached_version') || undefined,
              lastVerifiedDate: localStorage.getItem('kss_last_verified_date') || undefined
            });
          }
        }
      }
    } catch {
      // ignore parse errors
    }

    return null;
  },

  async saveSchemeDetail(
    scheme: SchemeDefinition,
    sourceVersion = '2026.5-KAR'
  ): Promise<CachedSchemeEnvelope<SchemeDefinition>> {
    const envelope: CachedSchemeEnvelope<SchemeDefinition> = {
      cacheKey: `scheme:${scheme.id}`,
      cachedData: scheme,
      cachedTimestamp: new Date().toISOString(),
      sourceVersion,
      schemeVersion: scheme.rulesVersion,
      lastVerifiedDate: scheme.lastVerifiedDate
    };
    const db = await getDb();
    if (db) {
      await db.put('scheme_details', envelope);
    }
    return envelope;
  },

  async getSchemeDetail(schemeId: string): Promise<CachedSchemeEnvelope<SchemeDefinition> | null> {
    const db = await getDb();
    if (db) {
      try {
        const entry = await db.get('scheme_details', `scheme:${schemeId}`);
        if (entry && isCacheEntryFresh(entry.cachedTimestamp, PUBLIC_SCHEME_CACHE_TTL_MS)) {
          return entry;
        }
      } catch {
        // ignore
      }
    }
    const catalog = await this.getSchemesCatalog();
    const found = catalog?.cachedData.find((s) => s.id === schemeId);
    if (!found || !catalog) return null;
    return {
      cacheKey: `scheme:${found.id}`,
      cachedData: found,
      cachedTimestamp: catalog.cachedTimestamp,
      sourceVersion: catalog.sourceVersion,
      schemeVersion: found.rulesVersion,
      lastVerifiedDate: found.lastVerifiedDate
    };
  },

  async saveSchemeGuide(
    guide: SchemeGuideCachePayload,
    sourceVersion = '2026.5-KAR'
  ): Promise<CachedSchemeEnvelope<SchemeGuideCachePayload>> {
    const envelope: CachedSchemeEnvelope<SchemeGuideCachePayload> = {
      cacheKey: `guide:${guide.schemeId}`,
      cachedData: guide,
      cachedTimestamp: new Date().toISOString(),
      sourceVersion,
      schemeVersion: guide.lastVerifiedDate,
      lastVerifiedDate: guide.lastVerifiedDate
    };
    const db = await getDb();
    if (db) {
      await db.put('scheme_guides', envelope);
    }
    return envelope;
  },

  async getSchemeGuide(schemeId: string): Promise<CachedSchemeEnvelope<SchemeGuideCachePayload> | null> {
    const db = await getDb();
    if (db) {
      try {
        const entry = await db.get('scheme_guides', `guide:${schemeId}`);
        if (entry && isCacheEntryFresh(entry.cachedTimestamp, PUBLIC_SCHEME_CACHE_TTL_MS)) {
          return entry;
        }
      } catch {
        // ignore
      }
    }
    return null;
  },

  async getCacheSummary(): Promise<{
    hasCachedCatalog: boolean;
    cachedTimestamp: string | null;
    sourceVersion: string;
    lastVerifiedDate: string;
    schemeCount: number;
  }> {
    const catalog = await this.getSchemesCatalog();
    if (!catalog) {
      return {
        hasCachedCatalog: false,
        cachedTimestamp: null,
        sourceVersion: '2026.5-KAR',
        lastVerifiedDate: '2026-11-10',
        schemeCount: 0
      };
    }
    return {
      hasCachedCatalog: true,
      cachedTimestamp: catalog.cachedTimestamp,
      sourceVersion: catalog.sourceVersion,
      lastVerifiedDate: catalog.lastVerifiedDate,
      schemeCount: catalog.cachedData.length
    };
  },

  async clearAll(): Promise<void> {
    const db = await getDb();
    if (db) {
      const tx = db.transaction(
        ['schemes_catalog', 'scheme_details', 'scheme_guides', 'cache_meta'],
        'readwrite'
      );
      await Promise.all([
        tx.objectStore('schemes_catalog').clear(),
        tx.objectStore('scheme_details').clear(),
        tx.objectStore('scheme_guides').clear(),
        tx.objectStore('cache_meta').clear()
      ]);
      await tx.done;
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('kss_cached_schemes');
        localStorage.removeItem('kss_cached_timestamp');
        localStorage.removeItem('kss_cached_version');
        localStorage.removeItem('kss_last_verified_date');
      }
    } catch {
      // ignore
    }
  }
};
