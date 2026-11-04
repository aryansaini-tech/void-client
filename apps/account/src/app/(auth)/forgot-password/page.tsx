import { serviceState } from '@void/backend/env';
import { AuthForm } from '@void/account/components/auth-form';

export const metadata = { title: 'Recover your account' };
export const dynamic = 'force-dynamic';

export default async function Forgot({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const params = await searchParams;
  return <AuthForm mode="forgot" services={serviceState()} returnTo={params.returnTo} />;
}
