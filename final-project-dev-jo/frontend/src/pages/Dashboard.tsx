import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useSync } from '../hooks/useSync';
import { Hexagon, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../lib/api';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { isOnline, isSyncing } = useSync();
  const hives = useLiveQuery(() => db.hives.where('uid').equals(user?.uid || '').toArray(), [user]) || [];
  
  const totalHives = hives.length;
  const goodHives = hives.filter(h => h.health_status === 'good').length;
  const fairHives = hives.filter(h => h.health_status === 'fair').length;
  const poorHives = hives.filter(h => h.health_status === 'poor').length;
  
  const needsInspection = hives.filter(h => {
    if (!h.last_inspection_date) return true;
    const diffDays = (new Date().getTime() - new Date(h.last_inspection_date).getTime()) / (1000 * 3600 * 24);
    return diffDays > 14; 
  }).length;

  useEffect(() => {
    // Attempt to wake up backend connection 
    if (isOnline) {
      apiFetch('/health').catch(() => {});
    }
  }, [isOnline]);

  return (
    <div className="flex-1 bg-[#FDF9F6] p-4 pb-24 overflow-y-auto w-full h-full relative">
      
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 -z-10 translate-x-20 -translate-y-20"></div>

      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8 pt-4"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Today</h1>
          <p className="text-gray-500 text-sm flex items-center gap-1.5 mt-1 font-medium">
            <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${isOnline ? 'bg-green-500 shadow-green-500/40' : 'bg-red-500 shadow-red-500/40'}`} />
            {isOnline ? (isSyncing ? 'Syncing data...' : 'Cloud connected') : 'Offline Mode Active'}
          </p>
        </div>
        <img src={user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} alt="Profile" className="w-12 h-12 rounded-full shadow-md border-2 border-white ring-2 ring-rose-100 object-cover" />
      </motion.div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-to-br from-[#5D0623] to-[#8c0834] p-5 rounded-3xl shadow-lg shadow-[#5D0623]/20 flex flex-col items-start justify-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Hexagon size={64} fill="currentColor" strokeWidth={1} />
          </div>
          <div className="p-2 bg-white/20 rounded-xl mb-3 backdrop-blur-md">
            <Hexagon className="text-white" size={24} />
          </div>
          <span className="text-4xl font-black text-white">{totalHives}</span>
          <span className="text-xs text-white/80 uppercase tracking-widest mt-1 font-medium z-10">Total Hives</span>
        </motion.div>
        
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-rose-50 flex flex-col items-start justify-center"
        >
          <div className="p-2 bg-orange-50 rounded-xl mb-3">
            <Clock className="text-orange-500" size={24} />
          </div>
          <span className="text-4xl font-black text-gray-800">{needsInspection}</span>
          <span className="text-xs text-gray-400 uppercase tracking-widest mt-1 font-bold">Due Checks</span>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="font-bold text-xl mb-4 text-gray-800 tracking-tight">Health Overview</h2>
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-rose-50 p-5 mb-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 p-2 rounded-xl text-green-600">
                <CheckCircle size={24} />
              </div>
              <span className="text-base font-bold text-gray-700">Healthy & Thriving</span>
            </div>
            <span className="text-2xl font-black text-gray-800">{goodHives}</span>
          </div>
          
          <div className="h-px bg-gray-100" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-50 p-2 rounded-xl text-yellow-600">
                <AlertTriangle size={24} />
              </div>
              <span className="text-base font-bold text-gray-700">Needs Attention</span>
            </div>
            <span className="text-2xl font-black text-gray-800">{fairHives + poorHives}</span>
          </div>
        </div>
      </motion.div>
      
    </div>
  );
};
