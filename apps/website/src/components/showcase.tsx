'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useMotionPreference } from '@void/ui/motion';
import { useLiveSiteContent } from '@void/shared/content-store';
import { Badge } from '@void/ui/components';

export function ClientShowcase() {
  const content = useLiveSiteContent();
  const showcase = content.sneakPeeks && content.sneakPeeks.length > 0 ? content.sneakPeeks : [];
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const reduced = useMotionPreference();
  const selectedIndex = active < showcase.length ? active : 0;
  const selected = showcase[selectedIndex] ?? showcase[0];

  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (showcase.length === 0) return;
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % showcase.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + showcase.length) % showcase.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = showcase.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  }

  if (!selected) {
    return null;
  }

  return (
    <>
      <div className="showcase-toolbar">
        <div className="showcase-tabs" role="tablist" aria-label="Client visual concepts">
          {showcase.map((item, index) => (
            <button
              key={item.id}
              ref={(element) => { buttons.current[index] = element; }}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-controls={`panel-${item.id}`}
              aria-selected={selectedIndex === index}
              tabIndex={selectedIndex === index ? 0 : -1}
              onKeyDown={(event) => keyboard(event, index)}
              onClick={() => setActive(index)}
            >
              {selectedIndex === index && (
                <motion.span
                  className="tab-background"
                  layoutId="showcase-tab"
                  transition={{ duration: reduced ? 0 : 0.25 }}
                />
              )}
              <span>{item.name}</span>
            </button>
          ))}
        </div>
        <Badge>Design concepts</Badge>
      </div>
      <div className="showcase-frame" data-showcase-frame>
        <div
          className="showcase-visual"
          role="tabpanel"
          id={`panel-${selected.id}`}
          aria-labelledby={`tab-${selected.id}`}
          tabIndex={0}
        >
          <AnimatePresence initial={false} mode="sync">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <div className="showcase-image-layer">
                <Image
                  src={selected.image}
                  alt={selected.alt}
                  fill
                  sizes="(max-width: 767px) 100vw, (max-width: 1440px) 90vw, 1240px"
                />
              </div>
              <span className="image-label">{selected.status} · Visual Preview</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="showcase-caption" aria-live="polite">
        <div>
          <h3>{selected.title}</h3>
          <p><span className="showcase-status">{selected.status}.</span> {selected.description}</p>
        </div>
        <span className="showcase-counter">
          <b>0{selectedIndex + 1}</b> / 0{showcase.length}
        </span>
      </div>
    </>
  );
}
