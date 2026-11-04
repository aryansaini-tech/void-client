'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { site } from '@void/shared/config';
import { DiscordIcon } from '@void/ui/brand';
import { authClient } from '@/lib/auth-client';
export function DiscordConnection({enabled,accountId}:{enabled:boolean;accountId:string|null}){const [busy,setBusy]=useState(false),[error,setError]=useState('');const router=useRouter();const linked=Boolean(accountId);async function update(){setBusy(true);setError('');try{const result=linked?await authClient.unlinkAccount({accountId:accountId!}):await authClient.linkSocial({provider:'discord',callbackURL:`${site.urls.account}/discord`});if(result.error)throw new Error('The connection could not be changed. Sign in again and retry.');router.refresh();}catch(error){setError(error instanceof Error?error.message:'Discord could not be reached.');}finally{setBusy(false);}}return <><button className={`button button-${linked?'secondary':'primary'}`} onClick={update} disabled={busy||!enabled}><DiscordIcon width={17} height={17}/>{busy?'Please wait…':linked?'Disconnect Discord':enabled?'Link Discord':'Discord connection coming soon'}</button><p className="field-error" role="alert">{error}</p></>;}
