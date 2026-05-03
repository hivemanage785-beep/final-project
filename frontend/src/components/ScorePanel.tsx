import React, { useEffect, useState } from 'react';
import { ScoreResult } from '../types/score';

interface ScorePanelProps {
  isOpen: boolean;
  result: ScoreResult | null;
  coords: {lat: number; lng: number} | null;
  month: number;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: () => void;
}

export const ScorePanel: React.FC<ScorePanelProps> = ({
  isOpen, result, coords, loading, error, onClose, onSave
}) => {
  const [ringOffset, setRingOffset] = useState(314);

  useEffect(() => {
    if (isOpen && result && !loading) {
      const timer = setTimeout(() => {
        setRingOffset(314 - (result.score / 100) * 314);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setRingOffset(314);
    }
  }, [isOpen, result, loading]);

  if (!isOpen) return null;

  return (
    <div className={`modal-ov ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="modal-sh" onClick={e => e.stopPropagation()}>
        <div className="mh" />
        <div className="mhdr">
          <div className="m-title">Location Analysis</div>
          <div className="m-sub">
            {coords ? `${coords.lat.toFixed(4)} N, ${coords.lng.toFixed(4)} E` : 'Selected Location'}
          </div>
          <button className="m-cls" onClick={onClose}>
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="mbdy">
          {loading ? (
            <div className="flex flex-col items-center py-12">
               <div className="spin" />
               <p className="mt-4 text-sm text-gray-500 font-bold uppercase tracking-widest">Analyzing Environment...</p>
            </div>
          ) : error ? (
            <div className="warn-ban">
              <div className="warn-ico">⚠️</div>
              <div>
                <div className="warn-ttl">Analysis Error</div>
                <div className="warn-dsc">{error}</div>
              </div>
            </div>
          ) : result ? (
            <>
              {(result.mlWarning === 'LOW_CONFIDENCE_PREDICTION' || result.mlModel === 'heuristic_fallback') && (
                <div className="warn-ban">
                  <div className="warn-ico">⚠️</div>
                  <div>
                    <div className="warn-ttl">Heuristic Mode Active</div>
                    <div className="warn-dsc">Using regional estimates — signal weak in this specific area.</div>
                  </div>
                </div>
              )}

              <div className="crd-row">
                <div className="cpill"><span>Latitude</span><b>{coords?.lat.toFixed(4)} N</b></div>
                <div className="cpill"><span>Longitude</span><b>{coords?.lng.toFixed(4)} E</b></div>
              </div>

              <div className="sec-lbl">Beekeeping Score</div>
              <div className="scr-sec">
                <div className="circ">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#F0EDE8" strokeWidth="10"/>
                    <circle 
                      cx="60" cy="60" r="50" fill="none" 
                      stroke={result.score >= 60 ? '#16A34A' : result.score >= 35 ? '#F59E0B' : '#DC2626'} 
                      strokeWidth="10" 
                      strokeDasharray="314" 
                      strokeDashoffset={ringOffset} 
                      strokeLinecap="round" 
                      style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                    />
                  </svg>
                  <div className="circ-txt">
                    <div className="circ-n" style={{ color: result.score >= 60 ? '#16A34A' : result.score >= 35 ? '#F59E0B' : '#DC2626' }}>
                      {result.score}
                    </div>
                    <div className="circ-o">out of 100</div>
                  </div>
                </div>
                <div className={`bdg scr-vdict mt8 ${result.score >= 60 ? 'bdg-gn' : result.score >= 35 ? 'bdg-yw' : 'bdg-at'}`}>
                   {result.score >= 60 ? 'Good for beekeeping' : result.score >= 35 ? 'Moderate conditions' : 'Not ideal for placement'}
                </div>
              </div>

              <div className="sec-lbl mt12">Environment Factors</div>
              <div className="w-grid">
                <div className="w-crd"><div className="w-val">{result.floraScore}</div><div className="w-key">Flora</div></div>
                <div className="w-crd"><div className="w-val">{result.weatherScore}</div><div className="w-key">Weather</div></div>
                <div className="w-crd"><div className="w-val">{result.seasonScore}</div><div className="w-key">Season</div></div>
              </div>

              <div className="flex gap-2 mt12">
                <button className="btn-pr" onClick={onSave} style={{flex: 1}}>Save Location</button>
                <button className="btn-pr" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords?.lat},${coords?.lng}`, '_blank')} style={{flex: 1, background: '#fff', color: 'var(--pr)', border: '1.5px solid var(--pr)'}}>
                  Navigate
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
