import React from 'react';

export const HelpFAQs = () => {
  return (
    <div className="page-enter">
      <div className="page-header">
        <p className="page-title">Help & FAQs</p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: '#333', marginBottom: 4 }}>How does location prediction work?</p>
        <p style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>It uses environmental data and ML to estimate flowering conditions.</p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: '#333', marginBottom: 4 }}>How do I add a hive?</p>
        <p style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>Select a location, then use 'Add Hive'.</p>
      </div>

      <div className="card">
        <p style={{ fontSize: 14, fontWeight: 800, color: '#333', marginBottom: 4 }}>Is this data real?</p>
        <p style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>Yes, predictions are based on real-time environmental inputs.</p>
      </div>
    </div>
  );
};
