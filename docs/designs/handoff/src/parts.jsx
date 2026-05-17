// Shared building blocks: ClanTag, StatusPill, TraitsCell, Tooltip

function ClanTag({ clan }) {
  if (!clan) return null;
  const c = window.CLANS[clan];
  if (!c) return null;
  return (
    <span className="clan-tag" style={{ color: c.hue }}>
      <span className="dot" />{c.label}
    </span>
  );
}

function GroupTag({ group, muted = false }) {
  if (!group) return null;
  const g = (window.GROUPS || []).find(x => x.id === group);
  if (!g) return null;
  const isUnset = group === 'unassigned';
  return (
    <span className="group-tag" style={isUnset ? { opacity: 0.55, fontStyle: 'italic' } : {}}>
      <svg width="9" height="9" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
        <circle cx="2" cy="2" r="1.2" fill="currentColor" />
        <circle cx="5" cy="2" r="1.2" fill="currentColor" />
        <circle cx="8" cy="2" r="1.2" fill="currentColor" />
        <circle cx="2" cy="5" r="1.2" fill="currentColor" />
        <circle cx="5" cy="5" r="1.2" fill="currentColor" />
        <circle cx="8" cy="5" r="1.2" fill="currentColor" />
      </svg>
      {g.name}
    </span>
  );
}

function StatusPill({ status }) {
  const label = window.STATUS_LABEL[status] || status;
  return (
    <span className={'status ' + status}>
      <span className="ind" /> {label}
    </span>
  );
}

function ProfGrid({ prof }) {
  // 8 slots, render as 4x2 grid
  return (
    <span className="prof-grid" title="Proficiencies">
      {prof.map((v, i) => (
        <span key={i} className={v >= 3 ? 'gold' : v >= 1 ? 'on' : ''} />
      ))}
    </span>
  );
}

// Traits display switcher
function TraitsCell({ traits, style, onHover }) {
  // style: 'badges-pips' | 'badges-only' | 'top-3' | 'chips'
  if (style === 'chips') {
    const top = traits.slice(0, 4);
    return (
      <div className="traits-row">
        {top.map(t => (
          <span key={t.id} className="trait-chip"
            onMouseEnter={(e) => onHover && onHover(t, e.currentTarget)}
            onMouseLeave={() => onHover && onHover(null)}
          >
            <span style={{ color: window.SHAPE_COLORS[t.shape].stroke, fontSize: 9 }}>◆</span>
            {t.name}
          </span>
        ))}
        {traits.length > top.length && <span className="more">+{traits.length - top.length}</span>}
      </div>
    );
  }
  if (style === 'top-3') {
    const top = traits.slice(0, 3);
    return (
      <div className="traits-row">
        {top.map(t => (
          <span key={t.id}
            onMouseEnter={(e) => onHover && onHover(t, e.currentTarget)}
            onMouseLeave={() => onHover && onHover(null)}
          >
            <TraitBadge trait={t} withPips />
          </span>
        ))}
        {traits.length > 3 && <span className="more">+{traits.length - 3}</span>}
      </div>
    );
  }
  const withPips = style === 'badges-pips';
  return (
    <div className="traits-row">
      {traits.map(t => (
        <span key={t.id}
          onMouseEnter={(e) => onHover && onHover(t, e.currentTarget)}
          onMouseLeave={() => onHover && onHover(null)}
        >
          <TraitBadge trait={t} withPips={withPips} />
        </span>
      ))}
    </div>
  );
}

// Floating trait tooltip
function TraitTooltip({ trait, anchor }) {
  if (!trait || !anchor) return null;
  const r = anchor.getBoundingClientRect();
  // Position relative to scaled stage — but since we render inside the same scaled tree,
  // raw viewport rect is fine when measured from getBoundingClientRect against the doc.
  // We render in a portal-like absolute layer on the scaled stage.
  const winEl = anchor.closest('.win-scale');
  const scaleRect = winEl ? winEl.getBoundingClientRect() : { left: 0, top: 0, width: 1, height: 1 };
  const sx = winEl ? (1440 / scaleRect.width) : 1;
  const left = (r.left - scaleRect.left) * sx;
  const top = (r.bottom - scaleRect.top) * sx + 8;
  const c = window.SHAPE_COLORS[trait.shape];
  const sourceLabel = trait.shape === 'hexagon' ? 'Learned · Talent'
    : trait.shape === 'diamond' ? 'Preference'
    : 'Innate · Tribe-born';
  return (
    <div className="tooltip" style={{ left, top }}>
      <div className="h">
        <TraitBadgeLg trait={trait} />
        <div style={{ flex: 1 }}>
          <div className="nm">{trait.name}</div>
          <div className="stars">{'★'.repeat(trait.star)}<span style={{ color: 'var(--faint)' }}>{'★'.repeat(3 - trait.star)}</span></div>
        </div>
      </div>
      <div className="src" style={{ color: c.stroke }}>◆ {sourceLabel}</div>
      <div className="eff">{trait.eff}</div>
    </div>
  );
}

// Section header like "◆ FILTERS ─────"
function SecH({ children }) {
  return <div className="sec-h">{children}<span className="line" /></div>;
}

// Radar bg — animated sweep
function Radar({ size = 380 }) {
  return (
    <svg className="radar" width={size} height={size} viewBox="0 0 400 400">
      <defs>
        <radialGradient id="rg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.30 0.04 140)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.30 0.04 140)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sweep" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="200" r="190" fill="url(#rg)" />
      {[40, 80, 120, 160].map(r => (
        <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="var(--accent-soft)" strokeWidth="0.5" opacity="0.45" />
      ))}
      <line x1="10" y1="200" x2="390" y2="200" stroke="var(--accent-soft)" strokeWidth="0.5" opacity="0.5" />
      <line x1="200" y1="10" x2="200" y2="390" stroke="var(--accent-soft)" strokeWidth="0.5" opacity="0.5" />
      {/* Cardinal ticks */}
      {[0, 90, 180, 270].map(a => (
        <g key={a} transform={`rotate(${a} 200 200)`}>
          <path d="M200 8 L194 18 L206 18 Z" fill="var(--accent)" opacity="0.7" />
        </g>
      ))}
      {/* Sweep */}
      <g transform="translate(200 200)">
        <path d="M0 0 L0 -180 A 180 180 0 0 1 156 -90 Z" fill="url(#sweep)">
          <animateTransform attributeName="transform" type="rotate"
            from="0" to="360" dur="6s" repeatCount="indefinite" />
        </path>
      </g>
      {/* Center mask glyph */}
      <g transform="translate(200 200)">
        <path d="M0 -38 L26 0 L0 38 L-26 0 Z" fill="none" stroke="var(--accent)" strokeWidth="1.2" />
        <circle cx="-6" cy="-2" r="2.4" fill="var(--gold)" />
        <circle cx="6" cy="-2" r="2.4" fill="var(--gold)" />
        <line x1="0" y1="6" x2="0" y2="20" stroke="var(--accent)" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

Object.assign(window, { ClanTag, GroupTag, StatusPill, ProfGrid, TraitsCell, TraitTooltip, SecH, Radar });
