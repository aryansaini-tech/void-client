import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { site, type AppName } from '@void/shared/config';
import { Wordmark } from './brand';

export function Footer({ app = 'website' }: { app?: AppName }) {
  const base = app === 'website' ? '' : site.urls.website;
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link href={`${site.urls.website}`} aria-label="Void Client home">
              <Wordmark />
            </Link>
            <p>A new perspective on Minecraft Bedrock.<br />Play beyond limits.</p>
            <span className="footer-coordinate">Built around the way you play.</span>
          </div>
          <div className="footer-group">
            <h2>Explore</h2>
            <Link href={`${base}/modules`}>Modules</Link>
            <Link href={`${base}/download`}>Download</Link>
            <Link href={`${base}/changelog`}>Changelog</Link>
            <Link href={`${base}/sneak-peeks`}>Sneak peeks</Link>
          </div>
          <div className="footer-group">
            <h2>Community</h2>
            <Link href={`${base}/discord`}>Discord <ArrowUpRight size={12} /></Link>
            <Link href={`${base}/partners`}>Partners</Link>
            <Link href={`${base}/about`}>About Void</Link>
            <Link href={`${base}/faq`}>Help & FAQ</Link>
          </div>
          <div className="footer-group">
            <h2>Your space</h2>
            <Link href={`${site.urls.account}/dashboard`}>Account <ArrowUpRight size={12} /></Link>
            <Link href={site.urls.store}>Store <ArrowUpRight size={12} /></Link>
            <Link href={`${site.urls.account}/security`}>Security</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getUTCFullYear()} Void Client</p>
          <p>Not affiliated with Mojang or Microsoft.</p>
          <div>
            {site.legal.privacy && <a href={site.legal.privacy}>Privacy</a>}
            {site.legal.terms && <a href={site.legal.terms}>Terms</a>}
            {site.legal.refund && <a href={site.legal.refund}>Refunds</a>}
          </div>
        </div>
        <div className="footer-giant" aria-hidden="true">BEYOND LIMITS.</div>
      </div>
    </footer>
  );
}
