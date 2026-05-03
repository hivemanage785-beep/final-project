import React, { useEffect, useState } from 'react';
import { ScoreResult } from '../types/score';

import { getDecision, getExplanation } from '../utils/decision';

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
      const t = setTimeout(() => setRingOffset(314 - (result.score / 100) * 314), 80);
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
            const place = data.address.city || data.address.town || data.address.village || data.address.county || data.name;
            const state = data.address.state;
            if (place && state) {
              setReadableLocation(`${place}, ${state}`);
            } else if (data.display_name) {
              setReadableLocation(data.display_name.split(',').slice(0,2).join(','));
            }
          }
        })
        .catch(() => {});
    }
  }, [coords, isOpen]);

  if (!isOpen) return null;

  const scoreColor = result
    ? result.score >= 60 ? '#15803D' : result.score >= 35 ? '#B45309' : '#B91C1C'
    : '#aaa';

  const recommendation = result ? getDecision(result.score) : '';

  const explanation = result && result.rawWeather 
    ? getExplanation(result.rawWeather.avgTemp, result.rawWeather.avgHumidity || 60, result.rawWeather.avgRain)
    : '';

  const verdictBg = result
    ? result.score >= 70 ? '#DCFCE7' : result.score >= 40 ? '#FEF3C7' : '#FEE2E2'
    : '#eee';

  const submitFeedback = (outcome: string) => {
    if (!result || !coords || !result.rawWeather) return;
    
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: coords.lat,
        lng: coords.lng,
        temperature: result.rawWeather.avgTemp,
        humidity: result.rawWeather.avgHumidity || 60,
        rainfall: result.rawWeather.avgRain,
        predicted_score: result.score,
        actual_outcome: outcome
      })
    }).catch(() => {});
    
    alert('Feedback submitted!');
  };

  return (
    <div className={`sheet-overlay${isOpen ? ' open' : ''}`} onClick={onClose}>
      <div className="sheet-panel" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div className="sheet-header">
          <p className="sheet-title">Location Analysis</p>
          <p className="sheet-sub">
            {readableLocation ? `Location: ${readableLocation}` : coords ? `${coords.lat.toFixed(4)} N, ${coords.lng.toFixed(4)} E` : 'Selected location'}
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
              <p style={{ fontSize:13,color:'#aaa',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em' }}>
                Analyzing location...
              </p>
            </div>
          ) : error ? (
            error.includes('outside Tamil Nadu') || error.includes('OUT_OF_REGION') ? (
              <div style={{
                background:'#EFF6FF',border:'1px solid #BFDBFE',
                borderRadius:12,padding:16,display:'flex',gap:12
              }}>
                <span style={{ fontSize:20 }}>🗺️</span>
                <div>
                  <p style={{ fontSize:13,fontWeight:800,color:'#1E40AF',marginBottom:4 }}>Outside Tamil Nadu</p>
                  <p style={{ fontSize:12,color:'#2563EB',lineHeight:1.5 }}>
                    The ML model is trained only for Tamil Nadu (lat 8°–13.5°N, lng 76°–80.5°E).
                    Tap a location inside Tamil Nadu to get a score.
                  </p>
                </div>
              </div>
            ) : error.includes('unavailable offline') ? (
              <div style={{
                background:'#FEF2F2',border:'1px solid #FECACA',
                borderRadius:12,padding:14,display:'flex',gap:12
              }}>
                <span style={{ fontSize:18 }}>📶</span>
                <div>
                  <p style={{ fontSize:13,fontWeight:800,color:'#991B1B',marginBottom:4 }}>Prediction unavailable offline</p>
                  <p style={{ fontSize:12,color:'#B91C1C',lineHeight:1.5 }}>Please reconnect to analyze location.</p>
                </div>
              </div>
            ) : (
              <div style={{
                background:'#FFF8F0',border:'1px solid #FDE9C9',
                borderRadius:12,padding:14,display:'flex',flexDirection:'column',gap:12
              }}>
                <div style={{display:'flex',gap:12}}>
                  <span style={{ fontSize:18 }}>⚠️</span>
                  <div>
                    <p style={{ fontSize:13,fontWeight:800,color:'#92400E',marginBottom:4 }}>{error || 'Unable to fetch prediction. Please try again.'}</p>
                  </div>
                </div>
                {onRetry && (
                  <button onClick={onRetry} style={{alignSelf:'flex-start', padding:'6px 12px', borderRadius:8, border:'1px solid #D97706', background:'#FEF3C7', color:'#92400E', cursor:'pointer', fontWeight:600}}>
                    Retry
                  </button>
                )}
              </div>
            )
          ) : result && result.score != null ? (
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
                    <p style={{ fontSize:12,fontWeight:800,color:'#334155' }}>Vegetation data not available. Prediction based on weather conditions (slightly reduced accuracy)</p>
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
                    <div className="score-num" style={{ color: scoreColor }}>{result?.score ?? "-"}</div>
                    <div className="score-of">out of 100</div>
                  </div>
                </div>
              </div>{/* /score-ring-wrap */}

              <div style={{ background:verdictBg, color:scoreColor, padding:'10px 16px', borderRadius:12, marginBottom:8, textAlign:'center' }}>
                  <p style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom:2 }}>Suitability</p>
                  <p style={{ fontSize: 15, fontWeight: 800 }}>
                    {result?.suitability_label ?? "Unknown"}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 600, marginTop: 4, opacity: 0.9 }}>
                    {result?.recommendation_text ?? ((result?.score ?? 0) >= 70 ? 'Suitable for hive relocation' : (result?.score ?? 0) >= 40 ? 'Use with caution; conditions are unstable' : 'Not suitable for hive placement')}
                  </p>
                </div>

              {onUseLocation && (
                <button 
                  onClick={onUseLocation} 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontWeight: 'bold' }}
                >
                  Use this location
                </button>
              )}

              {/* Why this score? */}
              {(result.reason_text || result.rawWeather) && (() => {
                const text = result.reason_text;
                if (!text && !result.rawWeather) return null;
                const hints: string[] = text ? [text] : [];
                if (!text && result.rawWeather) {
                  if ((result.rawWeather.avgHumidity ?? 0) > 80) hints.push('High humidity may reduce nectar quality');
                  if ((result.rawWeather.avgRain ?? 0) > 2)      hints.push('Moderate rainfall supports flowering');
                  if ((result.rawWeather.avgTemp ?? 0) > 35)     hints.push('High temperature stress');
                }
                if (hints.length === 0) return null;
                return (
                  <div style={{ marginBottom: 16, padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748B', marginBottom: 6 }}>Why this score?</p>
                    {hints.map(h => (
                      <p key={h} style={{ fontSize: 12, color: '#475569', lineHeight: 1.55 }}>• {h}</p>
                    ))}
                  </div>
                );
              })()}

              {/* Confidence label */}
              <div style={{ marginBottom: 16, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{result.ndvi_available === false ? '🟡' : '🟢'}</span>
                <p style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                  Confidence: {result.ndvi_available === false ? 'Medium (weather-based prediction)' : 'High'}
                </p>
              </div>

              <p style={{ fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 20 }}>
                {explanation}
              </p>

              {/* Weather */}
              <p style={{ fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.08em',color:'#aaa',marginBottom:10 }}>
                Weather Now
              </p>
              
              {result.rawWeather?.avgRain > 50 && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#991B1B', margin: 0 }}>
                    ⚠ Heavy rainfall detected. This may damage hive structure and reduce honey yield. Take protective measures.
                  </p>
                </div>
              )}

              <div className="weather-grid" style={{ marginBottom:20 }}>
                {[
                  { key:'Temperature', val: result?.rawWeather?.avgTemp != null ? `${Math.round(result?.rawWeather?.avgTemp)}°C` : (result?.rawWeather?.avgTemp ?? "-") },
                  { key:'Humidity',    val: result?.rawWeather?.avgHumidity != null ? `${Math.round(result?.rawWeather?.avgHumidity)}%` : (result?.rawWeather?.avgHumidity ?? "-") },
                  { key:'Rainfall',    val: result?.rawWeather?.avgRain != null ? `${Math.round(result?.rawWeather?.avgRain)} mm` : (result?.rawWeather?.avgRain ?? "-") },
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

              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => submitFeedback('Good')} style={{ flex: 1, padding: '8px', fontSize: 12, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155', cursor: 'pointer' }}>Mark as Good</button>
                  <button onClick={() => submitFeedback('Average')} style={{ flex: 1, padding: '8px', fontSize: 12, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155', cursor: 'pointer' }}>Mark as Average</button>
                  <button onClick={() => submitFeedback('Poor')} style={{ flex: 1, padding: '8px', fontSize: 12, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155', cursor: 'pointer' }}>Mark as Poor</button>
                </div>
              </div>
            </>
          ) : result ? (
            <div style={{
              background:'#FFF8F0',border:'1px solid #FDE9C9',
              borderRadius:12,padding:14,display:'flex',gap:12
            }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <div>
                <p style={{ fontSize:13,fontWeight:800,color:'#92400E',marginBottom:4 }}>Data unavailable for this location</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
