import { useEffect, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const useMotionEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const HERO_PARTS = [
  "[data-hero-mark]",
  "[data-hero-title]",
  "[data-hero-copy]",
  "[data-hero-actions]",
  "[data-hero-meta]",
];
const SCROLL_MARKERS = "[data-scroll-reveal], [data-scroll-stagger], [data-scroll-art]";

function clearMotionProps(targets, properties = ["opacity", "visibility", "transform"]) {
  const unused = properties.filter((property) => {
    const cssName = property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    return targets.every((target) => !target.style.getPropertyValue(cssName));
  });
  return unused.length ? { clearProps: unused.join(",") } : {};
}

function overlapsHero(element, heroTargets) {
  return heroTargets.some((hero) => hero === element || hero.contains(element) || element.contains(hero));
}

function revealTargets(container, heroTargets) {
  if (!container.children.length) return overlapsHero(container, heroTargets) ? [] : [container];
  return Array.from(container.children).flatMap((child) => {
    if (child.matches(SCROLL_MARKERS) || overlapsHero(child, heroTargets)) return [];
    return child.querySelector(SCROLL_MARKERS) ? revealTargets(child, heroTargets) : [child];
  });
}

/**
 * Visible-at-rest hero and one-time scroll choreography, scoped to this route.
 * Reveal markers own unmarked content; stagger markers own direct children;
 * art markers own their visual. Nested markers do not inherit parent motion.
 */
export function usePageMotion(rootRef, routeKey) {
  useMotionEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const seen = new WeakSet();
    let heroPlayed = false;
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add(
        "(prefers-reduced-motion: no-preference)",
        (motionContext) => {
          const groups = HERO_PARTS.map((selector) =>
            Array.from(root.querySelectorAll(selector)),
          ).filter((targets) => targets.length > 0);
          const heroTargets = groups.flat();
          const records = Array.from(root.querySelectorAll(SCROLL_MARKERS)).flatMap((element) => {
            if (seen.has(element) || heroTargets.some((hero) => hero === element || hero.contains(element))) return [];
            const kind = element.hasAttribute("data-scroll-art") ? "art"
              : element.hasAttribute("data-scroll-stagger") ? "stagger" : "reveal";
            const targets = kind === "art" ? [element] : kind === "stagger"
              ? Array.from(element.children).filter((child) => !child.matches(SCROLL_MARKERS) && !child.querySelector(SCROLL_MARKERS) && !overlapsHero(child, heroTargets))
              : revealTargets(element, heroTargets);
            if (!targets.length) return [];
            return [{ element, kind, targets, canClip: kind === "art" && window.getComputedStyle(element).clipPath === "none" }];
          });

          if (!heroPlayed && groups.length) {
            heroPlayed = true;
            const entrance = gsap.timeline({ defaults: { duration: 0.5, ease: "expo.out" } });
            groups.forEach((targets, index) => {
              entrance.from(targets, { autoAlpha: 0, y: 12, ...clearMotionProps(targets) }, index * 0.04);
            });
          }
          if (!records.length) return;

          let active = true;
          let setupFrame = 0;
          let refreshFrame = 0;
          const fonts = document.fonts;
          const queueRefresh = () => {
            if (!active || refreshFrame) return;
            refreshFrame = window.requestAnimationFrame(() => {
              refreshFrame = 0;
              if (active && root.isConnected) ScrollTrigger.refresh();
            });
          };

          // Defer trigger measurements until the route's scroll reset commits.
          // Context.add records the later-created animations for full teardown.
          setupFrame = window.requestAnimationFrame(() => {
            setupFrame = 0;
            if (!active || !root.isConnected) return;
            motionContext.add(() => {
              gsap.registerPlugin(ScrollTrigger);
              records.forEach(({ element, kind, targets, canClip }) => {
                const timeline = gsap.timeline({
                  defaults: { ease: "expo.out" },
                  onStart: () => seen.add(element),
                  scrollTrigger: {
                    trigger: element,
                    start: kind === "art" ? "clamp(top 88%)" : kind === "stagger" ? "clamp(top 92%)" : "clamp(top 90%)",
                    end: "clamp(top 65%)",
                    once: true,
                    toggleActions: "play none none none",
                  },
                });
                if (kind === "art") {
                  timeline.from(targets, {
                    autoAlpha: 0, scale: 1.035, y: 12, duration: 0.7,
                    immediateRender: false, ...clearMotionProps(targets),
                  }, 0);
                  if (canClip) {
                    timeline.fromTo(element,
                      { clipPath: "inset(8% 0% 0% 0%)" },
                      { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, immediateRender: false, ...clearMotionProps(targets, ["clipPath"]) },
                      0,
                    );
                  }
                } else {
                  const stagger = Math.min(kind === "stagger" ? 0.04 : 0.06, (kind === "stagger" ? 0.28 : 0.18) / Math.max(1, targets.length - 1));
                  timeline.from(targets, {
                    autoAlpha: 0, y: kind === "stagger" ? 12 : 24,
                    duration: kind === "stagger" ? 0.5 : 0.6, stagger,
                    immediateRender: false, ...clearMotionProps(targets),
                  }, 0);
                }
              });
              queueRefresh();
            });
          });

          root.addEventListener("load", queueRefresh, true);
          root.addEventListener("error", queueRefresh, true);
          fonts?.addEventListener?.("loadingdone", queueRefresh);
          if (fonts?.ready) fonts.ready.then(queueRefresh).catch(() => {});

          return () => {
            active = false;
            window.cancelAnimationFrame(setupFrame);
            window.cancelAnimationFrame(refreshFrame);
            root.removeEventListener("load", queueRefresh, true);
            root.removeEventListener("error", queueRefresh, true);
            fonts?.removeEventListener?.("loadingdone", queueRefresh);
          };
        },
        root,
      );
    }, root);

    return () => {
      media.revert();
      context.revert();
    };
  }, [rootRef, routeKey]);
}
