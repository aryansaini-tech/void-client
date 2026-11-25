import {useCallback, useEffect, useRef, useState} from 'react';
import {requestJson} from './site-api.js';
import './account.css';

const callbackMessages = {
  cancelled:'Discord sign-in was cancelled. You can try again below.',
  provider_unavailable:'Discord sign-in is not configured yet.',
  failed:'Discord sign-in could not be completed. Please try again.',
  expired:'Your sign-in request expired. Start again below.',
  invalid_state:'Your sign-in request could not be verified. Start again below.',
};
const date = value => {
  if(value == null) return '—';
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString() : '—';
};
function safeAvatar(value) {
  try {const url = new URL(value);return url.protocol === 'https:' && url.hostname === 'cdn.discordapp.com' && !url.username && !url.password ? url.href : undefined;} catch {return undefined;}
}

export default function UserAccount({Icon,location}) {
  const [session,setSession] = useState(null), [account,setAccount] = useState(null);
  const [loading,setLoading] = useState(true), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [pending,setPending] = useState(''), [confirmation,setConfirmation] = useState(null), [avatarFailed,setAvatarFailed] = useState(false);
  const alive = useRef(false), generation = useRef(0), access = useRef(null), busy = useRef(false), navigating = useRef(false), heading = useRef(null), confirmHeading = useRef(null);
  const queryStatus = new URLSearchParams(location.split('?')[1] || '').get('auth');
  const authenticated = session?.authenticated === true;
  const user = account?.user || session?.user;
  const avatar = !avatarFailed && safeAvatar(user?.avatarUrl || user?.avatar_url);
  const activeItems = new Map();
  for(const item of account?.entitlements || []) if(item.status === 'active' && !activeItems.has(item.item_id)) activeItems.set(item.item_id,item);
  const entitlements = [...activeItems.values()];

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);setError('');
    let discoveredSession;
    try {
      const next = await requestJson('/api/auth/session');
      if(typeof next.authenticated !== 'boolean') throw new Error('Your account could not be loaded.');
      discoveredSession = next;
      const detail = next.authenticated ? await requestJson('/api/account') : null;
      if(alive.current && current === generation.current) {access.current = next;setSession(next);setAccount(detail);}
    } catch(cause) {if(alive.current && current === generation.current) {setError(cause.message);setAccount(null);if(cause.status === 401) {const providers = discoveredSession?.providers || access.current?.providers || {};access.current = null;setSession({authenticated:false,providers});}}}
    finally {if(alive.current && current === generation.current) setLoading(false);}
  },[]);
  useEffect(() => {alive.current = true;refresh();return () => {alive.current = false;generation.current++;access.current = null;};},[refresh]);
  useEffect(() => {heading.current?.focus({preventScroll:true});},[]);
  useEffect(() => {setAvatarFailed(false);setConfirmation(null);},[user?.id,user?.discord_id]);
  useEffect(() => {if(confirmation) confirmHeading.current?.focus();},[confirmation]);
  useEffect(() => {
    const resume = () => {if(!document.hidden) {if(navigating.current) {navigating.current = false;busy.current = false;setPending('');}if(!busy.current) refresh();}};
    window.addEventListener('pageshow',resume);document.addEventListener('visibilitychange',resume);
    return () => {window.removeEventListener('pageshow',resume);document.removeEventListener('visibilitychange',resume);};
  },[refresh]);

  async function mutate(key,endpoint,body,message) {
    const snapshot = access.current;
    if(!snapshot?.authenticated || busy.current || loading) return;
    busy.current = true;setPending(key);setError('');setNotice('');
    try {
      await requestJson(endpoint,{method:'POST',body,csrfToken:snapshot.csrfToken});
      if(!alive.current) return;
      setConfirmation(null);
      await refresh();
      if(alive.current) setNotice(message);
    } catch(cause) {
      if(!alive.current) return;
      setError(cause.message);
      if(cause.status === 401 || cause.code === 'csrf_rejected') await refresh();
    } finally {busy.current = false;if(alive.current) setPending('');}
  }
  function loginDiscord() {
    if(busy.current || loading || !session?.providers?.discord?.available) return;
    busy.current = true;navigating.current = true;setPending('discord');window.location.assign('/auth/discord');
  }
  const disabled = Boolean(pending) || loading;
  return <main id="top" className={`user-account-page ${authenticated ? 'user-account-signed-in' : ''}`}>
    <section className="user-account-wrap" aria-labelledby="user-account-title">
      <div className="user-account-panel">
        <a className="user-account-brand" href="/" aria-label="VOID home"><img src="/void/brand-logo.png" width="44" height="44" alt=""/><span>VOID</span></a>
        <div className="user-account-heading"><div><h1 id="user-account-title" ref={heading} tabIndex={-1}>{authenticated ? 'Your VOID account' : 'Sign in to VOID'}</h1><p className="user-account-intro">{authenticated ? 'Your Discord account, owned items and launcher access.' : 'Use Discord to access the same items on the website and launcher.'}</p></div>{authenticated && <button className="user-account-connect" onClick={refresh} disabled={disabled}>Refresh account</button>}</div>
        <div className="user-account-feedback" aria-live="polite">{callbackMessages[queryStatus] && <p className="user-account-error" role="alert">{callbackMessages[queryStatus]}</p>}{error && <p className="user-account-error" role="alert">{error}</p>}{notice && <p className="user-account-success">{notice}</p>}</div>
        {session === null ? <div className="user-account-loading" role="status"><p>{loading ? 'Checking your account…' : 'Your account could not be loaded.'}</p>{!loading && <button className="user-account-button user-account-secondary" onClick={refresh}>Try again</button>}</div> : authenticated ? <>
          <div className="user-account-profile" data-user-profile><div className="user-account-avatar">{avatar ? <img src={avatar} onError={() => setAvatarFailed(true)} width="56" height="56" alt="" referrerPolicy="no-referrer"/> : <Icon name="account"/>}</div><div><strong data-user-name>{user?.displayName || user?.display_name || 'Discord player'}</strong><span>Discord ID {user?.discord_id || '—'}</span><span>Signed in with Discord</span></div></div>
          <section className="user-account-section" aria-labelledby="owned-items-title"><h2 id="owned-items-title">Owned items</h2><p className="user-account-supporting">Equip a cosmetic here. Your launcher receives the current selection on its next refresh. Minecraft cape rendering is a separate feature.</p>
            {loading ? <p role="status" className="user-account-supporting">Refreshing items…</p> : !account ? <p className="user-account-supporting">Items are unavailable. Refresh your account to try again.</p> : entitlements.length === 0 ? <p className="user-account-empty">You do not own any items yet.</p> : <ul className="user-item-list">{entitlements.map(item => {
              const equipped = item.equipped === true || (account.equipped || []).some(value => value.item_id === item.item_id);
              const cosmetic = Boolean(item.slot);
              const slot = item.slot;
              return <li className="user-item-row" key={item.id || `${item.item_id}-${item.source}`}><div><strong>{item.name || item.item_id}</strong><span>{item.source === 'admin' ? 'Admin grant' : 'Purchase'} · {equipped ? 'Equipped' : 'Owned'}</span></div>{cosmetic && <button className="user-account-connect" disabled={disabled} onClick={() => mutate(item.item_id,equipped ? '/api/account/unequip' : '/api/account/equip',equipped ? {slot} : {item_id:item.item_id},equipped ? 'Cosmetic unequipped.' : 'Cosmetic equipped.')}>{pending === item.item_id ? 'Saving…' : equipped ? 'Unequip item' : 'Equip item'}</button>}</li>;
            })}</ul>}
          </section>
          <section className="user-account-section" aria-labelledby="launcher-access-title"><h2 id="launcher-access-title">Launcher access</h2><p className="user-account-supporting">Revoke a launcher session to disconnect it. Sign-out in the launcher also revokes its token.</p>{!account ? <p className="user-account-supporting">Launcher sessions are unavailable.</p> : (account.launcher_tokens || []).length === 0 ? <p className="user-account-empty">No active launcher sessions.</p> : <ul className="user-item-list">{account.launcher_tokens.map((token,index) => <li className="user-item-row" key={token.id}><div><strong>Launcher session {index+1}</strong><span>Connected {date(token.created_at)}</span><span>Expires {date(token.expires_at)}</span>{token.last_used_at && <span>Last refresh {date(token.last_used_at)}</span>}</div><button className="user-account-connect" disabled={disabled} onClick={() => setConfirmation({type:'token',id:token.id})}>Revoke access</button></li>)}</ul>}</section>
          <section className="user-account-section" aria-labelledby="privacy-title"><h2 id="privacy-title">Account privacy</h2><p className="user-account-supporting">VOID stores your Discord identity, items and login times. Deleting your account removes or anonymises account data and disconnects launcher sessions. Payment records required by law are retained.</p><div className="user-account-actions"><button className="user-account-button user-account-secondary" disabled={disabled} onClick={() => mutate('logout','/api/auth/logout',{},'Signed out of the website.')}>{pending === 'logout' ? 'Signing out…' : 'Sign out'}</button><button className="user-account-button user-account-danger" disabled={disabled} onClick={() => setConfirmation({type:'delete'})}>Delete account</button></div></section>
          {confirmation && <div className="user-account-confirm" role="group" aria-labelledby="account-confirm-title"><h2 id="account-confirm-title" ref={confirmHeading} tabIndex={-1}>{confirmation.type === 'delete' ? 'Delete your account?' : 'Revoke launcher access?'}</h2><p>{confirmation.type === 'delete' ? 'Your profile and cosmetic selection will be removed or anonymised, and all sessions will end. Legally required payment records are kept.' : 'This launcher will need to sign in again to refresh your account.'}</p><div className="user-account-actions"><button className="user-account-button user-account-danger" disabled={disabled} onClick={() => confirmation.type === 'delete' ? mutate('delete','/api/account/delete',{confirm:true},'Your account was deleted.') : mutate('token','/api/account/launcher-tokens/revoke',{id:confirmation.id},'Launcher access revoked.')}>{pending ? 'Saving…' : confirmation.type === 'delete' ? 'Confirm deletion' : 'Confirm revocation'}</button><button className="user-account-button user-account-secondary" disabled={disabled} onClick={() => setConfirmation(null)}>Cancel</button></div></div>}
        </> : <>
          <div className="user-account-provider-buttons"><div className="user-provider-option"><button className="user-account-button user-login-discord" data-provider="discord" onClick={loginDiscord} disabled={disabled || !session.providers?.discord?.available}><Icon name="discord"/><span>{pending === 'discord' ? 'Opening Discord…' : 'Continue with Discord'}</span></button>{!loading && !session.providers?.discord?.available && <span className="user-provider-availability">Discord sign-in is not configured yet.</span>}</div><div className="user-provider-option"><button className="user-account-button user-account-secondary" data-provider="xbox" disabled><span>Xbox · Coming soon</span></button></div></div>
          <p className="user-account-privacy">You sign in on Discord. VOID never asks for your Discord password.</p>
        </>}
      </div><p className="user-account-help">Need a hand? <a href="/discord">Visit our Discord</a></p>
    </section>
  </main>;
}
