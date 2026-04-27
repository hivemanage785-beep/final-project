import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, ShieldX, Clock, MapPin, Leaf,
  QrCode, CircleAlert, Hexagon, BadgeCheck
} from 'lucide-react';

import { apiGet } from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TraceData {
  publicId: string;
  harvest_date: string;
  flora: string;
  hive_count: number;
  location: { lat_approx: number; lng_approx: number; note: string };
  beekeeper_name: string;
  quality_notes: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  certification_id: string | null;
  verified_at: string | null;
  is_locked: boolean;
  createdAt: string;
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  verified: {
    icon: ShieldCheck,
    label: 'Verified Authentic',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  pending: {
    icon: Clock,
    label: 'Verification Pending',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-400',
  },
  rejected: {
    icon: ShieldX,
    label: 'Verification Rejected',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
    dot: 'bg-red-500',
  },
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const TracePage: React.FC<{ publicId: string }> = ({ publicId }) => {
  const [data, setData]       = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!publicId) return;
    const controller = new AbortController();

    apiGet(`/api/batches/trace/${publicId}`, { signal: controller.signal })
      .then(d => {
        if (d.success) setData(d.data);
        else setError(d.error || 'Batch not found');
      })
      .catch(e => { if (e.name !== 'CanceledError') setError('Failed to load batch info'); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [publicId]);

  if (loading) return <TraceLoading />;
  if (error)   return <TraceError message={error} />;
  if (!data)   return null;

  const status = STATUS_CONFIG[data.verification_status];
  const StatusIcon = status.icon;
  const traceUrl = `${window.location.origin}/trace/${publicId}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 bg-[#5D0623] rounded-2xl flex items-center justify-center shadow-lg">
              <Hexagon className="text-white" size={20} fill="white" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">HiveOps Trace</span>
          </div>
          <p className="text-sm text-gray-500">Tamper-proof honey authenticity verification</p>
        </motion.div>

        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`flex items-center gap-3 p-4 rounded-2xl border ${status.bg} ${status.border} mb-4 shadow-sm`}
        >
          <StatusIcon className={status.text} size={24} />
          <div className="flex-1">
            <p className={`font-bold text-base ${status.text}`}>{status.label}</p>
            {data.verification_status === 'verified' && data.certification_id && (
              <p className="text-xs text-emerald-600 mt-0.5 font-mono">Cert: {data.certification_id}</p>
            )}
            {data.verification_status === 'verified' && data.verified_at && (
              <p className="text-xs text-emerald-600 mt-0.5">
                {new Date(data.verified_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
              </p>
            )}
          </div>
          {data.verification_status === 'verified' && (
            <BadgeCheck className="text-emerald-500 flex-shrink-0" size={28} />
          )}
        </motion.div>

        {/* QR Code + Batch Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden mb-4"
        >
          {/* QR */}
          <div className="flex flex-col items-center py-6 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
            <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-100">
              <QRCodeSVG
                value={traceUrl}
                size={160}
                level="H"
                includeMargin={false}
                fgColor="#1a1a1a"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-3 font-mono">{publicId.slice(0, 12)}...</p>
          </div>

          {/* Data Grid */}
          <div className="p-5 space-y-4">
            <DataRow
              icon={<Leaf size={16} className="text-green-600" />}
              label="Floral Source"
              value={data.flora}
              strong
            />
            <DataRow
              icon={<Clock size={16} className="text-blue-500" />}
              label="Harvest Date"
              value={new Date(data.harvest_date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
            />
            <DataRow
              icon={<Hexagon size={16} className="text-[#5D0623]" />}
              label="Hive Count"
              value={`${data.hive_count} hive${data.hive_count > 1 ? 's' : ''}`}
            />
            <DataRow
              icon={<MapPin size={16} className="text-orange-500" />}
              label="Approximate Location"
              value={`${data.location.lat_approx}° N, ${data.location.lng_approx}° E`}
              sub={data.location.note}
            />
            {data.quality_notes && (
              <DataRow
                icon={<BadgeCheck size={16} className="text-purple-500" />}
                label="Quality Notes"
                value={data.quality_notes}
              />
            )}
          </div>
        </motion.div>

        {/* Beekeeper Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-[#5D0623]/10 rounded-xl flex items-center justify-center">
            <QrCode className="text-[#5D0623]" size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Beekeeper / Apiary</p>
            <p className="font-bold text-gray-900">{data.beekeeper_name}</p>
          </div>
          {data.verification_status === 'verified' && (
            <BadgeCheck className="text-emerald-500 ml-auto" size={20} />
          )}
        </motion.div>

        {/* Locked badge */}
        {data.is_locked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-2"
          >
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
            Batch locked · Tamper-proof since {new Date(data.createdAt).toLocaleDateString()}
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
          </motion.div>
        )}

      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const DataRow: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; strong?: boolean }> = ({ icon, label, value, sub, strong }) => (
  <div className="flex items-start gap-3">
    <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-gray-100">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className={`mt-0.5 ${strong ? 'font-bold text-gray-900 text-base' : 'font-semibold text-gray-800 text-sm'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5 italic">{sub}</p>}
    </div>
  </div>
);

const TraceLoading: React.FC = () => (
  <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center gap-4">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5D0623] border-t-transparent" />
    <p className="text-gray-500 font-medium">Loading batch information...</p>
  </div>
);

const TraceError: React.FC<{ message: string }> = ({ message }) => (
  <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center gap-4 px-6">
    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
      <CircleAlert className="text-red-500" size={32} />
    </div>
    <div className="text-center">
      <p className="font-bold text-gray-900 text-lg">Batch Not Found</p>
      <p className="text-gray-500 text-sm mt-1 mb-4">{message}</p>
      <button onClick={() => window.location.reload()} className="px-6 py-2 bg-[#5D0623] text-white rounded-xl font-bold shadow-md active:scale-95 transition-transform">
        Try Again
      </button>
    </div>
  </div>
);
