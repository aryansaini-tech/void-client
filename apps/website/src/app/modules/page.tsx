import { PageIntro } from '@void/ui/components';
import { ModuleLibrary } from '@/components/libraries';
import { pageMeta } from '@/lib/metadata';

export const metadata = pageMeta('Modules', 'Explore the official Void Client module library, with verified descriptions and release availability.', '/modules');

export default function ModulesPage() {
  return (
    <main id="main">
      <PageIntro
        eyebrow="Made for your world"
        title="Your play. Your possibilities."
        description="Explore the official module library. Search by name, discover categories, and find confirmed features as they’re published."
      />
      <section className="container content-body" aria-label="Module library">
        <ModuleLibrary />
      </section>
    </main>
  );
}
