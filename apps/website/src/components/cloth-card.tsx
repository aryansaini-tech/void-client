'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { useMotionPreference } from '@void/ui/motion';

type Cloth = { destroy: () => void; suspend: () => void; wake: () => void; setEdge: (value: number) => void };
type ClothWindow = Window & { createVoidCloth?: (canvas: HTMLCanvasElement, plate: () => HTMLCanvasElement, options: Record<string, unknown>) => Cloth | null };
let runtime: Promise<void> | undefined;
const clothMedia = '(min-width: 768px) and (hover: hover) and (pointer: fine)';
function subscribeClothQuality(update: () => void) {
  const media = window.matchMedia(clothMedia);
  media.addEventListener('change', update);
  return () => media.removeEventListener('change', update);
}
const clothQuality = () => window.matchMedia(clothMedia).matches;
const serverClothQuality = () => false;
function loadCloth() {
  return runtime ??= new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = '/void/cloth-runtime.js'; script.async = true;
    script.onload = () => resolve(); script.onerror = () => { runtime = undefined; script.remove(); reject(new Error('Cloth unavailable')); };
    document.head.append(script);
  });
}

export function ClothCard({ href, image, title, description, label }: { href: string; image: string; title: string; description: string; label: string }) {
  const surface = useRef<HTMLDivElement>(null);
  const reduced = useMotionPreference();
  const interactive = useSyncExternalStore(subscribeClothQuality, clothQuality, serverClothQuality);
  useEffect(() => {
    const element = surface.current;
    if (!element || reduced || !interactive) return;
    let disposed = false;
    let instance: Cloth | null | undefined;
    let canvas: HTMLCanvasElement | undefined;
    const start = async () => {
      try {
        await loadCloth();
        const bitmap = new window.Image(); bitmap.src = image; await bitmap.decode();
        if (disposed) return;
        canvas = document.createElement('canvas'); canvas.className = 'cloth-canvas'; element.append(canvas);
        const plate = () => {
          const result = document.createElement('canvas'); result.width = Math.round(element.clientWidth * 1.5); result.height = Math.round(element.clientHeight * 1.5);
          const ctx = result.getContext('2d')!;
          const scale = Math.max(result.width / bitmap.width, result.height / bitmap.height);
          ctx.drawImage(bitmap, (result.width - bitmap.width * scale) / 2, (result.height - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale);
          const shade = ctx.createLinearGradient(0, 0, 0, result.height); shade.addColorStop(.25, '#10251f00'); shade.addColorStop(1, '#10251fcc');
          ctx.fillStyle = shade; ctx.fillRect(0, 0, result.width, result.height); return result;
        };
        instance = (window as ClothWindow).createVoidCloth?.(canvas, plate, { wind: .8, amplitude: 12, drape: 14, brush: .8, cornerRadius: 22 });
        if (instance) element.dataset.cloth = 'active'; else canvas.remove();
      } catch { canvas?.remove(); }
    };
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); void start(); } }, { rootMargin: '160px' });
    observer.observe(element);
    const lost = (event: Event) => { if (event.target !== canvas) return; event.preventDefault(); instance?.suspend(); delete element.dataset.cloth; };
    const restored = () => { delete element.dataset.cloth; instance?.destroy(); instance = null; canvas?.remove(); canvas = undefined; void start(); };
    element.addEventListener('webglcontextlost', lost, true); element.addEventListener('webglcontextrestored', restored, true);
    return () => { disposed = true; observer.disconnect(); element.removeEventListener('webglcontextlost', lost, true); element.removeEventListener('webglcontextrestored', restored, true); instance?.destroy(); canvas?.remove(); delete element.dataset.cloth; };
  }, [image, reduced, interactive]);
  return <Link href={href} className="landscape-card" data-reveal="card">
    <div className="cloth-surface" ref={surface}>
      <Image className="cloth-still" src={image} alt="" fill sizes="(max-width: 767px) 90vw, 33vw" />
      <div className="cloth-scrim" />
      <div className="landscape-card-copy"><span className="mono-label">{label}</span><h3>{title}</h3><p>{description}</p><span className="card-open"><ArrowUpRight size={20} /></span></div>
    </div>
  </Link>;
}
