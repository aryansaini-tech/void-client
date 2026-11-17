import Image from 'next/image';
import { VoidMark } from './brand';

export function Atmosphere({ variant = 'valley' }: { variant?: 'valley' | 'grove' | 'light' | 'highlands' }) {
  return <div className="page-atmosphere" data-landscape={variant} aria-hidden="true"><Image src={`/void/landscapes/river-${variant}.webp`} alt="" fill sizes="100vw" priority /><div /></div>;
}

/** The original mark, presented without scenery, geometry, or color filters. */
export function VoidScene({ className = '', animated = false }: { className?: string; animated?: boolean }) {
  return (
    <div className={`void-scene ${className}`} aria-hidden="true">
      <Image src="/void/landscapes/river-grove.webp" alt="" fill sizes="(max-width: 767px) 90vw, 40vw" />
      <div className="scene-atmosphere" />
      <div className="scene-brand">
        <VoidMark priority={animated} decorative animated={animated} />
      </div>
    </div>
  );
}
