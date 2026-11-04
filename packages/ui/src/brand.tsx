import Image from 'next/image';
import type { CSSProperties, SVGProps } from 'react';

export function MicrosoftIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}><path d="M1 1h8v8H1zm10 0h8v8h-8zM1 11h8v8H1zm10 0h8v8h-8z"/></svg>;
}

export type LogoProps = {
  className?: string;
  priority?: boolean;
  decorative?: boolean;
  animated?: boolean;
};

/**
 * The official source PNG assets are preserved byte-for-byte.
 * Exactly two instances receive animated={true}:
 * 1. Global navbar logo (via Wordmark animated={true})
 * 2. Homepage hero large official logo (via VoidScene animated={true})
 * All other instances remain completely static.
 */
function OfficialLogo({
  variant,
  className = '',
  priority = false,
  decorative = false,
  animated = false,
}: LogoProps & { variant: 'mark' | 'wordmark' }) {
  const src = `/brand/${variant === 'mark' ? 'logo.png' : 'void-logo.png'}`;
  return (
    <span
      className={`brand-asset brand-asset-${variant} ${animated ? 'brand-asset-animated' : 'brand-asset-static'} ${className}`}
      data-logo-animated={animated ? 'true' : 'false'}
      style={{ '--logo-mask': `url("${src}")` } as CSSProperties}
    >
      <Image
        src={src}
        alt={decorative ? '' : 'Void Client'}
        width={variant === 'mark' ? 450 : 1024}
        height={variant === 'mark' ? 450 : 341}
        priority={priority}
        unoptimized
        className="brand-image"
      />
      {animated && <span className="logo-sheen logo-sheen-sync" aria-hidden="true" />}
    </span>
  );
}

export function VoidMark(props: LogoProps) {
  return <OfficialLogo variant="mark" {...props} />;
}

/**
 * Official Void Client branding:
 * [Official V Logo Icon] VOID (Monocraft)
 *                        CLIENT (Monocraft, smaller)
 */
export function Wordmark({
  className = '',
  priority = false,
  decorative = false,
  animated = false,
}: LogoProps & { compact?: boolean }) {
  return (
    <span className={`wordmark ${className}`}>
      <VoidMark
        priority={priority}
        decorative
        animated={animated}
        className="wordmark-icon"
      />
      <span className="wordmark-text" aria-hidden="true">
        <span className="wordmark-title">VOID</span>
        <span className="wordmark-client">CLIENT</span>
      </span>
      {!decorative && <span className="sr-only">Void Client</span>}
    </span>
  );
}

export function BrandLoader() {
  return (
    <div role="status" className="page-loading">
      <VoidMark decorative className="loading-logo" />
      <span className="loading-line" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}

export function DiscordIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M19.7 5.2a18.2 18.2 0 0 0-4.4-1.4l-.6 1.1a16.1 16.1 0 0 0-5.4 0l-.6-1.1a18.5 18.5 0 0 0-4.4 1.4C1.5 9.4.8 13.5 1.2 17.5a18 18 0 0 0 5.4 2.7l1.1-1.8-1.7-.8.4-.3c3.6 1.6 7.6 1.6 11.2 0l.4.3-1.7.8 1.1 1.8a18 18 0 0 0 5.4-2.7c.5-4.7-.8-8.7-3.1-12.3ZM8.5 14.9c-1.1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2Zm7 0c-1.1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2Z"/>
    </svg>
  );
}
