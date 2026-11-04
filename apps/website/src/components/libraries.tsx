'use client';

import { useState } from 'react';
import { Blocks, Crosshair, Eye, Layers, Move, Newspaper, Settings2, Shield, Sparkles, type LucideIcon } from 'lucide-react';
import { useLiveSiteContent } from '@void/shared/content-store';
import { faqs } from '@void/shared/content';
import { Badge, ButtonLink, EmptyState } from '@void/ui/components';
import { Accordion, FilterBar, SearchField } from '@void/ui/interactive';

const moduleIcons: Record<string, LucideIcon> = {
  crosshair: Crosshair,
  eye: Eye,
  settings: Settings2,
  layers: Layers,
  move: Move,
  shield: Shield,
  sparkles: Sparkles,
};

export function ModuleLibrary() {
  const content = useLiveSiteContent();
  const modulesList = content.modules || [];
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  
  const categories = ['All', ...new Set(modulesList.map(item => item.category))];
  const filtered = modulesList.filter(item => 
    (category === 'All' || item.category === category) &&
    `${item.name} ${item.description}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <>
      <div className="library-toolbar">
        <SearchField label="Search modules" placeholder="Find your next module…" value={search} onChange={setSearch}/>
        <FilterBar options={categories} value={category} onChange={setCategory} label="Module categories"/>
      </div>
      <p className="results-count" role="status">
        {filtered.length} confirmed {filtered.length === 1 ? 'module' : 'modules'}
      </p>
      {filtered.length ? (
        <div className="module-grid">
          {filtered.map(item => {
            const Icon = moduleIcons[item.icon] || Settings2;
            return (
              <article className="module-card" key={item.id} data-reveal="card">
                <Icon size={26}/>
                <span className="product-category">{item.category}</span>
                <h2>{item.name}</h2>
                <p>{item.description}</p>
                <Badge gold={item.availability === 'available'}>
                  {item.availability === 'available' ? 'Available' : 'Coming soon'}
                </Badge>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Blocks size={29} strokeWidth={1.2}/>}
          title={search ? 'No matching modules.' : 'Something worth waiting for.'}
          description={search ? 'Try a different search, or clear your filters.' : 'The module library is taking shape. Verified names, capabilities, and release availability will appear here when they are published.'}
        >
          {search ? (
            <button className="button button-secondary" onClick={() => { setSearch(''); setCategory('All'); }}>Clear filters</button>
          ) : (
            <ButtonLink href="/changelog" variant="secondary">Follow release updates</ButtonLink>
          )}
        </EmptyState>
      )}
    </>
  );
}

const releaseLabels = { All: null, 'Major updates': 'major', 'Minor updates': 'minor', 'Bug fixes': 'fix' } as const;

export function ChangelogLibrary() {
  const content = useLiveSiteContent();
  const changelogList = content.changelog || [];
  const [filter, setFilter] = useState('All');
  const kind = releaseLabels[filter as keyof typeof releaseLabels];
  const entries = changelogList.filter(entry => !kind || kind === entry.kind);

  return (
    <>
      <div className="library-toolbar">
        <FilterBar options={Object.keys(releaseLabels)} value={filter} onChange={setFilter} label="Release types"/>
      </div>
      {entries.length ? (
        <div className="timeline">
          {entries.map(entry => (
            <article className="timeline-entry" key={entry.id} data-reveal="card">
              <div className="timeline-entry-header">
                <Badge gold>{entry.version}</Badge>
                <time dateTime={entry.date}>
                  {new Date(entry.date).toLocaleDateString('en', { year:'numeric', month:'long', day:'numeric', timeZone:'UTC' })}
                </time>
              </div>
              <h2>{entry.title}</h2>
              {([
                ['New features', entry.features],
                ['Improvements', entry.improvements],
                ['Bug fixes', entry.fixes],
                ['Notices', entry.notices]
              ] as const).map(([label, items]) => items && items.length > 0 && (
                <div key={label}>
                  <h3>{label}</h3>
                  <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>
                </div>
              ))}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={filter === 'All' ? 'Every chapter starts somewhere.' : 'No updates in this category.'}
          description="Official release notes will appear here once a release is published."
          icon={<Newspaper size={28} strokeWidth={1.2}/>}
        >
          <ButtonLink href="/sneak-peeks" variant="secondary">Explore sneak peeks</ButtonLink>
        </EmptyState>
      )}
    </>
  );
}

export function FAQLibrary() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const filtered = faqs.filter(item => 
    (category === 'All' || category === item.category) &&
    `${item.question} ${item.answer}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="faq-layout">
      <aside className="faq-sidebar">
        <SearchField label="Search questions" placeholder="Find an answer…" value={search} onChange={setSearch}/>
        <FilterBar options={['All','General','Installation','Compatibility','Downloads','Support']} value={category} onChange={setCategory} label="Question categories"/>
      </aside>
      <div>
        <p className="results-count" role="status">
          {filtered.length} {filtered.length === 1 ? 'answer' : 'answers'}
        </p>
        {filtered.length ? (
          filtered.map(item => (
            <Accordion key={item.id} question={item.question}>{item.answer}</Accordion>
          ))
        ) : (
          <EmptyState title="Let’s try another search." description="No answers match these filters. Try a shorter phrase or choose another category.">
            <button className="button button-secondary" onClick={() => { setSearch(''); setCategory('All'); }}>Clear filters</button>
          </EmptyState>
        )}
      </div>
    </div>
  );
}
