import React, { useState } from 'react';
import { Shield, Key, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Security = () => {
  const [password, setPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  return (
    <div className="page-enter pb-12">
      <div className="mb-6 px-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security</h1>
        <p className="text-sm font-medium text-slate-400 mt-1">Protect your field data and account access</p>
      </div>

      <div className="space-y-6">
        {/* Password Management */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
              <Key size={20} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-800">Update Password</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Change your access credentials</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-100 p-4 rounded-xl border border-slate-100 bg-slate-50/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#5D0623]/10 focus:border-[#5D0623] transition-all"
              />
            </div>
            <button 
              disabled={!password || isUpdating}
              className={`w-full py-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98] ${
                !password ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#5D0623] text-white shadow-md'
              }`}
              onClick={() => {
                setIsUpdating(true);
                setTimeout(() => { setIsUpdating(false); setPassword(''); }, 1500);
              }}
            >
              {isUpdating ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* Protection Status */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-3 px-2">Account Protection</h3>
          <div className="space-y-3">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h4 className="text-[14px] font-bold text-slate-800">Google Authentication</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-medium">Your account is verified via secure OAuth 2.0 protocol.</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                <Smartphone size={18} />
              </div>
              <div>
                <h4 className="text-[14px] font-bold text-slate-800">Device Isolation</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-medium">Field data is isolated to this session and synced only to authorized servers.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Informational Warning */}
        <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex gap-4">
          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-800">Multi-Tab Safety</h4>
            <p className="text-xs text-amber-700/80 mt-1 leading-relaxed font-medium">
              HiveOps uses local encryption. Opening the dashboard in multiple tabs may trigger a security refresh to ensure data integrity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
