import { site } from '@void/shared/config';
import { PageIntro, ButtonLink } from '@void/ui/components';
import { DownloadSelector } from '@/components/download-selector';
import { pageMeta } from '@/lib/metadata';

export const metadata = pageMeta('Download', 'Find verified Void Client downloads, release requirements, and installation information.', '/download');

export default function DownloadPage() {
  return (
    <main id="main">
      <PageIntro
        eyebrow="Your next chapter"
        title="Enter the void."
        description="Choose your platform. Find the official download, confirmed compatibility, and everything you need to get started."
      />
      <section className="container content-body" aria-label="Client downloads">
        <DownloadSelector />
        <div className="download-instructions">
          <h2>From here to your world.</h2>
          {site.release.instructions.length ? (
            <ol>{site.release.instructions.map(step => <li key={step}>{step}</li>)}</ol>
          ) : (
            <div className="steps-grid">
              {[
                ['Check availability', 'Select your platform above. A download becomes available when an official file is published.'],
                ['Read the release details', 'Review the confirmed system requirements and supported Bedrock versions before installing.'],
                ['Follow the official guide', 'Step-by-step installation instructions will be published with the verified release.']
              ].map(([title, description], i) => (
                <div key={title}>
                  <span className="step-number">{i + 1}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="community-banner">
          <div>
            <h2>A little help goes a long way.</h2>
            <p>Find answers about downloads, installation, and compatibility.</p>
          </div>
          <ButtonLink href="/faq" variant="secondary">Get support</ButtonLink>
        </div>
      </section>
    </main>
  );
}
