import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import { Bell, AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export const Alerts: React.FC = () => {
  const { user } = useAuth();
  
  // Get hives to generate dynamic alerts
  const hives = useLiveQuery(() => db.hives.where('uid').equals(user?.uid || '').toArray(), [user]) || [];
  
  const alerts = [];
  
  // Generate alerts for poor/fair health hives
  const poorHives = hives.filter(h => h.health_status === 'poor');
  if (poorHives.length > 0) {
    alerts.push({
      id: 'alert-health-poor',
      type: 'critical',
      title: 'Critical Hive Health',
      description: `${poorHives.length} hive(s) marked as poor health. Immediate inspection required.`,
      icon: AlertCircle,
      color: 'text-red-500',
      bg: 'bg-red-50',
      border: 'border-red-100'
    });
  }

  const fairHives = hives.filter(h => h.health_status === 'fair');
  if (fairHives.length > 0) {
    alerts.push({
      id: 'alert-health-fair',
      type: 'warning',
      title: 'Intervention Needed',
      description: `${fairHives.length} hive(s) require attention regarding their health status.`,
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-100'
    });
  }

  // Generate alerts for overdue inspections (> 14 days)
  const overdueHives = hives.filter(h => {
    if (!h.last_inspection_date) return true;
    const diffDays = (new Date().getTime() - new Date(h.last_inspection_date).getTime()) / (1000 * 3600 * 24);
    return diffDays > 14; 
  });
  
  if (overdueHives.length > 0) {
    alerts.push({
      id: 'alert-overdue',
      type: 'info',
      title: 'Overdue Inspections',
      description: `${overdueHives.length} hive(s) haven't been inspected in over 14 days.`,
      icon: Info,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      border: 'border-blue-100'
    });
  }

  return (
    <div className="flex-1 bg-gray-50 p-4 pb-24 overflow-y-auto w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="text-[#5D0623]" size={24} /> Alerts
          </h1>
          <p className="text-gray-500 text-sm">System notifications & action items</p>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-12 text-gray-400 flex flex-col items-center">
            <Bell size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-gray-500">You're all caught up!</p>
            <p className="text-xs">No alerts at this time.</p>
          </div>
        ) : (
          alerts.map((alert, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={alert.id} 
              className={`p-4 rounded-xl border ${alert.bg} ${alert.border} shadow-sm relative overflow-hidden`}
            >
              <div className="flex gap-4 items-start">
                <div className={`p-2 rounded-full bg-white/60 shadow-sm ${alert.color}`}>
                  <alert.icon size={20} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold ${alert.color.replace('text-', 'text-').replace('-500', '-700').replace('-600', '-800')}`}>{alert.title}</h3>
                  <p className="text-sm text-gray-700 mt-1 leading-snug">{alert.description}</p>
                </div>
                <button className="text-gray-400 hover:text-gray-600 transition">
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
