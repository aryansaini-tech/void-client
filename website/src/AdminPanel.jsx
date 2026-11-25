import {useCallback, useEffect, useRef, useState} from 'react';
import {requestJson,formatMinorAmount} from './site-api.js';
import './admin.css';

const pageSize = 25;
const date = value => {
  if(value == null) return '—';
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString() : '—';
};
function Avatar({url,name}) {
  const [failed,setFailed] = useState(false);
  useEffect(() => {setFailed(false);},[url]);
  let safe;
  try {const image = new URL(url);if(image.protocol === 'https:' && image.hostname === 'cdn.discordapp.com' && !image.username && !image.password) safe = image.href;} catch {}
  return <span className="admin-avatar">{safe && !failed ? <img src={safe} alt="" width="40" height="40" referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : <span aria-hidden="true">{(name || 'P').slice(0,1).toUpperCase()}</span>}</span>;
}
function Pagination({page,total,onChange,disabled}) {
  const pages = Math.max(1,Math.ceil((total || 0)/pageSize));
  return <div className="admin-pagination"><span>Page {page} of {pages} · {total || 0} records</span><div><button className="admin-button admin-button-secondary" onClick={() => onChange(page-1)} disabled={disabled || page <= 1}>Previous page</button><button className="admin-button admin-button-secondary" onClick={() => onChange(page+1)} disabled={disabled || page >= pages}>Next page</button></div></div>;
}

export default function AdminPanel({location,navigate}) {
  const pathname = location.split('?')[0].replace(/\/+$/,'');
  const selectedId = /^\/admin\/players\/([0-9]{17,20})$/.exec(pathname)?.[1] || null;
  const section = pathname === '/admin/audit' ? 'audit' : selectedId ? 'player' : 'players';
  const [session,setSession] = useState(null), [loading,setLoading] = useState(true), [denied,setDenied] = useState(false);
  const [error,setError] = useState(''), [notice,setNotice] = useState(''), [players,setPlayers] = useState(null), [detail,setDetail] = useState(null), [audit,setAudit] = useState(null), [catalogue,setCatalogue] = useState([]);
  const [draft,setDraft] = useState(''), [query,setQuery] = useState(''), [sort,setSort] = useState('last_login'), [order,setOrder] = useState('desc'), [page,setPage] = useState(1), [auditPage,setAuditPage] = useState(1);
  const [grantItem,setGrantItem] = useState(''), [note,setNote] = useState(''), [reason,setReason] = useState(''), [confirmation,setConfirmation] = useState(null), [pending,setPending] = useState(false);
  const alive = useRef(false), generation = useRef(0), controller = useRef(null), busy = useRef(false), access = useRef(null), heading = useRef(null), confirmHeading = useRef(null);
  const refresh = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();controller.current = request;
    const current = ++generation.current;
    setLoading(true);setError('');
    try {
      const admin = await requestJson('/api/admin/session',{signal:request.signal});
      if(!admin.user || !admin.csrfToken) throw new Error('Administrator access could not be verified.');
      let data,items;
      if(section === 'player') {
        [data,items] = await Promise.all([requestJson(`/api/admin/players/${selectedId}`,{signal:request.signal}),requestJson('/api/admin/catalogue',{signal:request.signal})]);
      } else if(section === 'audit') data = await requestJson(`/api/admin/audit?page=${auditPage}&page_size=${pageSize}`,{signal:request.signal});
      else data = await requestJson(`/api/admin/players?${new URLSearchParams({q:query,sort,order,page:String(page),page_size:String(pageSize)})}`,{signal:request.signal});
      if(alive.current && generation.current === current) {
        access.current = admin;setSession(admin);setDenied(false);
        if(section === 'player') {setDetail(data);setCatalogue(items.items || []);}
        else if(section === 'audit') setAudit(data);
        else setPlayers(data);
      }
    } catch(cause) {
      if(cause.name !== 'AbortError' && alive.current && generation.current === current) {
        setError(cause.message);setDetail(null);setPlayers(null);setAudit(null);setCatalogue([]);
        if(cause.status === 403 || cause.status === 401) {access.current = null;setSession(null);setDenied(true);}
      }
    } finally {if(alive.current && generation.current === current) setLoading(false);}
  },[section,selectedId,query,sort,order,page,auditPage]);
  useEffect(() => {alive.current = true;refresh();return () => {alive.current = false;generation.current++;controller.current?.abort();};},[refresh]);
  useEffect(() => {setConfirmation(null);setNotice('');setGrantItem('');setNote('');setReason('');heading.current?.focus({preventScroll:true});},[location]);
  useEffect(() => {if(confirmation) confirmHeading.current?.focus();},[confirmation]);
  useEffect(() => {
    const resume = () => {if(!document.hidden && !busy.current) refresh();};
    document.addEventListener('visibilitychange',resume);return () => document.removeEventListener('visibilitychange',resume);
  },[refresh]);
  function go(path) {if(busy.current) return;setConfirmation(null);navigate(path);}
  async function commitAction() {
    if(!confirmation || !access.current || busy.current || loading || confirmation.player_id !== selectedId) return;
    const action = {...confirmation,...(confirmation.action === 'revoke' ? {reason:reason.trim()} : {})};
    busy.current = true;setPending(true);setError('');setNotice('');
    try {
      const body = action.action === 'grant' ? {item_id:action.item_id,note:action.note,confirm:true} : {item_id:action.item_id,reason:action.reason,confirm:true};
      await requestJson(`/api/admin/players/${action.player_id}/${action.action}`,{method:'POST',body,csrfToken:access.current.csrfToken});
      if(!alive.current) return;
      setConfirmation(null);setNote('');setReason('');
      await refresh();
      if(alive.current) setNotice(action.action === 'grant' ? 'Grant recorded. The player receives the current items on their next launcher refresh.' : 'Removal recorded. The item is unequipped and will disappear on the next launcher refresh.');
    } catch(cause) {
      if(alive.current) {setError(cause.message);if(cause.status === 403 || cause.status === 401 || cause.code === 'csrf_rejected') {setConfirmation(null);await refresh();}}
    } finally {busy.current = false;if(alive.current) setPending(false);}
  }
  const disabled = loading || pending;
  const player = detail?.player;
  const owned = detail?.entitlements || [];
  const selectedCosmetic = catalogue.find(item => item.id === grantItem);
  const title = section === 'audit' ? 'Administrator audit log' : section === 'player' ? 'Player account' : 'Players';

  if(denied) return <main id="top" className="admin-denied"><a className="admin-brand" href="/">VOID</a><h1>Administrator access denied</h1><p>You must sign in with a Discord account allowed by the server owner.</p><p className="admin-error" role="alert">{error}</p><a className="admin-button" href="/account">Open account</a><button className="admin-button admin-button-secondary" onClick={refresh} disabled={loading}>Check access again</button></main>;
  if(!session) return <main id="top" className="admin-denied"><h1>Administrator access</h1><p role={loading ? 'status' : undefined}>{loading ? 'Checking server access…' : 'The administrator service is unavailable.'}</p>{error && <p className="admin-error" role="alert">{error}</p>}{!loading && <button className="admin-button" onClick={refresh}>Try again</button>}</main>;
  return <div className="admin-layout">
    <aside className="admin-sidebar"><a className="admin-skip-link" href="#admin-main">Skip to content</a><a className="admin-brand" href="/" onClick={event => {event.preventDefault();go('/');}}><img src="/void/brand-logo.png" alt="" width="36" height="36"/><span>VOID admin</span></a><nav aria-label="Administrator navigation"><a href="/admin" aria-current={section !== 'audit' ? 'page' : undefined} onClick={event => {event.preventDefault();go('/admin');}}>Players</a><a href="/admin/audit" aria-current={section === 'audit' ? 'page' : undefined} onClick={event => {event.preventDefault();go('/admin/audit');}}>Audit log</a></nav><div className="admin-identity"><strong>{session.user.displayName || session.user.display_name || 'Administrator'}</strong><span>Discord ID {session.user.discord_id}</span><a href="/account">Open account</a></div></aside>
    <main id="admin-main" className="admin-main"><header className="admin-heading"><div><h1 ref={heading} tabIndex={-1}>{title}</h1><p>{section === 'audit' ? 'Actions recorded by the server. Existing entries cannot be changed or deleted.' : section === 'player' ? 'Owned items, purchase records and administrative grants.' : 'Every player who has signed in with Discord.'}</p></div><button className="admin-button admin-button-secondary" onClick={refresh} disabled={disabled}>{loading ? 'Refreshing…' : 'Refresh records'}</button></header>
      <div className="admin-feedback" aria-live="polite">{error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-success">{notice}</p>}</div>
      {loading ? <p className="admin-supporting" role="status">Loading records…</p> : section === 'players' ? <section className="admin-panel" aria-label="Discord players">
        <form className="admin-filter" onSubmit={event => {event.preventDefault();setQuery(draft.trim());setPage(1);}}><label>Search name or Discord ID<input value={draft} onChange={event => setDraft(event.target.value)} maxLength={100} autoComplete="off"/></label><label>Sort by<select value={sort} onChange={event => {setSort(event.target.value);setPage(1);}}><option value="last_login">Last login</option><option value="created_at">First login</option><option value="display_name">Display name</option><option value="discord_id">Discord ID</option><option value="owned_count">Owned items</option></select></label><label>Order<select value={order} onChange={event => {setOrder(event.target.value);setPage(1);}}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label><button className="admin-button" disabled={disabled}>Search players</button></form>
        {players && <><div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Player records"><table className="admin-table"><thead><tr><th scope="col">Player</th><th scope="col">Discord ID</th><th scope="col">First login</th><th scope="col">Last login</th><th scope="col">Owned items</th></tr></thead><tbody>{(players.players || []).map(entry => <tr key={entry.discord_id}><td><a className="admin-player-link" href={`/admin/players/${entry.discord_id}`} onClick={event => {event.preventDefault();go(`/admin/players/${entry.discord_id}`);}}><Avatar url={entry.avatar_url} name={entry.display_name}/><strong>{entry.display_name}</strong></a></td><td className="admin-id">{entry.discord_id}</td><td>{date(entry.created_at)}</td><td>{date(entry.last_login)}</td><td>{entry.owned_count}</td></tr>)}</tbody></table>{(players.players || []).length === 0 && <p className="admin-empty">No players match this search.</p>}</div><Pagination page={players.page || page} total={players.total} onChange={setPage} disabled={disabled}/></>}
      </section> : section === 'audit' ? <section className="admin-panel" aria-label="Audit entries">{audit && <><div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Administrator action records"><table className="admin-table"><thead><tr><th scope="col">When</th><th scope="col">Administrator</th><th scope="col">Player</th><th scope="col">Item</th><th scope="col">Action</th><th scope="col">Reason or note</th></tr></thead><tbody>{(audit.entries || []).map(entry => <tr key={entry.id}><td>{date(entry.created_at)}</td><td className="admin-id">{entry.actor_id || '—'}</td><td className="admin-id">{entry.player_id || '—'}</td><td>{entry.item_name || entry.item_id || '—'}</td><td>{entry.action}</td><td>{entry.reason || '—'}</td></tr>)}</tbody></table>{(audit.entries || []).length === 0 && <p className="admin-empty">No administrator actions have been recorded.</p>}</div><Pagination page={audit.page || auditPage} total={audit.total} onChange={setAuditPage} disabled={disabled}/></>}</section> : detail && <>
        <section className="admin-panel admin-player-profile" aria-labelledby="player-profile-title"><Avatar url={player?.avatar_url} name={player?.display_name}/><div><h2 id="player-profile-title">{player?.display_name || 'Discord player'}</h2><p className="admin-id">Discord ID {player?.discord_id || selectedId}</p><dl className="admin-login-times"><div><dt>First login</dt><dd>{date(player?.created_at)}</dd></div><div><dt>Last login</dt><dd>{date(player?.last_login)}</dd></div></dl></div><button className="admin-button admin-button-secondary" onClick={() => go('/admin')}>Back to players</button></section>
        <section className="admin-panel" aria-labelledby="player-items-title"><h2 id="player-items-title">Player items</h2><p className="admin-supporting">Revoked items stay in the record. Re-granting an item restores it.</p><div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Player item records"><table className="admin-table"><thead><tr><th scope="col">Item</th><th scope="col">Source</th><th scope="col">Granted</th><th scope="col">Status</th><th scope="col">Equipped</th><th scope="col">Actions</th></tr></thead><tbody>{owned.map(item => <tr key={item.id || `${item.item_id}-${item.source}`}><td><strong>{item.name || item.item_id}</strong>{item.revoked_at && <span className="admin-row-detail">Revoked {date(item.revoked_at)}</span>}</td><td>{item.source === 'admin' ? 'Admin' : 'Purchase'}</td><td>{date(item.granted_at)}</td><td><span className={`admin-status admin-status-${item.status}`}>{item.status}</span></td><td>{item.equipped ? 'Yes' : 'No'}</td><td>{item.status === 'active' && <button className="admin-button admin-button-danger" disabled={disabled} onClick={() => {setReason('');setConfirmation({action:'revoke',player_id:selectedId,item_id:item.item_id,name:item.name || item.item_id,source:item.source});}}>Remove item</button>}</td></tr>)}</tbody></table>{owned.length === 0 && <p className="admin-empty">This player has no item records.</p>}</div></section>
        <section className="admin-panel" aria-labelledby="grant-title"><h2 id="grant-title">Grant an item</h2><p className="admin-supporting">Choose from the server catalogue. A repeated grant does not create another ownership record.</p><form className="admin-grant-form" onSubmit={event => {event.preventDefault();if(selectedCosmetic) setConfirmation({action:'grant',player_id:selectedId,item_id:grantItem,name:selectedCosmetic.name,note:note.trim()});}}><label>Catalogue item<select value={grantItem} onChange={event => setGrantItem(event.target.value)} required disabled={disabled}><option value="">Choose an item</option>{catalogue.map(item => <option value={item.id} key={item.id}>{item.name} · {item.kind}</option>)}</select></label><label>Note <span className="admin-optional">Optional</span><textarea value={note} onChange={event => setNote(event.target.value)} maxLength={500} rows={3} disabled={disabled}/></label><button className="admin-button" disabled={disabled || !grantItem}>Review grant</button>{catalogue.length === 0 && <p className="admin-supporting">The catalogue has no items to grant.</p>}</form></section>
        {confirmation && <section className="admin-confirm" aria-labelledby="admin-confirm-title"><h2 id="admin-confirm-title" ref={confirmHeading} tabIndex={-1}>{confirmation.action === 'grant' ? 'Confirm item grant' : 'Confirm item removal'}</h2><p>{confirmation.action === 'grant' ? `Grant ${confirmation.name} to ${player?.display_name || selectedId}? It will be recorded with source admin.` : `Remove ${confirmation.name} from ${player?.display_name || selectedId}? The record will be marked revoked and the item unequipped.`}</p>{confirmation.action === 'grant' && confirmation.note && <p>Note: {confirmation.note}</p>}{confirmation.action === 'revoke' && <>{owned.some(item => item.item_id === confirmation.item_id && item.source === 'purchase') && <p className="admin-purchase-warning" role="note">This item was purchased. Removing it does not refund the payment.</p>}<label>Reason for removal<textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={500} required rows={3} disabled={disabled}/></label></>}<div className="admin-confirm-actions"><button className={`admin-button ${confirmation.action === 'revoke' ? 'admin-button-danger' : ''}`} disabled={disabled || (confirmation.action === 'revoke' && !reason.trim())} onClick={commitAction}>{pending ? 'Recording…' : confirmation.action === 'grant' ? 'Confirm grant' : 'Confirm removal'}</button><button className="admin-button admin-button-secondary" disabled={disabled} onClick={() => setConfirmation(null)}>Cancel</button></div></section>}
        <section className="admin-panel" aria-labelledby="payments-title"><h2 id="payments-title">Purchase records</h2><p className="admin-supporting">Provider payment IDs are read-only. Item removal does not change a payment.</p><div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Read-only purchase records"><table className="admin-table"><thead><tr><th scope="col">Payment ID</th><th scope="col">Amount</th><th scope="col">Date</th><th scope="col">Status</th></tr></thead><tbody>{(detail.payments || []).map(payment => <tr key={payment.provider_payment_id || payment.id}><td className="admin-id">{payment.provider_payment_id || payment.payment_id}</td><td>{formatMinorAmount(payment.amount,payment.currency)}</td><td>{date(payment.granted_at || payment.created_at)}</td><td>{payment.status}</td></tr>)}</tbody></table>{(detail.payments || []).length === 0 && <p className="admin-empty">No purchase records for this player.</p>}</div></section>
      </>}
    </main>
  </div>;
}
