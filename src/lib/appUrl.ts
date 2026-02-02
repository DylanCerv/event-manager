export function withHashRouterIfNeeded(pathname: string): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (!import.meta.env.PROD) return normalizedPath;
  // In production we use HashRouter to avoid server 404 on refresh.
  return `/#${normalizedPath}`;
}

export function buildInvitationUrl(qrCode: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const code = encodeURIComponent(qrCode);
  return `${base}${withHashRouterIfNeeded(`/invitation/${code}`)}`;
}

export function normalizePublicUrl(url: string): string {
  if (!import.meta.env.PROD) return url;
  if (!url) return url;
  if (url.includes('/#/')) return url;

  try {
    const u = new URL(url);
    return `${u.origin}/#${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

