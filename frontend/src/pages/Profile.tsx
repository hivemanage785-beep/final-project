import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { User, Mail, Shield, Hexagon, ClipboardList, Activity, MapPin } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuth();
  
  // Real data counts from local Dexie sync DB
  const hives = useLiveQuery(() => db.hives.where('uid').equals(user?.uid || '').toArray(), [user]) || [];
  const inspections = useLiveQuery(() => db.inspections.where('uid').equals(user?.uid || '').toArray(), [user]) || [];
  const harvests = useLiveQuery(() => db.harvests.where('uid').equals(user?.uid || '').toArray(), [user]) || [];
  const savedLocations = useLiveQuery(() => db.savedLocations.where('uid').equals(user?.uid || '').toArray(), [user]) || [];

  // Fallback identity logic
  const email = user?.email || 'beekeeper@hiveops.app';
  const name = user?.displayName || email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="page-enter bg-[#f8f9fa] min-h-[100dvh] pb-24 px-4 pt-4">
      <div className="mb-6 pt-2 px-1">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Account</h1>
        <p className="text-sm text-slate-500 font-medium mt-0.5">Secure beekeeper identity</p>
      </div>

      {/* Identity Card */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 mb-8">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 shrink-0 rounded-[20px] bg-[#990a00] flex items-center justify-center text-white font-black text-xl shadow-sm overflow-hidden border-2 border-white">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="" 
                className="w-full h-full object-cover" 
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = `<span>${initials}</span>`; }} 
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 truncate">{name}</h2>
            <p className="text-sm font-medium text-slate-400 truncate mb-1">{email}</p>
            <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-emerald-50 border border-emerald-100 inline-flex">
              <Shield size={12} className="text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Verified Beekeeper</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Global Activity</h3>
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 mb-8">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-2xl font-black text-[#990a00] leading-none mb-1">{hives.length}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Apiaries</p>
          </div>
          <div className="w-px h-8 bg-slate-100 mx-auto" />
          <div className="text-center">
            <p className="text-2xl font-black text-[#990a00] leading-none mb-1">{inspections.length}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Logs</p>
          </div>
          <div className="w-px h-8 bg-slate-100 mx-auto" />
          <div className="text-center">
            <p className="text-2xl font-black text-[#990a00] leading-none mb-1">{harvests.length}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Batches</p>
          </div>
        </div>
      </div>

      {/* Account Details - Read Only */}
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Identity Details</h3>
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User size={18} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-600">Full Name</span>
          </div>
          <span className="text-sm font-bold text-slate-900">{name}</span>
        </div>
        
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-600">Email Address</span>
          </div>
          <span className="text-sm font-bold text-slate-900">{email}</span>
        </div>

        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-600">UID Signature</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{user?.uid?.slice(0, 8)}...</span>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin size={18} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-600">Saved Sites</span>
          </div>
          <span className="text-sm font-bold text-slate-900">{savedLocations.length} Locations</span>
        </div>
      </div>

      <p className="mt-8 px-2 text-[11px] text-slate-400 font-medium text-center leading-relaxed">
        Personal details are synchronized via HiveOps Security. Profile editing is currently managed through your identity provider.
      </p>
    </div>
  );
};
