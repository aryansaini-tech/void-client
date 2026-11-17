import { site } from '@void/shared/config';
import { PageIntro, ButtonLink } from '@void/ui/components';
import { VoidScene } from '@void/ui/scene';
import { Wordmark } from '@void/ui/brand';
import { pageMeta } from '@/lib/metadata';

export const metadata = pageMeta('About', 'The vision behind Void Client: a new perspective on Minecraft Bedrock, considered design, and community.', '/about');

export default function AboutPage() {
  return (
    <main id="main">
      <div className="about-hero">
        <PageIntro
          eyebrow="This is Void"
          title="A different kind of perspective."
          description="Void Client is a Minecraft Bedrock client with a simple idea at its center: there is always more to discover in a world you already love."
        >
          <div className="about-art"><VoidScene /></div>
        </PageIntro>
      </div>
      <div className="container content-body">
        <section className="about-grid">
          <h2 data-reveal="heading">Beyond the ordinary.</h2>
          <div data-reveal>
            <p>Playing isn’t only about the next session. It’s the way you make a world your own, the details you notice, and the people you meet along the way.</p>
            <p>Void’s vision starts there. A clear identity. A considered experience. A community with room for another perspective. Our official pages bring the client, account, and store into one connected space.</p>
          </div>
        </section>
        <p className="about-manifesto" data-reveal="heading">
          The world stays familiar.<br />The possibilities don’t have to.
        </p>
        <section className="about-values" aria-label="Our values">
          <div data-reveal>
            <h3>Purpose in the details.</h3>
            <p>Less noise. More intention. A visual language that gives the important things room to stand out.</p>
          </div>
          <div data-reveal>
            <h3>Clarity comes first.</h3>
            <p>Verified release information, honest availability, and a clear distinction between an idea and a published feature.</p>
          </div>
          <div data-reveal>
            <h3>A world shared.</h3>
            <p>A place for players, conversations, and ideas. The people around a client are part of what gives it meaning.</p>
          </div>
        </section>
        <section className="identity-strip" aria-label="Void visual identity">
          <div>
            <Wordmark />
            <p className="field-hint" style={{ marginTop: 14 }}>Champagne. Forest light. A world of possibility.</p>
          </div>
          <div className="identity-colors" aria-label="Champagne, forest green, atmospheric blue grey, and warm ivory">
            <span style={{ background: 'var(--champagne)' }} />
            <span style={{ background: 'var(--forest)' }} />
            <span style={{ background: 'var(--sky)' }} />
            <span style={{ background: 'var(--ivory)' }} />
          </div>
        </section>
        <div className="community-banner">
          <div>
            <h2>{site.tagline}</h2>
            <p>Explore the client and find your place in the community.</p>
          </div>
          <div className="button-row">
            <ButtonLink href="/download" icon="download">Download Client</ButtonLink>
            <ButtonLink href="/discord" variant="secondary">Join Discord</ButtonLink>
          </div>
        </div>
      </div>
    </main>
  );
}
