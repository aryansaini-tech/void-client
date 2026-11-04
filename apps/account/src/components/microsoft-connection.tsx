'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { site } from '@void/shared/config';
import { MicrosoftIcon } from '@void/ui/brand';
import { authClient } from '@/lib/auth-client';
import { microsoftErrorMessage } from '@/lib/auth-messages';

export function MicrosoftConnection({enabled,accountId,hasPassword,error:initialError}:{enabled:boolean;accountId:string|null;hasPassword:boolean;error?:string}) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(initialError ? microsoftErrorMessage(initialError,true) : '');
  const [success,setSuccess]=useState('');
  const router=useRouter();
  const linked=Boolean(accountId);
  const unavailable=linked ? !hasPassword : !enabled;
  async function update(){
    if(busy||unavailable)return;
    setBusy(true);setError('');setSuccess('');
    try{
      const result=linked
        ? await authClient.unlinkAccount({accountId:accountId!})
        : await authClient.linkSocial({provider:'microsoft',callbackURL:`${site.urls.account}/security`,errorCallbackURL:`${site.urls.account}/security`});
      if(result.error){setError(microsoftErrorMessage(result.error.code,true));return;}
      if(linked){setSuccess('Microsoft disconnected. You can still sign in with your email and password.');router.refresh();}
    }catch{setError('Account services could not be reached. Please try again shortly.');}
    finally{setBusy(false);}
  }
  return <div className="connection-controls"><button type="button" className="button button-secondary" onClick={update} disabled={busy||unavailable} aria-describedby="microsoft-connection-hint">{busy?<LoaderCircle size={17} className="spinner"/>:<MicrosoftIcon width={17} height={17}/>}<span>{busy?'Please wait…':linked?'Disconnect Microsoft':'Connect Microsoft'}</span></button><p className="field-hint" id="microsoft-connection-hint">{linked&&!hasPassword?'Microsoft is your sign-in method. Set an email password below before disconnecting.':!linked&&!enabled?'Microsoft connection is being prepared and is not available yet.':linked?'You can also sign in with your email and password.':'Choose a Microsoft account with the same email address as your Void account.'}</p><p role="alert" className="field-error">{error}</p><p role="status" className="status-text">{success}</p></div>;
}
