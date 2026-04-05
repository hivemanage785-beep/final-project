import React, { useState } from 'react';
import { MapInner } from './MapInner';
import { User } from 'firebase/auth';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface MapViewProps {
  user: User;
}

export const MapView: React.FC<MapViewProps> = ({ user }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);

  const prevMonth = () => setSelectedMonth(m => m === 1 ? 12 : m - 1);
  const nextMonth = () => setSelectedMonth(m => m === 12 ? 1 : m + 1);

  return (
    <div className="flex-1 flex flex-col relative w-full h-full min-h-0 overflow-hidden">
      {/* Month selector bar */}
      <div className="flex-shrink-0 flex items-center justify-between bg-white/95 backdrop-blur-sm px-4 py-2 border-b border-gray-100 z-[500] shadow-sm">
        <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-500">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold text-gray-700 tracking-wide">{MONTHS[selectedMonth - 1]} Forecast</span>
        <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-500">
          <ChevronRight size={18} />
        </button>
        <button 
          onClick={() => setIsSavedDrawerOpen(true)}
          className="ml-3 flex items-center gap-1 text-xs font-bold text-[#5D0623] bg-[#5D0623]/10 px-3 py-1.5 rounded-full"
        >
          <Star size={12} fill="currentColor" /> Saved
        </button>
      </div>
      <div className="flex-1 relative min-h-0">
        <MapInner 
          selectedMonth={selectedMonth} 
          user={user} 
          isSavedDrawerOpen={isSavedDrawerOpen} 
          setIsSavedDrawerOpen={setIsSavedDrawerOpen} 
        />
      </div>
    </div>
  );
};
