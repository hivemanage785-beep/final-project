import React, { useEffect, useState } from 'react';
import type { MapProps } from './MapInner';
import { User } from 'firebase/auth';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface MapViewProps {
  user: User;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const MapView: React.FC<MapViewProps> = ({ user }) => {
  const [MapComponent, setMapComponent] = useState<React.FC<MapProps> | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);

  useEffect(() => {
    const loadMap = async () => {
      const { MapInner } = await import('./MapInner');
      setMapComponent(() => MapInner);
    };
    loadMap();
  }, []);

  const prevMonth = () => setSelectedMonth(m => m === 1 ? 12 : m - 1);
  const nextMonth = () => setSelectedMonth(m => m === 12 ? 1 : m + 1);

  if (!MapComponent) {
    return (
      <div className="w-full flex-1 bg-[#f3f4f6] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#5D0623] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative min-h-0 overflow-hidden">
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
          onClick={() => setIsSavedDrawerOpen(o => !o)}
          className="ml-3 flex items-center gap-1 text-xs font-bold text-[#5D0623] bg-[#5D0623]/10 px-3 py-1.5 rounded-full"
        >
          <Star size={12} fill="currentColor" /> Saved
        </button>
      </div>

      {/* Map fills remaining space */}
      <div className="flex-1 relative min-h-0">
        <MapComponent
          selectedMonth={selectedMonth}
          user={user}
          isSavedDrawerOpen={isSavedDrawerOpen}
          setIsSavedDrawerOpen={setIsSavedDrawerOpen}
        />
      </div>
    </div>
  );
};
