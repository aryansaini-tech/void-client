'use client';

import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MotionConfig } from 'framer-motion';

const preferenceEvent = 'void:motion-preference';
const preferenceContext = createContext(false);
const revealSelector = '[data-reveal]';
let sessionPreference: boolean | undefined;

function savedReducedMotion() {
  try {
    return localStorage.getItem('void-reduced-motion') === 'true';
  } catch {
    return false;
  }
}

function motionSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || (sessionPreference ?? savedReducedMotion());
}

function subscribeMotion(update: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== 'void-reduced-motion') return;
    sessionPreference = undefined;
    update();
  };
  media.addEventListener('change', update);
  window.addEventListener('storage', storage);
  window.addEventListener(preferenceEvent, update);
  return () => {
    media.removeEventListener('change', update);
    window.removeEventListener('storage', storage);
    window.removeEventListener(preferenceEvent, update);
  };
}

export function setMotionPreference(reduced: boolean) {
  sessionPreference = reduced;
  try {
    localStorage.setItem('void-reduced-motion', String(reduced));
  } catch {
    // The preference still works for this session when storage is unavailable.
  }
  window.dispatchEvent(new Event(preferenceEvent));
}

export function useMotionPreference() {
  return useContext(preferenceContext);
}

export function MotionRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useSyncExternalStore(subscribeMotion, motionSnapshot, () => false);

  useEffect(() => {
    const currentPreference = motionSnapshot();
    document.documentElement.dataset.reducedMotion = String(currentPreference);
    if (currentPreference || !('IntersectionObserver' in window)) return;

    const elements = new Set<HTMLElement>();
    const animations = new Map<HTMLElement, Animation>();
    let frame = 0;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const element = entry.target as HTMLElement;
        // A large scroll jump should show its destination immediately.
        if (entry.boundingClientRect.top < window.innerHeight * .2 || element.contains(document.activeElement)) continue;
        const mobile = window.matchMedia('(max-width: 767px)').matches;
        const direction = element.dataset.reveal;
        const from = mobile ? '0 12px' : direction === 'left' ? '-16px 0' : direction === 'right' ? '16px 0' : direction === 'heading' ? '0 10px' : '0 18px';
        // WAAPI doesn't mutate React-owned attributes during streamed hydration.
        const keyframes = direction === 'heading'
          ? [{ opacity: 0, translate: from, clipPath: 'inset(0 0 70% 0)' }, { opacity: 1, translate: '0 0', clipPath: 'inset(0 0 0 0)' }]
          : [{ opacity: 0, translate: from }, { opacity: 1, translate: '0 0' }];
        const animation = element.animate(keyframes, {
          duration: mobile ? 320 : 480,
          easing: 'cubic-bezier(.22, 1, .36, 1)',
        });
        animation.id = 'void-reveal';
        animations.set(element, animation);
        animation.onfinish = () => { animations.delete(element); };
      }
    }, { threshold: 0, rootMargin: '0px 0px 64px 0px' });

    const scan = () => {
      frame = 0;
      const content = document.querySelector('main');
      if (!content) return;
      for (const element of elements) {
        if (!element.isConnected) {
          observer.unobserve(element);
          animations.get(element)?.cancel();
          animations.delete(element);
          elements.delete(element);
        }
      }

      // Measure first, then write. Content already on screen never disappears
      // during hydration, restored scrolling, filtering, or back navigation.
      const candidates = Array.from(content.querySelectorAll<HTMLElement>(revealSelector))
        .filter(element => !elements.has(element)
          && !element.closest('dialog')
          && !element.parentElement?.closest(revealSelector));
      const measurements = candidates.map(element => ({
        element,
        bounds: element.getBoundingClientRect(),
      }));

      for (const { element, bounds } of measurements) {
        if (bounds.height === 0) continue;
        elements.add(element);
        if (bounds.top >= window.innerHeight + 64 && !element.contains(document.activeElement)) {
          observer.observe(element);
        }
      }
    };

    const updates = new MutationObserver(records => {
      if (!frame && records.some(record => record.addedNodes.length || record.removedNodes.length)) {
        frame = requestAnimationFrame(scan);
      }
    });
    const focus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      for (const element of elements) {
        if (!element.contains(event.target)) continue;
        animations.get(element)?.cancel();
        animations.delete(element);
        observer.unobserve(element);
      }
    };

    frame = requestAnimationFrame(scan);
    // App Router can replace <main> after this effect starts during a transition.
    updates.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('focusin', focus);
    return () => {
      cancelAnimationFrame(frame);
      updates.disconnect();
      observer.disconnect();
      document.removeEventListener('focusin', focus);
      animations.forEach(animation => animation.cancel());
    };
  }, [pathname, reduced]);

  useEffect(() => {
    const logos = document.querySelectorAll<HTMLElement>('[data-logo-animated="true"]');
    const activate = (element: HTMLElement, visible: boolean) => {
      // Apply the phase to a real element; pseudo-elements cannot be queried.
      if (visible) element.style.setProperty('--logo-phase', `${-(performance.now() % 5200)}ms`);
      element.dataset.logoActive = String(visible);
    };
    const visibility = () => {
      document.documentElement.dataset.pageHidden = String(document.hidden);
      if (!document.hidden) {
        logos.forEach(element => {
          if (element.dataset.logoActive === 'true') activate(element, true);
        });
      }
    };
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(entries => {
        entries.forEach(entry => activate(entry.target as HTMLElement, entry.isIntersecting));
      })
      : null;

    logos.forEach(element => {
      if (observer) observer.observe(element);
      else activate(element, true);
    });
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      logos.forEach(element => {
        delete element.dataset.logoActive;
        element.style.removeProperty('--logo-phase');
      });
    };
  }, [pathname, reduced]);

  return (
    <preferenceContext.Provider value={reduced}>
      <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
        <ScrollEffects />
        {children}
      </MotionConfig>
    </preferenceContext.Provider>
  );
}

type DepthItem = {
  element: HTMLElement;
  section: HTMLElement;
  kind: 'hero' | 'showcase' | 'orbit';
  current: number;
  target: number;
  top: number;
  height: number;
  painted: number;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Native scrolling, one scheduled frame, and no React renders on scroll. */
function ScrollEffects() {
  const bar = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();
  const reduced = useMotionPreference();

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 960px) and (pointer: fine)');
    let items: DepthItem[] = [];
    let frame = 0;
    let dirty = true;
    let layoutDirty = true;
    let viewport = 0;
    let distance = 0;
    let lastTime = 0;

    const paint = (time: number) => {
      frame = 0;
      if (document.hidden) return;
      const elapsed = Math.min(64, lastTime ? time - lastTime : 16);
      lastTime = time;

      if (dirty) {
        const scroll = window.scrollY;
        // Layout is measured only after a resize/content change, never per scroll.
        if (layoutDirty) {
          viewport = window.innerHeight;
          distance = document.documentElement.scrollHeight - viewport;
          for (const item of items) {
            const bounds = item.section.getBoundingClientRect();
            item.top = bounds.top + scroll;
            item.height = bounds.height;
          }
          layoutDirty = false;
        }
        const progress = distance > 0 ? clamp(scroll / distance) : 0;
        for (const item of items) {
          const top = item.top - scroll;
          item.target = item.kind === 'hero'
            ? clamp(-top / Math.max(1, item.height))
            : item.kind === 'showcase'
              ? clamp((viewport * .92 - top) / (viewport * .62))
              : clamp((viewport - top) / (viewport + item.height));
          if (!Number.isFinite(item.current)) item.current = item.target;
        }
        if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
        dirty = false;
      }

      let moving = false;
      for (const item of items) {
        const difference = item.target - item.current;
        item.current = Math.abs(difference) < .001
          ? item.target
          : item.current + difference * (1 - Math.exp(-elapsed / 45));
        moving ||= Math.abs(item.target - item.current) >= .001;
        const progress = item.current;
        if (progress === item.painted) continue;
        item.painted = progress;
        item.element.style.transform = item.kind === 'hero'
          ? `translate3d(0, ${-38 * progress}px, 0)`
          : item.kind === 'showcase'
            ? `perspective(1400px) translate3d(0, ${24 * (1 - progress)}px, 0) rotateX(${2 * (1 - progress)}deg) scale(${.98 + .02 * progress})`
            : `rotate(${-5 + 10 * progress}deg)`;
      }
      if (moving) frame = requestAnimationFrame(paint);
    };

    const schedule = () => {
      dirty = true;
      if (!frame && !document.hidden) frame = requestAnimationFrame(paint);
    };
    const measure = () => { layoutDirty = true; schedule(); };
    const configure = () => {
      items.forEach(item => item.element.style.removeProperty('transform'));
      items = [];
      if (!reduced && !motionSnapshot() && desktop.matches) {
        const selectors = [
          ['.hero-art', 'hero'],
          ['[data-showcase-frame]', 'showcase'],
          ['[data-community-orbit]', 'orbit'],
        ] as const;
        for (const [selector, kind] of selectors) {
          document.querySelectorAll<HTMLElement>(selector).forEach(element => {
            const section = element.closest<HTMLElement>('section');
            if (section) items.push({ element, section, kind, current: NaN, target: 0, top: 0, height: 0, painted: NaN });
          });
        }
      }
      measure();
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      if (!document.hidden) schedule();
    };

    configure();
    const resize = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
    resize?.observe(document.body);
    items.forEach(item => resize?.observe(item.section));
    const contentChanges = new MutationObserver(records => {
      if (records.some(record => record.addedNodes.length || record.removedNodes.length)) configure();
    });
    contentChanges.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    desktop.addEventListener('change', configure);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      contentChanges.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', measure);
      desktop.removeEventListener('change', configure);
      document.removeEventListener('visibilitychange', visibility);
      items.forEach(item => item.element.style.removeProperty('transform'));
    };
  }, [pathname, reduced]);

  return <div className="scroll-progress" aria-hidden="true"><span ref={bar} /></div>;
}

export function Magnetic({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useMotionPreference();

  useEffect(() => {
    const element = ref.current;
    if (!element || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let frame = 0;
    let bounds: DOMRect | null = null;
    const enter = () => { bounds = element.getBoundingClientRect(); };
    const move = (event: PointerEvent) => {
      if (!bounds) return;
      const x = Math.max(-4, Math.min(4, (event.clientX - bounds.left - bounds.width / 2) * .06));
      const y = Math.max(-3, Math.min(3, (event.clientY - bounds.top - bounds.height / 2) * .1));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { element.style.transform = `translate3d(${x}px,${y}px,0)`; });
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      bounds = null;
      element.style.removeProperty('transform');
    };
    element.addEventListener('pointerenter', enter);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerleave', reset);
    element.addEventListener('pointercancel', reset);
    return () => {
      reset();
      element.removeEventListener('pointerenter', enter);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', reset);
      element.removeEventListener('pointercancel', reset);
    };
  }, [reduced]);

  return <div ref={ref} className="magnetic">{children}</div>;
}

/** Move only the ambient light: the official logo keeps its original geometry. */
export function AmbientLight({ children, className = '', label }: { children: ReactNode; className?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useMotionPreference();

  useEffect(() => {
    const element = ref.current;
    if (!element || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let frame = 0;
    let bounds: DOMRect | null = null;
    const enter = () => { bounds = element.getBoundingClientRect(); };
    const move = (event: PointerEvent) => {
      if (!bounds) return;
      const x = Math.max(-20, Math.min(20, (event.clientX - bounds.left - bounds.width / 2) * .055));
      const y = Math.max(-16, Math.min(16, (event.clientY - bounds.top - bounds.height / 2) * .055));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty('--light-x', `${x}px`);
        element.style.setProperty('--light-y', `${y}px`);
      });
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      bounds = null;
      element.style.removeProperty('--light-x');
      element.style.removeProperty('--light-y');
    };
    element.addEventListener('pointerenter', enter);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerleave', reset);
    element.addEventListener('pointercancel', reset);
    return () => {
      reset();
      element.removeEventListener('pointerenter', enter);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', reset);
      element.removeEventListener('pointercancel', reset);
    };
  }, [reduced]);

  return <div ref={ref} className={className} role="img" aria-label={label}>{children}</div>;
}
