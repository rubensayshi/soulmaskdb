// Review / correction screen
const { useState: ruseState } = React;

function ReviewScreen({ onDone }) {
  const [picks, setPicks] = ruseState(() => {
    const m = {};
    window.REVIEW_ITEMS.forEach(it => { m[it.id] = it.guess; });
    return m;
  });
  const [fixed, setFixed] = ruseState({});

  function setPick(itemId, choice) {
    setPicks(p => ({ ...p, [itemId]: choice }));
    setFixed(f => ({ ...f, [itemId]: true }));
  }

  const remaining = window.REVIEW_ITEMS.filter(it => !fixed[it.id]).length;

  return (
    <div>
      <div className="review-hd">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--gold)',
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>◆ Confidence below 80%</span>
        </div>
        <h2>Review <em>{window.REVIEW_ITEMS.length} items</em></h2>
        <div className="sub">Verify the codex's best guesses, or pick a different match. Unreviewed items will use the highest-confidence option.</div>

        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, maxWidth: 400 }}>
            <div className="progress" style={{ margin: 0 }}>
              <div className="bar" style={{ width: ((window.REVIEW_ITEMS.length - remaining) / window.REVIEW_ITEMS.length * 100) + '%' }} />
            </div>
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.06em' }}>
            {window.REVIEW_ITEMS.length - remaining} / {window.REVIEW_ITEMS.length} REVIEWED
          </span>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onDone}>Skip remaining</button>
          <button className="btn primary" onClick={onDone}>
            <IcoCheck /> Commit roster
          </button>
        </div>
      </div>

      <div className="review-list">
        {window.REVIEW_ITEMS.map(item => {
          const isFixed = fixed[item.id];
          return (
            <div key={item.id} className={'review-item ' + (isFixed ? 'fixed' : '')}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 4 }}>
                  ◆ {item.cropLabel}
                </div>
                <div className="review-crop">CROPPED REGION</div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--text)' }}>{item.tribesman}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    · {item.field}
                  </span>
                </div>
                <div className="picker">
                  {item.options.map(o => (
                    <button key={o.id}
                      className={'pick-opt ' + (picks[item.id] === o.id ? 'sel' : '')}
                      onClick={() => setPick(item.id, o.id)}>
                      {o.name} <span className="pct">{o.pct}%</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {isFixed ? (
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}><IcoCheck /> Confirmed</span>
                ) : (
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--gold)',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>◆ Awaiting</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { ReviewScreen });
