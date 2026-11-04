import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { partners } from '@void/shared/content';
import { localMediaPath, publicUrl } from '@void/shared/urls';
import { PageIntro, Badge, ButtonLink } from '@void/ui/components';
import { CopyButton } from '@void/ui/interactive';
import { pageMeta } from '@/lib/metadata';

export const metadata = pageMeta('Partners', 'Discover the networks and communities connected with Void Client.', '/partners');

export default function PartnersPage() {
  return (
    <main id="main">
      <PageIntro
        eyebrow="In good company"
        title="Shared worlds. Shared ambition."
        description="Meet the communities alongside Void. A place for genuine connections and what we build together."
      />
      <section className="container content-body" aria-label="Void partners">
        <div className="partner-grid">
          {partners.map(partner => (
            <article className="partner-card" key={partner.id} data-reveal="card">
              <div className="partner-card-top">
                {partner.logo && localMediaPath(partner.logo) ? (
                  <Image src={partner.logo} alt={`${partner.name} logo`} width={66} height={66} />
                ) : (
                  <div className="zerix-symbol" aria-hidden="true">{partner.name[0]}</div>
                )}
                <Badge gold={partner.status !== 'pending'}>{partner.status === 'pending' ? 'Profile coming soon' : 'Partner'}</Badge>
              </div>
              <h2>{partner.name}</h2>
              <p>{partner.description ?? 'This partner profile is awaiting confirmed details. Official links and server information will appear here once supplied.'}</p>
              <div className="partner-links">
                {publicUrl(partner.website ?? '') && (
                  <a className="text-link" href={publicUrl(partner.website ?? '')} target="_blank" rel="noopener noreferrer">
                    Website <ArrowUpRight size={15} /><span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
                {publicUrl(partner.discord ?? '') && (
                  <a className="text-link" href={publicUrl(partner.discord ?? '')} target="_blank" rel="noopener noreferrer">
                    Discord <ArrowUpRight size={15} /><span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </div>
              {partner.serverAddress ? (
                <CopyButton value={partner.serverAddress} />
              ) : (
                <span className="field-hint">Server address not yet published</span>
              )}
            </article>
          ))}
        </div>
        <div className="community-banner">
          <div>
            <h2>Better, together.</h2>
            <p>Follow official community information for future partnership announcements.</p>
          </div>
          <ButtonLink href="/discord" variant="secondary">Visit the community</ButtonLink>
        </div>
      </section>
    </main>
  );
}
