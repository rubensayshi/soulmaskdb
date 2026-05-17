// App shell — Win11 chrome, screen routing, tweaks panel, hotkey
const { useState: ause, useEffect: auseEffect, useMemo: auseMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layout": "table",
  "traitStyle": "badges-pips",
  "accent": "sage",
  "density": "comfortable",
  "showProf": true,
  "grain": true,
  "statusAnim": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Demo screen state — empty / roster / capture-modal / review / settings
  const [screen, setScreen] = ause('roster'); // start with roster shown
  const [modal, setModal] = ause(null); // null | 'capture' | 'settings'
  const [reviewActive, setReviewActive] = ause(false);

  const [query, setQuery] = ause('');
  const [filters, setFilters] = ause({ clan: 'all', status: 'all', groups: [] });
  const [sort, setSort] = ause({ k: 'name', dir: 'asc' });
  const [expanded, setExpanded] = ause(window.ROSTER[0].id);  // first row open by default
  const [selectedSplit, setSelectedSplit] = ause(window.ROSTER[0].id);
  const [hoverTrait, setHoverTrait] = ause(null);

  // Global hotkey to trigger capture
  auseEffect(() => {
    function onKey(e) {
      if (e.altKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        setModal('capture');
      }
      if (e.key === 'Escape') {
        if (modal) setModal(null);
        if (reviewActive) setReviewActive(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, reviewActive]);

  const rows = auseMemo(() =>
    sortRows(filterRows(window.ROSTER, filters, query), sort),
    [filters, query, sort]
  );

  function handleCaptureDone(next) {
    setModal(null);
    if (next === 'review') {
      setReviewActive(true);
    }
  }

  function reset(scr) {
    setScreen(scr);
    setModal(null);
    setReviewActive(false);
  }

  // Compose app classes
  const appCls = [
    'app',
    'accent-' + t.accent,
    'density-' + t.density,
    t.grain ? '' : 'no-grain',
    t.statusAnim ? '' : 'no-status-anim',
  ].filter(Boolean).join(' ');

  return (
    <div className="win">
      {/* Win11 title bar */}
      <div className="titlebar">
        <div className="tb-left">
          <span className="tb-icon"><IcoCompass size={16} /></span>
          <span className="tb-title">Soulmask Codex<span className="ver">v0.4.0 · TAURI</span></span>
        </div>
        <div className="tb-center">
          <span className="tb-hotkey">
            <span className="dot" />
            CAPTURE READY · <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>
          </span>
        </div>
        <div className="tb-right">
          <button className="tb-icon-btn"><WinMin /></button>
          <button className="tb-icon-btn"><WinMax /></button>
          <button className="tb-icon-btn close"><WinClose /></button>
        </div>
      </div>

      <div className={appCls}>
        {/* Left rail */}
        <div className="rail">
          <div className="rail-logo"><IcoCompass size={22} /></div>
          <button className={'rail-btn ' + (screen === 'roster' && !reviewActive ? 'active' : '')}
            onClick={() => reset('roster')} title="Roster">
            <IcoUsers />
          </button>
          <button className="rail-btn" onClick={() => setModal('capture')} title="Capture (Alt+Shift+S)">
            <IcoCamera />
          </button>
          <button className={'rail-btn ' + (reviewActive ? 'active' : '')}
            onClick={() => setReviewActive(true)} title="Review queue">
            <IcoFlag />
            <span className="badge">{window.REVIEW_ITEMS.length}</span>
          </button>
          <div className="rail-spacer" />
          <button className={'rail-btn ' + (screen === 'empty' ? 'active' : '')}
            onClick={() => reset('empty')} title="Show empty state (demo)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" strokeLinecap="round" />
            </svg>
          </button>
          <button className="rail-btn" onClick={() => setModal('settings')} title="Settings">
            <IcoCog />
          </button>
        </div>

        {/* Main */}
        <div className="main">
          {screen === 'roster' && !reviewActive && (
            <>
              <div className="topbar">
                <h1>Tribesman <em>Roster</em></h1>
                <span className="top-count"><b>{rows.length}</b> / {window.ROSTER.length} tribesmen</span>
                <span style={{
                  fontFamily: 'var(--serif)', fontStyle: 'italic',
                  color: 'var(--muted)', fontSize: 13,
                }}>· captured 17 minutes ago</span>
                <span className="top-spacer" />
                <div className="seg" role="tablist" aria-label="Layout">
                  <button className={t.layout === 'table' ? 'on' : ''}
                    onClick={() => setTweak('layout', 'table')} title="Table"><IcoTable />Table</button>
                  <button className={t.layout === 'cards' ? 'on' : ''}
                    onClick={() => setTweak('layout', 'cards')} title="Cards"><IcoCards />Cards</button>
                  <button className={t.layout === 'split' ? 'on' : ''}
                    onClick={() => setTweak('layout', 'split')} title="Split"><IcoSplit />Split</button>
                </div>
                <div className="search">
                  <IcoSearch />
                  <input placeholder="Search name, clan, title…"
                    value={query} onChange={e => setQuery(e.target.value)} />
                  <kbd>⌘K</kbd>
                </div>
                <button className="btn">
                  <IcoExport />
                  Export
                </button>
                <button className="btn primary" onClick={() => setModal('capture')}>
                  <IcoCamera size={12} />
                  Capture
                </button>
              </div>

              {t.layout !== 'split' && (
                <FilterBar filters={filters} setFilters={setFilters} query={query} setQuery={setQuery} />
              )}

              <div className="content">
                {t.layout === 'table' && (
                  <RosterTable
                    rows={rows} sort={sort} setSort={setSort}
                    expanded={expanded} setExpanded={setExpanded}
                    hoverTrait={hoverTrait} setHoverTrait={setHoverTrait}
                    traitStyle={t.traitStyle} showProf={t.showProf}
                  />
                )}
                {t.layout === 'cards' && (
                  <RosterCards rows={rows}
                    hoverTrait={hoverTrait} setHoverTrait={setHoverTrait}
                    traitStyle={t.traitStyle === 'badges-pips' ? 'top-3' : t.traitStyle} />
                )}
                {t.layout === 'split' && (
                  <RosterSplit rows={rows}
                    selectedId={selectedSplit} setSelectedId={setSelectedSplit}
                    traitStyle={t.traitStyle} showProf={t.showProf} />
                )}
              </div>
            </>
          )}

          {screen === 'empty' && !reviewActive && (
            <>
              <div className="topbar">
                <h1>Tribesman <em>Roster</em></h1>
                <span className="top-count"><b>0</b> tribesmen · empty roster</span>
                <span className="top-spacer" />
                <button className="btn primary" onClick={() => setModal('capture')}>
                  <IcoCamera size={12} />
                  Capture
                </button>
              </div>
              <div className="content">
                <EmptyState onCapture={() => setModal('capture')} />
              </div>
            </>
          )}

          {reviewActive && (
            <>
              <div className="topbar">
                <button className="btn" onClick={() => setReviewActive(false)}>
                  <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><IcoChev /></span>
                  Back to roster
                </button>
                <span className="top-spacer" />
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>◆ CAPTURE · 14 NEW · {window.REVIEW_ITEMS.length} NEED REVIEW</span>
              </div>
              <div className="content">
                <ReviewScreen onDone={() => setReviewActive(false)} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tooltip overlay */}
      {hoverTrait && <TraitTooltip trait={hoverTrait.t} anchor={hoverTrait.el} />}

      {/* Modals */}
      {modal === 'capture' && (
        <CaptureModal onClose={() => setModal(null)} onDone={handleCaptureDone} />
      )}
      {modal === 'settings' && (
        <SettingsModal onClose={() => setModal(null)} />
      )}

      {/* Tweaks */}
      <TweaksPanel>
        <TweakSection label="Density & columns" />
        <TweakRadio label="Density" value={t.density}
          options={['compact', 'comfortable']}
          onChange={v => setTweak('density', v)} />
        <TweakToggle label="Proficiency column" value={t.showProf}
          onChange={v => setTweak('showProf', v)} />

        <TweakSection label="Traits" />
        <TweakSelect label="Display style" value={t.traitStyle}
          options={[
            { value: 'badges-pips', label: 'Badges + star pips' },
            { value: 'badges-only', label: 'Badges only' },
            { value: 'top-3',       label: 'Top 3 + “+N more”' },
            { value: 'chips',       label: 'Text chips with name' },
          ]}
          onChange={v => setTweak('traitStyle', v)} />

        <TweakSection label="Theme" />
        <TweakRadio label="Accent" value={t.accent}
          options={['sage', 'amber', 'blue', 'mono']}
          onChange={v => setTweak('accent', v)} />
        <TweakToggle label="Parchment grain" value={t.grain}
          onChange={v => setTweak('grain', v)} />
        <TweakToggle label="Status animations" value={t.statusAnim}
          onChange={v => setTweak('statusAnim', v)} />

        <TweakSection label="Demo · screens" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          <button className="pick-opt" style={{ color: 'var(--text)' }}
            onClick={() => reset('roster')}>Roster</button>
          <button className="pick-opt" style={{ color: 'var(--text)' }}
            onClick={() => reset('empty')}>Empty state</button>
          <button className="pick-opt" style={{ color: 'var(--text)' }}
            onClick={() => setModal('capture')}>Capture</button>
          <button className="pick-opt" style={{ color: 'var(--text)' }}
            onClick={() => { setReviewActive(true); setModal(null); }}>Review</button>
          <button className="pick-opt" style={{ color: 'var(--text)', gridColumn: 'span 2' }}
            onClick={() => setModal('settings')}>Settings</button>
        </div>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
