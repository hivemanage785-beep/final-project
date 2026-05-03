import React from 'react';

export const AboutHiveOps = () => {
  return (
    <div className="page-enter">
      <div className="page-header">
        <p className="page-title">About HiveOps</p>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
        <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6, marginBottom: 20 }}>
          HiveOps is a decision-support system designed to help beekeepers select optimal hive locations using machine learning and environmental data.
        </p>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#888' }}>
          Version 1.0 – Final Year Project
        </p>
      </div>
    </div>
  );
};
