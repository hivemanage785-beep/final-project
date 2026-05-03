import React from 'react';
import { db, Inspection } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, AlertTriangle, Bug } from 'lucide-react';

interface Props {
  hiveId: string;
}

export const InspectionTimeline: React.FC<Props> = ({ hiveId }) => {
  const inspections = useLiveQuery(() => 
    db.inspections.where('hive_id').equals(hiveId).reverse().sortBy('date'),
    [hiveId]
  ) || [];

  if (inspections.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">
        <p className="text-sm">No logs recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
      {inspections.map((ins, i) => {
        const isHealthy = ins.health_status === 'good';
        return (
          <div key={ins.id || i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
             {/* Icon */}
             <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${isHealthy ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} z-10`}>
                 {isHealthy ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
             </div>
             
             {/* Card */}
             <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-1">
                  <time className="text-xs font-bold text-[#5D0623]">{new Date(ins.date).toLocaleDateString()}</time>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isHealthy ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {ins.health_status}
                  </span>
                </div>
                <div className="text-xs text-gray-600 font-medium mb-2">Queen: {ins.queen_status} | Boxes: {ins.box_count}</div>
                <p className="text-xs text-gray-500">{ins.notes || "No notes provided."}</p>
             </div>
          </div>
        );
      })}
    </div>
  );
};
