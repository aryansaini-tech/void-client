import { cache } from 'react';
import { headers } from 'next/headers';
import { getCatalog as catalog } from '@void/backend/catalog';
import { getSession } from '@void/backend/auth';
export const getCatalog=cache(catalog);
export const getViewer=cache(async()=>{try{const session=await getSession(await headers());return session?.user.emailVerified?session:null;}catch{return null;}});
