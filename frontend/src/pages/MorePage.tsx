import React from 'react';
import { User, LogOut, HelpCircle, ChevronRight, Shield, Bell, Info, Hexagon } from 'lucide-react';
import { auth } from '../firebase';

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

export const MorePage = ({ user }: any) => {
  const name = user?.displayName || 'Beekeeper';
  const email = user?.email || '';
  const inits = name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase();

  return (
    <div className="page-enter">
      <p className="page-title" style={{ marginBottom:20 }}>More</p>

      {/* Profile card */}
      <div style={{
        background:'#8B0000', borderRadius:18, padding:'20px 18px',
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

      {/* Account */}
      <p className="section-label">Account</p>
      <div className="card" style={{ marginBottom:14 }}>
        <Row Icon={User}   label="Profile"       sub="Edit personal details" />
        <Row Icon={Bell}   label="Notifications" sub="Alert preferences" />
        <Row Icon={Shield} label="Security"      sub="Password & 2FA" />
      </div>

      {/* Support */}
      <p className="section-label">Support</p>
      <div className="card" style={{ marginBottom:14 }}>
        <Row Icon={HelpCircle} label="Help & FAQs"   sub="Common questions" />
        <Row Icon={Info}       label="About HiveOps" sub="Version 1.0 · Tamil Nadu" />
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
