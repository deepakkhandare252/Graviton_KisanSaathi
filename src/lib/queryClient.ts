import { QueryClient } from '@tanstack/react-query';
import { FarmerProfile } from '../types/scheme';

export const PUBLIC_SCHEME_STALE_MS = 15 * 60 * 1000; // 15 minutes for verified policy catalog
export const USER_DYNAMIC_STALE_MS = 5 * 60 * 1000; // 5 minutes for saved schemes, applications, reminders
export const NOTIFICATIONS_STALE_MS = 60 * 1000; // 1 minute for alerts
export const GC_TIME_MS = 30 * 60 * 1000; // 30 minutes inactive cache retention

export const PRIVATE_QUERY_PREFIXES = [
  'saved-schemes',
  'applications',
  'application',
  'profile',
  'notifications',
  'reminders',
  'eligibility'
] as const;

export const queryKeys = {
  schemes: ['schemes'] as const,
  scheme: (schemeId: string) => ['scheme', schemeId] as const,
  checklist: (schemeId: string) => ['checklist', schemeId] as const,
  applicationGuide: (schemeId: string) => ['application-guide', schemeId] as const,
  eligibility: (scope: string, profileHash: string, rulesVersion: string) =>
    ['eligibility', scope, profileHash, rulesVersion] as const,
  savedSchemes: (userId: string) => ['saved-schemes', userId] as const,
  applications: (userId: string) => ['applications', userId] as const,
  application: (userId: string, applicationId: string) =>
    ['application', userId, applicationId] as const,
  profile: (userId: string) => ['profile', userId] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  reminders: (userId: string) => ['reminders', userId] as const
};

/**
 * Deterministic canonical hash of a FarmerProfile so any change to profile fields,
 * landholding, crops, or exclusions produces a distinct eligibility cache key.
 */
export function computeProfileHash(profile: Partial<FarmerProfile>): string {
  const normalizedEntries = Object.keys(profile)
    .sort()
    .map((key) => {
      const value = profile[key as keyof FarmerProfile];
      if (Array.isArray(value)) {
        return [key, [...value].map(String).sort()];
      }
      return [key, value === undefined ? null : value];
    });

  const serialized = JSON.stringify(normalizedEntries);
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i++) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fp_${(hash >>> 0).toString(16)}`;
}

export function buildEligibilityCacheKey(
  scope: string,
  profile: Partial<FarmerProfile>,
  rulesVersion: string
) {
  return queryKeys.eligibility(scope, computeProfileHash(profile), rulesVersion);
}

/**
 * Limits retries to bounded attempts for transient network / 5xx failures only.
 * Never retries 4xx client/auth errors (400, 401, 403, 404, 409, 422).
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: number }).status)
      : 0;

  if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
    return false;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  return true;
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: USER_DYNAMIC_STALE_MS,
        gcTime: GC_TIME_MS,
        retry: shouldRetryQuery,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true
      },
      mutations: {
        retry: 0
      }
    }
  });
}

export const queryClient = createAppQueryClient();

/**
 * Immediately removes all user-scoped and private evaluation caches from TanStack Query.
 * Called on logout, account switch, or 401 session invalidation so no private data
 * leaks between users or remains visible after sign-out.
 */
export function clearPrivateUserCaches(qc: QueryClient = queryClient): void {
  qc.cancelQueries({
    predicate: (query) => {
      const root = query.queryKey[0];
      return typeof root === 'string' && (PRIVATE_QUERY_PREFIXES as readonly string[]).includes(root);
    }
  });

  qc.removeQueries({
    predicate: (query) => {
      const root = query.queryKey[0];
      return typeof root === 'string' && (PRIVATE_QUERY_PREFIXES as readonly string[]).includes(root);
    }
  });
}
