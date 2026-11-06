'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Check, Copy, Search, X, ZoomIn } from 'lucide-react';
import { useHydrated } from './hydration';

export function SearchField({ value, onChange, placeholder = 'Search', label = 'Search' }: { value: string; onChange: (value: string) => void; placeholder?: string; label?: string }) {
  const hydrated = useHydrated();
  return <div className="search-field"><Search size={18} aria-hidden="true"/><input type="search" aria-label={label} placeholder={placeholder} value={value} disabled={!hydrated} onChange={event => onChange(event.target.value)} maxLength={120}/>{value && <button type="button" className="icon-button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => onChange('')}><X size={15}/></button>}</div>;
}
export function FilterBar({ options, value, onChange, label = 'Filter' }: { options: readonly string[]; value: string; onChange: (value: string) => void; label?: string }) {
  const hydrated = useHydrated();
  return <div className="filter-bar" role="group" aria-label={label}>{options.map(option => <button key={option} type="button" disabled={!hydrated} aria-pressed={option === value} onClick={() => onChange(option)} className={value === option ? 'selected' : ''}>{option}</button>)}</div>;
}
export function CopyButton({ value, label = 'Copy server address' }: { value: string; label?: string }) {
  const [status, setStatus] = useState('');
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setStatus('Copied to clipboard'); }
    catch { setStatus('Could not copy. Select and copy the address manually.'); }
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setStatus(''), 3500);
  }
  return <div className="copy-control"><button className="button button-secondary" onClick={copy} aria-label={label}><code>{value}</code>{status === 'Copied to clipboard' ? <Check size={16}/> : <Copy size={16}/>}</button><span className="copy-status" role="status">{status}</span></div>;
}
export function Accordion({ question, children }: { question: string; children: ReactNode }) {
  return <details className="accordion"><summary>{question}<span className="accordion-plus" aria-hidden="true"/></summary><div className="accordion-content">{children}</div></details>;
}
export type GalleryImage = { image: string; alt: string; name: string; description: string; status: string };
export function Gallery({ items }: { items: readonly GalleryImage[] }) {
  const [selected, setSelected] = useState<GalleryImage | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const isOpen = selected !== null;
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);
  const close = () => { dialog.current?.close(); setSelected(null); };
  const selectedIndex = selected ? items.findIndex(item => item.name === selected.name) : -1;
  const step = (offset: number) => { if (items.length > 1) setSelected(items[(selectedIndex + offset + items.length) % items.length] ?? null); };
  return <><div className="gallery-grid">{items.map((item, index) => <button type="button" className={`gallery-card ${index === 0 ? 'gallery-featured' : ''}`} key={item.name} onClick={event => { trigger.current = event.currentTarget; setSelected(item); }} aria-label={`Preview ${item.name}`}>
    <div className="gallery-image"><Image src={item.image} alt={item.alt} fill loading={index === 0 ? 'eager' : 'lazy'} sizes={index === 0 ? '(max-width: 767px) 100vw, 90vw' : '(max-width: 767px) 100vw, 45vw'}/><span className="gallery-zoom"><ZoomIn size={18}/></span><span className="image-label">{item.status}</span></div><div className="gallery-caption"><div><h2>{item.name}</h2><p>{item.description}</p></div><span>View preview</span></div>
  </button>)}</div>
  <dialog ref={dialog} className="lightbox" aria-labelledby="lightbox-title" aria-describedby="lightbox-description" onClose={() => { setSelected(null); trigger.current?.focus({ preventScroll: true }); }} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); } }}>
    {selected && <div className="lightbox-panel"><button type="button" className="icon-button lightbox-close" onClick={close} aria-label="Close preview"><X size={22}/></button><div className="lightbox-image"><Image src={selected.image} alt={selected.alt} fill sizes="90vw"/></div><div className="lightbox-caption"><div className="lightbox-meta"><span className="badge">{selected.status}</span><div className="lightbox-navigation" aria-label="Gallery controls"><button type="button" className="icon-button" aria-label="Previous preview" disabled={items.length < 2} onClick={() => step(-1)}><ArrowLeft size={19}/></button><span>{selectedIndex + 1} / {items.length}</span><button type="button" className="icon-button" aria-label="Next preview" disabled={items.length < 2} onClick={() => step(1)}><ArrowRight size={19}/></button></div></div><div aria-live="polite"><h2 id="lightbox-title">{selected.name}</h2><p id="lightbox-description">{selected.description}</p></div></div></div>}
  </dialog></>;
}
