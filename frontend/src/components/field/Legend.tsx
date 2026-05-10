import React from 'react';

export const Legend: React.FC = () => {
  return (
    <div className="absolute bottom-20 left-3 z-[1000] shadow-lg rounded-xl p-2.5 pointer-events-auto border border-white/60"
      style={{ 
        minWidth: 140,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)'
      }}>
      <h4 className="font-bold text-gray-800 mb-2 text-[10px] tracking-tight uppercase">
        Flowering Suitability
      </h4>

      {/* Red → Yellow → Green gradient bar */}
      <div className="relative mb-2">
        <div style={{
          background: 'linear-gradient(to right, #d7191c, #ffff00, #1a9641)',
          height: 6,
          borderRadius: 3,
          width: '100%'
        }} />
        <div className="flex justify-between text-[8px] text-gray-500 mt-1 font-medium uppercase">
          <span>Poor</span>
          <span>Fair</span>
          <span>Good</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 mt-1 text-[9px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: '#d7191c' }} />
          <span className="text-gray-600">Avoid 🚫</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: '#ffff00' }} />
          <span className="text-gray-600">Moderate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: '#1a9641' }} />
          <span className="text-gray-600">Excellent ✅</span>
        </div>
      </div>
    </div>
  );
};
