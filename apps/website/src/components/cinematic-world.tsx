'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { useMotionPreference } from '@void/ui/motion';

type SceneControl = {
  setChapter: (value: number) => void;
  setPointer: (x: number, y: number) => void;
  setActive: (active: boolean) => void;
  dispose: () => void;
};
type SceneWindow = Window & { __voidScene?: SceneControl };

function subscribeQuality(update: () => void) {
  const media = window.matchMedia('(max-width: 767px), (hover: none)');
  media.addEventListener('change', update);
  return () => media.removeEventListener('change', update);
}
function sceneSource(reduced: boolean) {
  const query = new URLSearchParams();
  if (reduced) query.set('reduce', '1');
  if (window.matchMedia('(max-width: 767px), (hover: none)').matches) {
    query.set('q', 'low'); query.set('dpr', '1.25');
  }
  if (new URLSearchParams(window.location.search).get('nogl') === '1') query.set('nogl', '1');
  return `/void/scene.html?${query}`;
}

/** HTML content and the fallback arrive first. The reference renderer owns its canvas. */
export function CinematicWorld() {
  const frame = useRef<HTMLIFrameElement>(null);
  // Ref cleanup runs before React detaches the iframe, while its window is accessible.
  const attachFrame = useCallback((element: HTMLIFrameElement | null) => {
    frame.current = element;
    if (!element) return;
    return () => {
      try { (element.contentWindow as SceneWindow | null)?.__voidScene?.dispose(); }
      catch { /* An uninitialized frame can still have an opaque origin. */ }
      frame.current = null;
    };
  }, []);
  const reduced = useMotionPreference();
  const source = useSyncExternalStore(subscribeQuality, () => sceneSource(reduced), () => undefined);

  useEffect(() => {
    if (!source) return;
    const element = frame.current;
    const page = document.querySelector<HTMLElement>('.cinematic-home');
    if (!element || !page) return;
    let pending = 0;
    let anchors: number[] = [];
    let max = 1;
    const scene = () => {
      try { return (element.contentWindow as SceneWindow | null)?.__voidScene; }
      catch { return undefined; } // A newly inserted sandbox frame starts with an opaque origin.
    };
    const chapters = Array.from(page.querySelectorAll<HTMLElement>('[data-camera]'));
    const update = () => {
      pending = 0;
      const y = window.scrollY;
      let progress = 0;
      for (let i = 0; i < anchors.length - 1; i++) {
        const from = anchors[i]!, to = anchors[i + 1]!;
        if (y >= from) progress = i + Math.min(1, (y - from) / (to - from));
      }
      scene()?.setChapter(progress);
      scene()?.setActive(y < page.offsetTop + page.offsetHeight && !document.hidden);
      page.style.setProperty('--hero-exit', String(Math.min(1, y / Math.max(1, window.innerHeight * .75))));
      page.style.setProperty('--journey-progress', String(Math.min(1, y / max)));
      page.querySelectorAll<HTMLElement>('.journey-rail a').forEach((link, i) => {
        link.dataset.active = String(i === Math.round(progress));
      });
    };
    const schedule = () => { if (!pending) pending = requestAnimationFrame(update); };
    const measure = () => {
      max = Math.max(1, page.offsetTop + page.offsetHeight - window.innerHeight);
      anchors = chapters.map((chapter, i) => i === 0 ? 0 : Math.max(0, chapter.getBoundingClientRect().top + window.scrollY + chapter.offsetHeight * .35 - window.innerHeight * .35));
      for (let i = 1; i < anchors.length; i++) anchors[i] = Math.max(anchors[i]!, anchors[i - 1]! + 1);
      schedule();
    };
    const pointer = (event: PointerEvent) => {
      if (!reduced && event.pointerType === 'mouse') scene()?.setPointer(event.clientX / window.innerWidth * 2 - 1, 1 - event.clientY / window.innerHeight * 2);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(page); chapters.forEach(chapter => resize.observe(chapter));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('pointermove', pointer, { passive: true });
    document.addEventListener('visibilitychange', schedule);
    element.addEventListener('load', measure);
    measure();
    return () => {
      cancelAnimationFrame(pending); resize.disconnect();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', measure);
      window.removeEventListener('pointermove', pointer); document.removeEventListener('visibilitychange', schedule);
      element.removeEventListener('load', measure); scene()?.dispose();
    };
  }, [source, reduced]);

  return <div className="cinematic-world" aria-hidden="true">
    <Image className="world-still" src="/void/landscapes/river-valley.webp" alt="" fill priority sizes="100vw" />
    {source && <iframe key={source} ref={attachFrame} src={source} title="Void Client cinematic landscape" tabIndex={-1} sandbox="allow-scripts allow-same-origin" />}
    <div className="world-grain" />
  </div>;
}
