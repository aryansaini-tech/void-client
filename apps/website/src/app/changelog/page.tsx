import { Radio } from 'lucide-react';
import { PageIntro, ButtonLink } from '@void/ui/components';
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
      <section className="container content-body release-journal" aria-label="Release history">
        <div><ChangelogLibrary /></div>
        <aside className="release-aside"><Radio size={25} strokeWidth={1.3} /><h2>Follow the development.</h2><p>Release notes belong here. For conversations, previews, and news between releases, join the Void community.</p><ButtonLink href="/discord" variant="secondary">Visit Discord</ButtonLink></aside>
      </section>
    </main>
  );
}
