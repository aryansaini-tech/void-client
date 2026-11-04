'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowUpRight, Menu, Moon, ShoppingBag, Sun, UserRound, X } from 'lucide-react';
import { site, storeUrl, accountUrl, websiteNavigation, type AppName } from '@void/shared/config';
import { Wordmark } from './brand';
import { useMotionPreference } from './motion';

type Theme = 'dark' | 'light';
const themeEvent = 'void:theme-change';

function themeSnapshot(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function subscribeTheme(update: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== 'void-theme') return;
    document.documentElement.dataset.theme = event.newValue === 'dark' ? 'dark' : 'light';
    update();
  };
  window.addEventListener(themeEvent, update);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(themeEvent, update);
    window.removeEventListener('storage', storage);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, themeSnapshot, (): Theme => 'light');
  function toggle() {
    const next = themeSnapshot() === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('void-theme', next);
    } catch {
      // Appearance remains usable in private or storage-restricted browsers.
    }
    window.dispatchEvent(new Event(themeEvent));
  }

  const label = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
  return (
    <button type="button" className="theme-toggle-btn" onClick={toggle} aria-label={label} title={label}>
      {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}

function subscribeScroll(update: () => void) {
  window.addEventListener('scroll', update, { passive: true });
  return () => window.removeEventListener('scroll', update);
}

export function Navigation({ app = 'website' }: { app?: AppName }) {
  const pathname = usePathname();
  const reduced = useMotionPreference();
  const scrolled = useSyncExternalStore(subscribeScroll, () => window.scrollY > 24, () => false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const links = app === 'website' ? websiteNavigation : app === 'store' ? [
    { label: 'Store', href: storeUrl() },
    { label: 'Collection', href: storeUrl('/products') },
    { label: 'Categories', href: storeUrl('/categories') },
    { label: 'Orders', href: storeUrl('/orders') },
    { label: 'Void Client', href: site.urls.website },
  ] : [
    { label: 'Void Client', href: site.urls.website },
    { label: 'Store', href: site.urls.store },
    { label: 'Support', href: `${site.urls.website}/faq` },
  ];
  const isCurrent = (href: string) => {
    const target = new URL(href, site.urls.website);
    const base = new URL(site.urls[app]);
    if (target.origin !== base.origin) return false;
    const root = base.pathname.replace(/\/$/, '') || '/';
    const route = target.pathname;
    return pathname === route || (route !== '/' && route !== root && pathname.startsWith(`${route}/`));
  };

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    dialog.current?.close();
  }, [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1180px)');
    const resize = () => {
      if (!desktop.matches) return;
      if (closeTimer.current) clearTimeout(closeTimer.current);
      dialog.current?.close();
    };
    desktop.addEventListener('change', resize);
    return () => {
      desktop.removeEventListener('change', resize);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  function closeMenu(immediate = false, restoreFocus = true) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const finish = () => {
      closeTimer.current = null;
      dialog.current?.close();
      if (restoreFocus && trigger.current?.offsetParent) trigger.current.focus({ preventScroll: true });
    };
    if (immediate || reduced) {
      finish();
      return;
    }
    setClosing(true);
    closeTimer.current = setTimeout(finish, 200);
  }

  function openMenu() {
    if (!dialog.current || dialog.current.open) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setClosing(false);
    dialog.current.showModal();
    setOpen(true);
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`} data-app={app}>
        <div className="nav-inner">
          <Link href={app === 'website' ? '/' : site.urls.website} className="brand-link" aria-label="Void Client home">
            <Wordmark priority animated decorative />
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {links.map(link => (
              <Link key={link.label} href={link.href} className={`nav-link ${isCurrent(link.href) ? 'active' : ''}`} aria-current={isCurrent(link.href) ? 'page' : undefined}>
                {link.label}
                {isCurrent(link.href) && <motion.span className="nav-indicator" layoutId="nav-indicator" transition={{ duration: reduced ? 0 : .2 }} />}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            {app === 'store' && <Link className="icon-button" href={storeUrl('/cart')} aria-label="Shopping cart"><ShoppingBag size={18} /></Link>}
            <ThemeToggle />
            <Link href={accountUrl('/dashboard')} className="account-link" aria-label="Your Void account">
              <UserRound size={17} /><span>Account</span><ArrowUpRight size={14} />
            </Link>
            <button ref={trigger} className="icon-button menu-trigger" type="button" onClick={openMenu} aria-label="Open navigation menu" aria-expanded={open} aria-controls="mobile-navigation">
              <Menu size={23} />
            </button>
          </div>
        </div>
      </header>
      <dialog
        ref={dialog}
        id="mobile-navigation"
        className="mobile-dialog"
        data-closing={closing}
        aria-labelledby="mobile-menu-title"
        onCancel={event => { event.preventDefault(); closeMenu(); }}
        onClose={() => { setOpen(false); setClosing(false); }}
        onClick={event => { if (event.target === event.currentTarget) closeMenu(); }}
      >
        <div className="mobile-menu-panel">
          <div className="mobile-menu-top">
            <span id="mobile-menu-title"><Wordmark /></span>
            <button className="icon-button" type="button" aria-label="Close navigation menu" onClick={() => closeMenu()}><X size={23} /></button>
          </div>
          <nav aria-label="Mobile navigation">
            {links.map((link, index) => (
              <Link key={link.label} href={link.href} aria-current={isCurrent(link.href) ? 'page' : undefined} style={{ '--menu-index': index } as CSSProperties} onClick={() => closeMenu(true, false)}>
                {link.label}<ArrowUpRight size={18} />
              </Link>
            ))}
          </nav>
          <div className="mobile-menu-bottom">
            <div className="mobile-appearance"><span>Appearance</span><ThemeToggle /></div>
            <Link href={accountUrl('/dashboard')} onClick={() => closeMenu(true, false)}>Your Void account <UserRound size={17} /></Link>
            <p>PLAY BEYOND LIMITS.</p>
          </div>
        </div>
      </dialog>
    </>
  );
}
