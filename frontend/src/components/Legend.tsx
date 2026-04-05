import React from 'react';

export const Legend: React.FC = () => {
  return (
    <div className="absolute bottom-6 left-6 z-[1000] bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-gray-100 min-w-56 overflow-hidden">
      <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 px-1">Hive Suitability</h4>
      
      <div className="relative h-2 w-full rounded-full bg-gray-100" style={{ background: 'linear-gradient(to right, blue, lime, yellow, orange, red)' }}>
      </div>
      
      <div className="flex justify-between mt-1 px-1">
        <span className="text-[10px] font-bold text-blue-600 uppercase">Poor</span>
        <span className="text-[10px] font-bold text-gray-400 uppercase">Moderate</span>
        <span className="text-[10px] font-bold text-red-600 uppercase">Optimal</span>
      </div>
    </div>
  );
};
