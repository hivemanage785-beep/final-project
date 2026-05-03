import React, { useState } from 'react';

export const Security = () => {
  const [password, setPassword] = useState('');

  return (
    <div className="page-enter">
      <div className="page-header">
        <p className="page-title">Security</p>
      </div>

      <div className="card">
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
          />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', padding: '12px', borderRadius: 8, fontWeight: 'bold' }}>
          Update Password
        </button>
      </div>
    </div>
  );
};
