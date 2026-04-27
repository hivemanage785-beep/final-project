import React from 'react';
import { Hexagon } from 'lucide-react';

export const AuthScreen: React.FC<{ onSignIn: () => void }> = ({ onSignIn }) => (
  <div className="auth-screen">
    <div className="auth-card">
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: '#8B0000', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px'
      }}>
        <Hexagon size={32} color="#fff" fill="#fff" />
      </div>

      <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 8 }}>
        HiveOps
      </h1>
      <p style={{ fontSize: 14, color: '#888', marginBottom: 32, lineHeight: 1.5 }}>
        Precision beekeeping intelligence<br />for Tamil Nadu apiaries.
      </p>

      <button
        onClick={onSignIn}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 10,
          background: '#fff', border: '1.5px solid #E0DDD8',
          borderRadius: 12, padding: '13px 20px',
          fontSize: 14, fontWeight: 700, color: '#222',
          cursor: 'pointer', transition: 'background 0.15s'
        }}
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style={{ width: 18, height: 18 }} />
        Continue with Google
      </button>

      <p style={{ fontSize: 11, color: '#bbb', marginTop: 24 }}>
        By signing in you agree to our Terms of Service
      </p>
    </div>
  </div>
);
