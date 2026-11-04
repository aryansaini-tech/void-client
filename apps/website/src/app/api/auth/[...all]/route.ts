// Reuse the account application; business logic stays in apps/account.
export { GET, POST } from '@void/account/app/api/auth/[...all]/route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
