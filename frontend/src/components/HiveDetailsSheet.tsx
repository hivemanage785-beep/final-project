import React, { useState, useRef } from 'react';
import { BottomSheet } from './BottomSheet';
import { Hive, Inspection, db } from '../lib/db';
import { Settings, CheckSquare, Activity, MapPin, Search, QrCode, ExternalLink, Mic, Square } from 'lucide-react';
import { useSync } from '../hooks/useSync';
import { useAuth } from '../hooks/useAuth';
import { InspectionTimeline } from './InspectionTimeline';
import { QRCode } from './QRCode';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface HiveDetailsSheetProps {
  hive: Hive | null;
  isOpen: boolean;
  onClose: () => void;
}

export const HiveDetailsSheet: React.FC<HiveDetailsSheetProps> = ({ hive, isOpen, onClose }) => {
  const { user } = useAuth();
  const { queueOperation } = useSync();
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'inspections' | 'add_inspection'>('overview');
  const [editedHive, setEditedHive] = useState<Partial<Hive>>({});
  const [newInspection, setNewInspection] = useState<Partial<Inspection>>({ health_status: 'good', queen_status: 'healthy', box_count: 1 });

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);

  React.useEffect(() => {
    if (isOpen && hive) {
      setEditedHive(hive);
      setNewInspection({ health_status: hive.health_status, queen_status: hive.queen_status, box_count: hive.box_count, notes: '' });
      setActiveTab('overview');
      setAudioBlob(null);
      setIsRecording(false);
    }
  }, [isOpen, hive]);

  if (!hive) return null;

  const handleSaveHive = async () => {
    if (!editedHive.id) return;
    await db.hives.update(editedHive.id, editedHive);
    queueOperation('hives', 'update', { id: editedHive.id, ...editedHive });
    setActiveTab('overview');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e: any) => {
          let finalTranscript = '';
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) {
              finalTranscript += e.results[i][0].transcript + ' ';
            }
          }
          if (finalTranscript) {
            setNewInspection(prev => ({ ...prev, notes: ((prev.notes || '') + ' ' + finalTranscript).trim() }));
          }
        };
        rec.start();
        recognitionRef.current = rec;
      }
    } catch (e) {
      console.error(e);
      alert('Microphone access denied or not supported');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
  };

  const handleCreateInspection = async () => {
    if (!hive.id || !user) return;
    setIsUploading(true);
    const date = new Date().toISOString();
    
    let audio_url = undefined;
    if (audioBlob) {
      try {
        const fileRef = ref(storage, `inspections/${user.uid}/${hive.id}_${Date.now()}.webm`);
        await uploadBytes(fileRef, audioBlob);
        audio_url = await getDownloadURL(fileRef);
      } catch (e) {
        console.error('Failed to upload audio', e);
      }
    }
    
    const doc: Inspection = {
      id: crypto.randomUUID(), // Required: Dexie uses 'id' as non-auto PK
      uid: user.uid,
      hive_id: hive.id,
      date,
      notes: newInspection.notes || '',
      box_count: newInspection.box_count || hive.box_count,
      queen_status: newInspection.queen_status || 'healthy',
      health_status: newInspection.health_status || 'good',
      audio_url
    };
    
    await db.inspections.add(doc);
    queueOperation('inspections', 'create', doc);
    console.log('[INSPECTION] Created locally for hive:', hive.hive_id);
    
    // Auto-update parent hive
    await db.hives.update(hive.id, { 
      last_inspection_date: date, 
      health_status: doc.health_status,
      queen_status: doc.queen_status,
      box_count: doc.box_count
    });
    queueOperation('hives', 'update', { id: hive.id, last_inspection_date: date, health_status: doc.health_status, queen_status: doc.queen_status, box_count: doc.box_count });
    
    setIsUploading(false);
    setAudioBlob(null);
    setActiveTab('inspections');
  };


  const isHealthy = hive.health_status === 'good';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={hive.hive_id}>
      <div className="flex bg-gray-100 p-1 rounded-xl mb-4 mt-2">
         <button 
           className={`flex-1 py-1.5 font-bold text-xs rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white shadow-sm text-[#5D0623]' : 'text-gray-500'}`}
           onClick={() => setActiveTab('overview')}
         >
           Overview
         </button>
         <button 
           className={`flex-1 py-1.5 font-bold text-xs rounded-lg transition-all ${activeTab === 'inspections' ? 'bg-white shadow-sm text-[#5D0623]' : 'text-gray-500'}`}
           onClick={() => setActiveTab('inspections')}
         >
           Timeline
         </button>
         <button 
           className={`flex-1 py-1.5 font-bold text-xs rounded-lg transition-all ${activeTab === 'edit' ? 'bg-white shadow-sm text-[#5D0623]' : 'text-gray-500'}`}
           onClick={() => setActiveTab('edit')}
         >
           Settings
         </button>
      </div>

      <div className="overflow-y-auto max-h-[60vh] pb-8 pt-2">
        
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-1.5 ${isHealthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <Activity size={14} /> {hive.health_status}
              </div>
              <div className="px-3 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-1.5 bg-blue-50 text-blue-700">
                Queen: {hive.queen_status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 flex flex-col justify-center">
                <span className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Boxes</span>
                <span className="text-2xl font-black text-gray-800">{hive.box_count}</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 flex flex-col justify-center">
                <span className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Last Check</span>
                <span className="text-sm font-bold text-gray-800">{new Date(hive.last_inspection_date).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
                 <div className="flex items-center gap-2 mb-2 text-gray-800 font-bold text-sm">
                   <MapPin size={16} className="text-[#5D0623]" /> Current Location
                 </div>
                 <p className="text-gray-600 text-xs font-mono">Lat: {hive.lat?.toFixed(6) || 'N/A'}</p>
                 <p className="text-gray-600 text-xs font-mono">Lng: {hive.lng?.toFixed(6) || 'N/A'}</p>
                 
                 {hive.location_history && hive.location_history.length > 0 && (
                   <div className="mt-3 pt-3 border-t border-gray-200">
                     <p className="text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-wider">Relocation History</p>
                     <div className="space-y-3">
                       {hive.location_history.map((loc, idx) => (
                         <div key={idx} className="relative pl-3 border-l-2 border-[#5D0623]/20">
                           <div className="text-[10px] font-bold text-[#5D0623]">{new Date(loc.date).toLocaleDateString()}</div>
                           <div className="text-xs text-gray-700 font-medium">{loc.reason}</div>
                           <div className="text-[10px] text-gray-500 font-mono mt-0.5">Moved to: {loc.lat?.toFixed(4)}, {loc.lng?.toFixed(4)}</div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
            </div>

            {hive.notes && (
               <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4">
                  <span className="text-orange-800 text-xs font-bold">Notes</span>
                  <p className="text-sm text-gray-700 mt-1">{hive.notes}</p>
               </div>
            )}

            {/* QR Traceability Code */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 text-gray-800 font-bold text-sm">
                <QrCode size={16} className="text-[#5D0623]" /> Hive Traceability QR
              </div>
              <div className="flex items-center gap-4">
                <QRCode value={`${window.location.origin}/trace/${hive.id}`} size={96} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-2">Scan to view hive data publicly. Attach this QR to the physical hive box.</p>
                  <button 
                    onClick={() => window.open(`/trace/${hive.id}`, '_blank')}
                    className="flex items-center gap-1 text-xs font-bold text-[#5D0623] hover:underline"
                  >
                    <ExternalLink size={12} /> Open Trace Page
                  </button>
                </div>
              </div>
            </div>

            <button onClick={() => setActiveTab('add_inspection')} className="w-full btn-primary flex justify-center items-center gap-2 mt-4">
              <CheckSquare size={18} /> New Inspection Log
            </button>
          </div>
        )}

        {activeTab === 'inspections' && (
          <div className="space-y-4">
             <InspectionTimeline hiveId={hive.id!} />
             <button onClick={() => setActiveTab('add_inspection')} className="w-full btn-secondary mt-4">Add Log</button>
          </div>
        )}

        {activeTab === 'add_inspection' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800 mb-2">Log Inspection Details</h3>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Health Status</label>
              <select className="input-field" value={newInspection.health_status} onChange={e => setNewInspection({...newInspection, health_status: e.target.value as any})}>
                 <option value="good">Good</option>
                 <option value="fair">Fair</option>
                 <option value="poor">Poor</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Queen Status</label>
              <select className="input-field" value={newInspection.queen_status} onChange={e => setNewInspection({...newInspection, queen_status: e.target.value as any})}>
                 <option value="healthy">Healthy</option>
                 <option value="missing">Missing</option>
                 <option value="replaced">Replaced</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Box Count</label>
                <input type="number" className="input-field" value={newInspection.box_count} onChange={e => setNewInspection({...newInspection, box_count: parseInt(e.target.value)})} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Observations / Notes</label>
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${isRecording ? 'bg-red-100 text-red-600 font-bold animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {isRecording ? <><Square size={12}/> Stop Dictation</> : <><Mic size={12}/> Dictate</>}
                </button>
              </div>
              <textarea className="input-field min-h-[80px]" placeholder="Evidence of mites? Surplus honey? Dictate hands-free..." value={newInspection.notes || ''} onChange={e => setNewInspection({...newInspection, notes: e.target.value})} />
              {audioBlob && !isRecording && (
                <div className="text-xs text-green-600 font-bold mt-1">✓ Audio recording attached</div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
               <button onClick={() => setActiveTab('inspections')} className="flex-1 btn-secondary" disabled={isUploading}>Cancel</button>
               <button onClick={handleCreateInspection} className="flex-2 btn-primary flex justify-center items-center gap-2" disabled={isUploading}>
                 {isUploading ? 'Saving...' : 'Save Log'}
               </button>
            </div>
          </div>
        )}

        {activeTab === 'edit' && (
          <div className="space-y-4">
             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-500 uppercase">Hive Name / ID</label>
               <input type="text" className="input-field" value={editedHive.hive_id || ''} onChange={e => setEditedHive({...editedHive, hive_id: e.target.value})} />
             </div>
             
             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-500 uppercase">General Notes</label>
               <textarea className="input-field min-h-[80px]" value={editedHive.notes || ''} onChange={e => setEditedHive({...editedHive, notes: e.target.value})} />
             </div>

             <div className="pt-4 flex gap-3">
               <button onClick={() => setActiveTab('overview')} className="flex-1 btn-secondary">Cancel</button>
               <button onClick={handleSaveHive} className="flex-2 btn-primary flex justify-center items-center gap-2"><Settings size={18}/> Update Settings</button>
             </div>
          </div>
        )}

      </div>
    </BottomSheet>
  );
};
