/** Reject unsafe schemes, credentials, and ambiguous URLs before rendering links. */
export function publicUrl(value: string | undefined, fallback = ''): string {
  if (!value?.trim()) return fallback;
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) return fallback;
    return url.href.replace(/\/$/, '');
  } catch { return fallback; }
}

export function safeReturnUrl(value: string | null | undefined, accountUrl: string, storeUrl: string): string {
  const fallback = `${accountUrl}/dashboard`;
  if (!value || value.includes('\\') || /[\u0000-\u001f]/.test(value)) return fallback;
  try {
    const account = new URL(accountUrl);
    const store = new URL(storeUrl);
    // Existing relative account destinations remain valid when mounted at /account.
    const accountRoutes = ['/dashboard', '/profile', '/security', '/settings', '/purchases', '/discord'];
    const storeRoutes = ['/checkout', '/orders'];
    const accountBase = account.pathname.replace(/\/$/, '');
    const relativeAccountRoute = value.startsWith('/') && accountRoutes.some(path => value === path || value.startsWith(`${path}?`) || value.startsWith(`${path}/`) || value.startsWith(`${path}#`));
    const target = new URL(relativeAccountRoute ? `${accountBase}${value}` : value, `${accountUrl}/`);
    if (target.username || target.password) return fallback;
    const allowed = [[account, accountRoutes], [store, storeRoutes]] as const;
    if (!allowed.some(([base, routes]) => target.origin === base.origin && routes.some(route => {
      const path = `${base.pathname.replace(/\/$/, '')}${route}`;
      return target.pathname === path || target.pathname.startsWith(`${path}/`);
    }))) return fallback;
    return target.href;
  } catch { return fallback; }
}

export function localMediaPath(value: string): boolean {
  return /^\/media\/[a-zA-Z0-9/_-]+\.(avif|webp|png|jpe?g|svg)$/.test(value) && !value.includes('..');
}
