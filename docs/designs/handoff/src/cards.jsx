// Card-based grid layout for the roster

function RosterCards({ rows, hoverTrait, setHoverTrait, traitStyle }) {
  return (
    <div className="cards-wrap">
      {rows.map(tm => {
        const hue = window.CLANS[tm.clan].hue;
        return (
          <div key={tm.id} className="card">
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
              background: hue, opacity: 0.7,
            }} />
            <div className="card-hd">
              <span className="nm">{tm.name}</span>
              <span className="cell-level">{tm.level}</span>
            </div>
            <div className="card-meta">
              <ClanTag clan={tm.clan} />
              <b>{tm.klass}</b>
              <span className="dot" />
              <GroupTag group={tm.group} />
            </div>
            <div className="card-title-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{tm.title === '—' ? <span style={{ color: 'var(--faint)' }}>—</span> : tm.title}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-strong)' }} />
              <span style={{ fontFamily: 'var(--sans)', fontStyle: 'normal', color: 'var(--muted)', fontSize: 11 }}>
                {tm.location}
              </span>
            </div>
            <div className="card-traits">
              <TraitsCell traits={tm.traits} style={traitStyle}
                onHover={(t, el) => setHoverTrait(t ? { t, el } : null)} />
            </div>
            <div className="card-foot">
              <StatusPill status={tm.status} />
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 9.5,
                color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {tm.traits.length} traits
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { RosterCards });
