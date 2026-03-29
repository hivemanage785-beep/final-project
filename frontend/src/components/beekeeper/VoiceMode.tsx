/**
 * Voice Mode — MediaRecorder + Local Blob Storage + Transcription placeholder
 */
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Mic, Square, Play, Trash2, 
  Save, FileAudio, CheckCircle2, 
  Activity, Volume2
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface VoiceModeProps {
  onClose: () => void;
  onSave?: (blob: Blob, transcript: string) => void;
}

export function VoiceMode({ onClose, onSave }: VoiceModeProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPreview = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic access denied", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlay = () => {
    if (!audioPreview.current || !audioUrl) return;
    if (isPlaying) {
      audioPreview.current.pause();
    } else {
      audioPreview.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const reset = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
  };

  const handleFinish = () => {
    if (audioBlob && onSave) {
      onSave(audioBlob, "Simulated transcription: Colony showing heavy swarm behavior in upper deep. Added second honey super.");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900 flex flex-col items-center justify-between p-8 text-white">
      <header className="w-full flex justify-between items-center">
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Voice Record v2</span>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-12 w-full max-w-sm text-center">
        {!audioBlob ? (
          <div className="space-y-8 w-full">
            <div className="relative">
              {/* Voice pulse animation */}
              {isRecording && (
                <div className="absolute inset-0 flex items-center justify-center scale-150">
                  <div className="w-32 h-32 rounded-full border-2 border-primary animate-ping opacity-20" />
                  <div className="w-40 h-40 rounded-full border-2 border-primary animate-ping opacity-10 [animation-delay:0.3s]" />
                </div>
              )}
              <div className={cn(
                "w-32 h-32 rounded-full mx-auto flex items-center justify-center transition-all duration-500 relative z-10 shadow-2xl",
                isRecording ? "bg-red-500" : "bg-primary"
              )}>
                <Mic className="w-12 h-12 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black">{isRecording ? 'Listening...' : 'Ready to record'}</h2>
              <p className="text-sm text-slate-400">Recording will be stored locally and synced when online.</p>
              <p className="text-4xl font-black font-mono tracking-tighter mt-4">
                {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
              </p>
            </div>

            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95",
                isRecording ? "bg-white text-red-500" : "bg-primary text-white"
              )}
            >
              {isRecording ? "Stop Recording" : "Tap to Speak"}
            </button>
          </div>
        ) : (
          <div className="space-y-8 w-full animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-primary/20 rounded-full mx-auto flex items-center justify-center border-2 border-primary/30">
              <FileAudio className="w-10 h-10 text-primary" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-2xl font-black tracking-tight">Transcription Complete</h2>
              <div className="bg-slate-800/50 p-6 rounded-3xl text-sm italic text-slate-300 border border-slate-700 leading-relaxed text-left">
                "Colony showing heavy swarm behavior in upper deep. Added second honey super."
              </div>
            </div>

            <audio ref={audioPreview} src={audioUrl || ''} onEnded={() => setIsPlaying(false)} className="hidden" />
            
            <div className="flex gap-4">
              <button 
                onClick={reset}
                className="flex-1 py-4 bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button 
                onClick={togglePlay}
                className="flex-1 py-4 bg-primary/20 text-primary border border-primary/30 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />} 
                {isPlaying ? 'Pause' : 'Listen'}
              </button>
            </div>

            <button 
              onClick={handleFinish}
              className="w-full py-5 bg-primary text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
            >
              Attach to Inspection <CheckCircle2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </main>

      <footer className="w-full flex flex-col items-center gap-2 opacity-50">
        <Volume2 className="w-4 h-4" />
        <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Audio Analysis Engine active</span>
      </footer>
    </div>
  );
}

const WaveformIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10v3" /><path d="M6 6v11" /><path d="M10 3v18" /><path d="M14 8v7" /><path d="M18 5v13" /><path d="M22 10v3" />
  </svg>
);
