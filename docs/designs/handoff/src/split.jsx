// Split layout — list on left, full detail on right

function RosterSplit({ rows, selectedId, setSelectedId, traitStyle, showProf }) {
  const sel = rows.find(r => r.id === selectedId) || rows[0];
  return (
    <div className="split">
      <div className="list-col">
        {rows.map(tm => (
          <div key={tm.id}
            className={'split-item ' + (sel && sel.id === tm.id ? 'sel' : '')}
            onClick={() => setSelectedId(tm.id)}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: window.CLANS[tm.clan].hue, flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="nm" style={{
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{tm.name}</div>
              <div className="sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>LV.{tm.level}</span>
                <span style={{ color: 'var(--faint)' }}>·</span>
                <GroupTag group={tm.group} />
              </div>
            </div>
            <StatusPill status={tm.status} />
          </div>
        ))}
      </div>
      <div className="detail-col">
        {sel && (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 500 }}>{sel.name}</h2>
              <span className="cell-level" style={{ fontSize: 22 }}>{sel.level}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <ClanTag clan={sel.clan} />
              <GroupTag group={sel.group} />
              <span style={{ color: 'var(--text-dim)' }}>{sel.klass}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-strong)' }} />
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--gold)', fontSize: 17 }}>{sel.title}</span>
            </div>
            <div style={{
              padding: 14, background: 'oklch(0.18 0.008 130 / 0.5)',
              border: '1px solid var(--border-soft)', borderRadius: 'var(--r)',
              marginBottom: 22, display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11.5 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>◆ Location</span>
                <span>{sel.location}</span>
              </div>
              <StatusPill status={sel.status} />
            </div>
            <ExpandedRow tm={sel} showProf={showProf} />
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { RosterSplit });
