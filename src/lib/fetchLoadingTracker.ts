import { loadingStore } from './loadingStore';

declare global {
  interface Window {
    __fetchLoadingTrackerInstalled?: boolean;
    __originalFetch?: typeof fetch;
  }
}

function getRequestUrl(input: RequestInfo | URL): string | null {
  try {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    if (input instanceof Request) return input.url;
    return null;
  } catch {
    return null;
  }
}

function shouldTrack(url: string | null, apiBaseUrl: string | undefined): boolean {
  if (!url) return false;
  if (!apiBaseUrl) return false;
  return url.startsWith(apiBaseUrl);
}

function hasSilentLoadingHeader(input: RequestInfo | URL, init?: RequestInit): boolean {
  const silentHeaderName = 'x-silent-loading';

  const fromHeadersInit = (headers: HeadersInit | undefined) => {
    if (!headers) return false;
    try {
      const h = new Headers(headers);
      const v = h.get(silentHeaderName);
      return v === '1' || v === 'true';
    } catch {
      return false;
    }
  };

  // init headers
  if (fromHeadersInit(init?.headers)) return true;

  // Request input headers
  try {
    if (input instanceof Request) {
      const v = input.headers.get(silentHeaderName);
      return v === '1' || v === 'true';
    }
  } catch {
    // ignore
  }

  return false;
}

export function installFetchLoadingTracker() {
  if (typeof window === 'undefined') return;
  if (window.__fetchLoadingTrackerInstalled) return;
  if (typeof window.fetch !== 'function') return;

  const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? undefined;
  const originalFetch = window.fetch.bind(window);

  window.__originalFetch = originalFetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = getRequestUrl(input);
    const track = shouldTrack(url, apiBaseUrl);
    const silent = hasSilentLoadingHeader(input, init);

    if (track && !silent) loadingStore.increment();
    try {
      return await originalFetch(input as RequestInfo, init);
    } finally {
      if (track && !silent) loadingStore.decrement();
    }
  };

  window.__fetchLoadingTrackerInstalled = true;
}

