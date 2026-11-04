'use client';

import { useState, useEffect, useRef, useSyncExternalStore, type ChangeEvent, type SetStateAction } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  RefreshCw, Eye, Sparkles, ExternalLink,
  Plus, Trash2, Image as ImageIcon, Save,
  Layers, MessageSquare, Newspaper, Settings,
  ShieldAlert, ArrowLeft
} from 'lucide-react';
import {
  useLiveSiteContent,
  saveSiteContent,
  resetSiteContent,
  defaultPageScreenshots,
  type PageScreenshotItem,
} from '@void/shared/content-store';
import { site } from '@void/shared/config';
import type { ClientModule, ReleaseEntry } from '@void/shared/content';
import { Badge } from '@void/ui/components';
import { Wordmark } from '@void/ui/brand';

const PRESET_ASSETS = [
  { label: 'ClickGUI Hero', url: '/media/clickgui-hero.jpg' },
  { label: 'Visual Concept Scene', url: '/media/visual-concept.svg' },
  { label: 'Interface ClickGUI', url: '/media/interface-concept.svg' },
  { label: 'HUD In-Game Concept', url: '/media/hud-concept.svg' },
  { label: 'Settings & GUI Study', url: '/media/settings-concept.svg' },
  { label: 'Landscape Atmosphere', url: '/media/landscape.svg' },
  { label: 'Zerix Network Partner', url: '/media/partners/zerix.webp' },
  { label: 'Official Void Emblem', url: '/media/official-logo.png' },
];

const subscribeHydration = () => () => {};

export default function AdminPage() {
  // In production static export, render the immutable restricted advisory directly in static HTML
  if (process.env.NODE_ENV === 'production') {
    return <AdminRestricted />;
  }

  return <AdminDevGate />;
}

function AdminDevGate() {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);

  if (!hydrated) {
    return (
      <main id="main" className="container admin-auth-container" aria-busy="true">
        <div className="admin-loading" role="status">
          <Wordmark />
          <h1 className="sr-only">Admin Studio</h1>
          <p>Loading…</p>
        </div>
      </main>
    );
  }

  return <AdminStudioDev />;
}

/* ========================================================
   RESTRICTED VIEW FOR PRODUCTION STATIC HOSTING
   ======================================================== */
function AdminRestricted() {
  return (
    <main id="main" className="container admin-auth-container">
      <div className="admin-login-card admin-restricted-card">
        <div className="admin-login-header">
          <Wordmark animated />
          <span className="admin-pill admin-pill-restricted">ACCESS RESTRICTED</span>
          <h1>Admin Studio Restricted</h1>
          <p>
            Administrative tools and live customizers are disabled in public static hosting environments.
            Content updates and management require an authenticated session through the private Void Client control plane.
          </p>
        </div>

        <div className="admin-restricted-notice">
          <ShieldAlert size={20} />
          <div>
            <strong>Static Distribution Security Policy</strong>
            <p>
              This website is distributed as an immutable static export on Cloudflare Pages.
              No administrative credentials, authentication handlers, or write APIs are exposed on this host.
            </p>
          </div>
        </div>

        <div className="admin-restricted-actions">
          <Link href="/" className="button button-primary" style={{ justifyContent: 'center' }}>
            <ArrowLeft size={16} /> Return to Homepage
          </Link>
          <Link href={`${site.urls.account}/dashboard`} className="button button-secondary" style={{ justifyContent: 'center' }}>
            Account Portal <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </main>
  );
}

/* ========================================================
   LOCAL DEVELOPMENT CUSTOMIZER (DEV PREVIEW ONLY)
   ======================================================== */
function AdminStudioDev() {
  const content = useLiveSiteContent();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'screenshots' | 'modules' | 'discord' | 'sneakPeeks' | 'changelog' | 'settings'>('screenshots');
  const [statusMessage, setStatusMessage] = useState('');

  // Page Screenshot editor state
  const pageKeys = Object.keys(defaultPageScreenshots);
  const [selectedPageId, setSelectedPageId] = useState<string>('home');
  const [screenshotDraft, setScreenshotDraft] = useState<PageScreenshotItem | null>(null);
  const currentScreenshot = screenshotDraft ?? content.pageScreenshots[selectedPageId] ?? defaultPageScreenshots[selectedPageId] ?? defaultPageScreenshots.home!;

  function setCurrentScreenshot(value: SetStateAction<PageScreenshotItem>) {
    setScreenshotDraft(previous => typeof value === 'function' ? value(previous ?? currentScreenshot) : value);
  }

  // New module state
  const [newModule, setNewModule] = useState<Partial<ClientModule>>({
    name: '',
    category: 'Combat',
    description: '',
    icon: 'crosshair',
    availability: 'available',
  });

  // New sneak peek state
  const [newSneakPeek, setNewSneakPeek] = useState({
    name: '',
    title: '',
    description: '',
    image: '/media/clickgui-hero.jpg',
    alt: '',
    status: 'In Development',
  });

  // New changelog entry state
  const [newChangelog, setNewChangelog] = useState<{
    version: string;
    title: string;
    date: string;
    kind: 'major' | 'minor' | 'fix';
    features: string;
    fixes: string;
  }>({
    version: 'v1.1.0',
    title: 'Performance & ClickGUI Polish',
    date: new Date().toISOString().split('T')[0] ?? '2026-11-03',
    kind: 'minor',
    features: 'Frosted champagne-gold interface styling\nMonocraft brand rendering',
    fixes: 'Console hydration mismatch eliminated',
  });

  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
  }, []);

  function notify(msg: string) {
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    setStatusMessage(msg);
    notificationTimer.current = setTimeout(() => setStatusMessage(''), 4000);
  }

  function handleSaveScreenshot() {
    const updatedScreenshots = {
      ...content.pageScreenshots,
      [selectedPageId]: {
        ...currentScreenshot,
        id: selectedPageId,
      },
    };
    saveSiteContent({ pageScreenshots: updatedScreenshots });
    setScreenshotDraft(null);
    notify(`Saved screenshot for "${currentScreenshot.name}"! Immediately live on ${currentScreenshot.path}`);
  }

  function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCurrentScreenshot((prev) => ({ ...prev, image: dataUrl }));
      notify('Custom image loaded! Click "Apply Screenshot to Page" to save.');
    };
    reader.readAsDataURL(file);
  }

  function handleAddModule(e: React.FormEvent) {
    e.preventDefault();
    if (!newModule.name || !newModule.description) return;
    const item: ClientModule = {
      id: newModule.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: newModule.name,
      category: (newModule.category as ClientModule['category']) || 'Utility',
      description: newModule.description,
      icon: (newModule.icon as ClientModule['icon']) || 'crosshair',
      availability: (newModule.availability as ClientModule['availability']) || 'available',
    };
    saveSiteContent({ modules: [item, ...content.modules] });
    setNewModule({ name: '', category: 'Combat', description: '', icon: 'crosshair', availability: 'available' });
    notify(`Module "${item.name}" added to live ClickGUI!`);
  }

  function handleDeleteModule(id: string) {
    const updated = content.modules.filter((m) => m.id !== id);
    saveSiteContent({ modules: updated });
    notify('Module removed from live ClickGUI.');
  }

  function handleAddSneakPeek(e: React.FormEvent) {
    e.preventDefault();
    if (!newSneakPeek.name || !newSneakPeek.description) return;
    const item = {
      id: `peek-${Date.now()}`,
      name: newSneakPeek.name,
      title: newSneakPeek.title || newSneakPeek.name,
      description: newSneakPeek.description,
      image: newSneakPeek.image || '/media/clickgui-hero.jpg',
      alt: newSneakPeek.alt || newSneakPeek.name,
      status: newSneakPeek.status || 'In Development',
    };
    saveSiteContent({ sneakPeeks: [item, ...content.sneakPeeks] });
    setNewSneakPeek({ name: '', title: '', description: '', image: '/media/clickgui-hero.jpg', alt: '', status: 'In Development' });
    notify(`Sneak peek "${item.name}" added to showcase!`);
  }

  function handleDeleteSneakPeek(id: string) {
    const updated = content.sneakPeeks.filter((p) => p.id !== id);
    saveSiteContent({ sneakPeeks: updated });
    notify('Sneak peek removed.');
  }

  function handleAddChangelog(e: React.FormEvent) {
    e.preventDefault();
    if (!newChangelog.version || !newChangelog.title) return;
    const item: ReleaseEntry = {
      id: `rel-${Date.now()}`,
      version: newChangelog.version,
      date: newChangelog.date,
      title: newChangelog.title,
      kind: newChangelog.kind,
      features: newChangelog.features.split('\n').map((s) => s.trim()).filter(Boolean),
      improvements: [],
      fixes: newChangelog.fixes.split('\n').map((s) => s.trim()).filter(Boolean),
      notices: [],
    };
    saveSiteContent({ changelog: [item, ...content.changelog] });
    notify(`Release ${item.version} published to Changelog!`);
  }

  function handleDeleteChangelog(id: string) {
    const updated = content.changelog.filter((c) => c.id !== id);
    saveSiteContent({ changelog: updated });
    notify('Changelog entry removed.');
  }

  function handleExportBackup() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(content, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `void-site-content-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    notify('Exported backup JSON file!');
  }

  function handleImportBackup(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        saveSiteContent(parsed);
        setScreenshotDraft(null);
        notify('Site configuration restored from backup successfully!');
      } catch {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  }

  function handleResetDefaults() {
    if (confirm('Are you sure you want to reset all content to the default factory state?')) {
      resetSiteContent();
      setScreenshotDraft(null);
      notify('All content reset to original defaults.');
    }
  }

  return (
    <main id="main" className="admin-studio-wrapper">
      {/* Top Banner / Studio Bar */}
      <header className="admin-topbar">
        <div className="container admin-topbar-inner">
          <div className="admin-topbar-left">
            <Wordmark />
            <span className="admin-status-dot" title="Local Preview Active">● DEV PREVIEW</span>
          </div>

          <div className="admin-topbar-actions">
            {statusMessage && <span className="admin-flash-msg">{statusMessage}</span>}
            <Link href="/" target="_blank" className="button button-secondary button-sm">
              <Eye size={14} /> View Live Website <ExternalLink size={12} />
            </Link>
            <button onClick={handleResetDefaults} className="button button-ghost button-sm">
              <RefreshCw size={14} /> Reset Defaults
            </button>
          </div>
        </div>
      </header>

      <div className="container admin-studio-main">
        {/* Navigation Tabs */}
        <nav className="admin-tab-nav" aria-label="Customizer sections">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'screenshots' ? 'active' : ''}`}
            onClick={() => setActiveTab('screenshots')}
          >
            <ImageIcon size={16} /> Page Screenshots (Shopify Editor)
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'modules' ? 'active' : ''}`}
            onClick={() => setActiveTab('modules')}
          >
            <Layers size={16} /> Modules ({content.modules.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'sneakPeeks' ? 'active' : ''}`}
            onClick={() => setActiveTab('sneakPeeks')}
          >
            <Sparkles size={16} /> Sneak Peeks ({content.sneakPeeks.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'discord' ? 'active' : ''}`}
            onClick={() => setActiveTab('discord')}
          >
            <MessageSquare size={16} /> Discord & Links
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'changelog' ? 'active' : ''}`}
            onClick={() => setActiveTab('changelog')}
          >
            <Newspaper size={16} /> Changelog ({content.changelog.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} /> Backup & Reset
          </button>
        </nav>

        {/* TAB 1: PAGE SCREENSHOTS (Shopify-like Theme Customizer) */}
        {activeTab === 'screenshots' && (
          <section className="admin-panel-card">
            <div className="admin-card-header">
              <div>
                <h2>Page Screenshots & Hero Visuals (Theme Customizer)</h2>
                <p>Select any page of the website from the dropdown to preview and change its featured screenshot live.</p>
              </div>
              <Badge gold>Instant Synchronization</Badge>
            </div>

            <div className="admin-customizer-split">
              {/* Left Column: Form Controls */}
              <div className="admin-editor-column">
                <label className="admin-field">
                  <span className="admin-field-label">Select Page to Customize:</span>
                  <select
                    value={selectedPageId}
                    onChange={(e) => {
                      setSelectedPageId(e.target.value);
                      setScreenshotDraft(null);
                    }}
                    className="admin-select"
                  >
                    {pageKeys.map((key) => {
                      const item = defaultPageScreenshots[key];
                      return (
                        <option key={key} value={key}>
                          {item?.name} ({item?.path})
                        </option>
                      );
                    })}
                  </select>
                </label>

                {/* Quick Presets */}
                <div className="admin-preset-picker">
                  <span className="admin-field-label">Quick Image Presets:</span>
                  <div className="admin-preset-pills">
                    {PRESET_ASSETS.map((asset) => (
                      <button
                        key={asset.url}
                        type="button"
                        className={`admin-pill-btn ${currentScreenshot.image === asset.url ? 'active' : ''}`}
                        onClick={() => setCurrentScreenshot((prev) => ({ ...prev, image: asset.url }))}
                      >
                        {asset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom URL or path */}
                <label className="admin-field">
                  <span className="admin-field-label">Image URL or Custom Path:</span>
                  <input
                    type="text"
                    value={currentScreenshot.image}
                    onChange={(e) => setCurrentScreenshot((prev) => ({ ...prev, image: e.target.value }))}
                    placeholder="/media/clickgui-hero.jpg or https://..."
                  />
                </label>

                {/* File Upload from PC */}
                <label className="admin-field">
                  <span className="admin-field-label">Or Upload Image from Computer:</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                </label>

                {/* Badge Label & Alt Text */}
                <div className="admin-field-grid">
                  <label className="admin-field">
                    <span className="admin-field-label">Badge Label:</span>
                    <input
                      type="text"
                      value={currentScreenshot.badge}
                      onChange={(e) => setCurrentScreenshot((prev) => ({ ...prev, badge: e.target.value }))}
                    />
                  </label>
                  <label className="admin-field">
                    <span className="admin-field-label">Alt Text:</span>
                    <input
                      type="text"
                      value={currentScreenshot.alt}
                      onChange={(e) => setCurrentScreenshot((prev) => ({ ...prev, alt: e.target.value }))}
                    />
                  </label>
                </div>

                <label className="admin-field">
                  <span className="admin-field-label">Description / Caption:</span>
                  <textarea
                    rows={2}
                    value={currentScreenshot.description}
                    onChange={(e) => setCurrentScreenshot((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </label>

                <div className="admin-action-row">
                  <button type="button" onClick={handleSaveScreenshot} className="button button-primary">
                    <Save size={16} /> Apply Screenshot to {currentScreenshot.name}
                  </button>
                  <Link href={currentScreenshot.path} target="_blank" className="button button-secondary">
                    <Eye size={15} /> Preview {currentScreenshot.path}
                  </Link>
                </div>
              </div>

              {/* Right Column: Live Interactive Preview Card */}
              <div className="admin-preview-column">
                <span className="admin-field-label">Live Preview / {currentScreenshot.name}</span>
                <div className="showcase-frame admin-live-preview-box">
                  <div className="showcase-window-bar">
                    <span className="window-dots"><i /><i /><i /></span>
                    <span className="window-title">VOID CLIENT / {currentScreenshot.name.toUpperCase()}</span>
                    <span className="window-status">{currentScreenshot.badge}</span>
                  </div>
                  <div className="showcase-image-layer" style={{ height: '240px', position: 'relative' }}>
                    <Image
                      src={currentScreenshot.image}
                      alt={currentScreenshot.alt}
                      fill
                      unoptimized
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ padding: '16px' }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: '16px' }}>{currentScreenshot.name}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{currentScreenshot.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: MODULES */}
        {activeTab === 'modules' && (
          <section className="admin-panel-card">
            <div className="admin-card-header">
              <div>
                <h2>ClickGUI Modules Manager</h2>
                <p>Add, update, or remove module cards displayed on the /modules page.</p>
              </div>
            </div>

            {/* Add New Module Form */}
            <form onSubmit={handleAddModule} className="admin-add-box">
              <h3>Add New Client Module</h3>
              <div className="admin-field-row">
                <input
                  type="text"
                  required
                  placeholder="Module Name (e.g. Velocity, KillAura, Reach)"
                  value={newModule.name}
                  onChange={(e) => setNewModule({ ...newModule, name: e.target.value })}
                />
                <select
                  value={newModule.category}
                  onChange={(e) => setNewModule({ ...newModule, category: e.target.value as ClientModule['category'] })}
                >
                  <option value="Combat">Combat</option>
                  <option value="Movement">Movement</option>
                  <option value="Render">Render</option>
                  <option value="Player">Player</option>
                  <option value="World">World</option>
                  <option value="Utility">Utility</option>
                </select>
                <select
                  value={newModule.availability}
                  onChange={(e) => setNewModule({ ...newModule, availability: e.target.value as ClientModule['availability'] })}
                >
                  <option value="available">Available Now</option>
                  <option value="planned">In Development</option>
                </select>
              </div>
              <textarea
                rows={2}
                required
                placeholder="Module description and key advantages..."
                value={newModule.description}
                onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
              />
              <button type="submit" className="button button-primary">
                <Plus size={16} /> Add Module to ClickGUI
              </button>
            </form>

            {/* Existing Module List */}
            <div className="admin-module-list">
              {content.modules.map((mod) => (
                <div key={mod.id} className="admin-module-row">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Badge gold={mod.category === 'Combat'}>{mod.category}</Badge>
                      <strong>{mod.name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({mod.availability})</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{mod.description}</p>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    title="Delete module"
                    onClick={() => handleDeleteModule(mod.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 3: SNEAK PEEKS */}
        {activeTab === 'sneakPeeks' && (
          <section className="admin-panel-card">
            <div className="admin-card-header">
              <div>
                <h2>Sneak Peeks Gallery Manager</h2>
                <p>Add in-progress features, ClickGUI screenshots, and development previews.</p>
              </div>
            </div>

            {/* Add Sneak Peek Form */}
            <form onSubmit={handleAddSneakPeek} className="admin-add-box">
              <h3>Add New Sneak Peek</h3>
              <div className="admin-field-row">
                <input
                  type="text"
                  required
                  placeholder="Title (e.g. Modern HUD Overhaul)"
                  value={newSneakPeek.name}
                  onChange={(e) => setNewSneakPeek({ ...newSneakPeek, name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Image URL or Path"
                  value={newSneakPeek.image}
                  onChange={(e) => setNewSneakPeek({ ...newSneakPeek, image: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Status (e.g. In Testing, Preview)"
                  value={newSneakPeek.status}
                  onChange={(e) => setNewSneakPeek({ ...newSneakPeek, status: e.target.value })}
                />
              </div>
              <textarea
                rows={2}
                required
                placeholder="Description of the feature..."
                value={newSneakPeek.description}
                onChange={(e) => setNewSneakPeek({ ...newSneakPeek, description: e.target.value })}
              />
              <button type="submit" className="button button-primary">
                <Plus size={16} /> Add Sneak Peek
              </button>
            </form>

            <div className="admin-sneak-grid">
              {content.sneakPeeks.map((item) => (
                <div key={item.id} className="admin-sneak-item">
                  <div className="admin-sneak-thumb">
                    <Image src={item.image} alt={item.alt || item.name} fill unoptimized style={{ objectFit: 'cover' }} />
                  </div>
                  <div className="admin-sneak-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <Badge gold>{item.status}</Badge>
                      <button type="button" className="icon-button" onClick={() => handleDeleteSneakPeek(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <h4>{item.name}</h4>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 4: DISCORD */}
        {activeTab === 'discord' && (
          <section className="admin-panel-card">
            <div className="admin-card-header">
              <div>
                <h2>Discord & Social Community Links</h2>
                <p>Update the official Discord invite link and community description shown across the site.</p>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); notify('Discord link saved!'); }} className="admin-editor-column">
              <label className="admin-field">
                <span className="admin-field-label">Official Discord Invite URL:</span>
                <input
                  type="url"
                  required
                  value={content.discord.url}
                  onChange={(e) => saveSiteContent({ discord: { ...content.discord, url: e.target.value } })}
                />
              </label>

              <label className="admin-field">
                <span className="admin-field-label">Badge Label:</span>
                <input
                  type="text"
                  value={content.discord.badge}
                  onChange={(e) => saveSiteContent({ discord: { ...content.discord, badge: e.target.value } })}
                />
              </label>

              <label className="admin-field">
                <span className="admin-field-label">Community Description:</span>
                <textarea
                  rows={2}
                  value={content.discord.description}
                  onChange={(e) => saveSiteContent({ discord: { ...content.discord, description: e.target.value } })}
                />
              </label>

              <div className="admin-action-row">
                <button type="submit" className="button button-primary">
                  <Save size={16} /> Save Discord Settings
                </button>
                <Link href="/discord" target="_blank" className="button button-secondary">
                  <Eye size={14} /> View Discord Page
                </Link>
              </div>
            </form>
          </section>
        )}

        {/* TAB 5: CHANGELOG */}
        {activeTab === 'changelog' && (
          <section className="admin-panel-card">
            <div className="admin-card-header">
              <div>
                <h2>Changelog & Releases Manager</h2>
                <p>Post client versions, feature announcements, and bug fix summaries.</p>
              </div>
            </div>

            {/* Add Changelog Release */}
            <form onSubmit={handleAddChangelog} className="admin-add-box">
              <h3>Publish New Release Note</h3>
              <div className="admin-field-row">
                <input
                  type="text"
                  required
                  placeholder="Version (e.g. v1.1.0)"
                  value={newChangelog.version}
                  onChange={(e) => setNewChangelog({ ...newChangelog, version: e.target.value })}
                />
                <input
                  type="text"
                  required
                  placeholder="Title (e.g. Performance & UI Polish)"
                  value={newChangelog.title}
                  onChange={(e) => setNewChangelog({ ...newChangelog, title: e.target.value })}
                />
                <select
                  value={newChangelog.kind}
                  onChange={(e) => setNewChangelog({ ...newChangelog, kind: e.target.value as ReleaseEntry['kind'] })}
                >
                  <option value="major">Major Update</option>
                  <option value="minor">Minor Update</option>
                  <option value="fix">Bug Fix Patch</option>
                </select>
              </div>
              <div className="admin-field-grid">
                <label className="admin-field">
                  <span className="admin-field-label">New Features (one per line):</span>
                  <textarea
                    rows={3}
                    placeholder="Frosted champagne-gold interface styling&#10;Monocraft font for branding"
                    value={newChangelog.features}
                    onChange={(e) => setNewChangelog({ ...newChangelog, features: e.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span className="admin-field-label">Bug Fixes (one per line):</span>
                  <textarea
                    rows={3}
                    placeholder="Console hydration mismatch eliminated&#10;Smooth scroll performance improved"
                    value={newChangelog.fixes}
                    onChange={(e) => setNewChangelog({ ...newChangelog, fixes: e.target.value })}
                  />
                </label>
              </div>
              <button type="submit" className="button button-primary">
                <Plus size={16} /> Publish Release
              </button>
            </form>

            <div className="admin-changelog-list">
              {content.changelog.map((entry) => (
                <div key={entry.id} className="admin-changelog-row">
                  <div>
                    <div className="admin-entry-meta">
                      <Badge gold>{entry.version}</Badge>
                      <span>{entry.date}</span>
                    </div>
                    <h4>{entry.title}</h4>
                    {entry.features && entry.features.length > 0 && (
                      <p><b>Features:</b> {entry.features.join(', ')}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    title="Delete release note"
                    onClick={() => handleDeleteChangelog(entry.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 6: BACKUP & RESTORE */}
        {activeTab === 'settings' && (
          <section className="admin-panel-card">
            <div className="admin-card-header">
              <div>
                <h2>Data Backup & Local Reset</h2>
                <p>Backup or restore your local preview customization data.</p>
              </div>
            </div>

            <div className="admin-customizer-split">
              <div className="admin-editor-column">
                <h3>Export Site Data</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
                  Download a complete JSON snapshot of all modules, sneak peeks, and custom screenshot paths.
                </p>
                <button type="button" onClick={handleExportBackup} className="button button-secondary">
                  Export JSON Backup
                </button>
              </div>

              <div className="admin-preview-column">
                <h3>Import / Reset</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5, marginBottom: '16px' }}>
                  Restore configuration from a previously exported JSON backup, or restore original factory defaults.
                </p>
                <div className="admin-action-row" style={{ flexWrap: 'wrap' }}>
                  <label className="button button-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                    Import JSON Backup
                    <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
                  </label>
                  <button type="button" onClick={handleResetDefaults} className="button button-ghost" style={{ color: '#d9534f' }}>
                    Reset to Factory Defaults
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
