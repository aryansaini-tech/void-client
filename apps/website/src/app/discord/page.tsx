import { Bell, CalendarDays, Eye, LifeBuoy, MessageCircle, Sparkles } from 'lucide-react';
import { PageIntro, ButtonLink } from '@void/ui/components';
import { CommunityOrbit } from '@/components/community-orbit';
import { LiveDiscordButton } from '@/components/live-discord';
import { pageMeta } from '@/lib/metadata';

export const metadata = pageMeta('Discord', 'Connect with the Void Client community. Find official announcements, sneak peeks, and support information.', '/discord');

const areas = [
  { icon: Bell, title: 'Announcements', copy: 'A place for official client news and published release updates.' },
  { icon: Eye, title: 'Sneak peeks', copy: 'A closer look at visual ideas and development previews.' },
  { icon: LifeBuoy, title: 'Support', copy: 'Find published answers and community support information.' },
  { icon: MessageCircle, title: 'Conversations', copy: 'Share your perspective with people who know the world you play in.' },
  { icon: Sparkles, title: 'Ideas & feedback', copy: 'Bring your thoughts to the conversation and help shape what comes next.' },
  { icon: CalendarDays, title: 'Community moments', copy: 'Find event announcements here when a schedule is published.' }
];

export default function DiscordPage() {
  return (
    <main id="main">
      <div className="container community-page-hero">
        <PageIntro
          eyebrow="Find your people"
          title="Better worlds. Built together."
          description="The client is only the beginning. Discover the conversations, ideas, and shared moments that make a community."
        >
          <LiveDiscordButton />
        </PageIntro>
        <CommunityOrbit />
      </div>
      <section className="container content-body" aria-label="Community information">
        <div className="benefit-grid" style={{ marginTop: 36 }}>
          {areas.map(({ icon: Icon, title, copy }) => (
            <article className="benefit-card" key={title} data-reveal="card">
              <Icon size={25} strokeWidth={1.4} />
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <div className="community-banner">
          <div>
            <h2>While you’re here.</h2>
            <p>Explore the design direction and get to know the idea behind Void.</p>
          </div>
          <ButtonLink href="/sneak-peeks" variant="secondary">Take a look inside</ButtonLink>
        </div>
      </section>
    </main>
  );
}
