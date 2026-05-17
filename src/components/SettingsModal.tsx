import { useState } from 'react'
import { IcoX } from './Icons'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const [hotkey, setHotkey] = useState({ alt: true, shift: true, ctrl: false, key: 'S' })
  const [target, setTarget] = useState('soulmask.exe')
  const [dataPath] = useState('C:\\Users\\Verdun\\AppData\\Local\\Soulmask Codex\\roster.json')
  const [autoMerge, setAutoMerge] = useState(true)
  const [dedupBy, setDedupBy] = useState('name')
  const [launch, setLaunch] = useState(false)
  const [confTh, setConfTh] = useState(80)

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center"
      style={{ background: 'oklch(0.10 0.01 130 / 0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-[var(--radius-lg)] border border-border-soft overflow-hidden"
        style={{ width: 520, maxHeight: '80vh', background: 'var(--color-bg)', boxShadow: '0 24px 80px oklch(0 0 0 / 0.6)', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between sticky top-0 z-10" style={{ padding: '16px 22px', borderBottom: '1px solid var(--color-border-soft)', background: 'var(--color-bg)' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>Settings</h2>
          <button onClick={onClose} style={{ color: 'var(--color-muted)' }}><IcoX /></button>
        </div>

        {/* Capture group */}
        <SettingGroup title="Capture">
          <SettingRow label="Global hotkey" sub="Triggers capture from any window.">
            <div className="flex items-center gap-1" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              <HotkeyChip on={hotkey.ctrl} onClick={() => setHotkey({ ...hotkey, ctrl: !hotkey.ctrl })}>Ctrl</HotkeyChip>
              <span style={{ color: 'var(--color-faint)' }}>+</span>
              <HotkeyChip on={hotkey.alt} onClick={() => setHotkey({ ...hotkey, alt: !hotkey.alt })}>Alt</HotkeyChip>
              <span style={{ color: 'var(--color-faint)' }}>+</span>
              <HotkeyChip on={hotkey.shift} onClick={() => setHotkey({ ...hotkey, shift: !hotkey.shift })}>Shift</HotkeyChip>
              <span style={{ color: 'var(--color-faint)' }}>+</span>
              <input
                className="border rounded text-center bg-transparent outline-0"
                style={{
                  width: 40, height: 28, padding: '5px 6px',
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
                value={hotkey.key}
                onChange={e => setHotkey({ ...hotkey, key: e.target.value.slice(-1).toUpperCase() })}
              />
            </div>
          </SettingRow>

          <SettingRow label="Capture target" sub="Window to screenshot when hotkey is pressed.">
            <Select value={target} onChange={setTarget} options={[
              { value: 'soulmask.exe', label: 'SoulMask.exe (auto)' },
              { value: 'primary-monitor', label: 'Primary monitor' },
              { value: 'region', label: 'Custom region…' },
            ]} />
          </SettingRow>

          <SettingRow label="Confidence threshold" sub="Below this, the row is flagged for review.">
            <div className="flex items-center gap-2.5">
              <input
                type="range" min="50" max="95" step="5"
                value={confTh}
                onChange={e => setConfTh(+e.target.value)}
                style={{ width: 140, accentColor: 'var(--color-accent)' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-accent)', minWidth: 32 }}>
                {confTh}%
              </span>
            </div>
          </SettingRow>
        </SettingGroup>

        {/* Roster group */}
        <SettingGroup title="Roster">
          <SettingRow label="Auto-merge captures" sub="New captures append to the current roster.">
            <Toggle on={autoMerge} onChange={setAutoMerge} />
          </SettingRow>

          <SettingRow label="Deduplicate by" sub="How to match tribesmen across captures.">
            <Select value={dedupBy} onChange={setDedupBy} options={[
              { value: 'name', label: 'Name' },
              { value: 'name-level', label: 'Name + level' },
              { value: 'all', label: 'Name + clan + class' },
            ]} />
          </SettingRow>

          <SettingRow label="Data location" sub="Where the roster is persisted.">
            <div className="flex items-center gap-1.5">
              <input
                className="bg-transparent border rounded outline-0 truncate"
                style={{
                  width: 180, height: 28, padding: '5px 8px',
                  fontSize: 10.5, fontFamily: 'var(--font-mono)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-muted)',
                }}
                value={dataPath}
                readOnly
              />
              <button className="btn-outline" style={{ height: 28, padding: '0 8px', fontSize: 11 }}>Browse…</button>
            </div>
          </SettingRow>
        </SettingGroup>

        {/* Sidecar group */}
        <SettingGroup title="Sidecar">
          <SettingRow label="Python recognition pipeline" sub="OpenCV 4.9 · Tesseract 5.3 · trait-classifier 0.4.2">
            <span
              className="rounded-full"
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
                padding: '4px 10px',
                border: '1px solid var(--color-accent-soft)',
                color: 'var(--color-accent)',
                background: 'var(--color-accent-glow)',
              }}
            >
              ● RUNNING
            </span>
          </SettingRow>

          <SettingRow label="Launch with Windows" sub="Start the sidecar at system boot.">
            <Toggle on={launch} onChange={setLaunch} />
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
  )
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--color-border-soft)' }}>
      <h3 style={{
        margin: '0 0 14px',
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.14em', color: 'var(--color-accent)',
        textTransform: 'uppercase', fontWeight: 500,
      }}>
        ◆ {title}
      </h3>
      <div className="grid gap-4">{children}</div>
    </div>
  )
}

function SettingRow({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div style={{ fontSize: 13, color: 'var(--color-text)' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--color-muted)' }}>{sub}</div>
      </div>
      {children}
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className="rounded-full transition-all shrink-0"
      style={{
        width: 38, height: 20,
        background: on ? 'var(--color-accent)' : 'var(--color-border)',
        position: 'relative',
      }}
      onClick={() => onChange(!on)}
    >
      <span
        className="absolute rounded-full transition-all"
        style={{
          width: 14, height: 14, top: 3,
          left: on ? 21 : 3,
          background: on ? 'var(--color-text)' : 'var(--color-muted)',
        }}
      />
    </button>
  )
}

function HotkeyChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="rounded transition-all"
      style={{
        padding: '4px 8px',
        fontSize: 11,
        border: `1px solid ${on ? 'var(--color-accent-soft)' : 'var(--color-border-soft)'}`,
        background: on ? 'var(--color-accent-glow)' : 'transparent',
        color: on ? 'var(--color-accent)' : 'var(--color-muted)',
      }}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      className="rounded outline-0"
      style={{
        height: 28, padding: '4px 8px',
        fontSize: 12, fontFamily: 'var(--font-sans)',
        background: 'var(--color-bg-elev)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
      }}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
