import { CartProvider } from './cart-provider';
import { getCatalog, getViewer } from '../lib/data';

/** Shared by the standalone store and the website's /store layout. */
export async function StoreProvider({ children }: { children: React.ReactNode }) {
  const [catalog, viewer] = await Promise.all([getCatalog(), getViewer()]);
  return <CartProvider catalog={catalog.products} userId={viewer?.user.id ?? null}>{children}</CartProvider>;
}
