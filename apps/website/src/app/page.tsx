import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Blocks, ShieldCheck, SlidersHorizontal, UserRound } from 'lucide-react';
import { site, accountUrl } from '@void/shared/config';
import { ButtonLink } from '@void/ui/components';
import { DiscordIcon } from '@void/ui/brand';
import { Accordion } from '@void/ui/interactive';
import { ClientShowcase } from '@/components/showcase';
import { CinematicWorld } from '@/components/cinematic-world';
import { ClothCard } from '@/components/cloth-card';
import { ModuleLibrary } from '@/components/libraries';
import { LiveDiscordButton } from '@/components/live-discord';
import { pageMeta } from '@/lib/metadata';

export const metadata = pageMeta('Play beyond limits.', site.description, '/');
const chapters = [
  ['opening', 'Void'], ['landscape', 'The world'], ['why-void', 'Why Void'],
  ['features', 'The experience'], ['modules', 'Modules'], ['customization', 'In the details'],
  ['performance', 'Release details'], ['community', 'Community'], ['get-void', 'Get Void'],
];

export default function HomePage() {
  return <main id="main" className="cinematic-home">
    <CinematicWorld />
    <div className="journey-progress" aria-hidden="true"><span /></div>
    <nav className="journey-rail" aria-label="Homepage chapters">{chapters.map(([id, name], i) => <a key={id} href={'#' + id} data-active={i === 0} aria-label={name}><span>{name}</span><i /></a>)}</nav>

    <section id="opening" className="cinematic-hero" data-camera aria-labelledby="hero-heading">
      <div className="container cinematic-hero-layout">
        <div className="cinematic-hero-copy">
          <p className="mono-label hero-edition">Minecraft Bedrock Client</p>
          <p className="hero-brand">VOID CLIENT</p>
          <h1 id="hero-heading">Play beyond<br />limits.</h1>
          <p className="cinematic-description">Your world. Your point of view.<br />Discover a different side of Minecraft with Void Client.</p>
          <div className="button-row"><ButtonLink href="/download" icon="download">Download Client</ButtonLink><LiveDiscordButton /></div>
        </div>
        <div className="cinematic-word" aria-hidden="true"><span>VOID</span><small>PLAY BEYOND LIMITS.</small></div>
      </div>
      <div className="container cinematic-hero-bottom"><a href="#landscape"><ArrowDown size={16} /><span>Step into the world</span></a><span className="mono-label">A new perspective on Bedrock</span></div>
    </section>

    <section id="landscape" className="journey-chapter landscape-chapter" data-camera aria-labelledby="landscape-heading">
      <div className="container landscape-copy"><p className="chapter-label mono-label">The world of Void</p><h2 id="landscape-heading" data-reveal="heading">A familiar world.<br />A fresh perspective.</h2><p>There’s more than one way to make a world your own. Void brings the client, your account, and a community of Bedrock players into one considered experience.</p><Link href="/about" className="text-link">The idea behind Void <ArrowUpRight size={16} /></Link></div>
      <div className="landscape-caption mono-label" aria-hidden="true">Through the river valley</div>
    </section>

    <section id="why-void" className="journey-chapter why-chapter" data-camera aria-labelledby="why-heading">
      <div className="container"><div className="chapter-heading"><div><p className="chapter-label mono-label">Why Void</p><h2 id="why-heading" data-reveal="heading">Your world.<br />Your way.</h2></div><div><p>The game is just the beginning. Explore the tools, the visual ideas, and the community that make up Void.</p><Link href="/about" className="text-link">Discover the vision <ArrowUpRight size={16} /></Link></div></div>
        <div className="world-features">
          {[
            { href: '/modules', icon: Blocks, title: 'Tools within reach', copy: 'Explore the module library by category, with descriptions and release availability.' },
            { href: '/sneak-peeks', icon: SlidersHorizontal, title: 'In the details', copy: 'A closer look at interface and HUD concepts as the visual direction takes shape.' },
            { href: accountUrl('/dashboard'), icon: UserRound, title: 'Your own space', copy: 'Your profile, connected accounts, security settings, and purchase history.' },
            { href: '/download', icon: ShieldCheck, title: 'Clear availability', copy: 'Official download links and confirmed compatibility when each release is published.' },
          ].map(({href, icon: Icon, title, copy}) => <Link className="world-feature" href={href} key={title} data-reveal="card"><Icon size={23} /><h3>{title}</h3><p>{copy}</p><ArrowUpRight className="world-feature-arrow" size={17} /></Link>)}
        </div>
      </div>
    </section>

    <section id="features" className="journey-chapter features-chapter" data-camera aria-labelledby="features-heading">
      <div className="container"><div className="chapter-heading"><div><p className="chapter-label mono-label">The experience</p><h2 id="features-heading" data-reveal="heading">More to discover.</h2></div><p>Follow a different path through Void. The tools, the ideas, and the people behind the pixels.</p></div>
        <div className="landscape-cards">
          <ClothCard href="/modules" image="/void/landscapes/river-grove.webp" label="Explore" title="Find your way to play." description="Discover the modules in Void’s existing library." />
          <ClothCard href="/sneak-peeks" image="/void/landscapes/river-light.webp" label="Look closer" title="Details make the difference." description="Interface concepts and official development previews." />
          <ClothCard href="/discord" image="/void/landscapes/river-highlands.webp" label="Connect" title="Beyond the game." description="Find your place in the Void community." />
        </div>
      </div>
    </section>

    <section id="modules" className="journey-chapter modules-chapter" data-camera aria-labelledby="modules-heading">
      <div className="container"><div className="chapter-heading"><div><p className="chapter-label mono-label">The module library</p><h2 id="modules-heading" data-reveal="heading">Choose your perspective.</h2></div><p>Search the actual module catalog. Explore a category and open a module for its description and availability.</p></div>
        <div className="native-library"><div className="native-library-heading"><span className="mono-label">VOID / MODULES</span><Link className="text-link" href="/modules">Open full library <ArrowUpRight size={16} /></Link></div><ModuleLibrary /></div>
      </div>
    </section>

    <section id="customization" className="journey-chapter customization-chapter" data-camera aria-labelledby="customization-heading">
      <div className="container"><div className="chapter-heading"><div><p className="chapter-label mono-label">Customization &amp; HUD</p><h2 id="customization-heading" data-reveal="heading">Everything in its place.</h2></div><div><p>A closer look at the interface, the atmosphere, and the ideas taking shape. These studies are clearly marked as concepts.</p><Link className="text-link" href="/sneak-peeks">Explore sneak peeks <ArrowUpRight size={16} /></Link></div></div>
        <div className="cinematic-showcase"><ClientShowcase /></div>
      </div>
    </section>

    <section id="performance" className="journey-chapter performance-chapter" data-camera aria-labelledby="performance-heading">
      <div className="container performance-layout"><div><p className="chapter-label mono-label">Compatibility &amp; performance</p><h2 id="performance-heading" data-reveal="heading">Details before<br />your next session.</h2><p>Know what you’re installing. Confirmed requirements, supported Bedrock versions, and installation steps will accompany each official release.</p><ButtonLink href="/download" variant="secondary">View release details</ButtonLink></div>
        <div className="release-glass"><span className="mono-label">VOID / RELEASE INFORMATION</span><dl><div><dt>Edition</dt><dd>Minecraft Bedrock</dd></div><div><dt>Client version</dt><dd>{site.release.version ?? 'Awaiting official release'}</dd></div><div><dt>System requirements</dt><dd>{site.release.requirements.length ? site.release.requirements.join(', ') : 'Published with the verified release'}</dd></div><div><dt>Performance information</dt><dd>Confirmed engine details and benchmarks are not yet published.</dd></div></dl><Link className="text-link" href="/changelog">Follow official updates <ArrowUpRight size={16} /></Link></div>
      </div>
    </section>

    <section id="community" className="journey-chapter community-chapter" data-camera aria-labelledby="community-heading"><div className="container cinematic-community"><div className="community-emblem" aria-hidden="true"><DiscordIcon /></div><div><p className="chapter-label mono-label">The people behind the pixels</p><h2 id="community-heading" data-reveal="heading">Between sessions.<br />Beyond the game.</h2><p>Trade ideas. Share a discovery. Find someone who sees the world the way you do. There’s a place for you in the Void community.</p><LiveDiscordButton /><Link href="/partners" className="community-partners">Meet our partners <ArrowUpRight size={16} /></Link></div></div></section>

    <section id="get-void" className="journey-chapter closing-chapter" data-camera aria-labelledby="closing-heading"><div className="container"><div className="closing-copy"><p className="hero-brand">VOID CLIENT</p><h2 id="closing-heading" data-reveal="heading">See what’s beyond.</h2><p>Your next chapter starts here.</p><div className="button-row"><ButtonLink href="/download" icon="download">Download Client</ButtonLink><ButtonLink href="/discord" variant="secondary">Join Discord</ButtonLink></div></div>
        <div className="closing-help"><div><h3>Before you step inside.</h3><Link className="text-link" href="/faq">All questions <ArrowUpRight size={16} /></Link></div><div><Accordion question="Is Void for Bedrock or Java Edition?">Void Client is for Minecraft Bedrock Edition. Supported Bedrock versions will be listed with each official release.</Accordion><Accordion question="Where can I download Void?">Visit the Download page for official files and platform availability. Coming soon means a verified download has not been published yet.</Accordion><Accordion question="What is a Void account for?">Your account brings your profile, security settings, linked accounts, and purchase history together in one place.</Accordion></div></div>
      </div></section>
  </main>;
}
