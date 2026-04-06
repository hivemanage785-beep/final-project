import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, Hive } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSync } from '../hooks/useSync';
import { Hexagon, Plus, MapPin } from 'lucide-react';
import { HiveDetailsSheet } from '../components/HiveDetailsSheet';

export const HivesList: React.FC = () => {
  const { user } = useAuth();
  const { queueOperation } = useSync();
  const hives = useLiveQuery(() => db.hives.where('uid').anyOf([user?.uid || '', 'demo-uid-fixed-001']).toArray(), [user]) || [];
  
  const [selectedHive, setSelectedHive] = useState<Hive | null>(null);

  const handleAddHive = async () => {
    if (!user) return;
    const newHiveId = prompt("Enter new Hive Identifier (e.g. Hive-A1)");
    if (!newHiveId) return;
    
    // Attempting to grasp geolocation for easy UX
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const hiveLocalId = crypto.randomUUID(); // Required: Dexie uses 'id' as non-auto PK
      const newHive: Hive = {
        id: hiveLocalId,
        uid: user.uid,
        hive_id: newHiveId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        box_count: 1,
        queen_status: 'healthy',
        health_status: 'good',
        last_inspection_date: new Date().toISOString(),
        notes: ''
      };
      
      await db.hives.add(newHive);
      queueOperation('hives', 'create', newHive);
      console.log('[HIVE] Created locally:', newHive.hive_id, newHive.id);
    }, () => {
      alert("Please allow location to place hive correctly.");
    });
  };


  return (
    <div className="flex-1 bg-gray-50 h-full w-full pb-20">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-3 border-b border-gray-200 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">My Hives</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleAddHive} className="bg-[#5D0623] text-white p-2 text-sm rounded-full flex items-center shadow-md">
            <Plus size={20} />
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-3 overflow-y-auto">
        {hives.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Hexagon size={48} className="mx-auto mb-3 opacity-20" />
            <p>No hives yet. Tap + to deploy one.</p>
          </div>
        )}
        
        {hives.map(hive => (
          <div 
            key={hive.id} 
            onClick={() => setSelectedHive(hive)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 relative transition active:scale-[0.98]"
          >
            <div className="flex justify-between items-start pointer-events-none">
              <h3 className="font-bold text-[#5D0623] text-lg">{hive.hive_id}</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                hive.health_status === 'good' ? 'bg-green-100 text-green-700' :
                hive.health_status === 'fair' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              }`}>
                {hive.health_status}
              </span>
            </div>
            
            <div className="text-xs text-gray-500 flex items-center gap-1 pointer-events-none">
              <MapPin size={12} />
              {hive.lat.toFixed(4)}, {hive.lng.toFixed(4)}
            </div>
            
            <div className="mt-2 text-sm flex gap-4 pointer-events-none">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Queen</span>
                <span className="font-medium text-gray-700">{hive.queen_status}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Boxes</span>
                <span className="font-medium text-gray-700">{hive.box_count}</span>
              </div>
            </div>
            
            <div className="mt-2 text-[11px] text-gray-400 pointer-events-none">
              Last Check: {new Date(hive.last_inspection_date).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      <HiveDetailsSheet 
        hive={selectedHive} 
        isOpen={selectedHive !== null} 
        onClose={() => setSelectedHive(null)} 
      />
    </div>
  );
};
