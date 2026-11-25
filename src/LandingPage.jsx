import React, { createContext, lazy, Suspense, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { categories, modules } from './catalog.js';
import { usePageMotion } from './motion.js';
import Magnet from './components/Magnet.jsx';
import StorePage from './StorePage.jsx';
import './store.css';
import SystemFeatures from './SystemFeatures.jsx';
import { PublicChangelog, PublicDownload } from './SiteContent.jsx';
import { useSiteData } from './site-api.js';

const NativePreview = lazy(() => import('./NativePreview.jsx'));
const AdminPanel = lazy(() => import('./AdminPanel.jsx'));
const UserAccount = lazy(() => import('./UserAccount.jsx'));
const Router = createContext(null);
const VERSION = '1.26.63';
const featuredNames = ['Armor HUD', 'Better Inventory', 'Combo Counter', 'CPS Counter', 'Custom Crosshair', 'FPS Counter', 'Fullbright', 'Keystrokes', 'Reach Display', 'Zoom', 'Animations', '3D Map'];
const featured = featuredNames.map(name => modules.find(module => module.name === name)).filter(Boolean);
const currentLocation = () => window.location.pathname + window.location.search;

function Icon({ name = 'arrow' }) {
  if (name === 'windows') return <svg className="icon brand-icon" data-brand-icon="windows" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" /></svg>;
  if (name === 'discord') return <svg className="icon brand-icon" data-brand-icon="discord" viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true"><path d="M19.27 5.37c-1.36-.63-2.82-1.09-4.35-1.35-.19.34-.41.8-.56 1.17-1.62-.25-3.24-.25-4.82 0-.15-.37-.38-.83-.57-1.17-1.54.26-3 .72-4.36 1.35-2.76 4.12-3.5 8.14-3.12 12.11 1.83 1.36 3.6 2.19 5.34 2.73.43-.59.81-1.22 1.13-1.88-.63-.24-1.23-.54-1.8-.89.15-.11.3-.23.44-.35 3.48 1.64 7.26 1.64 10.7 0 .14.12.29.24.44.35-.57.35-1.17.64-1.8.89.32.66.7 1.3 1.13 1.88 1.75-.54 3.53-1.37 5.35-2.73.46-4.59-.78-8.57-3.15-12.11ZM8.02 14.71c-1.04 0-1.89-.95-1.89-2.11s.83-2.11 1.89-2.11 1.91.95 1.89 2.11c0 1.16-.84 2.11-1.89 2.11Zm7.01 0c-1.04 0-1.89-.95-1.89-2.11s.83-2.11 1.89-2.11 1.91.95 1.89 2.11c0 1.16-.83 2.11-1.89 2.11Z" /></svg>;
  const paths = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 17v4h14v-4" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    chevron: <><path d="m8 5 7 7-7 7" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9" /></>,
    account: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    discord: <><path d="M8 6 5 5C3 9 2 13 3 17l4 2 2-3M16 6l3-1c2 4 3 8 2 12l-4 2-2-3M8 6a16 16 0 0 1 8 0M8 16a13 13 0 0 0 8 0" /><path d="M8 11v2M16 11v2" /></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.arrow}</svg>;
}

function Link({ to = '/', children, className = '', ...props }) {
  const { navigate } = useContext(Router);
  return <a href={to} className={className} {...props} onClick={event => {
    props.onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !to.startsWith('/')) return;
    event.preventDefault(); navigate(to);
  }}>{children}</a>;
}

function Action({ to, secondary = false, children, icon = 'arrow', leadingIcon }) {
  const before = leadingIcon || (to === '/download' ? 'windows' : undefined);
  const external = /^https?:/.test(to);
  return <Link to={to} className={`btn ${secondary ? 'btn--secondary' : 'btn--primary'}`} {...(external ? {target:'_blank',rel:'noopener noreferrer'} : {})}>{before && <Icon name={before} />}<span>{children}</span>{icon && <Icon name={icon} />}</Link>;
}

function Header({ page }) {
  const [menuPage, setMenuPage] = useState(null);
  const open = menuPage === page;
  const header = useRef(null);
  const navigation = useRef(null);
  const toggle = useRef(null);
  useEffect(() => { setMenuPage(null); }, [page]);
  useEffect(() => {
    if (!open) return;
    const mobile = window.matchMedia('(max-width: 1024px)');
    if (!mobile.matches) { setMenuPage(null); return; }
    const root = header.current;
    const menu = navigation.current;
    const button = toggle.current;
    const outside = [...Array.from(root.parentElement.children).filter(element => element !== root), root.querySelector('.skip-link')].filter(Boolean);
    const inertStates = outside.map(element => [element, element.getAttribute('inert')]);
    const overflow = document.body.style.getPropertyValue('overflow');
    const overflowPriority = document.body.style.getPropertyPriority('overflow');
    const firstLink = () => menu.querySelector('a[href]') || button;
    const focusable = () => Array.from(root.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(element => !element.closest('[inert]') && element.getClientRects().length > 0 && window.getComputedStyle(element).visibility !== 'hidden');

    firstLink()?.focus({preventScroll:true});
    outside.forEach(element => element.setAttribute('inert', ''));
    document.body.style.setProperty('overflow', 'hidden');

    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); setMenuPage(null); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); return; }
      const index = items.indexOf(document.activeElement);
      if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && (index < 0 || index === items.length - 1)) { event.preventDefault(); items[0].focus(); }
    };
    const onFocus = event => { if (!root.contains(event.target) || event.target.closest?.('[inert]')) firstLink()?.focus({preventScroll:true}); };
    const onViewportChange = event => { if (!event.matches) setMenuPage(null); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocus);
    mobile.addEventListener('change', onViewportChange);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocus);
      mobile.removeEventListener('change', onViewportChange);
      inertStates.forEach(([element, previous]) => { if (previous === null) element.removeAttribute('inert'); else element.setAttribute('inert', previous); });
      if (overflow) document.body.style.setProperty('overflow', overflow, overflowPriority);
      else document.body.style.removeProperty('overflow');
      const target = mobile.matches ? button : root.querySelector('.brand');
      if (target?.isConnected) target.focus({preventScroll:true});
    };
  }, [open]);
  const links = [['modules', 'Modules'], ['changelog', 'Changelog'], ['store', 'Store'], ['discord', 'Discord']];
  return <header className="nav" ref={header} onClick={event => { if (open && event.target.closest?.('a[href]')) setMenuPage(null); }}><div className="wrap nav-wrap">
    <a className="skip-link" href="#top">Skip to content</a>
    <Link to="/" className="brand" aria-label="VOID home"><img src="/void/brand-logo.png" alt="" width="40" height="40" /><span>VOID</span></Link>
    <nav className="nav-links" aria-label="Main navigation">{links.map(([id,label]) => <Link key={id} to={`/${id}`} aria-current={page === id ? 'page' : undefined}>{label}</Link>)}</nav>
    <div className="nav-actions"><Link to="/account" className="account-link" aria-label="Account" aria-current={page === 'account' ? 'page' : undefined}><Icon name="account" /><span>Account</span></Link><Action to="/download" icon="download">Download</Action><button ref={toggle} className="menu-toggle" type="button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setMenuPage(open ? null : page)}><Icon name={open ? 'close' : 'menu'} /></button></div>
  </div><nav id="mobile-navigation" className="mobile-navigation" ref={navigation} aria-label="Mobile navigation" hidden={!open}>{links.map(([id,label]) => <Link key={id} to={`/${id}`} onClick={() => setMenuPage(null)}>{label}<Icon /></Link>)}<Link to="/account" onClick={() => setMenuPage(null)}>Account<Icon name="account" /></Link><Action to="/download" icon="download">Download for Windows</Action></nav></header>;
}

function Home() {
  return <main id="top"><section className="hero hero--centered" id="hero" data-enter aria-labelledby="hero-title"><div className="wrap hero-layout"><div className="hero-mark" data-hero-mark><img src="/void/brand-logo.png" alt="VOID logo" width="112" height="112" fetchPriority="high" /></div><div className="hero-text">
    <h1 id="hero-title" className="hero-title" data-hero-title>Play beyond<br /><span>limits.</span></h1>
    <div className="btn-row hero-actions" data-hero-actions><Magnet padding={32} magnetStrength={12} maxOffset={3} scale={1} tilt={0}><Action to="/download" icon={null}>Download for Windows</Action></Magnet><Action to="https://discord.com/invite/4NpbgbsS5d" secondary leadingIcon="discord" icon={null}>Discord</Action></div>
    <p className="hero-meta" data-hero-meta><span>Windows</span><span>Bedrock target {VERSION}</span></p>
    <p className="hero-lead" data-hero-copy>Your HUD. Your keybinds. Your setup.<br /> VOID brings your client controls together for Minecraft Bedrock on Windows.</p>
  </div></div><a className="scroll-cue" href="#client-systems"><span>Explore the client</span><Icon name="chevron" /></a></section><SystemFeatures Link={Link} Icon={Icon} /><section className="section module-section" id="client-modules" aria-labelledby="modules-title"><div className="wrap">
    <div className="client-showcase"><div className="section-heading" data-scroll-reveal><h2 id="modules-title">Your setup,<br />all in one place.</h2><p>Choose your Bedrock version, find your client modules and manage your settings from the launcher.</p><Action to="/modules" secondary>See client modules</Action></div><div className="client-shot" data-scroll-art data-visual><img src="/void/launcher-home.png" alt="Actual VOID launcher showing the launch controls, saved setup and player preview" width="960" height="620" loading="lazy" /></div></div>
    <div className="module-cloud ui" data-scroll-stagger aria-label="Featured client modules">{featured.slice(0,6).map(module => <Link key={module.id} className="module-pill" to={`/modules?module=${encodeURIComponent(module.id)}`}><span>{module.name}</span><Icon /></Link>)}</div>
    <div className="section-action"><Action to="/modules" secondary>See all modules</Action></div>
  </div></section></main>;
}

function PageHeading({ title, children }) {
  return <div className="page-heading"><h1 tabIndex="-1">{title}</h1>{children && <p>{children}</p>}</div>;
}

function Modules({ location }) {
  const requested = new URLSearchParams(location.split('?')[1] || '').get('module');
  const requestedView = new URLSearchParams(location.split('?')[1] || '').get('view');
  const selected = modules.find(module => module.id === requested);
  const [view, setView] = useState(requestedView === 'preview' ? 'preview' : 'catalog');
  const [previewModuleId, setPreviewModuleId] = useState(selected?.id);
  const [query, setQuery] = useState(selected?.name || '');
  const [category, setCategory] = useState('All');
  useEffect(() => { setQuery(selected?.name || ''); setCategory('All'); setPreviewModuleId(selected?.id); }, [requested]);
  useEffect(() => { setView(requestedView === 'preview' ? 'preview' : 'catalog'); }, [requestedView,requested]);
  const filtered = useMemo(() => modules.filter(module => (category === 'All' || module.category === category) && `${module.name} ${module.description}`.toLowerCase().includes(query.toLowerCase().trim())), [query, category]);
  return <main id="top" className="page-main"><section className="page-section"><div className="wrap">
    <PageHeading title="Client modules.">Find the controls for your setup. Open a module to read its description, or try the interactive browser preview.</PageHeading>
    <div className="view-tabs" role="group" aria-label="Module views"><button type="button" aria-pressed={view === 'catalog'} onClick={() => setView('catalog')}>Catalog</button><button type="button" aria-pressed={view === 'preview'} onClick={() => setView('preview')}>Interactive preview</button></div>
    {view === 'catalog' ? <div id="catalog-view"><div className="catalog-tools"><label className="search-field"><span className="sr-only">Search modules</span><Icon name="search" /><input type="search" placeholder="Search modules" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Clear module search" onClick={() => setQuery('')}><Icon name="close" /></button>}</label><div className="category-filters" aria-label="Module categories">{categories.map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
      {filtered.length ? <div className="catalog-list">{filtered.map(module => <details className="module-row" key={module.id} open={selected?.id === module.id || undefined}><summary><span>{module.name}<small>{module.category}</small></span><Icon name="chevron" /></summary><div className="module-description"><p>{module.description || 'This module is available in the client catalog.'}</p><button className="text-link" type="button" onClick={() => { setPreviewModuleId(module.id); setView('preview'); }}>Try the browser preview<Icon /></button></div></details>)}</div> : <div className="empty-state"><Icon name="search" /><h2>No modules found.</h2><p>Try a different name or choose another category.</p><button type="button" className="btn btn--secondary" onClick={() => { setQuery(''); setCategory('All'); }}>Clear filters<Icon /></button></div>}
    </div> : <div id="preview-view"><p className="preview-notice">Preview changes stay in this browser. They do not connect to Minecraft.</p><Suspense fallback={<div className="preview-loading" role="status">Loading the client preview…</div>}><NativePreview moduleId={previewModuleId} /></Suspense></div>}
  </div></section></main>;
}

function Download({ site, refresh }) {
  return <PublicDownload site={site} refresh={refresh} PageHeading={PageHeading} Action={Action} Icon={Icon} version={VERSION} />;
}

function Changelog({ site, refresh }) {
  return <PublicChangelog site={site} refresh={refresh} PageHeading={PageHeading} Action={Action} Icon={Icon} />;
}

function Community() {
  return <main id="top" className="page-main"><section className="page-section discord-page"><div className="wrap"><div className="support-hero"><div data-scroll-reveal><PageHeading title="Find us on Discord.">Talk about your setup, ask a client question or share feedback with the VOID community.</PageHeading><a className="btn btn--primary" href="https://discord.com/invite/4NpbgbsS5d" target="_blank" rel="noopener noreferrer" data-community-invite><span>Join the VOID Discord</span><Icon /></a></div><img className="support-logo" src="/void/brand-logo.png" alt="VOID's gold V logo" width="464" height="464" data-scroll-art /></div><div className="support-topics" data-scroll-stagger><article><h2>Get help with a setup.</h2><p>Include your Bedrock version and describe what you were doing when the problem appeared.</p></article><article><h2>Talk about client controls.</h2><p>Discuss HUD layouts, keybinds and settings. The full module catalog is available here.</p><Link className="text-link" to="/modules">Browse the module catalog<Icon /></Link></article><article><h2>Follow the project.</h2><p>Use the community link for project conversations. Public release notes appear on the changelog page when published.</p><Link className="text-link" to="/changelog">Read the changelog<Icon /></Link></article></div></div></section></main>;
}

function Account({location}) {
  return <Suspense fallback={<main id="top" className="page-main"><section className="page-section"><div className="wrap" role="status">Loading sign-in…</div></section></main>}><UserAccount Icon={Icon} location={location}/></Suspense>;
}

function NotFound() {
  return <main id="top" className="page-main"><section className="page-section"><div className="wrap"><PageHeading title="Page not found.">The address does not match a VOID page.</PageHeading><Action to="/" secondary>Return to home</Action></div></section></main>;
}

function Footer({ home }) {
  return <footer className={`closing footer ${home ? 'footer-home' : ''}`} data-moment={home ? 'word-highlight' : undefined}><div className="wrap">{home && <p className="mo-wh__text footer-statement">Play beyond limits. Choose the controls that make your Minecraft Bedrock setup yours.</p>}<div className="footer-base"><Link to="/" className="brand"><img src="/void/brand-logo.png" alt="" width="32" height="32" loading="lazy" /><span>VOID</span></Link><nav aria-label="Footer navigation"><Link to="/modules">Modules</Link><Link to="/store">Store</Link><Link to="/account">Account</Link><Link to="/changelog">Changelog</Link><Link to="/download">Download</Link><Link to="/discord">Discord</Link></nav><p>© {new Date().getFullYear()} VOID. Not affiliated with Mojang or Microsoft.</p></div></div></footer>;
}

export default function LandingPage() {
  const [location, setLocation] = useState(currentLocation);
  const { site, refresh } = useSiteData();
  const root = useRef(null);
  const routePath = location.split('?')[0].replace(/^\/+|\/+$/g, '');
  const isAdmin = /^(adminpanel|admin)(\/|$)/.test(routePath);
  const page = isAdmin ? 'admin' : routePath === 'login' ? 'account' : routePath.startsWith('store/') ? 'store' : routePath || 'home';
  const storeItemId = routePath.startsWith('store/') ? routePath.slice('store/'.length) : undefined;
  const navigate = target => { if (target !== currentLocation()) window.history.pushState({}, '', target); setLocation(currentLocation()); };
  usePageMotion(root, isAdmin ? 'admin-workspace' : location);
  useEffect(() => { if (['changelog', 'download', 'admin'].includes(page)) refresh(); }, [location, page, refresh]);
  useEffect(() => { const onPop = () => setLocation(currentLocation()); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  useEffect(() => {
    window.scrollTo({top:0,behavior:'instant'});
    const title = {home:'Play beyond limits — Minecraft Bedrock client',modules:'Client modules',download:'Download',store:'Store',account:'Account',changelog:'Changelog',discord:'Discord',admin:'Site admin'}[page] || 'Page not found';
    document.title = `${title} — VOID`;
    let disposed = false;
    let focusFrame = 0;
    if (page !== 'home' && !isAdmin) {
      const heading = root.current?.querySelector('main h1');
      const focusHeading = () => {
        if (disposed || !heading?.isConnected) return;
        // The entrance starts at visibility:hidden; focus once it is visible.
        if (getComputedStyle(heading).visibility === 'hidden') {
          focusFrame = window.requestAnimationFrame(focusHeading);
          return;
        }
        heading.focus({preventScroll:true});
      };
      focusFrame = window.requestAnimationFrame(focusHeading);
    }
    const footer = root.current?.querySelector('[data-moment="word-highlight"]');
    const destroyMoment = () => {
      if (!footer) return;
      footer.__moment?.destroy?.();
      delete footer.__moment;
      delete footer.__momentP;
      footer.removeAttribute('data-moment-mounted');
    };
    if (page === 'home' && footer) {
      window.__momentsManual = true;
      import(/* @vite-ignore */ '/void/taste/moments/moments.js').then(async module => {
        if (disposed) return;
        await module.mount(footer);
        if (disposed) destroyMoment();
        else document.documentElement.dataset.momentsReady = '1';
      }).catch(error => console.error('VOID motion:',error));
    }
    return () => { disposed=true; window.cancelAnimationFrame(focusFrame); destroyMoment(); };
  }, [location,page]);
  return <Router.Provider value={{navigate}}><div className={isAdmin ? 'admin-root' : 'site-shell'} ref={root}>{isAdmin ? <Suspense fallback={<main className="admin-loading" role="status">Loading admin access…</main>}><AdminPanel site={site} refresh={refresh} version={VERSION} location={location} navigate={navigate} /></Suspense> : <><Header page={page} />{page==='home'?<Home />:page==='modules'?<Modules location={location} />:page==='download'?<Download site={site} refresh={refresh} />:page==='changelog'?<Changelog site={site} refresh={refresh} />:page==='discord'?<Community />:page==='store'?<StorePage key={storeItemId || 'store'} itemId={storeItemId} Link={Link} Action={Action} Icon={Icon} />:page==='account'?<Account location={location}/>:<NotFound />}<Footer home={page==='home'} /></>}</div></Router.Provider>;
}
