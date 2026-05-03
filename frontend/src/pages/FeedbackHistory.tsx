import React, { useEffect, useState } from 'react';
import { apiGet } from '../services/api';

export const FeedbackHistory = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/feedback-history')
      .then((d: any) => {
        if (d.success) setData(d.entries || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <p className="page-title">Feedback History</p>
          <p className="page-subtitle">Your submitted feedback records</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading...</div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          No feedback recorded yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.map((e, i) => (
            <div key={e._id || i} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 700 }}>
                  {e.lat?.toFixed(4)}°N, {e.lng?.toFixed(4)}°E
                </p>
                <p style={{ fontSize: 12, fontWeight: 700, color: e.actual_outcome === 'Good' ? '#15803D' : e.actual_outcome === 'Poor' ? '#B91C1C' : '#B45309' }}>
                  {e.actual_outcome}
                </p>
              </div>
              <p style={{ fontSize: 11, color: '#555' }}>
                Predicted Score: {e.predicted_score} | Temp: {e.temperature?.toFixed(1)}°C | Hum: {e.humidity?.toFixed(1)}% | Rain: {e.rainfall?.toFixed(1)}mm
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
