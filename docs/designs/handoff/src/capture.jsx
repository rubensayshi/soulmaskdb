// Capture flow: source select → progress → summary
const { useState: cuseState, useEffect: cuseEffect } = React;

function CaptureModal({ onClose, onDone }) {
  // phase: 'pick' | 'processing' | 'summary'
  const [phase, setPhase] = cuseState('pick');
  const [progress, setProgress] = cuseState(0);
  const [shots, setShots] = cuseState(3);

  function startProcessing() {
    setPhase('processing');
    setProgress(0);
  }

  cuseEffect(() => {
    if (phase !== 'processing') return;
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(t);
          setTimeout(() => setPhase('summary'), 300);
          return 100;
        }
        return p + 2.5;
      });
    }, 60);
    return () => clearInterval(t);
  }, [phase]);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <h2>{phase === 'summary' ? <>Capture <em>Complete</em></> : <>Capture <em>Roster</em></>}</h2>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        {phase === 'pick' && (
          <div className="modal-bd">
            <p style={{ margin: '0 0 18px', color: 'var(--text-dim)', fontSize: 13 }}>
              Open the in-game tribesman list, then capture. The Python sidecar will detect
              names, levels, clans, classes, titles, and all 366 trait icons.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <button className="btn primary" style={{ height: 76, flexDirection: 'column', gap: 8 }}
                onClick={startProcessing}>
                <IcoCamera size={22} />
                <span>Capture screen</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--muted)', letterSpacing: '0.06em' }}>SOULMASK.EXE · 2560×1440</span>
              </button>
              <button className="btn" style={{ height: 76, flexDirection: 'column', gap: 8 }}
                onClick={startProcessing}>
                <IcoExport size={20} />
                <span>Import images</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--muted)', letterSpacing: '0.06em' }}>PNG · JPG · WEBP</span>
              </button>
            </div>

            <SecH>Source preview</SecH>
            <div className="drop" style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{
                    width: 90, height: 60,
                    background: 'repeating-linear-gradient(45deg, oklch(0.20 0.012 130) 0 6px, oklch(0.16 0.008 130) 6px 12px)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    display: 'grid', placeItems: 'center',
                    fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)',
                    letterSpacing: '0.06em',
                  }}>SHOT {i}</div>
                ))}
              </div>
              <div style={{ fontSize: 11.5 }}>
                Drag images here · or paste from clipboard <kbd style={{
                  fontFamily: 'var(--mono)', fontSize: 9.5,
                  background: 'var(--bg-elev)', border: '1px solid var(--border)',
                  borderRadius: 3, padding: '1px 5px', marginLeft: 4,
                }}>⌘ V</kbd>
              </div>
            </div>

            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em' }}>
                ◆ DEDUP ON · MERGE WITH CURRENT ROSTER
              </span>
              <button className="btn" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}

        {phase === 'processing' && (
          <div className="modal-bd" style={{ paddingBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 18, fontStyle: 'italic', color: 'var(--accent)' }}>
                Reading the masks…
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>{Math.round(progress)}%</span>
            </div>
            <div className="progress"><div className="bar" style={{ width: progress + '%' }} /></div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 18 }}>
              {[
                ['Names',  progress > 18],
                ['Clans',  progress > 36],
                ['Groups', progress > 54],
                ['Traits', progress > 72],
                ['Status', progress > 88],
              ].map(([label, done]) => (
                <div key={label} style={{
                  padding: '10px 12px',
                  border: '1px solid ' + (done ? 'var(--accent-soft)' : 'var(--border-soft)'),
                  background: done ? 'var(--accent-glow)' : 'transparent',
                  borderRadius: 'var(--r)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: 11.5, color: done ? 'var(--accent)' : 'var(--muted)',
                  fontFamily: 'var(--mono)', letterSpacing: '0.06em', textTransform: 'uppercase',
                  transition: 'all 0.3s',
                }}>
                  {label}
                  {done && <IcoCheck />}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, color: 'var(--muted)', fontSize: 11.5 }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Screenshots</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--text)' }}>{shots}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tribesmen Found</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--accent)' }}>
                  {Math.floor(progress / 100 * 14)}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sidecar</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--text)' }}>OpenCV · Tesseract</div>
              </div>
            </div>
          </div>
        )}

        {phase === 'summary' && (
          <div className="modal-bd">
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
              padding: '18px 0 22px', borderBottom: '1px solid var(--border-soft)', marginBottom: 18,
            }}>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 40, fontWeight: 500 }}>14</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>◆ Tribesmen found</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 40, fontWeight: 500, color: 'var(--accent)' }}>12</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>◆ High confidence</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 40, fontWeight: 500, color: 'var(--gold)' }}>{window.REVIEW_ITEMS.length}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>◆ Need review</div>
              </div>
            </div>
            <p style={{ margin: '0 0 18px', color: 'var(--text-dim)', fontSize: 13 }}>
              The codex parsed your roster. {window.REVIEW_ITEMS.length} fields scored below the 80% threshold —
              review them, or accept the highest-confidence guesses.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn" onClick={onDone}>Skip review</button>
              <button className="btn primary" onClick={() => onDone('review')}>
                Review {window.REVIEW_ITEMS.length} items <IcoChev />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { CaptureModal });
