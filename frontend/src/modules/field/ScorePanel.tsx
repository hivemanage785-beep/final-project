import React, { useEffect, useState } from 'react';
import { ScoreResult } from '../../types/score';
import { postFeedback } from '../../api/scoreApi';

interface Props {
  isOpen: boolean;
  result: ScoreResult | null;
  coords: { lat: number; lng: number } | null;
  month: number;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: () => void;
  onRetry?: () => void;
  onUseLocation?: () => void;
}

export const ScorePanel: React.FC<Props> = ({
  isOpen, result, coords, loading, error, onClose, onSave, onRetry, onUseLocation
}) => {
  const [ringOffset, setRingOffset] = useState(314);
  const [readableLocation, setReadableLocation] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && result && !loading) {
      const t = setTimeout(() => setRingOffset(314 - (result.score / 100) * 314), 150);
      return () => clearTimeout(t);
    }
    setRingOffset(314);
  }, [isOpen, result, loading]);

  useEffect(() => {
    if (coords && isOpen) {
      setReadableLocation(null);
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`)
        .then(res => res.json())
        .then(data => {
          if (data && data.address) {
            const place = data.address.city || data.address.town || data.address.village || data.address.county;
            const state = data.address.state;
            if (place && state) setReadableLocation(`${place}, ${state}`);
            else if (data.display_name) setReadableLocation(data.display_name.split(',').slice(0, 2).join(','));
          }
        })
        .catch(() => {});
    }
  }, [coords, isOpen]);

  if (!isOpen) return null;

  const scoreColor = result
    ? result.score >= 80 ? '#15803D' : result.score >= 60 ? '#166534' : result.score >= 40 ? '#B45309' : '#B91C1C'
    : '#aaa';

  const verdictBg = result
    ? result.score >= 80 ? '#F0FDF4' : result.score >= 60 ? '#F0FDF4' : result.score >= 40 ? '#FFFBEB' : '#FEF2F2'
    : '#eee';

  const submitFeedback = (outcome: 'good' | 'fair' | 'poor') => {
    if (!result || !coords || !result.rawWeather) return;
    postFeedback({
      lat: coords.lat,
      lng: coords.lng,
      month: result.month || 1, // Fallback if missing
      weatherScore: result.weatherScore,
      floraScore: result.floraScore,
      seasonScore: result.seasonScore,
      finalScore: result.score,
      floraCount: result.floraCount,
      avgTemp: result.rawWeather.avgTemp,
      avgRain: result.rawWeather.avgRain,
      avgWind: result.rawWeather.avgWind
    }).catch(() => {});
    alert('Outcome logged for model refinement.');
  };

  return (
    <div className={`sheet-overlay${isOpen ? ' open' : ''}`} onClick={onClose}>
      <div className="sheet-panel" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="sheet-handle" />

        <div className="sheet-header" style={{ padding: '12px 20px 8px' }}>
          <p className="sheet-title" style={{ fontSize: 16 }}>Intelligence Summary</p>
          <p className="sheet-sub" style={{ fontSize: 11 }}>
            {readableLocation || (coords ? `${coords.lat.toFixed(4)} N, ${coords.lng.toFixed(4)} E` : 'Selected location')}
          </p>
          <button className="sheet-close" onClick={onClose} style={{ top: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="sheet-body" style={{ padding: '0 20px 24px' }}>
          {loading ? (
            <div className="loading-state" style={{ padding: '24px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div className="skeleton" style={{ width: 100, height: 100, borderRadius: '50%' }} />
                <div className="skeleton" style={{ width: '60%', height: 12, borderRadius: 6 }} />
                <div className="skeleton" style={{ width: '40%', height: 10, borderRadius: 5 }} />
                <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Analyzing environmental conditions...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="error-state" style={{ padding: '16px 0' }}>
               <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, padding: 16 }}>
                 <p style={{ fontSize: 14, fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>Analysis Failed</p>
                 <p style={{ fontSize: 12, color: '#B91C1C', lineHeight: 1.5 }}>{error}</p>
                 {onRetry && (
                   <button onClick={onRetry} className="active:opacity-50 transition-opacity" style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: '#991B1B', textDecoration: 'underline' }}>
                     Try again
                   </button>
                 )}
               </div>
            </div>
          ) : result ? (
            <div className="score-content">
              {/* A. Main Score Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, padding: '12px 0' }}>
                <div className="score-ring" style={{ width: 90, height: 90, flexShrink: 0 }}>
                  <svg width="90" height="90" viewBox="0 0 130 130">
                    <circle cx="65" cy="65" r="54" fill="none" stroke="#F1F5F9" strokeWidth="12" />
                    <circle
                      cx="65" cy="65" r="54" fill="none"
                      stroke={scoreColor}
                      strokeWidth="12"
                      strokeDasharray="339"
                      strokeDashoffset={ringOffset * (339 / 314)}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)', transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                    />
                  </svg>
                  <div className="score-ring-inner">
                    <div className="score-num" style={{ color: scoreColor, fontSize: 24 }}>{result.score}</div>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor }}>{result.suitability_label}</span>
                    <span style={{ fontSize: 10, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, color: '#64748B', fontWeight: 700 }}>
                      {Math.round((result.mlConfidence || 0.95) * 100)}% CONFIDENCE
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#334155', fontWeight: 500, lineHeight: 1.4 }}>
                    {result.recommendation_text}
                  </p>
                </div>
              </div>

              {/* B. Operational Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                <div style={{ background: verdictBg, padding: '8px', borderRadius: 10, textAlign: 'center' }}>
                  <p style={{ fontSize: 9, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Risk</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: scoreColor }}>{result.mlWarning === 'LOW_CONFIDENCE_PREDICTION' ? 'Moderate' : 'Low'}</p>
                </div>
                <div style={{ background: '#F8FAFC', padding: '8px', borderRadius: 10, textAlign: 'center', border: '1px solid #F1F5F9' }}>
                  <p style={{ fontSize: 9, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Outlook</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>{result.yieldOutlook || 'Stable'}</p>
                </div>
                <div style={{ background: '#F8FAFC', padding: '8px', borderRadius: 10, textAlign: 'center', border: '1px solid #F1F5F9' }}>
                  <p style={{ fontSize: 9, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Hives</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>{result.recommendedHives || 4}</p>
                </div>
              </div>

              {/* C. Reasoning Section */}
              {result.reasoning && result.reasoning.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Current Conditions</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {result.reasoning.map((r, i) => (
                      <div key={i} style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 8, borderLeft: `3px solid ${scoreColor}` }}>
                        <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* D. Primary Concern */}
              {result.primaryConcern && (
                <div style={{ background: '#FEF2F2', padding: '12px', borderRadius: 10, marginBottom: 12, border: '1px solid #FEE2E2' }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: '#B91C1C', textTransform: 'uppercase', marginBottom: 4 }}>Primary Constraint</p>
                  <p style={{ fontSize: 12, color: '#991B1B', fontWeight: 500 }}>{result.primaryConcern}</p>
                </div>
              )}

              {/* E. Movement Advice */}
              {result.movementAdvice && (
                <div style={{ background: '#F0F9FF', padding: '12px', borderRadius: 10, marginBottom: 20, border: '1px solid #E0F2FE' }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', marginBottom: 4 }}>Action Plan</p>
                  <p style={{ fontSize: 12, color: '#075985', fontWeight: 500 }}>{result.movementAdvice}</p>
                </div>
              )}

              {/* F. Environmental Breakdown */}
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16, marginBottom: 24 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Environmental Breakdown</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                   <div style={{ textAlign: 'center' }}>
                      <div style={{ height: 4, background: '#F1F5F9', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${result.weatherScore}%`, height: '100%', background: '#3B82F6' }} />
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>{result.weatherScore}%</p>
                      <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>Weather</p>
                   </div>
                   <div style={{ textAlign: 'center' }}>
                      <div style={{ height: 4, background: '#F1F5F9', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${result.floraScore}%`, height: '100%', background: '#10B981' }} />
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>{result.floraScore}%</p>
                      <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>Flora</p>
                   </div>
                   <div style={{ textAlign: 'center' }}>
                      <div style={{ height: 4, background: '#F1F5F9', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${result.seasonScore}%`, height: '100%', background: '#F59E0B' }} />
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>{result.seasonScore}%</p>
                      <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>Season</p>
                   </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onUseLocation} className="btn-primary" style={{ flex: 1, padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14 }}>
                  Allocate Hives
                </button>
                <button onClick={() => onSave()} className="btn-secondary" style={{ padding: '12px', borderRadius: 12, background: '#F1F5F9' }}>
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                     <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                   </svg>
                </button>
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>LOG OUTCOME</span>
                <div style={{ display: 'flex', gap: 6 }}>
                   <button onClick={() => submitFeedback('good')} className="active:scale-90 transition-transform" style={{ fontSize: 18 }}>🟢</button>
                   <button onClick={() => submitFeedback('fair')} className="active:scale-90 transition-transform" style={{ fontSize: 18 }}>🟡</button>
                   <button onClick={() => submitFeedback('poor')} className="active:scale-90 transition-transform" style={{ fontSize: 18 }}>🔴</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

