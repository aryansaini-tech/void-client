import { PageIntro } from '@void/ui/components';
import { ChangelogLibrary } from '@/components/libraries';
import { pageMeta } from '@/lib/metadata';

export const metadata = pageMeta('Changelog', 'Official Void Client release notes, improvements, fixes, and compatibility notices.', '/changelog');

export default function ChangelogPage() {
  return (
    <main id="main">
      <PageIntro
        eyebrow="The journey, documented"
        title="Always moving forward."
        description="Every release, every refinement. Follow the evolution of Void through official updates and release notes."
      />
      <section className="container content-body" aria-label="Release history">
        <ChangelogLibrary />
      </section>
    </main>
  );
}
