import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MapView } from '../components/field/MapView';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const FieldPage = ({ user }: any) => {
  const [month, setMonth] = useState(new Date().getMonth()); // 0-indexed

  const prev = () => setMonth(m => (m + 11) % 12);
  const next = () => setMonth(m => (m + 1) % 12);

  return (
    <div className="field-page page-enter" style={{ padding: 0 }}>
      {/* Top bar */}
      <div className="field-topbar flex flex-col min-[380px]:flex-row items-start min-[380px]:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Field Intelligence</h1>
          <p className="page-subtitle">Analyze any location for forage suitability and flowering trends</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full min-[380px]:w-auto">
          {/* Month picker */}
          <div className="month-pill">
            <button className="month-btn" onClick={prev}><ChevronLeft size={16} /></button>
            <span className="month-name">{MONTHS[month]}</span>
            <button className="month-btn" onClick={next}><ChevronRight size={16} /></button>
          </div>

          {/* Live badge */}
          <div style={{
            display:'flex',alignItems:'center',gap:5,
            background:'rgba(139,0,0,0.08)',
            padding:'6px 10px',borderRadius:8
          }}>
            <div style={{ width:6,height:6,borderRadius:'50%',background:'#8B0000',animation:'pulse 2s infinite' }} />
            <span style={{ fontSize:10,fontWeight:800,color:'#8B0000',letterSpacing:'0.06em' }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="field-map">
        <MapView selectedMonth={month + 1} user={user} />
      </div>
    </div>
  );
};
