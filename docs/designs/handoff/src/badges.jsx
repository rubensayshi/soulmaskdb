// Trait badges: hexagon (learned), diamond (preference), shield (innate)
// + the inner symbol drawn programmatically from trait id

// Pick a glyph shape based on hash of trait id, so it looks distinct
function trGlyph(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 10;
}

const SHAPE_COLORS = {
  hexagon: { stroke: 'oklch(0.78 0.06 165)', fill: 'oklch(0.24 0.04 165)', glyph: 'oklch(0.82 0.07 165)' },
  diamond: { stroke: 'oklch(0.80 0.06 130)', fill: 'oklch(0.24 0.04 130)', glyph: 'oklch(0.85 0.07 130)' },
  shield:  { stroke: 'oklch(0.78 0.10 80)',  fill: 'oklch(0.24 0.05 80)',  glyph: 'oklch(0.85 0.10 80)' },
};

function Glyph({ kind, color }) {
  // 10 procedural glyphs — abstract symbols
  const c = color;
  const w = 1.2;
  switch (kind) {
    case 0: return <path d="M12 7v10M7 12h10" stroke={c} strokeWidth={w} strokeLinecap="round" />;
    case 1: return <><circle cx="12" cy="12" r="3.5" stroke={c} strokeWidth={w} fill="none"/><circle cx="12" cy="12" r="1" fill={c}/></>;
    case 2: return <path d="M8 8l8 8M16 8l-8 8" stroke={c} strokeWidth={w} strokeLinecap="round" />;
    case 3: return <path d="M12 6l3 5h-6l3-5zM12 18l-3-5h6l-3 5z" fill={c} />;
    case 4: return <><path d="M8 13l3 3 5-6" stroke={c} strokeWidth={w + 0.2} fill="none" strokeLinecap="round" strokeLinejoin="round"/></>;
    case 5: return <><circle cx="9" cy="12" r="1.5" fill={c}/><circle cx="15" cy="12" r="1.5" fill={c}/><path d="M9 12 Q 12 8 15 12" stroke={c} strokeWidth={w} fill="none"/></>;
    case 6: return <path d="M12 6 L16 12 L12 18 L8 12 Z" stroke={c} strokeWidth={w} fill="none"/>;
    case 7: return <><path d="M8 8h8v8h-8z" stroke={c} strokeWidth={w} fill="none"/><path d="M10 10h4v4h-4z" fill={c}/></>;
    case 8: return <><path d="M12 7v10" stroke={c} strokeWidth={w}/><path d="M9 10l3-3 3 3M9 14l3 3 3-3" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round"/></>;
    case 9: return <><circle cx="12" cy="12" r="5" stroke={c} strokeWidth={w} fill="none" opacity="0.5"/><path d="M12 9v6M9 12h6" stroke={c} strokeWidth={w} strokeLinecap="round"/></>;
  }
  return null;
}

function HexFrame({ stroke, fill }) {
  return (
    <>
      <path d="M12 2 L20.5 7 L20.5 17 L12 22 L3.5 17 L3.5 7 Z" fill={fill} stroke={stroke} strokeWidth="1" />
    </>
  );
}
function DiamondFrame({ stroke, fill }) {
  return <path d="M12 2 L22 12 L12 22 L2 12 Z" fill={fill} stroke={stroke} strokeWidth="1" />;
}
function ShieldFrame({ stroke, fill }) {
  return <path d="M12 2 L21 5 L21 12 Q 21 19 12 22 Q 3 19 3 12 L3 5 Z" fill={fill} stroke={stroke} strokeWidth="1" />;
}

function TraitBadge({ trait, size = 22, withPips = true }) {
  const shape = trait.shape;
  const c = SHAPE_COLORS[shape];
  const g = trGlyph(trait.id);
  return (
    <span className="trait-badge" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1, lineHeight: 0 }}>
      <svg width={size} height={size} viewBox="0 0 24 24">
        {shape === 'hexagon' && <HexFrame stroke={c.stroke} fill={c.fill} />}
        {shape === 'diamond' && <DiamondFrame stroke={c.stroke} fill={c.fill} />}
        {shape === 'shield'  && <ShieldFrame  stroke={c.stroke} fill={c.fill} />}
        <Glyph kind={g} color={c.glyph} />
      </svg>
      {withPips && (
        <span style={{ display: 'flex', gap: 1.5 }}>
          {[1, 2, 3].map(s => (
            <span key={s} style={{
              width: 3, height: 3, borderRadius: '50%',
              background: s <= trait.star ? 'var(--gold)' : 'oklch(0.30 0.010 130)',
            }} />
          ))}
        </span>
      )}
    </span>
  );
}

// Bigger version used in tooltip/detail panes
function TraitBadgeLg({ trait }) {
  return <TraitBadge trait={trait} size={34} withPips={false} />;
}

Object.assign(window, { TraitBadge, TraitBadgeLg, SHAPE_COLORS, trGlyph, Glyph, HexFrame, DiamondFrame, ShieldFrame });
