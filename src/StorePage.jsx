import {useCallback,useEffect,useRef,useState} from 'react';
import {requestJson,formatMinorAmount} from './site-api.js';

function price(item) {
  const value = Number(item.price);
  if(item.price == null || !Number.isFinite(value)) return 'Price not published';
  return formatMinorAmount(value,item.currency);
}
export default function StorePage({Link,Action,Icon,itemId}) {
  const [catalogue,setCatalogue] = useState(null), [loading,setLoading] = useState(true), [error,setError] = useState(''), [category,setCategory] = useState('all');
  const controller = useRef(null), alive = useRef(false);
  const refresh = useCallback(async () => {
    controller.current?.abort();const request = new AbortController();controller.current = request;
    setLoading(true);setError('');
    try {const result = await requestJson('/api/catalogue',{signal:request.signal});if(!Array.isArray(result.items)) throw new Error('The catalogue could not be loaded.');if(alive.current && controller.current === request) setCatalogue(result);}
    catch(cause) {if(cause.name !== 'AbortError' && alive.current && controller.current === request) {setError(cause.message);setCatalogue(null);}}
    finally {if(alive.current && controller.current === request) setLoading(false);}
  },[]);
  useEffect(() => {alive.current = true;refresh();return () => {alive.current = false;controller.current?.abort();};},[refresh]);
  const items = catalogue?.items || [];
  const categories = [...new Set(items.map(item => item.kind).filter(Boolean))];
  const selected = itemId === undefined ? null : items.find(item => item.id === itemId);
  const purchasing = catalogue?.purchasing_live ? 'Checkout is unavailable in this release.' : 'Real purchasing is not live.';

  return <main id="top" className="store-page"><section className="store-browser" aria-labelledby="store-title"><div className="wrap store-wrap">
    <header className="store-heading"><h1 id="store-title" tabIndex={-1}>{itemId === undefined ? 'VOID store' : selected?.name || (loading ? 'Store item' : 'Item not found')}</h1><p>{itemId === undefined ? 'Published items from the VOID catalogue.' : selected ? `${selected.kind || 'Store item'} · ${price(selected)}` : loading ? 'Loading the catalogue…' : 'This item is not in the published catalogue.'}</p><p className="store-purchasing-status">{purchasing}</p></header>
    {error && <div className="store-feedback" role="alert"><p>{error}</p><button className="store-button" onClick={refresh}>Reload catalogue</button></div>}
    {loading ? <p className="store-loading" role="status">Loading catalogue…</p> : itemId !== undefined ? selected ? <div className="store-product-info"><dl className="store-product-facts"><div><dt>Item</dt><dd>{selected.name}</dd></div><div><dt>Type</dt><dd>{selected.kind || 'Store item'}</dd></div><div><dt>Price</dt><dd>{price(selected)}</dd></div></dl>{selected.description && <p className="store-product-description">{selected.description}</p>}<button className="store-button store-purchase" type="button" disabled>Purchases unavailable</button><Link className="store-account-link" to="/account">Manage owned items<Icon/></Link><Link className="store-account-link" to="/store">Back to store<Icon/></Link></div> : <div className="store-empty"><Action to="/store" secondary>Back to store</Action></div> : <>
      {categories.length > 1 && <div className="store-tabs" role="group" aria-label="Store categories"><button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All items</button>{categories.map(kind => <button type="button" key={kind} aria-pressed={category === kind} onClick={() => setCategory(kind)}>{kind}</button>)}</div>}
      <div id="store-items" className="store-items" aria-live="polite">{items.length === 0 ? <div className="store-empty"><h2>No published items</h2><p>The store catalogue has no published items yet.</p></div> : <ul className="store-catalogue-list">{items.filter(item => category === 'all' || item.kind === category).map(item => <li key={item.id}><Link to={`/store/${encodeURIComponent(item.id)}`} className="store-catalogue-row"><div><h2>{item.name}</h2><span>{item.kind || 'Store item'}</span></div><span>{price(item)}</span><Icon/></Link></li>)}</ul>}</div>
    </>}
  </div></section></main>;
}
