import './site-content.css';

const releaseDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const downloadCountFormatter = new Intl.NumberFormat('en-GB');

function releaseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return releaseDateFormatter.format(date);
}

function ContentState({ loading, error, refresh, subject }) {
  if (loading) return <p className="site-content-status" role="status">Loading {subject}…</p>;
  if (!error) return null;
  return <div className="site-content-error" role="alert">
    <p>We couldn't load {subject}. Try again.</p>
    <button className="btn btn--secondary" type="button" onClick={() => refresh()}>Try again</button>
  </div>;
}

export function PublicChangelog({ site, refresh, PageHeading, Action }) {
  const { entries = [], loading, error } = site;
  return <main id="top" className="page-main public-changelog"><section className="page-section"><div className="wrap">
    <PageHeading title="VOID changelog.">Release notes and download status for the client.</PageHeading>
    <ContentState loading={loading} error={error} refresh={refresh} subject="release notes" />
    {entries.length > 0 ? <ol className="public-release-list" aria-label="Published releases" aria-busy={loading || undefined}>
      {entries.map(entry => {
        const formattedDate = releaseDate(entry.date);
        return <li key={entry.id}>
          <article className="release-entry public-release-entry">
            <div className="release-date">
              {formattedDate ? <time dateTime={entry.date}>{formattedDate}</time> : <span>Date unavailable</span>}
              {entry.version && <span className="public-release-version">Version {entry.version}</span>}
            </div>
            <div className="public-release-body">
              <h2>{entry.title}</h2>
              <ul className="public-release-changes">{entry.changes.map((change, index) => <li key={index}>{change}</li>)}</ul>
            </div>
          </article>
        </li>;
      })}
    </ol> : !loading && !error && <div className="site-content-empty">
      <h2>Public release notes pending.</h2>
      <p>A detailed release history has not been published. There are no verified release dates or change entries to list yet.</p>
      <Action to="/download" secondary>Check download availability</Action>
    </div>}
  </div></section></main>;
}

export function PublicDownload({ site, refresh, PageHeading, Action, Icon, version }) {
  const { downloadAvailable, downloadCount, loading, error } = site;
  const loaded = !loading && !error && typeof downloadAvailable === 'boolean';
  const available = loaded && downloadAvailable === true;
  const showCount = loaded && Number.isSafeInteger(downloadCount) && downloadCount >= 0;
  return <main id="top" className="page-main public-download"><section className="page-section"><div className="wrap">
    <PageHeading title="Download VOID.">Minecraft Bedrock on Windows. Check the release status before installing.</PageHeading>
    <ContentState loading={loading} error={error} refresh={refresh} subject="download status" />
    <div className="download-grid">
      <article className="download-panel">
        <img src="/void/brand-logo.png" alt="" width="56" height="56" />
        <h2>VOID for Windows</h2>
        <p className="release-version">Bedrock target {version}</p>
        <div className="release-status">{available ? 'Public installer available' : loading ? 'Checking availability' : error ? 'Status unavailable' : 'Public installer pending'}</div>
        {available ? <a className="btn btn--primary" href="/api/download">Download for Windows<Icon name="download" /></a> : <button className="btn btn--primary" disabled type="button">Download coming soon<Icon name="download" /></button>}
        <p className="download-note">{available ? 'Download the Windows installer from this site.' : loaded ? 'A public installer has not been published.' : 'Download availability will appear when the site connects.'}</p>
        {showCount && <p className="public-download-count"><span>Downloads served</span><strong>{downloadCountFormatter.format(downloadCount)}</strong></p>}
      </article>
      <div className="download-details">
        <h2>Windows requirements.</h2>
        <dl className="requirements">
          <div><dt>Platform</dt><dd>Windows only</dd></div>
          <div><dt>Game</dt><dd>Minecraft Bedrock Edition</dd></div>
          <div><dt>Target version</dt><dd>{version}</dd></div>
          <div><dt>Minimum hardware</dt><dd>Not published</dd></div>
        </dl>
        <Action to="/discord" secondary>Join the community</Action>
      </div>
    </div>
    <div className="safety-notes">
      <article><h2>Download safety.</h2><p>An antivirus warning does not prove a file is safe. Verify the download source, keep protection enabled and stop installation if you are unsure.</p></article>
      <article><h2>Server rules.</h2><p>Check each server's rules before using client modifications. Allowed features vary by server.</p></article>
    </div>
    <div className="download-faq">
      <h2>Before you install.</h2>
      <details><summary>Does VOID work with Java Edition?<Icon name="chevron" /></summary><p>No. VOID targets Minecraft Bedrock Edition on Windows.</p></details>
      <details><summary>Is there a phone or console version?<Icon name="chevron" /></summary><p>No phone or console build is listed. The supported platform is Windows.</p></details>
      <details><summary>Does the website preview change my game?<Icon name="chevron" /></summary><p>No. Its settings are stored in your browser and do not connect to Minecraft.</p></details>
    </div>
  </div></section></main>;
}
