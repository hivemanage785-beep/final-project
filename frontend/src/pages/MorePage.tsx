import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, HelpCircle, ChevronRight, Shield, Bell, Info, Hexagon, BarChart3 } from 'lucide-react';
import { auth } from '../firebase';
import { apiGet } from '../services/api';

interface RowProps {
  Icon: any; label: string; sub?: string; danger?: boolean; onClick?: () => void;
}
const Row = ({ Icon, label, sub, danger, onClick }: RowProps) => (
  <div className="settings-row" onClick={onClick}>
    <div className="settings-row-icon" style={{ background: danger ? '#FEE2E2' : '#F5F3EF' }}>
      <Icon size={17} color={danger ? '#B91C1C' : '#555'} />
    </div>
    <div style={{ flex:1 }}>
      <p className="settings-row-label" style={{ color: danger ? '#B91C1C' : undefined }}>{label}</p>
      {sub && <p className="settings-row-sub">{sub}</p>}
    </div>
    {!danger && <ChevronRight size={15} color="#ccc" />}
  </div>
);

const outcomeBadge = (outcome: string) => {
  const cfg: Record<string, { bg: string; color: string }> = {
    Good:    { bg: '#DCFCE7', color: '#15803D' },
    Average: { bg: '#FEF3C7', color: '#B45309' },
    Poor:    { bg: '#FEE2E2', color: '#B91C1C' },
  };
  const c = cfg[outcome] || cfg.Average;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px',
      borderRadius: 6, background: c.bg, color: c.color,
      textTransform: 'uppercase', letterSpacing: '0.04em'
    }}>{outcome}</span>
  );
};

export const MorePage = ({ user }: any) => {
  const navigate = useNavigate();
  const name = user?.displayName || 'Beekeeper';
  const email = user?.email || '';
  const inits = name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase();

  const [feedbackData, setFeedbackData] = useState<{ total: number; entries: any[] } | null>(null);
  const [fbLoading, setFbLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/feedback-history')
      .then((d: any) => {
        if (d.success) setFeedbackData({ total: d.total, entries: d.entries || [] });
      })
      .catch(() => {})
      .finally(() => setFbLoading(false));
  }, []);

  const goodCount = feedbackData?.entries.filter((e: any) => e.actual_outcome === 'Good').length || 0;
  const avgCount = feedbackData?.entries.filter((e: any) => e.actual_outcome === 'Average').length || 0;
  const poorCount = feedbackData?.entries.filter((e: any) => e.actual_outcome === 'Poor').length || 0;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">More</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Account &amp; settings</p>
        </div>
      </div>

      {/* Profile card */}
      <div style={{
        background:'#8B0000', borderRadius:24, padding:'20px 18px',
        marginBottom:16, display:'flex', alignItems:'center', gap:14,
        position:'relative', overflow:'hidden'
      }}>
        <div style={{ position:'absolute',right:-12,top:-12,opacity:0.08 }}>
          <Hexagon size={100} fill="white" color="white" />
        </div>
        <div style={{
          width:50,height:50,borderRadius:'50%',
          background:'rgba(255,255,255,0.18)',
          color:'#fff',display:'flex',alignItems:'center',
          justifyContent:'center',fontWeight:900,fontSize:18,flexShrink:0
        }}>{inits}</div>
        <div style={{ color:'#fff' }}>
          <p style={{ fontWeight:800,fontSize:17,lineHeight:1.25 }}>{name}</p>
          <p style={{ fontSize:12,opacity:0.65,marginTop:2 }}>{email}</p>
          <div style={{
            display:'inline-flex',alignItems:'center',gap:5,
            background:'rgba(255,255,255,0.15)',
            padding:'4px 10px',borderRadius:100,marginTop:8
          }}>
            <div style={{ width:6,height:6,borderRadius:'50%',background:'#86efac' }} />
            <span style={{ fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.9)',letterSpacing:'0.05em' }}>
              Pro Beekeeper
            </span>
          </div>
        </div>
      </div>

      {/* Feedback History */}
      <h3 className="section-label">Feedback Data</h3>
      <div className="card" style={{ marginBottom: 20 }}>
        <Row
          Icon={BarChart3}
          label="Feedback History"
          sub={fbLoading ? 'Loading...' : `${feedbackData?.total || 0} entries recorded`}
          onClick={() => navigate('/feedback-history')}
        />
      </div>

      {/* Account */}
      <h3 className="section-label">Account</h3>
      <div className="card" style={{ marginBottom: 20 }}>
        <Row Icon={User}   label="Profile"       sub="Edit personal details" onClick={() => navigate('/profile')} />
        <Row Icon={Bell}   label="Notifications" sub="Alert preferences" onClick={() => navigate('/notifications')} />
        <Row Icon={Shield} label="Security"      sub="Password & 2FA" onClick={() => navigate('/security')} />
      </div>

      {/* Support */}
      <h3 className="section-label">Support</h3>
      <div className="card" style={{ marginBottom: 20 }}>
        <Row Icon={HelpCircle} label="Help & FAQs"   sub="Common questions" onClick={() => navigate('/help')} />
        <Row Icon={Info}       label="About HiveOps" sub="Version 1.0 · Tamil Nadu" onClick={() => navigate('/about')} />
      </div>

      {/* Sign out */}
      <div className="card">
        <Row Icon={LogOut} label="Sign out" danger onClick={() => auth.signOut()} />
      </div>

      <p style={{ textAlign:'center',fontSize:11,color:'#ccc',marginTop:28,letterSpacing:'0.05em',fontWeight:600,textTransform:'uppercase' }}>
        HiveOps · Precision Beekeeping
      </p>
    </div>
  );
};
