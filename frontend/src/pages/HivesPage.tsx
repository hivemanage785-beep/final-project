import React, { useState, useEffect } from 'react';
import { Plus, Hexagon, MapPin, CheckCircle2, AlertTriangle, AlertCircle, ChevronRight, Clock } from 'lucide-react';
import { apiGet } from '../services/api';

const STATUS_MAP: Record<string, { label: string; bg: string; color: string; Icon: any }> = {
  healthy:  { label: 'Healthy',  bg: '#DCFCE7', color: '#15803D', Icon: CheckCircle2 },
  warning:  { label: 'Warning',  bg: '#FEF3C7', color: '#B45309', Icon: AlertTriangle },
  critical: { label: 'Critical', bg: '#FEE2E2', color: '#B91C1C', Icon: AlertCircle },
};

const HiveCard = ({ hive }: { hive: any }) => {
  const s = STATUS_MAP[hive.healthStatus] ?? STATUS_MAP.warning;
  const SI = s.Icon;

  return (
    <div className="hive-card">
      <div className="hive-card-header">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:46,height:46,borderRadius:14,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Hexagon size={22} color={s.color} fill={s.color} />
          </div>
          <div>
            <p style={{ fontSize:15,fontWeight:800,lineHeight:1.25 }}>{hive.name}</p>
            <div style={{ display:'flex',alignItems:'center',gap:4,marginTop:3 }}>
              <MapPin size={11} color="#999" />
              <span style={{ fontSize:11,color:'#999',fontWeight:500 }}>{hive.location?.city || 'Tamil Nadu'}</span>
            </div>
          </div>
        </div>
        <span style={{
          display:'inline-flex', alignItems:'center', gap:4,
          padding:'5px 10px', borderRadius:100,
          background:s.bg, color:s.color,
          fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em'
        }}>
          <SI size={11} /> {s.label}
        </span>
      </div>

      <div className="hive-card-meta">
        {[
          { label: 'Boxes',      value: hive.specifications?.boxes ?? '—' },
          { label: 'Queen',      value: hive.specifications?.queenStatus ?? 'Unknown' },
          { label: 'Last Check', value: hive.lastInspection
              ? new Date(hive.lastInspection).toLocaleDateString('en-IN',{ day:'numeric',month:'short' })
              : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="hive-meta-item">
            <div className="hive-meta-label">{label}</div>
            <div className="hive-meta-value">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const HivesPage = () => {
  const [hives, setHives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    apiGet('/api/hives')
      .then(d => setHives(Array.isArray(d) ? d : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? hives : hives.filter(h => h.healthStatus === filter);

  const counts = {
    all:      hives.length,
    healthy:  hives.filter(h => h.healthStatus === 'healthy').length,
    warning:  hives.filter(h => h.healthStatus === 'warning').length,
    critical: hives.filter(h => h.healthStatus === 'critical').length,
  };

  if (error) return (
    <div className="page-enter">
      <div className="page-header"><p className="page-title">My Hives</p></div>
      <div className="error-state">
        <div className="error-icon"><AlertCircle size={22} /></div>
        <p className="error-title">Could not load hives</p>
        <p className="error-body">Check your connection and try again.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="page-enter">
      <div className="page-header">
        <p className="page-title">My Hives</p>
        <div className="skeleton" style={{ width:38,height:38,borderRadius:'50%' }} />
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="skeleton" style={{ height:140,borderRadius:16,marginBottom:10 }} />
      ))}
    </div>
  );

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <p className="page-title">My Hives</p>
          <p className="page-subtitle">{hives.length} active {hives.length === 1 ? 'apiary' : 'apiaries'}</p>
        </div>
        <button className="btn btn-primary" style={{ padding:'10px 14px',borderRadius:12 }}>
          <Plus size={18} />
        </button>
      </div>

      {/* Filter pills */}
      {hives.length > 0 && (
        <div style={{ display:'flex',gap:8,overflowX:'auto',paddingBottom:4,marginBottom:16 }}>
          {(['all','healthy','warning','critical'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flexShrink:0, padding:'7px 14px', borderRadius:100, border:'none', cursor:'pointer',
                fontSize:12, fontWeight:700, letterSpacing:'0.03em',
                background: filter === f ? '#8B0000' : '#fff',
                color: filter === f ? '#fff' : '#555',
                boxShadow: filter === f ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
              }}
            >
              {f.charAt(0).toUpperCase()+f.slice(1)}
              <span style={{ marginLeft:5, opacity:0.65, fontSize:10 }}>{counts[f]}</span>
            </button>
          ))}
        </div>
      )}

      {hives.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Hexagon size={26} /></div>
          <p className="empty-title">No hives connected</p>
          <p className="empty-body">Add your first hive to start monitoring health and flowering predictions.</p>
          <button className="btn btn-primary"><Plus size={16} /> Add Hive</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#aaa', fontSize:13 }}>
          No hives match this filter.
        </div>
      ) : (
        filtered.map((h, idx) => (
          <React.Fragment key={h._id || h.id || idx}>
            <HiveCard hive={h} />
          </React.Fragment>
        ))
      )}
    </div>
  );
};
