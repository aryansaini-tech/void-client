import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@void/backend/auth';
import { getDatabase } from '@void/backend/database';

export const currentViewer=cache(async()=>{
  const session=await getSession(await headers());
  if(!session || !session.user.emailVerified)return null;
  const profile=await getDatabase().accountProfile.findUnique({where:{userId:session.user.id}});
  return {...session,profile};
});
export async function requireViewer(path='/dashboard'){
  const viewer=await currentViewer();
  if(!viewer)redirect(`/login?returnTo=${encodeURIComponent(path)}`);
  return viewer;
}
