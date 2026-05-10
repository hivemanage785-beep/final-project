import React from 'react';
import { Hexagon, Loader2 } from 'lucide-react';

export const AuthScreen: React.FC<{ 
  onSignIn: () => void, 
  loading?: boolean, 
  error?: string | null 
}> = ({ onSignIn, loading, error }) => (
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

      {error && (
        <div style={{ 
          background: '#FEF2F2', border: '1px solid #FECACA', 
          borderRadius: 12, padding: '10px 14px', marginBottom: 20,
          fontSize: 11, color: '#B91C1C', textAlign: 'left', fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.02em'
        }}>
          {error}
        </div>
      )}

      <button
        onClick={onSignIn}
        disabled={loading}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 10,
          background: '#fff', border: '1.5px solid #E0DDD8',
          borderRadius: 12, padding: '13px 20px',
          fontSize: 14, fontWeight: 700, color: '#222',
          cursor: loading ? 'not-allowed' : 'pointer', 
          transition: 'all 0.2s',
          opacity: loading ? 0.6 : 1,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin text-slate-400" />
        ) : (
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style={{ width: 18, height: 18 }} />
        )}
        <span style={{ marginTop: 1 }}>{loading ? 'Authenticating...' : 'Continue with Google'}</span>
      </button>

      <p style={{ fontSize: 11, color: '#bbb', marginTop: 24 }}>
        By signing in you agree to our Terms of Service
      </p>
    </div>
  </div>
);
