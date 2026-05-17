import { IcoCamera, IcoExport } from '../components/Icons'

interface Props {
  onCapture: () => void
}

export function EmptyState({ onCapture }: Props) {
  return (
    <div className="grid place-items-center h-full relative" style={{ padding: 40 }}>
      {/* Radar background */}
      <div className="absolute inset-0 grid place-items-center pointer-events-none" style={{ opacity: 0.55, zIndex: 1 }}>
        <Radar size={520} />
      </div>

      {/* Content */}
      <div className="text-center relative" style={{ maxWidth: 540, zIndex: 2 }}>
        <div className="inline-flex items-center gap-2.5 mb-1">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-gold)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            ◆ The Tribesman Atlas
          </span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 56, fontWeight: 600, margin: '24px 0 4px', letterSpacing: '0.005em', lineHeight: 1 }}>
          NO ROSTER
          <em style={{ fontStyle: 'italic', color: 'var(--color-accent)', fontWeight: 500, display: 'block' }}>yet captured.</em>
        </h2>

        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-text-dim)', fontSize: 18, margin: '0 0 18px' }}>
          Your tribe will appear once the codex sees them.
        </p>

        <p style={{ color: 'var(--color-muted)', fontSize: 13, maxWidth: 420, margin: '0 auto 28px', lineHeight: 1.6 }}>
          Open the in-game tribesman list, then trigger a capture. Multiple screenshots will be
          merged into a single roster — deduplicated by name. The codex parses names, levels,
          clans, classes, titles and trait icons through the local recognition pipeline.
        </p>

        <div className="inline-flex items-center gap-2.5">
          <span className="inline-flex gap-1 items-center" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-dim)' }}>
            <Kbd>Alt</Kbd>
            <span style={{ color: 'var(--color-faint)' }}>+</span>
            <Kbd>Shift</Kbd>
            <span style={{ color: 'var(--color-faint)' }}>+</span>
            <Kbd>S</Kbd>
            <span style={{ color: 'var(--color-muted)', marginLeft: 8 }}>to capture</span>
          </span>
          <span style={{ color: 'var(--color-faint)' }}>·</span>
          <button className="btn-primary" onClick={onCapture}>
            <IcoCamera size={12} />
            Capture now
          </button>
          <button className="btn-outline" onClick={onCapture}>
            <IcoExport size={12} />
            Import images
          </button>
        </div>

        <div className="flex justify-center gap-5 mt-9" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--color-muted)', textTransform: 'uppercase' }}>
          <span>◇ Local-only · no cloud sync</span>
          <span>◇ Encrypted at rest</span>
          <span>◇ Tauri sidecar v0.3.1</span>
        </div>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      background: 'var(--color-bg-elev)',
      border: '1px solid var(--color-border)',
      borderBottomWidth: 2,
      borderRadius: 3,
      padding: '3px 7px',
      fontSize: 10.5,
      fontFamily: 'var(--font-mono)',
    }}>
      {children}
    </kbd>
  )
}

function Radar({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400">
      <defs>
        <radialGradient id="rg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.30 0.04 140)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.30 0.04 140)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sweep" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="200" r="190" fill="url(#rg)" />
      {[40, 80, 120, 160].map(r => (
        <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="var(--color-accent-soft)" strokeWidth="0.5" opacity="0.45" />
      ))}
      <line x1="10" y1="200" x2="390" y2="200" stroke="var(--color-accent-soft)" strokeWidth="0.5" opacity="0.5" />
      <line x1="200" y1="10" x2="200" y2="390" stroke="var(--color-accent-soft)" strokeWidth="0.5" opacity="0.5" />
      {[0, 90, 180, 270].map(a => (
        <g key={a} transform={`rotate(${a} 200 200)`}>
          <path d="M200 8 L194 18 L206 18 Z" fill="var(--color-accent)" opacity="0.7" />
        </g>
      ))}
      <g transform="translate(200 200)">
        <path d="M0 0 L0 -180 A 180 180 0 0 1 156 -90 Z" fill="url(#sweep)">
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6s" repeatCount="indefinite" />
        </path>
      </g>
      <g transform="translate(200 200)">
        <path d="M0 -38 L26 0 L0 38 L-26 0 Z" fill="none" stroke="var(--color-accent)" strokeWidth="1.2" />
        <circle cx="-6" cy="-2" r="2.4" fill="var(--color-gold)" />
        <circle cx="6" cy="-2" r="2.4" fill="var(--color-gold)" />
        <line x1="0" y1="6" x2="0" y2="20" stroke="var(--color-accent)" strokeWidth="1.2" />
      </g>
    </svg>
  )
}
