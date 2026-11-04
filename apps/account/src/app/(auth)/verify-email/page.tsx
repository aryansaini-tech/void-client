import { serviceState } from '@void/backend/env';
import { AuthForm } from '@void/account/components/auth-form';

export const metadata = { title: 'Verify email' };
export const dynamic = 'force-dynamic';

export default async function Verify({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const params = await searchParams;
  return <AuthForm mode="verify" services={serviceState()} error={params.error} returnTo={params.returnTo} />;
}
