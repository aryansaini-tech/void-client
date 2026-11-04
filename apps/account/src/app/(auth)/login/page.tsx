import { serviceState } from '@void/backend/env';
import { site } from '@void/shared/config';
import { safeReturnUrl } from '@void/shared/urls';
import { AuthForm } from '@void/account/components/auth-form';
export const metadata={title:'Sign in'};
export const dynamic='force-dynamic';
export default async function Login({searchParams}:{searchParams:Promise<{returnTo?:string;error?:string}>}){const params=await searchParams;return <AuthForm mode="login" services={serviceState()} returnTo={safeReturnUrl(params.returnTo,site.urls.account,site.urls.store)} error={params.error}/>;}
