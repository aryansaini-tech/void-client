import { PageIntro, Notice } from '@void/ui/components';
import { LiveSneakPeeksGallery } from '@/components/sneak-peeks-view';
import { pageMeta } from '@/lib/metadata';

export const metadata = pageMeta('Sneak peeks', 'Explore original Void Client visual concepts and upcoming official previews.', '/sneak-peeks');

export default function SneakPeeksPage() {
  return (
    <main id="main">
      <PageIntro
        eyebrow="A look beyond"
        title="The shape of things to come."
        description="A closer look at the Void visual direction. Open a preview, explore the details, and see the ideas taking shape."
      />
      <section className="container content-body" aria-label="Visual preview gallery">
        <LiveSneakPeeksGallery />
        <div className="spaced-notice">
          <Notice>These are original design concepts and artwork, not screenshots of released client features. Official captures will be added when supplied.</Notice>
        </div>
      </section>
    </main>
  );
}
