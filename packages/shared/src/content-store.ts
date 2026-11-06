'use client';

import { useSyncExternalStore } from 'react';
import { modules as defaultModules, changelog as defaultChangelog, showcase as defaultShowcase, type ClientModule, type ReleaseEntry } from './content';
import { site as defaultSite } from './config';

export type PageScreenshotItem = {
  id: string;
  name: string;
  path: string;
  image: string;
  alt: string;
  badge: string;
  description: string;
};

export type SiteContentState = {
  version: number;
  lastUpdated: string;
  discord: {
    url: string;
    badge: string;
    description: string;
  };
  pageScreenshots: Record<string, PageScreenshotItem>;
  modules: ClientModule[];
  sneakPeeks: Array<{
    id: string;
    name: string;
    title: string;
    description: string;
    image: string;
    alt: string;
    status: string;
  }>;
  changelog: ReleaseEntry[];
};

export const defaultPageScreenshots: Record<string, PageScreenshotItem> = {
  home: {
    id: 'home',
    name: 'Homepage Hero',
    path: '/',
    image: '/media/visual-concept.svg',
    alt: 'Void Client Hero Visual Concept',
    badge: 'Official Hero Artwork',
    description: 'The official Void logo, presented with open space and subtle atmospheric lighting.',
  },
  modules: {
    id: 'modules',
    name: 'Modules ClickGUI',
    path: '/modules',
    image: '/media/interface-concept.svg',
    alt: 'Void Client ClickGUI Module Interface',
    badge: 'ClickGUI Concept',
    description: 'Charcoal interface concept with an open module list and restrained champagne accents.',
  },
  download: {
    id: 'download',
    name: 'Download Showcase',
    path: '/download',
    image: '/media/hud-concept.svg',
    alt: 'Void Client In-Game HUD & Installation',
    badge: 'Bedrock Client Preview',
    description: 'Clean HUD heads-up display and installation instructions.',
  },
  discord: {
    id: 'discord',
    name: 'Discord Community',
    path: '/discord',
    image: '/media/landscape.svg',
    alt: 'Void Community Voxel Landscape',
    badge: 'Community Atmosphere',
    description: 'Voxel landscape representing the thriving Void player collective.',
  },
  'sneak-peeks': {
    id: 'sneak-peeks',
    name: 'Sneak Peeks Gallery',
    path: '/sneak-peeks',
    image: '/media/settings-concept.svg',
    alt: 'Void Client Settings & GUI Study',
    badge: 'Design Study',
    description: 'In-depth sneak peek of upcoming client features and interface layouts.',
  },
  changelog: {
    id: 'changelog',
    name: 'Changelog Timeline',
    path: '/changelog',
    image: '/media/visual-concept.svg',
    alt: 'Release Development Notes',
    badge: 'Release Timeline',
    description: 'Chronological roadmap of client updates and performance patches.',
  },
  partners: {
    id: 'partners',
    name: 'Partners Spotlight',
    path: '/partners',
    image: '/media/partners/zerix.webp',
    alt: 'Zerix Network Partnership',
    badge: 'Partner Network',
    description: 'Featured partner network servers and affiliated communities.',
  },
  about: {
    id: 'about',
    name: 'About Manifesto',
    path: '/about',
    image: '/media/landscape.svg',
    alt: 'Void Client Bedrock Manifesto',
    badge: 'Bedrock Identity',
    description: 'The philosophy and architectural vision behind Void Client.',
  },
};

export const defaultSiteContent: SiteContentState = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  discord: {
    url: defaultSite.discordInvite || 'https://discord.gg/voidclient',
    badge: 'Active Bedrock Collective',
    description: 'Join thousands of Bedrock enthusiasts, share presets, and get release notifications.',
  },
  pageScreenshots: defaultPageScreenshots,
  modules: defaultModules,
  sneakPeeks: Array.from(defaultShowcase),
  changelog: defaultChangelog,
};

const STORAGE_KEY = 'void_admin_site_content';
const EVENT_NAME = 'void:content-updated';

let memoryCache: SiteContentState | null = null;

export function loadSiteContent(): SiteContentState {
  if (typeof window === 'undefined') {
    return defaultSiteContent;
  }

  if (memoryCache) {
    return memoryCache;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryCache = defaultSiteContent;
      return defaultSiteContent;
    }
    const parsed = JSON.parse(raw);
    memoryCache = {
      ...defaultSiteContent,
      ...parsed,
      pageScreenshots: { ...defaultPageScreenshots, ...(parsed.pageScreenshots || {}) },
      discord: { ...defaultSiteContent.discord, ...(parsed.discord || {}) },
    };
    return memoryCache!;
  } catch {
    memoryCache = defaultSiteContent;
    return defaultSiteContent;
  }
}

export function saveSiteContent(updates: Partial<SiteContentState>): SiteContentState {
  const current = loadSiteContent();
  const next: SiteContentState = {
    ...current,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };
  memoryCache = next;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch {
      /* Quota or storage restriction */
    }
  }

  return next;
}

export function resetSiteContent(): SiteContentState {
  memoryCache = defaultSiteContent;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch {
      /* Ignore */
    }
  }
  return defaultSiteContent;
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useLiveSiteContent(): SiteContentState {
  return useSyncExternalStore(subscribe, loadSiteContent, () => defaultSiteContent);
}

