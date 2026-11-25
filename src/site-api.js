import { useCallback, useEffect, useRef, useState } from 'react';

export function formatMinorAmount(value, currency) {
  const amount = Number(value);
  if(value == null || !Number.isFinite(amount) || typeof currency !== 'string' || !currency) return '—';
  try {
    const formatter = new Intl.NumberFormat(undefined, {style:'currency',currency:currency.toUpperCase()});
    return formatter.format(amount / (10 ** formatter.resolvedOptions().maximumFractionDigits));
  } catch { return '—'; }
}

export async function requestJson(path, { method = 'GET', body, csrfToken, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (method !== 'GET' && method !== 'HEAD') headers['Content-Type'] = 'application/json';
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  const response = await fetch(path, {
    method, headers, credentials: 'same-origin', cache: 'no-store', signal,
    ...(method !== 'GET' && method !== 'HEAD' ? { body: JSON.stringify(body ?? {}) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const error = new Error(data?.error || 'The site service is unavailable. Please try again.');
    error.status = response.status;
    error.code = data?.code;
    throw error;
  }
  return data;
}

export function useSiteData() {
  const [site, setSite] = useState({ entries: [], downloadCount: 0, downloadAvailable: false, loading: true, error: null });
  const controller = useRef(null);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    if (mounted.current) setSite(previous => ({ ...previous, loading: true, error: null }));
    try {
      const data = await requestJson('/api/site', { signal: request.signal });
      if (!Array.isArray(data.entries) || !Number.isSafeInteger(data.downloadCount) || data.downloadCount < 0) {
        throw new Error('The site returned invalid release data.');
      }
      if (mounted.current && controller.current === request) {
        setSite({ entries: data.entries, downloadCount: data.downloadCount, downloadAvailable: data.downloadAvailable === true, loading: false, error: null });
      }
      return data;
    } catch (error) {
      if (error.name !== 'AbortError' && mounted.current && controller.current === request) {
        setSite(previous => ({ ...previous, loading: false, error: error.message }));
      }
      return null;
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => { mounted.current = false; controller.current?.abort(); };
  }, [refresh]);
  return { site, refresh };
}

export function localDateToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatEntryDate(date) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}
