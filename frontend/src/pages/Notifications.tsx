import React, { useState } from 'react';

export const Notifications = () => {
  const [alerts, setAlerts] = useState(true);
  const [recommendations, setRecommendations] = useState(true);

  return (
    <div className="page-enter">
      <div className="page-header">
        <p className="page-title">Notifications</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>Alerts</p>
            <p style={{ fontSize: 11, color: '#666' }}>Critical hive and weather alerts</p>
          </div>
          <button 
            onClick={() => setAlerts(!alerts)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none',
              background: alerts ? '#8B0000' : '#E2E8F0',
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 2, left: alerts ? 22 : 2, transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>Recommendations</p>
            <p style={{ fontSize: 11, color: '#666' }}>ML-based location and action suggestions</p>
          </div>
          <button 
            onClick={() => setRecommendations(!recommendations)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none',
              background: recommendations ? '#8B0000' : '#E2E8F0',
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 2, left: recommendations ? 22 : 2, transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }} />
          </button>
        </div>
      </div>
    </div>
  );
};
