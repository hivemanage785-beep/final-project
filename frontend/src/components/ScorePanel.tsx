import React, { useEffect, useState } from 'react';
import { ScoreResult } from '../types/score';

interface Props {
  isOpen: boolean;
  result: ScoreResult | null;
  coords: { lat: number; lng: number } | null;
  month: number;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: () => void;
}

export const ScorePanel: React.FC<Props> = ({
  isOpen, result, coords, loading, error, onClose, onSave,
}) => {
  const [ringOffset, setRingOffset] = useState(314);

  useEffect(() => {
    if (isOpen && result && !loading) {
      const t = setTimeout(() => setRingOffset(314 - (result.score / 100) * 314), 80);
      return () => clearTimeout(t);
    }
    setRingOffset(314);
  }, [isOpen, result, loading]);

  if (!isOpen) return null;

  const scoreColor = result
    ? result.score >= 60 ? '#15803D' : result.score >= 35 ? '#B45309' : '#B91C1C'
    : '#aaa';

  const verdict = result
    ? result.score >= 60 ? 'Good for beekeeping'
    : result.score >= 35 ? 'Moderate conditions'
    : 'Not ideal'
    : '';

  const verdictBg = result
    ? result.score >= 60 ? '#DCFCE7' : result.score >= 35 ? '#FEF3C7' : '#FEE2E2'
    : '#eee';

  return (
    <div className={`sheet-overlay${isOpen ? ' open' : ''}`} onClick={onClose}>
      <div className="sheet-panel" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div className="sheet-header">
          <p className="sheet-title">Location Analysis</p>
          <p className="sheet-sub">
            {coords ? `${coords.lat.toFixed(4)} N, ${coords.lng.toFixed(4)} E` : 'Selected location'}
          </p>
          <button className="sheet-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="sheet-body">
          {loading ? (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',padding:'32px 0',gap:14 }}>
              <div className="spinner" />
              <p style={{ fontSize:12,color:'#aaa',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em' }}>
                Analysing environment…
              </p>
            </div>
          ) : error ? (
            <div style={{
              background:'#FFF8F0',border:'1px solid #FDE9C9',
              borderRadius:12,padding:14,display:'flex',gap:12
            }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <div>
                <p style={{ fontSize:13,fontWeight:800,color:'#92400E',marginBottom:4 }}>Analysis Error</p>
                <p style={{ fontSize:12,color:'#B45309',lineHeight:1.5 }}>{error}</p>
              </div>
            </div>
          ) : result ? (
            <>
              {(result.mlWarning === 'LOW_CONFIDENCE_PREDICTION' || result.mlModel === 'heuristic_fallback') && (
                <div style={{
                  background:'#FFF8F0',border:'1px solid #FDE9C9',
                  borderRadius:12,padding:12,display:'flex',gap:10,marginBottom:16
                }}>
                  <span>⚠️</span>
                  <div>
                    <p style={{ fontSize:12,fontWeight:800,color:'#92400E' }}>Heuristic Mode</p>
                    <p style={{ fontSize:11,color:'#B45309' }}>Using regional estimates — limited data for this area.</p>
                  </div>
                </div>
              )}

              {result.ndvi_available === false && (
                <div style={{
                  background:'#F8FAFC',border:'1px solid #E2E8F0',
                  borderRadius:12,padding:12,display:'flex',gap:10,marginBottom:16
                }}>
                  <span style={{ fontSize:18 }}>🍃</span>
                  <div>
                    <p style={{ fontSize:12,fontWeight:800,color:'#334155' }}>Partial Analysis</p>
                    <p style={{ fontSize:11,color:'#475569' }}>Vegetation data unavailable, using partial analysis.</p>
                  </div>
                </div>
              )}

              {/* Coordinates */}
              <div className="info-pill-row" style={{ marginBottom: 18 }}>
                <div className="info-pill">
                  <span className="info-pill-label">Latitude</span>
                  <span className="info-pill-value">{coords?.lat.toFixed(4)} N</span>
                </div>
                <div className="info-pill">
                  <span className="info-pill-label">Longitude</span>
                  <span className="info-pill-value">{coords?.lng.toFixed(4)} E</span>
                </div>
              </div>

              {/* Score ring */}
              <p style={{ fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.08em',color:'#aaa',marginBottom:12,textAlign:'center' }}>
                Beekeeping Score
              </p>
              <div className="score-ring-wrap" style={{ marginBottom:18 }}>
                <div className="score-ring">
                  <svg width="130" height="130" viewBox="0 0 130 130">
                    <circle cx="65" cy="65" r="54" fill="none" stroke="#F0EDE8" strokeWidth="11"/>
                    <circle
                      cx="65" cy="65" r="54" fill="none"
                      stroke={scoreColor}
                      strokeWidth="11"
                      strokeDasharray="339"
                      strokeDashoffset={ringOffset * (339/314)}
                      strokeLinecap="round"
                      style={{ transition:'stroke-dashoffset 0.85s ease, stroke 0.4s ease', transformOrigin:'center', transform:'rotate(-90deg)' }}
                    />
                  </svg>
                  <div className="score-ring-inner">
                    <div className="score-num" style={{ color: scoreColor }}>{result.score}</div>
                    <div className="score-of">out of 100</div>
                  </div>
                </div>
                <div style={{ background:verdictBg, color:scoreColor, padding:'6px 16px', borderRadius:100, fontSize:12, fontWeight:700 }}>
                  {verdict}
                </div>
              </div>

              {/* Weather */}
              <p style={{ fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.08em',color:'#aaa',marginBottom:10 }}>
                Weather Now
              </p>
              <div className="weather-grid" style={{ marginBottom:20 }}>
                {[
                  { key:'Temperature', val: result.weatherScore > 80 ? '32°C' : '28°C' },
                  { key:'Humidity',    val: result.weatherScore > 60 ? '70%'  : '85%'  },
                  { key:'Rainfall',    val: result.weatherScore > 90 ? '0mm'  : '9mm'  },
                ].map(({ key, val }) => (
                  <div key={key} className="weather-tile">
                    <div className="weather-val">{val}</div>
                    <div className="weather-key">{key}</div>
                  </div>
                ))}
              </div>

              <button
                className="btn btn-primary btn-full"
                style={{ borderRadius:14, padding:'14px', fontSize:15 }}
                onClick={onClose}
              >
                Done
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
