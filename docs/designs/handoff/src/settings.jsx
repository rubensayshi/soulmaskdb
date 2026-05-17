// Settings modal — hotkey, capture target, data path
const { useState: suseState } = React;

function SettingsModal({ onClose }) {
  const [hotkey, setHotkey] = suseState({ alt: true, shift: true, ctrl: false, key: 'S' });
  const [target, setTarget] = suseState('soulmask.exe');
  const [dataPath] = suseState('C:\\Users\\Verdun\\AppData\\Local\\Soulmask Codex\\roster.json');
  const [autoMerge, setAutoMerge] = suseState(true);
  const [dedupBy, setDedupBy] = suseState('name');
  const [launch, setLaunch] = suseState(false);
  const [confTh, setConfTh] = suseState(80);

  function Toggle({ on, onChange }) {
    return <button className={'toggle ' + (on ? 'on' : '')} onClick={() => onChange(!on)} />;
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal settings-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <h2>Settings</h2>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="setting-grp">
          <h3>◆ Capture</h3>

          <div className="setting-row">
            <div>
              <div className="lbl">Global hotkey</div>
              <div className="sub">Triggers capture from any window.</div>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 11 }}>
              <button className={'pick-opt ' + (hotkey.ctrl ? 'sel' : '')}
                onClick={() => setHotkey({ ...hotkey, ctrl: !hotkey.ctrl })}>Ctrl</button>
              <span style={{ color: 'var(--faint)' }}>+</span>
              <button className={'pick-opt ' + (hotkey.alt ? 'sel' : '')}
                onClick={() => setHotkey({ ...hotkey, alt: !hotkey.alt })}>Alt</button>
              <span style={{ color: 'var(--faint)' }}>+</span>
              <button className={'pick-opt ' + (hotkey.shift ? 'sel' : '')}
                onClick={() => setHotkey({ ...hotkey, shift: !hotkey.shift })}>Shift</button>
              <span style={{ color: 'var(--faint)' }}>+</span>
              <input className="field" style={{ width: 40, textAlign: 'center', minWidth: 0, padding: '5px 6px' }}
                value={hotkey.key}
                onChange={e => setHotkey({ ...hotkey, key: e.target.value.slice(-1).toUpperCase() })} />
            </div>
          </div>

          <div className="setting-row">
            <div>
              <div className="lbl">Capture target</div>
              <div className="sub">Window to screenshot when hotkey is pressed.</div>
            </div>
            <select className="field" value={target} onChange={e => setTarget(e.target.value)}>
              <option value="soulmask.exe">SoulMask.exe (auto)</option>
              <option value="primary-monitor">Primary monitor</option>
              <option value="region">Custom region…</option>
            </select>
          </div>

          <div className="setting-row">
            <div>
              <div className="lbl">Confidence threshold</div>
              <div className="sub">Below this, the row is flagged for review.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="range" min="50" max="95" step="5"
                value={confTh} onChange={e => setConfTh(+e.target.value)}
                style={{ width: 140, accentColor: 'var(--accent)' }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', minWidth: 32 }}>{confTh}%</span>
            </div>
          </div>
        </div>

        <div className="setting-grp">
          <h3>◆ Roster</h3>

          <div className="setting-row">
            <div>
              <div className="lbl">Auto-merge captures</div>
              <div className="sub">New captures append to the current roster.</div>
            </div>
            <Toggle on={autoMerge} onChange={setAutoMerge} />
          </div>

          <div className="setting-row">
            <div>
              <div className="lbl">Deduplicate by</div>
              <div className="sub">How to match tribesmen across captures.</div>
            </div>
            <select className="field" value={dedupBy} onChange={e => setDedupBy(e.target.value)}>
              <option value="name">Name</option>
              <option value="name-level">Name + level</option>
              <option value="all">Name + clan + class</option>
            </select>
          </div>

          <div className="setting-row">
            <div>
              <div className="lbl">Data location</div>
              <div className="sub">Where the roster is persisted.</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input className="field path" value={dataPath} readOnly />
              <button className="btn" style={{ height: 28, padding: '0 8px', fontSize: 11 }}>Browse…</button>
            </div>
          </div>
        </div>

        <div className="setting-grp">
          <h3>◆ Sidecar</h3>

          <div className="setting-row">
            <div>
              <div className="lbl">Python recognition pipeline</div>
              <div className="sub">OpenCV 4.9 · Tesseract 5.3 · trait-classifier 0.4.2</div>
            </div>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em',
              padding: '4px 10px', border: '1px solid var(--accent-soft)',
              borderRadius: 999, color: 'var(--accent)', background: 'var(--accent-glow)',
            }}>● RUNNING</span>
          </div>

          <div className="setting-row">
            <div>
              <div className="lbl">Launch with Windows</div>
              <div className="sub">Start the sidecar at system boot.</div>
            </div>
            <Toggle on={launch} onChange={setLaunch} />
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsModal });
