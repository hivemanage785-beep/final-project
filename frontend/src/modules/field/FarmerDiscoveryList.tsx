import React, { useEffect, useState } from 'react';
import { PartnerFarmer, RequestStatus } from '../../types/score';
import { fetchNearbyFarmers, requestContact } from '../../api/scoreApi';
import { MapPin, UserPlus, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';

interface FarmerDiscoveryListProps {
  lat: number;
  lng: number;
  score: number;
}

export const FarmerDiscoveryList: React.FC<FarmerDiscoveryListProps> = ({ lat, lng, score }) => {
  const [farmers, setFarmers] = useState<PartnerFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState<Record<string, 'pending' | 'success'>>({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchNearbyFarmers(lat, lng);
        if (mounted) setFarmers(data);
      } catch (e) {
        console.error('Discovery failed', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [lat, lng]);

  const handleRequest = async (farmerId: string) => {
    setSentRequests(prev => ({ ...prev, [farmerId]: 'pending' }));
    try {
      await requestContact(farmerId);
      setSentRequests(prev => ({ ...prev, [farmerId]: 'success' }));
    } catch (error) {
      console.error('Request failed', error);
      // Rollback or show error
    }
  };

  if (loading) {
    return (
       <div className="mt-6 flex justify-center p-4">
         <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
       </div>
    );
  }

  if (farmers.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <ShieldAlert className="text-[#5D0623]" size={16} />
          Potential Land Partners
        </h3>
        <span className="text-[10px] font-bold bg-[#5D0623]/5 text-[#5D0623] px-2 py-0.5 rounded-full uppercase tracking-tight">
          Admin Approval Required
        </span>
      </div>

      <div className="grid gap-3">
        {farmers.map((farmer) => (
          <div 
            key={farmer.farmer_id} 
            className="group bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-extrabold text-gray-800 mb-1">{farmer.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider">
                  <MapPin size={12} className="text-red-400" />
                  {farmer.approx_location.lat.toFixed(2)}, {farmer.approx_location.lng.toFixed(2)} 
                  <span className="ml-1 opacity-50">(Approximate)</span>
                </div>
              </div>

              {sentRequests[farmer.farmer_id] === 'success' ? (
                <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase">
                  <CheckCircle2 size={12} />
                  Sent
                </div>
              ) : (
                <button
                  disabled={sentRequests[farmer.farmer_id] === 'pending'}
                  onClick={() => handleRequest(farmer.farmer_id)}
                  className="flex items-center gap-1.5 bg-[#5D0623] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-[#4A051C] transition-colors disabled:opacity-50"
                >
                  {sentRequests[farmer.farmer_id] === 'pending' ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <UserPlus size={12} />
                  )}
                  {sentRequests[farmer.farmer_id] === 'pending' ? 'Sending...' : 'Request Contact'}
                </button>
              )}
            </div>
            
            {sentRequests[farmer.farmer_id] === 'success' && (
              <p className="mt-3 text-[10px] text-gray-500 bg-gray-50 p-2 rounded-lg leading-relaxed font-medium">
                📩 Request Sent – Awaiting Approval. Once approved, you can access contact details in your profile.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
