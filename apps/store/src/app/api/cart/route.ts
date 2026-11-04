import { z } from 'zod';
import { site } from '@void/shared/config';
import { cartSchema } from '@void/shared/schemas';
import { getDatabase } from '@void/backend/database';
import { assertOrigin, errorResponse, HttpError, rateLimit, readJson, requireSession } from '@void/backend/security';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const cart = await getDatabase().cart.findUnique({ where: { userId: session.user.id }, include: { items: { select: { productId: true, quantity: true } } } });
    return Response.json({ items: cart?.items ?? [], revision: cart?.revision ?? 0 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function PUT(request: Request) {
  try {
    assertOrigin(request, site.urls.store);
    const session = await requireSession(request);
    await rateLimit('cart', session.user.id, 50, 60);
    const { items, revision } = await readJson(request, z.object({ items: cartSchema, revision: z.number().int().nonnegative() }).strict());
    const db = getDatabase();
    const products = await db.product.findMany({ where: { id: { in: items.map(item => item.productId) }, published: true }, select: { id: true } });
    if (products.length !== items.length) throw new HttpError(409, 'Remove unpublished or missing products from your cart.');
    await db.$transaction(async tx => {
      const cart = await tx.cart.upsert({ where: { userId: session.user.id }, create: { userId: session.user.id }, update: {} });
      const changed = await tx.cart.updateMany({ where: { id: cart.id, revision }, data: { revision: { increment: 1 } } });
      if (!changed.count) throw new HttpError(409, 'Your account cart changed. Reload before making further changes.', 'CART_CHANGED');
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      if (items.length) await tx.cartItem.createMany({ data: items.map(item => ({ ...item, cartId: cart.id })) });
    });
    return Response.json({ saved: true, revision: revision + 1 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
