import { faqs } from '@void/shared/content';
import { PageIntro, ButtonLink } from '@void/ui/components';
import { FAQLibrary } from '@/components/libraries';
import { pageMeta } from '@/lib/metadata';

export const metadata = pageMeta('FAQ', 'Answers about Void Client, installation, platform compatibility, downloads, and account support.', '/faq');

export default function FAQPage() {
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } }))
  };

  return (
    <main id="main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }}
      />
      <PageIntro
        eyebrow="A little clarity"
        title="Good questions. Clear answers."
        description="Get to know Void. Find help with installation, compatibility, downloads, and your account."
      />
      <section className="container content-body" aria-label="Frequently asked questions">
        <FAQLibrary />
        <div className="community-banner">
          <div>
            <h2>Still looking for an answer?</h2>
            <p>Find official community and support information in one place.</p>
          </div>
          <ButtonLink href="/discord" variant="secondary">Visit the community</ButtonLink>
        </div>
      </section>
    </main>
  );
}
