import Link from 'next/link';
import { ArrowDownToLine, ArrowUpRight, ChevronRight, CircleDashed } from 'lucide-react';
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

/** Word masks retain one uninterrupted accessible heading. */
export function RevealText({ text }: { text: string }) {
  return <><span className="sr-only">{text}</span><span className="reveal-words" aria-hidden="true">{text.split(/\s+/).map((word, index) => <span className="reveal-word" key={`${word}-${index}`}><span style={{ '--word-delay': `${Math.min(index, 9) * 42}ms` } as CSSProperties}>{word}</span>{' '}</span>)}</span></>;
}

export function ButtonLink({ href, children, variant = 'primary', className = '', external = false, icon = 'arrow' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; className?: string; external?: boolean; icon?: 'arrow' | 'download' | 'chevron' | 'none' }) {
  const content = <><span>{children}</span>{icon === 'arrow' ? <ArrowUpRight size={17} /> : icon === 'download' ? <ArrowDownToLine size={17} /> : icon === 'chevron' ? <ChevronRight size={17} /> : null}</>;
  const classes = `button button-${variant} ${className}`;
  return external ? <a href={href} className={classes} target="_blank" rel="noopener noreferrer">{content}<span className="sr-only"> (opens in a new tab)</span></a> : <Link href={href} className={classes}>{content}</Link>;
}
export function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
export function Badge({ children, gold = false }: { children: ReactNode; gold?: boolean }) {
  return <span className={`badge ${gold ? 'badge-gold' : ''}`}>{gold && <span className="status-dot" />}{children}</span>;
}
export function PageIntro({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description: string; children?: ReactNode }) {
  return <header className="page-intro container"><div className="page-intro-light" aria-hidden="true" />{eyebrow && <p className="eyebrow" data-reveal><span />{eyebrow}</p>}<h1 className="display-heading" data-reveal="heading"><RevealText text={title}/></h1><p className="page-description" data-reveal>{description}</p>{children && <div className="intro-actions" data-reveal>{children}</div>}</header>;
}
export function EmptyState({ title, description, icon, children }: { title: string; description: string; icon?: ReactNode; children?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon" aria-hidden="true">{icon ?? <CircleDashed size={30} strokeWidth={1.2} />}</div><h2>{title}</h2><p>{description}</p>{children && <div className="empty-actions">{children}</div>}</div>;
}
export function SectionHeading({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return <div className="section-heading"><div><h2 data-reveal="heading"><RevealText text={title}/></h2>{description && <p data-reveal>{description}</p>}</div>{children}</div>;
}
export function Notice({ children }: { children: ReactNode }) {
  return <div className="notice"><CircleDashed size={18} aria-hidden="true" /><div>{children}</div></div>;
}
