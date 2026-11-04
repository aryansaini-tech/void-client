import { serviceState } from '@void/backend/env';
import { AuthForm } from '@void/account/components/auth-form';

export const metadata = { title: 'Reset password' };
export const dynamic = 'force-dynamic';

export default async function Reset({ searchParams }: {
  searchParams: Promise<{ token?: string; error?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  return <AuthForm mode="reset" services={serviceState()} token={params.token} error={params.error} returnTo={params.returnTo} />;
}
