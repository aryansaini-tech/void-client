import { z } from 'zod';

export const emailSchema = z.string().trim().email('Enter a valid email address.').max(254).toLowerCase();
export const passwordSchema = z.string().min(12, 'Use at least 12 characters.').max(128, 'Use 128 characters or fewer.');
export const registerSchema = z.object({ name: z.string().trim().min(2, 'Use at least 2 characters.').max(40), email: emailSchema, password: passwordSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password.').max(128) });
export const profileSchema = z.object({ name: z.string().trim().min(2).max(40), bio: z.string().trim().max(160), minecraftName: z.string().trim().max(32).regex(/^[\w .-]*$/, 'Use letters, numbers, spaces, periods, or hyphens.') }).strict();
export const settingsSchema = z.object({ reducedMotion: z.boolean(), publicProfile: z.boolean() }).strict();
export const cartItemSchema = z.object({ productId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(10) }).strict();
export const cartSchema = z.array(cartItemSchema).max(25).refine(items => new Set(items.map(item => item.productId)).size === items.length, 'A product can only appear once.');
export const checkoutSchema = z.object({ items: cartSchema.refine(items => items.length > 0, 'Your cart is empty.'), requestId: z.string().uuid(), acceptedTerms: z.literal(true) }).strict();
export const passwordChangeSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema });
export type CartLine = z.infer<typeof cartItemSchema>;

export const productSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  name: z.string().trim().min(2).max(120), description: z.string().trim().min(10).max(5000),
  price: z.number().int().min(50).max(10000000), currency: z.string().regex(/^[a-z]{3}$/),
  stripePriceId: z.string().regex(/^price_[A-Za-z0-9]+$/), categoryId: z.string().min(1),
  images: z.array(z.string().regex(/^\/media\/[a-zA-Z0-9/_-]+\.(avif|webp|png|jpe?g)$/)).max(8),
  available: z.boolean(), published: z.boolean(),
}).strict();
