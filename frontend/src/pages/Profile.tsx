import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { User, Mail, Shield, Hexagon, ClipboardList, Activity } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');

  // Real data counts from local Dexie sync DB
  const hives = useLiveQuery(() => db.hives.where('uid').equals(user?.uid || '').toArray(), [user]) || [];
  const inspections = useLiveQuery(() => db.inspections.where('uid').equals(user?.uid || '').toArray(), [user]) || [];

  return (
    <div className="page-enter">
      <div className="page-header">
        <p className="page-title">Profile</p>
      </div>

      {/* Identity Card */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 50, height: 50, borderRadius: '50%',
          background: '#8B0000', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 18, flexShrink: 0
        }}>
          {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
        </div>
        <div>
          <p style={{ fontWeight: 800, fontSize: 17, color: '#333', lineHeight: 1.25 }}>{name || 'Beekeeper'}</p>
          <p style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{email || 'No email'}</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Shield size={12} color="#15803D" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>Beekeeper</span>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <p className="section-label">Activity Summary</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#8B0000' }}>{hives?.length ?? 0}</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hives</p>
          </div>
          <div style={{ width: 1, height: 30, background: '#eee' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#8B0000' }}>{inspections?.length ?? 0}</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logs</p>
          </div>
          <div style={{ width: 1, height: 30, background: '#eee' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#999', marginTop: 4 }}>Not tracked</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analyses</p>
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <p className="section-label">Edit Profile</p>
      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
          />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', padding: '12px', borderRadius: 8, fontWeight: 'bold' }}>
          Save
        </button>
      </div>
    </div>
  );
};
