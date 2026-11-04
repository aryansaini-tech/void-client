import { redirect } from 'next/navigation';
import { accountUrl } from '@void/shared/config';
export default function Page(){redirect(accountUrl('/dashboard'));}
