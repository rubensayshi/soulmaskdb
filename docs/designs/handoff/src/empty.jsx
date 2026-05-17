// Empty / first-run state — radar bg + call to capture

function EmptyState({ onCapture }) {
  return (
    <div className="empty">
      <div className="radar-bg"><Radar size={520} /></div>
      <div className="empty-inner">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--gold)',
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>◆ The Tribesman Atlas</span>
        </div>
        <h2>
          NO ROSTER
          <em>yet captured.</em>
        </h2>
        <p className="lede">Your tribe will appear once the codex sees them.</p>
        <p className="body">
          Open the in-game tribesman list, then trigger a capture. Multiple screenshots will be
          merged into a single roster — deduplicated by name. The codex parses names, levels,
          clans, classes, titles and trait icons through the local recognition pipeline.
        </p>
        <div className="empty-actions">
          <span className="kbd-block">
            <kbd>Alt</kbd>
            <span style={{ color: 'var(--faint)' }}>+</span>
            <kbd>Shift</kbd>
            <span style={{ color: 'var(--faint)' }}>+</span>
            <kbd>S</kbd>
            <span style={{ color: 'var(--muted)', marginLeft: 8 }}>to capture</span>
          </span>
          <span style={{ color: 'var(--faint)' }}>·</span>
          <button className="btn primary" onClick={onCapture}>
            <IcoCamera size={12} />
            Capture now
          </button>
          <button className="btn" onClick={onCapture}>
            <IcoExport size={12} />
            Import images
          </button>
        </div>
        <div style={{
          marginTop: 36, display: 'flex', justifyContent: 'center', gap: 22,
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em',
          color: 'var(--muted)', textTransform: 'uppercase',
        }}>
          <span>◇ Local-only · no cloud sync</span>
          <span>◇ Encrypted at rest</span>
          <span>◇ Tauri sidecar v0.3.1</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EmptyState });
