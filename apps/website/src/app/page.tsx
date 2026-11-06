import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowUpRight, Compass, Newspaper, ShieldCheck, UserRound } from 'lucide-react';
import { site, accountUrl } from '@void/shared/config';
import { ButtonLink } from '@void/ui/components';
import { DiscordIcon } from '@void/ui/brand';
import { VoidScene } from '@void/ui/scene';
import { AmbientLight, Magnetic } from '@void/ui/motion';
import { Accordion } from '@void/ui/interactive';
import { ClientShowcase } from '@/components/showcase';
import { pageMeta } from '@/lib/metadata';

export const metadata = pageMeta('Play beyond limits.', site.description, '/');

export default function HomePage() {
  return <main id="main" className="home-page">
    <section className="hero" aria-labelledby="hero-heading">
      <div className="container hero-layout">
        <div className="hero-copy" data-hero-copy>
          <p className="hero-kicker"><span /> A new perspective on Bedrock</p>
          <h1 id="hero-heading">Play beyond<br />limits.</h1>
          <p className="hero-description">Your world. Your point of view.<br />Discover a different side of Minecraft with Void Client.</p>
          <div className="button-row">
            <Magnetic><ButtonLink href="/download" icon="download">Download Client</ButtonLink></Magnetic>
            <ButtonLink href="/modules" variant="ghost">Explore modules</ButtonLink>
          </div>
          <Link href="/discord" className="hero-community"><DiscordIcon /><span>Find your people on Discord</span><ArrowUpRight size={14} /></Link>
        </div>
        <AmbientLight className="hero-art" label="Official Void Client logo">
          <VoidScene animated />
        </AmbientLight>
      </div>
      <div className="container hero-bottom">
        <a href="#discover" className="scroll-hint"><ArrowDown size={16} />Discover Void</a>
        <p>Minecraft Bedrock Edition <span className="hero-bottom-divider" /> Client. Community. You.</p>
      </div>
    </section>

    <section id="discover" className="container intro-section section-pad">
      <h2 data-reveal="heading">A familiar world.<br />A fresh perspective.</h2>
      <div>
        <p>There’s more than one way to make a world your own. Void brings the client, your account, and a community of Bedrock players into one considered experience.</p>
        <Link href="/about" className="text-link">The idea behind Void <ArrowUpRight size={16} /></Link>
      </div>
    </section>

    <section className="showcase-section section-pad" data-showcase-section aria-labelledby="showcase-heading">
      <div className="container">
        <div className="showcase-heading">
          <div><p className="section-kicker">Inside Void</p><h2 id="showcase-heading" data-reveal="heading">Details make<br />the difference.</h2></div>
          <div><p>A closer look at the interface, the atmosphere, and the ideas taking shape.</p><Link className="text-link" href="/sneak-peeks">Explore the gallery <ArrowUpRight size={16} /></Link></div>
        </div>
        <ClientShowcase />
      </div>
    </section>

    <section className="container experience-section section-pad" aria-labelledby="experience-heading">
      <div className="experience-intro"><p className="section-kicker">One connected experience</p><h2 id="experience-heading" data-reveal="heading">The game is<br />just the beginning.</h2><p>Your next session, your own space, and everything that comes after.</p></div>
      <div className="experience-stories">
        <Link className="feature-card" href="/modules"><Compass size={24} strokeWidth={1.4} /><div><h3>Find your way to play.</h3><p>Explore modules by category, with clear descriptions and release availability.</p></div><ArrowUpRight size={20} /></Link>
        <Link className="feature-card" href={accountUrl('/dashboard')}><UserRound size={24} strokeWidth={1.4} /><div><h3>A space that’s yours.</h3><p>Your profile, connected accounts, and purchases. All together.</p></div><ArrowUpRight size={20} /></Link>
        <Link className="feature-card" href="/changelog"><Newspaper size={24} strokeWidth={1.4} /><div><h3>Follow what’s next.</h3><p>Official release notes and development previews, straight from Void.</p></div><ArrowUpRight size={20} /></Link>
      </div>
    </section>

    <section className="community-section section-pad" aria-labelledby="community-heading">
      <div className="container community-editorial">
        <div className="community-signature" aria-hidden="true"><DiscordIcon /><span>Good company.<br />Great possibilities.</span></div>
        <div className="community-copy"><p className="section-kicker">The people behind the pixels</p><h2 id="community-heading" data-reveal="heading">Between sessions.<br />Beyond the game.</h2><p>Trade ideas. Share a discovery. Find someone who sees the world the way you do. There’s a place for you in the Void community.</p><ButtonLink href="/discord" variant="secondary">Join the community</ButtonLink></div>
      </div>
    </section>

    <section className="container home-help section-pad" aria-labelledby="home-help-heading">
      <div><p className="section-kicker">A little clarity</p><h2 id="home-help-heading">Before you<br />step inside.</h2><Link className="text-link" href="/faq">All questions <ArrowUpRight size={16} /></Link></div>
      <div className="home-questions">
        <Accordion question="Is Void for Bedrock or Java Edition?">Void Client is for Minecraft Bedrock Edition. Supported Bedrock versions will be listed with each official release.</Accordion>
        <Accordion question="Where can I download Void?">Visit the Download page for official files and platform availability. A “Coming soon” label means a verified download has not been published yet.</Accordion>
        <Accordion question="What is a Void account for?">Your account brings your profile, security settings, linked accounts, and purchase history together in one place.</Accordion>
      </div>
    </section>

    <section className="container partner-preview">
      <p>In good company.</p>
      <Link href="/partners" className="partner-wordmark"><Image src="/media/partners/zerix.webp" alt="" width={42} height={42} /><strong>Zerix Network</strong><ArrowUpRight size={16} /></Link>
      <span>Partner profile coming soon</span>
    </section>

    <section className="final-cta">
      <div className="container final-cta-inner"><div><p className="section-kicker">Your next chapter</p><h2 data-reveal="heading">See what’s beyond.</h2></div><div><ButtonLink href="/download" icon="download">Download Client</ButtonLink><p><ShieldCheck size={14} /> Official downloads. Clear availability.</p></div></div>
    </section>
  </main>;
}
