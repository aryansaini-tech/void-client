import { VoidMark } from './brand';

/** The original mark, presented without scenery, geometry, or color filters. */
export function VoidScene({ className = '', animated = false }: { className?: string; animated?: boolean }) {
  return (
    <div className={`void-scene ${className}`} aria-hidden="true">
      <div className="scene-atmosphere" />
      <div className="scene-floor-light" />
      <div className="scene-brand">
        <VoidMark priority={animated} decorative animated={animated} />
      </div>
    </div>
  );
}
