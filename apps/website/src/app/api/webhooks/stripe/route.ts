// Reuse the store application; business logic stays in apps/store.
export { POST } from '@void/store/app/api/webhooks/stripe/route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
