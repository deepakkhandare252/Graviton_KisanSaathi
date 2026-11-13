/**
 * Resolves the effective API base URL safely across local VS Code,
 * Java Spring Boot (:8080), Express (:3000), and hosted AI Studio preview origins.
 */

export function isLoopbackHost(hostname: string): boolean {
  const clean = hostname.trim().toLowerCase();
  return clean === 'localhost' || clean === '127.0.0.1' || clean === '::1' || clean === '[::1]';
}

export function isLoopbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return isLoopbackHost(parsed.hostname);
  } catch {
    return false;
  }
}

export function resolveApiBaseUrl(
  configuredBase?: string,
  windowLocation?: { hostname: string; origin: string }
): string {
  const raw = (configuredBase || '').trim();
  if (!raw) return '/api';

  const normalized = raw.replace(/\/+$/, '') || '/api';

  // Relative paths (e.g. '/api') always resolve on the current origin.
  if (normalized.startsWith('/')) {
    return normalized;
  }

  // If the app is served from a remote/hosted origin (e.g. Cloud Run / AI Studio preview),
  // never attempt to call a loopback URL like http://localhost:8080/api from the user's browser.
  if (windowLocation && !isLoopbackHost(windowLocation.hostname) && isLoopbackUrl(normalized)) {
    return '/api';
  }

  // If the configured URL already targets the current origin, prefer relative '/api'.
  if (windowLocation) {
    try {
      const parsed = new URL(normalized);
      if (parsed.origin === windowLocation.origin) {
        return parsed.pathname.replace(/\/+$/, '') || '/api';
      }
    } catch {
      return '/api';
    }
  }

  return normalized;
}

export function shouldFallbackToSameOrigin(
  baseUrl: string | undefined,
  status: number,
  alreadyRetried?: boolean
): boolean {
  if (alreadyRetried || status !== 0) return false;
  if (!baseUrl) return false;
  const trimmed = baseUrl.trim();
  // Only fall back when the failing request targeted a different origin (e.g. http://localhost:8080/api)
  return /^https?:\/\//i.test(trimmed);
}

export function formatNetworkErrorMessage(opts: {
  status: number;
  isOnline: boolean;
  errorCode?: string;
  dataError?: string;
  dataMessage?: string;
}): string {
  if (opts.dataError) return opts.dataError;
  if (opts.dataMessage) return opts.dataMessage;

  if (opts.status === 0) {
    if (!opts.isOnline) {
      return 'You appear to be offline. Local rule evaluation and cached schemes continue working.';
    }
    if (opts.errorCode === 'ECONNABORTED') {
      return 'Server request timed out. Please try again. Local rule features continue working.';
    }
    return 'Unable to reach the backend API server. Verify the server is running (npm run dev) or check your connection. Local rule features continue working.';
  }

  return `Request failed with status ${opts.status}`;
}
