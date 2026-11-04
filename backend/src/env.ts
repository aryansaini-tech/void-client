import { z } from 'zod';
import { site } from '@void/shared/config';

const optional = z.string().optional().transform(value => value?.trim() || undefined);
const schema = z.object({
  DATABASE_URL: optional, BETTER_AUTH_SECRET: optional, BETTER_AUTH_URL: optional, AUTH_COOKIE_DOMAIN: optional,
  AUTH_IP_HEADER: z.string().default('x-real-ip'),
  SMTP_HOST: optional, SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.enum(['true','false']).default('false'), SMTP_USER: optional, SMTP_PASSWORD: optional, EMAIL_FROM: optional,
  STRIPE_SECRET_KEY: optional, STRIPE_WEBHOOK_SECRET: optional, STORE_CHECKOUT_ENABLED: z.enum(['true','false']).default('false'),
  STRIPE_AUTOMATIC_TAX_ENABLED: z.enum(['true','false']).default('false'),
  DISCORD_CLIENT_ID: optional, DISCORD_CLIENT_SECRET: optional, NODE_ENV: z.string().optional(),
  MICROSOFT_CLIENT_ID: optional, MICROSOFT_CLIENT_SECRET: optional,
  MICROSOFT_TENANT_ID: z.string().regex(/^(consumers|common|organizations|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i).default('consumers'),
  VOID_LOCAL_PREVIEW: z.enum(['true','false']).default('false'),
});
export function serverEnv() { return schema.parse(process.env); }
/** Explicitly opt into HTTP only for a production build served entirely on loopback. */
export function isLocalPreview() {
  return serverEnv().VOID_LOCAL_PREVIEW === 'true' && Object.values(site.urls).every(value => {
    const url = new URL(value);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  });
}
export function serviceState() {
  const env = serverEnv();
  const database = Boolean(env.DATABASE_URL && /^postgres(?:ql)?:\/\//.test(env.DATABASE_URL));
  const secret = Boolean(env.BETTER_AUTH_SECRET && env.BETTER_AUTH_SECRET.length >= 32);
  const mail = Boolean(env.SMTP_HOST && env.EMAIL_FROM && ((env.SMTP_USER && env.SMTP_PASSWORD) || ['localhost','127.0.0.1'].includes(env.SMTP_HOST)));
  return {
    database, auth: database && secret,
    email: database && secret && mail,
    discord: Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET),
    microsoft: database && secret && mail && Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET),
    checkout: database && secret && Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET) && env.STORE_CHECKOUT_ENABLED === 'true' && Boolean(site.legal.terms && site.legal.privacy && site.legal.refund),
  };
}
export function validateProduction() {
  const env = serverEnv();
  if (env.NODE_ENV !== 'production') return;
  if (!isLocalPreview()) for (const url of Object.values(site.urls)) if (!url.startsWith('https://') || new URL(url).hostname === 'localhost') throw new Error('Production application URLs must use public HTTPS origins.');
  if (env.BETTER_AUTH_URL && new URL(env.BETTER_AUTH_URL).origin !== new URL(site.urls.account).origin) throw new Error('BETTER_AUTH_URL must match the public account origin.');
  if (env.AUTH_COOKIE_DOMAIN) {
    const domain = env.AUTH_COOKIE_DOMAIN.replace(/^\./,'');
    if (!domain.includes('.') || Object.values(site.urls).some(value => { const host = new URL(value).hostname; return host !== domain && !host.endsWith(`.${domain}`); })) throw new Error('Cookie scope must match every trusted application host.');
  }
}
