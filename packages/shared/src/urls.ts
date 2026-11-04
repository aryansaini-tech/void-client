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
    const target = new URL(value, accountUrl);
    if (![new URL(accountUrl).origin, new URL(storeUrl).origin].includes(target.origin)) return fallback;
    if (!['/dashboard', '/checkout', '/orders', '/profile', '/security', '/settings', '/purchases', '/discord'].some(path => target.pathname === path || target.pathname.startsWith(`${path}/`))) return fallback;
    return target.href;
  } catch { return fallback; }
}

export function localMediaPath(value: string): boolean {
  return /^\/media\/[a-zA-Z0-9/_-]+\.(avif|webp|png|jpe?g|svg)$/.test(value) && !value.includes('..');
}
