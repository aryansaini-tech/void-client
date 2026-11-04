'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { cartSchema, type CartLine } from '@void/shared/schemas';
import type { PublicProduct } from '@void/shared/commerce';

type Context = {
  items: CartLine[]; catalog: PublicProduct[]; ready: boolean; notice: string;
  add: (id: string) => void; remove: (id: string) => void;
  quantity: (id: string, value: number) => void;
  clearPurchased: (orderId: string, purchased: CartLine[]) => void;
};
const CartContext = createContext<Context | null>(null);
const remoteSchema = z.object({ items: cartSchema, revision: z.number().int().nonnegative() });
function stored(key: string) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? 'null');
    const result = cartSchema.safeParse(raw?.version === 1 ? raw.items : []);
    return { items: result.success ? result.data : [], synced: raw?.synced === true };
  } catch { return { items: [] as CartLine[], synced: false }; }
}
function merge(a: CartLine[], b: CartLine[]) {
  const map = new Map(a.map(line => [line.productId, line.quantity]));
  for (const line of b) map.set(line.productId, Math.min(10, Math.max(line.quantity, map.get(line.productId) ?? 0)));
  return Array.from(map, ([productId, quantity]) => ({ productId, quantity })).slice(0, 25);
}

export function CartProvider({ catalog, userId, children }: { catalog: PublicProduct[]; userId: string | null; children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const revision = useRef<number | null>(null);
  const saveSequence = useRef(0);
  const saveQueue = useRef(Promise.resolve());
  const dirty = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = `void-cart-v1:${userId ?? 'guest'}`;
  const ready = loadedKey === key;

  useEffect(() => {
    let canceled = false;
    ++saveSequence.current;
    dirty.current = false;
    revision.current = null;
    async function load() {
      // Read browser-owned storage after hydration; the server renders a stable loading state.
      await Promise.resolve();
      const local = stored(key);
      let result = local.items;
      let needsSave = false;
      if (userId) {
        try {
          const response = await fetch('/api/cart', { cache: 'no-store' });
          if (!response.ok) throw new Error();
          const remote = remoteSchema.parse(await response.json());
          if (canceled) return;
          revision.current = remote.revision;
          result = merge(remote.items, merge(local.synced ? [] : local.items, stored('void-cart-v1:guest').items));
          needsSave = JSON.stringify(result) !== JSON.stringify(remote.items);
          try { localStorage.removeItem('void-cart-v1:guest'); } catch { /* Storage can be unavailable. */ }
        } catch {
          if (!canceled) setNotice('Account cart sync is unavailable. Your changes stay on this device until you reload.');
        }
      }
      if (!canceled) { dirty.current = needsSave; setItems(result); setLoadedKey(key); }
    }
    void load();
    return () => { canceled = true; };
  }, [key, userId]);

  useEffect(() => {
    if (!ready || !dirty.current) return;
    const sequence = ++saveSequence.current;
    let canceled = false;
    // Persist asynchronously so storage errors cannot cascade during rendering.
    const timer = setTimeout(() => {
      dirty.current = false;
      try { localStorage.setItem(key, JSON.stringify({ version: 1, items, synced: false })); }
      catch { if (!canceled) setNotice('Your browser could not save this cart. Keep this tab open while checking out.'); }
      if (!userId || revision.current === null) return;
      // Serialize writes and compare server revisions. Never blindly replace a newer cart.
      saveQueue.current = saveQueue.current.then(async () => {
        if (canceled || sequence !== saveSequence.current || revision.current === null) return;
        try {
          const response = await fetch('/api/cart', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, revision: revision.current }),
          });
          if (!response.ok) {
            revision.current = null;
            if (response.status === 409) {
              // A reload must use the newer server cart, not merge this rejected snapshot.
              try { localStorage.removeItem(key); } catch { /* The warning still explains recovery. */ }
            }
            if (!canceled) setNotice(response.status === 409
              ? 'Your account cart changed in another session. Reload to load the latest cart.'
              : 'Account cart sync is unavailable. Your changes are saved on this device.');
            return;
          }
          const result = await response.json();
          revision.current = z.number().int().nonnegative().parse(result.revision);
          if (sequence === saveSequence.current) {
            try { localStorage.setItem(key, JSON.stringify({ version: 1, items, synced: true })); } catch { /* In-memory cart remains usable. */ }
          }
        } catch {
          revision.current = null;
          if (!canceled) setNotice('Account cart sync is unavailable. Your changes are saved on this device.');
        }
      });
    }, 0);
    return () => { canceled = true; clearTimeout(timer); };
  }, [items, ready, userId, key]);

  useEffect(() => {
    // Account tabs use server revisions; echoing their storage events could resend stale data.
    if (userId) return;
    const update = (event: StorageEvent) => { if (event.key === key) setItems(stored(key).items); };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, [key, userId]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const add = useCallback((id: string) => {
    const product = catalog.find(item => item.id === id && item.available);
    if (!product || !ready) return;
    dirty.current = true;
    setItems(current => {
      if (current.some(item => item.productId === id)) return current.map(item => item.productId === id ? { ...item, quantity: Math.min(10, item.quantity + 1) } : item);
      return current.length < 25 ? [...current, { productId: id, quantity: 1 }] : current;
    });
    setNotice(`${product.name} added to your cart.`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setNotice(''), 3000);
  }, [catalog, ready]);
  const remove = useCallback((id: string) => { dirty.current = true; setItems(current => current.filter(item => item.productId !== id)); }, []);
  const quantity = useCallback((id: string, value: number) => {
    if (!Number.isInteger(value) || value < 1 || value > 10) return;
    dirty.current = true;
    setItems(current => current.map(item => item.productId === id ? { ...item, quantity: value } : item));
  }, []);
  const clearPurchased = useCallback((orderId: string, purchased: CartLine[]) => {
    try {
      if (sessionStorage.getItem('void-pending-order') !== orderId) return;
      sessionStorage.removeItem('void-pending-order');
    } catch { return; }
    ++saveSequence.current;
    if (userId) {
      // The signed webhook already removed quantities; reload its authoritative result.
      revision.current = null;
      void saveQueue.current.then(async () => {
        try {
          const response = await fetch('/api/cart', { cache: 'no-store' });
          if (!response.ok) throw new Error();
          const remote = remoteSchema.parse(await response.json());
          revision.current = remote.revision;
          dirty.current = false;
          try { localStorage.setItem(key, JSON.stringify({ version: 1, items: remote.items, synced: true })); } catch { /* Keep the verified in-memory cart. */ }
          setItems(remote.items);
        } catch { setNotice('Your purchase is recorded. Reload to refresh your account cart.'); }
      });
      return;
    }
    dirty.current = true;
    setItems(current => current.flatMap(line => {
      const count = purchased.find(item => item.productId === line.productId)?.quantity ?? 0;
      return line.quantity > count ? [{ ...line, quantity: line.quantity - count }] : [];
    }));
  }, [userId, key]);

  return <CartContext.Provider value={{ items, catalog, ready, notice, add, remove, quantity, clearPurchased }}>
    {children}<div role="status" className={`cart-toast ${notice ? 'visible' : ''}`}>{notice}</div>
  </CartContext.Provider>;
}
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('CartProvider is required.');
  return value;
}
