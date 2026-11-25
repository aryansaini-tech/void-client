const systems = [
  {
    id: 'void-sodium',
    name: 'VOID Sodium',
    status: 'Rendering core',
    description: 'Batches compatible VOID 3D geometry and reuses vertex colors within each batch to limit repeated rendering work.',
  },
  {
    id: 'distant-worlds',
    name: 'Distant Worlds',
    status: 'Experimental preview',
    description: 'Capture a loaded terrain section and inspect a miniature with multiple detail levels. Full-world terrain rendering is not available yet.',
  },
  {
    id: 'visibility-culling',
    name: 'Visibility & Culling',
    status: 'VOID visuals',
    description: 'Distance filtering for VOID hitboxes, with an experimental camera-aware visibility filter for Chunk Borders. Minecraft terrain remains unchanged.',
  },
  {
    id: 'adaptive-controller',
    name: 'Adaptive Controller',
    status: 'Opt-in',
    description: 'Adjusts Full, Lite and Flat interface quality using recent frame times. Your manual choice takes priority.',
  },
  {
    id: 'frame-pacing',
    name: 'Frame Pacing & Diagnostics',
    status: 'Diagnostics',
    description: 'Tracks frame-time spikes and can defer VOID background work after slow frames. A built-in benchmark helps you inspect your setup.',
  },
  {
    id: 'hardware-profiles',
    name: 'Hardware Profiles',
    status: 'Editable profiles',
    description: 'Sets VOID work budgets, batching limits and cache ceilings for your hardware, with profiles you can adjust.',
  },
  {
    id: 'glass-cache',
    name: 'Glass & Cache Budgets',
    status: 'UI controls',
    description: 'Choose a glass quality level and cap the memory used by its effect cache.',
  },
];

export default function SystemFeatures({ Link, Icon }) {
  return <section className="system-section" id="client-systems" aria-labelledby="systems-title">
    <div className="wrap">
      <div className="system-intro" data-scroll-reveal>
        <h2 id="systems-title">The systems<br />behind VOID.</h2>
        <p>Rendering, visibility, frame timing and interface control, together in one client.</p>
      </div>
      <div className="system-list" aria-label="Major VOID systems">
        {systems.map(system => <article className="system-row" id={system.id} key={system.id}>
          <h3>{system.name}</h3>
          <p>{system.description}</p>
          <span className="system-status">{system.status}</span>
        </article>)}
      </div>
      <div className="system-footer">
        <Link className="text-link" to="/modules">View the module catalog<Icon /></Link>
      </div>
    </div>
  </section>;
}
