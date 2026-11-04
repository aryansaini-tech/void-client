import type { CartLine } from './schemas';

export type PublicProduct = {
  id: string; slug: string; name: string; description: string;
  price: number; currency: string; images: string[]; available: boolean;
  category: { id: string; name: string; slug: string };
};
export type PricedLine = { product: PublicProduct; quantity: number; subtotal: number };

/** Integer minor units only. Unknown/unavailable items are never silently charged. */
export function quoteCart(items: CartLine[], catalog: PublicProduct[]) {
  const byId = new Map(catalog.map(product => [product.id, product]));
  const lines: PricedLine[] = [];
  const unavailable: string[] = [];
  let currency: string | undefined;
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product?.available) { unavailable.push(item.productId); continue; }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) throw new Error('Invalid quantity.');
    if (!Number.isSafeInteger(product.price) || product.price < 0) throw new Error('Invalid price.');
    if (currency && currency !== product.currency) throw new Error('Products must use one currency.');
    currency = product.currency;
    lines.push({ product, quantity: item.quantity, subtotal: item.quantity * product.price });
  }
  const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
  if (!Number.isSafeInteger(total)) throw new Error('Cart total is too large.');
  return { lines, unavailable, total, currency: currency ?? null, canCheckout: lines.length > 0 && unavailable.length === 0 };
}
export function formatMoney(amount: number, currency: string) {
  const formatter = new Intl.NumberFormat('en', { style: 'currency', currency });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amount / 10 ** digits);
}
