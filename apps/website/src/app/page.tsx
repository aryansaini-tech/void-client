import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowUpRight, Blocks, Box, CircleDashed, Layers3, Monitor, Newspaper, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { site } from '@void/shared/config';
import { ButtonLink, SectionHeading } from '@void/ui/components';
import { DiscordIcon } from '@void/ui/brand';
import { VoidScene } from '@void/ui/scene';
import { Magnetic } from '@void/ui/motion';
import { ClientShowcase } from '@/components/showcase';
import { CommunityOrbit } from '@/components/community-orbit';
import { pageMeta } from '@/lib/metadata';

export const metadata = pageMeta('Play beyond limits.', site.description, '/');
export default function HomePage() {
  return <main id="main">
    <section className="hero" aria-labelledby="hero-heading">
      <div className="container hero-layout"><div className="hero-copy" data-hero-copy>
        <p className="eyebrow"><span/>The Minecraft Bedrock client</p>
        <div className="hero-wordmark">VOID CLIENT</div>
        <h1 id="hero-heading"><span><span>PLAY BEYOND</span></span><span><span>LIMITS.</span></span></h1>
        <p className="hero-description">A new perspective. A world of possibility.<br/>Meet Void, a Minecraft Bedrock client with a vision that goes beyond the ordinary.</p>
        <div className="button-row"><Magnetic><ButtonLink href="/download" icon="download">Download Client</ButtonLink></Magnetic><ButtonLink href="/modules" variant="secondary">Explore Modules</ButtonLink></div>
        <div className="hero-discord"><DiscordIcon/><Link href="/discord">Join Discord <ArrowUpRight size={12}/></Link><span>Find your people.</span></div>
      </div><div className="hero-art" data-hero-art><VoidScene animated /></div></div>
      <div className="container hero-bottom"><a href="#discover" className="scroll-hint"><ArrowDown size={14}/>Scroll to discover</a><span className="hero-art-note">Original Void artwork · Not gameplay footage</span></div>
    </section>
    <div className="context-strip"><div className="container">
      <div className="context-item"><Box size={22} strokeWidth={1.3}/><div><strong>Minecraft Bedrock</strong><span>A different perspective</span></div></div>
      <div className="context-item"><CircleDashed size={22} strokeWidth={1.3}/><div><strong>Official release information</strong><span><Link href="/download">Check availability</Link></span></div></div>
      <div className="context-item"><Layers3 size={22} strokeWidth={1.3}/><div><strong>One connected ecosystem</strong><span>Client. Account. Store.</span></div></div>
    </div></div>
    <section className="container section-pad intro-section" id="discover"><h2 data-reveal="heading">Your world.<br/>A different point of view.</h2><div data-reveal><p>There’s always another way to experience the world you know. Void brings a focused identity to Minecraft Bedrock: considered design, a clear vision, and a place for what comes next.</p><Link href="/about" className="text-link">Get to know Void <ArrowUpRight size={16}/></Link></div></section>
    <section className="showcase-section section-pad" data-showcase-section><div className="section-light" aria-hidden="true"/><div className="container"><SectionHeading title="A glimpse inside the void." description="Explore the visual direction. These original concepts set the atmosphere while official client screenshots are on their way."><ButtonLink href="/sneak-peeks" variant="ghost">All sneak peeks</ButtonLink></SectionHeading><ClientShowcase/></div></section>
    <section className="container section-pad"><SectionHeading title="A place for every part of your journey." description="Discover the client, make yourself at home, and stay close to what’s next."/>
      <div className="feature-grid">
        <Link className="feature-card" href="/about" data-reveal="card"><span className="card-decoration" aria-hidden="true">VOID</span><Monitor size={26} strokeWidth={1.3}/><h3>Bedrock at the center.</h3><p>A client identity rooted in Minecraft Bedrock, with a clear vision for the experience ahead.</p></Link>
        <Link className="feature-card" href={`${site.urls.account}/dashboard`} data-reveal="card"><UserRound size={25} strokeWidth={1.3}/><h3>Your own space.</h3><p>One Void account for your profile, security settings, and future purchases.</p></Link>
        <Link className="feature-card" href="/changelog" data-reveal="card"><Newspaper size={25} strokeWidth={1.3}/><h3>Stay in the loop.</h3><p>Official releases, development previews, and community updates. All in one place.</p></Link>
      </div><p className="section-note"><ShieldCheck size={13}/>Client capabilities and compatibility are listed only when confirmed in official release information.</p>
    </section>
    <section className="container section-pad module-preview"><div><p className="eyebrow"><span/>The module library</p><h2 data-reveal="heading">Find your way<br/>to play.</h2><p data-reveal>The official module library will bring verified features, clear descriptions, and release availability together. Explore what’s published as Void takes shape.</p><ButtonLink href="/modules" variant="secondary">Explore Modules</ButtonLink></div><div className="module-preview-graphic" data-reveal><div className="module-preview-top"><span>VOID / MODULE LIBRARY</span><Blocks size={18}/></div>{[0,1,2].map(item=><div className="module-ghost-row" key={item} aria-hidden="true"><span className="module-ghost-icon"/><span className="module-ghost-text"/><span className="module-ghost-switch"/></div>)}<div className="module-placeholder-caption"><CircleDashed size={13}/>Verified module details coming soon</div></div></section>
    <section className="community-section section-pad"><div className="container community-inner"><div className="community-copy"><p className="eyebrow"><span/>The world is better together</p><h2 data-reveal="heading">Beyond the client.<br/>Into the community.</h2><p data-reveal>For the conversations between sessions. The ideas that turn into something. The people who see the world a little differently. Find your place in Void.</p><ButtonLink href="/discord">Join the community</ButtonLink></div><CommunityOrbit/></div></section>
    <section className="container partner-preview"><div><h2 data-reveal="heading">Good company. Shared ambition.</h2><p>Meet the networks and communities alongside Void.</p></div><div className="partner-wordmark" data-reveal="right"><Image className="partner-logo-preview" src="/media/partners/zerix.webp" alt="Zerix Network logo" width={65} height={65}/><div><strong>ZERIX NETWORK</strong><span>Partner details coming soon</span></div></div><Link href="/partners" className="text-link">Our partners <ArrowUpRight size={15}/></Link></section>
    <section className="final-cta"><div className="container"><p className="eyebrow"><Sparkles size={13}/>A new perspective awaits</p><h2 data-reveal="heading">The next chapter is yours.</h2><p>Discover Void Client. See where it takes you.</p><div className="button-row"><ButtonLink href="/download" icon="download">Download Client</ButtonLink><ButtonLink href="/discord" variant="secondary">Join Discord</ButtonLink></div></div></section>
  </main>;
}
