'use client';
import { useState } from 'react';
import { ArrowDownToLine, Laptop, Monitor, Smartphone, Terminal } from 'lucide-react';
import { site } from '@void/shared/config';
import { Badge, ButtonLink } from '@void/ui/components';
import { FilterBar } from '@void/ui/interactive';

const icons = { monitor: Monitor, terminal: Terminal, laptop: Laptop, smartphone: Smartphone };
export function DownloadSelector() {
  const [platform, setPlatform] = useState('Windows');
  const selected = site.platforms.find(item => item.name === platform) ?? site.platforms[0];
  const Icon = icons[selected.icon];
  return <><FilterBar options={site.platforms.map(item => item.name)} value={platform} onChange={setPlatform} label="Download platform"/>
    <div className="download-layout"><section className="download-main" aria-live="polite"><div className="download-main-icon"><Icon size={27} strokeWidth={1.5}/></div><div className="download-heading"><h2>Void for {selected.name}</h2><Badge gold={Boolean(selected.url)}>{selected.url ? 'Download available' : 'Coming soon'}</Badge></div><p>{selected.url ? 'The official download for your selected platform. Read the release requirements before installing.' : `A verified ${selected.name} download has not been published yet. Follow the official release information for availability.`}</p><dl className="download-meta"><div><dt>Client version</dt><dd>{site.release.version ?? 'To be announced'}</dd></div><div><dt>Bedrock compatibility</dt><dd>See confirmed release requirements</dd></div></dl>{selected.url ? <ButtonLink href={selected.url} external icon="download">Download for {selected.name}</ButtonLink> : <button type="button" className="button button-secondary button-wide" disabled><ArrowDownToLine size={17}/>Download coming soon</button>}</section>
    <aside className="download-aside"><div className="info-card"><h2>Before you install</h2>{site.release.requirements.length ? <ul>{site.release.requirements.map(item => <li key={item}>{item}</li>)}</ul> : <p>Verified system requirements and supported Bedrock versions will be published with the release.</p>}<ButtonLink href="/faq" variant="ghost">Compatibility FAQ</ButtonLink></div><div className="info-card"><h2>Stay up to date</h2><p>Release notes are the source for new features, compatibility changes, and installation notices.</p><ButtonLink href="/changelog" variant="ghost">Read the changelog</ButtonLink></div></aside></div>
    <p className="platform-note">Platform selectors show availability, not confirmed platform support. Only enabled downloads link to published files.</p>
  </>;
}
