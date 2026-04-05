import React from 'react';
import { X, MapPin, Trash2 } from 'lucide-react';
import { SavedLocation } from '../types/score';

interface SavedLocationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  locations: SavedLocation[];
  onSelect: (loc: SavedLocation) => void;
  onDelete: (id: string) => void;
}

export const SavedLocationsDrawer: React.FC<SavedLocationsDrawerProps> = ({
  isOpen, onClose, locations, onSelect, onDelete
}) => {
  if (!isOpen) return null;

  const getGradeColor = (grade: string) => {
    switch(grade) {
      case 'Excellent': return 'bg-[#1a9641] text-white';
      case 'Good': return 'bg-[#a6d96a] text-gray-900';
      case 'Fair': return 'bg-[#f46d43] text-white';
      case 'Poor': return 'bg-[#d73027] text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="absolute top-[48px] right-0 h-[calc(100vh-48px)] w-full md:w-[320px] bg-white shadow-2xl z-[2001] flex flex-col transform transition-transform border-l border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">Saved Locations</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {locations.length === 0 ? (
          <p className="text-center text-gray-500 mt-8">No saved locations yet.</p>
        ) : (
          locations.map(loc => (
            <div 
              key={loc.id} 
              className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer relative group bg-gray-50 hover:bg-white flex flex-col items-start text-left w-full"
            >
              <div className="w-full flex justify-between items-start mb-2" onClick={() => onSelect(loc)}>
                <div className={`px-2 py-0.5 rounded text-xs font-bold leading-none flex items-center h-5 ${getGradeColor(loc.grade)}`}>
                  {loc.grade} ({loc.score})
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (loc.id) onDelete(loc.id);
                  }}
                  className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600 font-mono mb-1 w-full" onClick={() => onSelect(loc)}>
                <MapPin size={14} />
                {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
              </div>
              <div className="text-xs text-gray-500 w-full" onClick={() => onSelect(loc)}>
                Month: {MONTHS[loc.month - 1]}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
