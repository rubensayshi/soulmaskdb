// Main roster — table layout with sort, expand, filter
const { useState, useMemo } = React;

function FilterBar({ filters, setFilters, query, setQuery }) {
  const clans = ['Claw', 'Flint', 'Fang', 'Wolf', 'Horn', 'Exile', 'DLC'];
  const statuses = ['idle', 'hosting', 'mining', 'work-break', 'resting'];
  const groups = window.GROUPS || [];

  function toggleGroup(id) {
    const cur = filters.groups || [];
    const next = cur.includes(id) ? cur.filter(g => g !== id) : [...cur, id];
    setFilters({ ...filters, groups: next });
  }
  const groupSel = (filters.groups || []);
  const allGroupsActive = groupSel.length === 0;

  return (
    <div className="filterbar">
      <span className="label">Clan</span>
      <button className={'chip ' + (filters.clan === 'all' ? 'on' : '')}
        onClick={() => setFilters({ ...filters, clan: 'all' })}>All</button>
      {clans.map(c => {
        const hue = window.CLANS[c].hue;
        return (
          <button key={c} className={'chip ' + (filters.clan === c ? 'on' : '')}
            onClick={() => setFilters({ ...filters, clan: c })}
            style={filters.clan === c ? { color: hue, borderColor: hue } : {}}>
            <span className="dot" style={{ background: hue }} />
            {c}
          </button>
        );
      })}
      <span style={{ width: 14 }} />
      <span className="label">Status</span>
      <button className={'chip ' + (filters.status === 'all' ? 'on' : '')}
        onClick={() => setFilters({ ...filters, status: 'all' })}>Any</button>
      {statuses.map(s => (
        <button key={s} className={'chip ' + (filters.status === s ? 'on' : '')}
          onClick={() => setFilters({ ...filters, status: s })}>
          {window.STATUS_LABEL[s]}
        </button>
      ))}
      <span style={{ flexBasis: '100%', height: 0 }} />
      <span className="label">Group</span>
      <button className={'chip ' + (allGroupsActive ? 'on' : '')}
        onClick={() => setFilters({ ...filters, groups: [] })}>All</button>
      {groups.map(g => {
        const on = groupSel.includes(g.id);
        return (
          <button key={g.id} className={'chip ' + (on ? 'on' : '')}
            onClick={() => toggleGroup(g.id)} title={g.hint}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              color: on ? 'var(--accent)' : 'var(--muted)',
            }}>
              <svg width="8" height="8" viewBox="0 0 10 10">
                <circle cx="2" cy="2" r="1.2" fill="currentColor" />
                <circle cx="5" cy="2" r="1.2" fill="currentColor" />
                <circle cx="8" cy="2" r="1.2" fill="currentColor" />
                <circle cx="2" cy="5" r="1.2" fill="currentColor" />
                <circle cx="5" cy="5" r="1.2" fill="currentColor" />
                <circle cx="8" cy="5" r="1.2" fill="currentColor" />
              </svg>
            </span>
            {g.name}
          </button>
        );
      })}
      {!allGroupsActive && (
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--muted)',
          letterSpacing: '0.06em', marginLeft: 4,
        }}>
          · {groupSel.length} active
        </span>
      )}
    </div>
  );
}

function SortableTh({ k, label, sort, setSort, width }) {
  const active = sort.k === k;
  const onClick = () => setSort({ k, dir: active && sort.dir === 'asc' ? 'desc' : 'asc' });
  return (
    <th className={active ? 'sorted' : ''} style={{ width }} onClick={onClick}>
      {label}<span className="sort">{active ? (sort.dir === 'asc' ? '▲' : '▼') : '▲'}</span>
    </th>
  );
}

function TraitDetailItem({ trait }) {
  const c = window.SHAPE_COLORS[trait.shape];
  const sourceLabel = trait.shape === 'hexagon' ? 'Learned · Talent'
    : trait.shape === 'diamond' ? 'Preference'
    : 'Innate · Tribe-born';
  return (
    <div className="trait-detail">
      <TraitBadgeLg trait={trait} />
      <div className="body">
        <div className="nm">
          {trait.name}
          <span className="stars">{'★'.repeat(trait.star)}</span>
        </div>
        <div className="src" style={{ color: c.stroke }}>{sourceLabel}</div>
        <div className="eff">{trait.eff}</div>
      </div>
    </div>
  );
}

function ExpandedRow({ tm, showProf }) {
  const byShape = {
    hexagon: tm.traits.filter(t => t.shape === 'hexagon'),
    diamond: tm.traits.filter(t => t.shape === 'diamond'),
    shield:  tm.traits.filter(t => t.shape === 'shield'),
  };
  return (
    <div className="detail">
      <div className="detail-section">
        <h3>◆ Details</h3>
        <dl className="meta-grid">
          <dt>Class</dt><dd>{tm.klass}</dd>
          <dt>Title</dt><dd><em>{tm.title}</em></dd>
          <dt>Group</dt><dd><GroupTag group={tm.group} /></dd>
          <dt>Location</dt><dd>{tm.location}</dd>
          <dt>Status</dt><dd><StatusPill status={tm.status} /></dd>
          <dt>Clan</dt><dd><ClanTag clan={tm.clan} /></dd>
        </dl>
        {showProf && (
          <>
            <h3>◆ Proficiencies</h3>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px 14px',
              fontSize: 11, color: 'var(--text-dim)',
            }}>
              {['Sword', 'Bow', 'Mining', 'Logging', 'Farming', 'Cooking', 'Smithing', 'Tanning'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase' }}>{s}</span>
                  <ProfGrid prof={Array.from({length: 8}, (_, k) => k < (tm.prof[i] || 0) * 2 ? 1 : 0)} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="detail-section">
        <h3>◆ Traits · {tm.traits.length}</h3>
        {byShape.hexagon.map(t => <TraitDetailItem key={t.id} trait={t} />)}
        {byShape.shield.map(t => <TraitDetailItem key={t.id} trait={t} />)}
        {byShape.diamond.map(t => <TraitDetailItem key={t.id} trait={t} />)}
      </div>
    </div>
  );
}

function RosterTable({ rows, sort, setSort, expanded, setExpanded, hoverTrait, setHoverTrait, traitStyle, showProf }) {
  return (
    <div className="table-wrap">
      <table className="roster">
        <thead>
          <tr>
            <th style={{ width: 24 }}></th>
            <SortableTh k="name"  label="Name"   sort={sort} setSort={setSort} />
            <SortableTh k="level" label="Lv."    sort={sort} setSort={setSort} width="72" />
            <SortableTh k="klass" label="Class"  sort={sort} setSort={setSort} width="160" />
            <SortableTh k="clan"  label="Clan"   sort={sort} setSort={setSort} width="100" />
            <SortableTh k="title" label="Title"  sort={sort} setSort={setSort} width="170" />
            <th style={{ width: '34%' }}>Traits</th>
            {showProf && <th style={{ width: 80 }}>Prof.</th>}
            <th style={{ width: 130 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(tm => {
            const open = expanded === tm.id;
            return (
              <React.Fragment key={tm.id}>
                <tr className={open ? 'open' : ''} onClick={() => setExpanded(open ? null : tm.id)}>
                  <td><span className="row-chev"><IcoChev /></span></td>
                  <td>
                    <div className="cell-name">{tm.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 1 }}>
                      <GroupTag group={tm.group} />
                      <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>· {tm.location}</span>
                    </div>
                  </td>
                  <td><span className="cell-level">{tm.level}</span></td>
                  <td><span className="cell-class">{tm.klass}</span></td>
                  <td><ClanTag clan={tm.clan} /></td>
                  <td><span className="cell-title">{tm.title === '—' ? <span style={{ color: 'var(--faint)' }}>—</span> : tm.title}</span></td>
                  <td>
                    <TraitsCell traits={tm.traits} style={traitStyle}
                      onHover={(t, el) => setHoverTrait(t ? { t, el } : null)} />
                  </td>
                  {showProf && <td><ProfGrid prof={tm.prof} /></td>}
                  <td><StatusPill status={tm.status} /></td>
                </tr>
                {open && (
                  <tr className="detail-row">
                    <td colSpan={showProf ? 9 : 8}>
                      <ExpandedRow tm={tm} showProf={showProf} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function sortRows(rows, sort) {
  const { k, dir } = sort;
  const mult = dir === 'asc' ? 1 : -1;
  return rows.slice().sort((a, b) => {
    const va = a[k], vb = b[k];
    if (typeof va === 'number') return (va - vb) * mult;
    return String(va).localeCompare(String(vb)) * mult;
  });
}

function filterRows(rows, filters, query) {
  return rows.filter(r => {
    if (filters.clan !== 'all' && r.clan !== filters.clan) return false;
    if (filters.status !== 'all' && r.status !== filters.status) return false;
    if (filters.groups && filters.groups.length > 0 && !filters.groups.includes(r.group)) return false;
    if (query) {
      const q = query.toLowerCase();
      const hay = (r.name + ' ' + r.title + ' ' + r.klass + ' ' + r.clan + ' ' + (r.group || '')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

Object.assign(window, { FilterBar, RosterTable, ExpandedRow, sortRows, filterRows });
