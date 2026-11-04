import { publicUrl } from './urls';

const isProduction = process.env.NODE_ENV === 'production' && process.env.VOID_LOCAL_PREVIEW !== 'true';

const websiteUrl = publicUrl(process.env.NEXT_PUBLIC_WEBSITE_URL, isProduction ? 'https://voidclient.org' : 'http://localhost:3000');
const defaultUrls = { website: websiteUrl, account: `${websiteUrl}/account`, store: `${websiteUrl}/store` };

export const site = {
  name: 'VOID CLIENT',
  tagline: 'PLAY BEYOND LIMITS.',
  description: 'A new perspective on Minecraft Bedrock. Discover Void Client, explore official updates, and find your next way to play.',
  urls: {
    website: publicUrl(process.env.NEXT_PUBLIC_WEBSITE_URL, defaultUrls.website),
    account: publicUrl(process.env.NEXT_PUBLIC_ACCOUNT_URL, defaultUrls.account),
    store: publicUrl(process.env.NEXT_PUBLIC_STORE_URL, defaultUrls.store),
  },
  discordInvite: publicUrl(process.env.NEXT_PUBLIC_DISCORD_INVITE || 'https://discord.com/invite/fRs86qQXCT'),
  legal: {
    privacy: publicUrl(process.env.NEXT_PUBLIC_PRIVACY_URL),
    terms: publicUrl(process.env.NEXT_PUBLIC_TERMS_URL),
    refund: publicUrl(process.env.NEXT_PUBLIC_REFUND_URL),
  },
  release: {
    version: process.env.NEXT_PUBLIC_CLIENT_VERSION?.trim() || null,
    date: process.env.NEXT_PUBLIC_CLIENT_RELEASE_DATE?.trim() || null,
    // Publish only verified release notes, requirements and instructions.
    requirements: [] as string[],
    instructions: [] as string[],
  },
  platforms: [
    { id: 'windows', name: 'Windows', icon: 'monitor', url: publicUrl(process.env.NEXT_PUBLIC_DOWNLOAD_WINDOWS) },
    { id: 'linux', name: 'Linux', icon: 'terminal', url: publicUrl(process.env.NEXT_PUBLIC_DOWNLOAD_LINUX) },
    { id: 'macos', name: 'macOS', icon: 'laptop', url: publicUrl(process.env.NEXT_PUBLIC_DOWNLOAD_MACOS) },
    { id: 'android', name: 'Android', icon: 'smartphone', url: publicUrl(process.env.NEXT_PUBLIC_DOWNLOAD_ANDROID) },
    { id: 'ios', name: 'iOS', icon: 'smartphone', url: publicUrl(process.env.NEXT_PUBLIC_DOWNLOAD_IOS) },
  ],
} as const;

export type AppName = keyof typeof site.urls;
/** Public app URLs also support separately hosted account/store builds. */
export const accountUrl = (path = '') => `${site.urls.account}${path === '/' ? '' : path}`;
export const storeUrl = (path = '') => `${site.urls.store}${path === '/' ? '' : path}`;
export const websiteNavigation = [
  { label: 'Home', href: '/' }, { label: 'Modules', href: '/modules' },
  { label: 'Download', href: '/download' }, { label: 'Store', href: site.urls.store, externalApp: true },
  { label: 'Changelog', href: '/changelog' }, { label: 'Sneak peeks', href: '/sneak-peeks' },
  { label: 'Partners', href: '/partners' }, { label: 'Discord', href: '/discord' },
];
