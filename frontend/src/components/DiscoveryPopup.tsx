import React, { useState } from 'react';
import { Popup } from 'react-leaflet';
import { PartnerFarmer } from '../types/score';
import { requestContact } from '../api/scoreApi';
import { UserPlus, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';

interface DiscoveryPopupProps {
  farmers: PartnerFarmer[];
  position: [number, number];
  onClose: () => void;
}

export const DiscoveryPopup: React.FC<DiscoveryPopupProps> = ({ farmers, position, onClose }) => {
  const [requestStatus, setRequestStatus] = useState<Record<string, 'idle' | 'pending' | 'success'>>({});

  const handleRequest = async (farmerId: string) => {
    setRequestStatus(prev => ({ ...prev, [farmerId]: 'pending' }));
    try {
      await requestContact(farmerId);
      setRequestStatus(prev => ({ ...prev, [farmerId]: 'success' }));
    } catch (e) {
      console.error('Request failed', e);
      setRequestStatus(prev => ({ ...prev, [farmerId]: 'idle' }));
    }
  };

  if (farmers.length === 0) return null;

  return (
    <Popup position={position} onClose={onClose} minWidth={240} className="custom-discovery-popup">
      <div className="p-1 font-sans">
        <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
          <ShieldAlert size={16} className="text-[#5D0623]" />
          <span className="text-xs font-bold text-gray-800 uppercase tracking-tight">Nearby Land Partners</span>
        </div>

        <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
          {farmers.map(farmer => (
            <div key={farmer.farmer_id} className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
              <p className="text-sm font-bold text-gray-800">{farmer.name}</p>
              <p className="text-[10px] text-gray-400 font-medium mb-2 uppercase tracking-wide">
                {farmer.approx_location.lat.toFixed(3)}, {farmer.approx_location.lng.toFixed(3)}
              </p>

              {requestStatus[farmer.farmer_id] === 'success' ? (
                <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase bg-green-50 px-2 py-1.5 rounded-md w-full justify-center">
                  <CheckCircle2 size={12} />
                  Request Sent
                </div>
              ) : (
                <button
                  disabled={requestStatus[farmer.farmer_id] === 'pending'}
                  onClick={() => handleRequest(farmer.farmer_id)}
                  className="flex items-center justify-center gap-2 w-full bg-[#5D0623] text-white py-1.5 rounded-md text-[10px] font-bold uppercase hover:bg-[#4A051C] transition-all disabled:opacity-50 shadow-sm active:scale-95"
                >
                  {requestStatus[farmer.farmer_id] === 'pending' ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <UserPlus size={12} />
                      Request Contact
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
        
        <p className="mt-2 text-[8px] text-gray-400 font-medium leading-tight">
          * Locations are approximate for privacy. Admin approval is required for contact details.
        </p>
      </div>
    </Popup>
  );
};
